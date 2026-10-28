<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { 
    http_response_code(200); 
    exit; 
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(false, "Method not allowed.", null, 405);
}

$input = getJsonInput();
$requestId = filter_var($input['request_id'] ?? null, FILTER_VALIDATE_INT);
$decision = $input['decision'] ?? '';
$note = trim((string)($input['note'] ?? ''));
$approvedQty = filter_var($input['approved_qty'] ?? null, FILTER_VALIDATE_INT);

if (!$requestId || !in_array($decision, ['approve', 'reject'], true)) {
    sendJsonResponse(false, "Provide a valid decision.", null, 400);
}

try {
    $admin = requireAuthUser($pdo);
    $allowedRoles = ['admin', 'manager'];
    if (!in_array(strtolower($admin['role'] ?? ''), $allowedRoles, true)) {
        sendJsonResponse(false, "Admin access required.", null, 403);
    }
    
    $adminId = (int)$admin['id'];
    $adminName = trim(($admin['first_name'] ?? '') . ' ' . ($admin['last_name'] ?? '')) ?: 'Admin';

    $pdo->beginTransaction();
    $requestStmt = $pdo->prepare("SELECT * FROM inventory_change_requests WHERE id = ? AND status = 'pending' LIMIT 1 FOR UPDATE");
    $requestStmt->execute([$requestId]);
    $request = $requestStmt->fetch();

    if (!$request) {
        $pdo->rollBack();
        sendJsonResponse(false, "This request is no longer pending.", null, 409);
    }

    $originalUserId = (int)($request['requested_by'] ?? $request['user_id'] ?? $adminId);
    $originalUserName = trim((string)($request['user_name'] ?? ''));
    if ($originalUserName === '' && $originalUserId !== $adminId) {
        $uStmt = $pdo->prepare("SELECT first_name, last_name, email FROM users WHERE id = ? LIMIT 1");
        $uStmt->execute([$originalUserId]);
        $uData = $uStmt->fetch();
        if ($uData) {
            $originalUserName = trim(($uData['first_name'] ?? '') . ' ' . ($uData['last_name'] ?? '')) ?: ($uData['email'] ?? 'Staff');
        }
    }
    if ($originalUserName === '') {
        $originalUserName = 'Staff';
    }

    if ($decision === 'approve') {
        $data = json_decode($request['requested_data'], true);
        if (!is_array($data)) {
            throw new InvalidArgumentException("The submitted change data is invalid.");
        }

        $audit = $pdo->prepare("INSERT INTO inventory_audit (action_type, product_id, product_name, before_data, after_data, quantity_change, reason, user_id, user_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

        if ($request['action_type'] === 'restock') {
            // RESTOCK APPROVAL: Use the newly edited approvedQty if provided, otherwise fallback to original
            $restockQty = ($approvedQty !== null && $approvedQty > 0) ? $approvedQty : (int)($data['restockQty'] ?? $data['stockQuantity'] ?? 0);
            
            // Update requested_data JSON with the new approved quantity so downstream receive screens display it correctly
            if ($approvedQty !== null && $approvedQty > 0) {
                $data['restockQty'] = $approvedQty;
                $updJson = $pdo->prepare("UPDATE inventory_change_requests SET requested_data = ? WHERE id = ?");
                $updJson->execute([json_encode($data, JSON_THROW_ON_ERROR), $requestId]);
            }

            $productName = trim((string)($data['productName'] ?? 'Product'));
            $productId = (int)($request['product_id'] ?? $data['id'] ?? 0);

            // Automatically increase the actual product stock quantity upon restock approval
            if ($productId > 0) {
                $stockUpdate = $pdo->prepare("UPDATE products SET stockQuantity = stockQuantity + ? WHERE id = ?");
                $stockUpdate->execute([$restockQty, $productId]);
            }

            $audit->execute([
                'Restock Approved',
                $productId > 0 ? $productId : null,
                $productName,
                null,
                json_encode(['approvedQty' => $restockQty], JSON_THROW_ON_ERROR),
                $restockQty,
                $productName . ' | ' . $restockQty . ' units approved for restock | Reason: ' . ($note !== '' ? $note : 'Manager Approval'),
                $originalUserId,
                $originalUserName
            ]);
        } else {
            $name = trim((string)($data['productName'] ?? ''));
            $barcode = trim((string)($data['barcode'] ?? ''));
            $category = trim((string)($data['category'] ?? ''));
            $stock = $request['action_type'] === 'add' ? 0 : filter_var($data['stockQuantity'] ?? null, FILTER_VALIDATE_INT);
            $cost = filter_var($data['costPrice'] ?? null, FILTER_VALIDATE_FLOAT);
            $price = filter_var($data['sellingPrice'] ?? null, FILTER_VALIDATE_FLOAT);
            $threshold = filter_var($data['threshold'] ?? 5, FILTER_VALIDATE_INT);

            if ($name === '' || $barcode === '' || $category === '' || $stock === false || $stock < 0 || $cost === false || $cost < 0 || $price === false || $price < 0 || $threshold === false || $threshold < 0) {
                throw new InvalidArgumentException("The requested product fields are invalid.");
            }

            $expirationDate = $request['action_type'] === 'add' ? null : (!empty($data['expirationDate']) ? (string)$data['expirationDate'] : null);
            if ($expirationDate !== null) {
                $date = DateTime::createFromFormat('!Y-m-d', $expirationDate);
                if (!$date || $date->format('Y-m-d') !== $expirationDate) {
                    throw new InvalidArgumentException("Expiration date is invalid.");
                }
            }

            $batches = $request['action_type'] === 'add' ? [] : ($data['expiryBatches'] ?? []);
            if ($request['action_type'] === 'add') {
                $batches = [];
            } elseif (!is_array($batches) || count($batches) > 100) {
                throw new InvalidArgumentException("Expiry batches are invalid.");
            }

            foreach ($batches as $batch) {
                $batchDate = is_array($batch) ? (string)($batch['date'] ?? '') : '';
                $batchQty = is_array($batch) ? filter_var($batch['qty'] ?? null, FILTER_VALIDATE_INT) : false;
                $date = $batchDate !== '' ? DateTime::createFromFormat('!Y-m-d', $batchDate) : false;
                if (!$date || $date->format('Y-m-d') !== $batchDate || $batchQty === false || $batchQty < 0) {
                    throw new InvalidArgumentException("An expiry batch is invalid.");
                }
            }

            $description = trim((string)($data['description'] ?? '')) ?: null;
            $supplier = trim((string)($data['supplier'] ?? '')) ?: null;
            $encodedBatches = json_encode($batches, JSON_THROW_ON_ERROR);

            if ($request['action_type'] === 'add') {
                $insert = $pdo->prepare("INSERT INTO products (productName, barcode, description, stockQuantity, costPrice, sellingPrice, category, supplier, expirationDate, expiry_batches, threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $insert->execute([$name, $barcode, $description, $stock, $cost, $price, $category, $supplier, $expirationDate, $encodedBatches, $threshold]);
                $productId = (int)$pdo->lastInsertId();
                
                $audit->execute([
                    'Added New Product', 
                    $productId, 
                    $name, 
                    null, 
                    json_encode(['stockQuantity' => $stock, 'barcode' => $barcode], JSON_THROW_ON_ERROR), 
                    $stock, 
                    $name . ' | ' . $stock . ' units added | Reason: Approved staff request #' . $requestId, 
                    $originalUserId, 
                    $originalUserName
                ]);
            } else {
                $productId = (int)$request['product_id'];
                $find = $pdo->prepare("SELECT * FROM products WHERE id = ? LIMIT 1 FOR UPDATE");
                $find->execute([$productId]);
                $before = $find->fetch();

                if (!$before) {
                    throw new InvalidArgumentException("The product was removed before this request could be approved.");
                }

                $submittedBefore = json_decode((string)$request['before_data'], true) ?: [];
                
                $submittedStockBefore = (int)($submittedBefore['stockQuantity'] ?? $before['stockQuantity']);
                $requestedStockDelta = $stock - $submittedStockBefore;
                $stock = (int)$before['stockQuantity'] + $requestedStockDelta;

                if ($stock < 0) {
                    throw new InvalidArgumentException("Current stock changed while this request was pending; the approved adjustment would make stock negative. Reject and ask Staff to resubmit.");
                }

                $stockDelta = $stock - (int)$before['stockQuantity'];
                $reason = trim((string)($data['stockChangeReason'] ?? ''));
                if ($stockDelta !== 0 && $reason === '') {
                    throw new InvalidArgumentException("A reason is required for the requested stock change.");
                }

                $baseFields = [
                    'productName' => $submittedBefore['productName'] ?? null,
                    'barcode' => $submittedBefore['barcode'] ?? null,
                    'description' => $submittedBefore['description'] ?? null,
                    'costPrice' => $submittedBefore['costPrice'] ?? null,
                    'sellingPrice' => $submittedBefore['sellingPrice'] ?? null,
                    'category' => $submittedBefore['category'] ?? null,
                    'supplier' => $submittedBefore['supplier'] ?? null,
                    'expirationDate' => $submittedBefore['expirationDate'] ?? null,
                    'threshold' => $submittedBefore['threshold'] ?? null,
                ];

                $requestedFields = [
                    'productName' => $name,
                    'barcode' => $barcode,
                    'description' => $description,
                    'costPrice' => $cost,
                    'sellingPrice' => $price,
                    'category' => $category,
                    'supplier' => $supplier,
                    'expirationDate' => $expirationDate,
                    'threshold' => $threshold
                ];

                $sameValue = static function (string $field, $left, $right): bool {
                    if (in_array($field, ['costPrice', 'sellingPrice'], true)) return (float)$left === (float)$right;
                    if ($field === 'threshold') return (int)$left === (int)$right;
                    return (string)($left ?? '') === (string)($right ?? '');
                };

                foreach ($requestedFields as $field => $value) {
                    $requestChangedField = !$sameValue($field, $value, $baseFields[$field] ?? null);
                    $currentChangedField = !$sameValue($field, $before[$field] ?? null, $baseFields[$field] ?? null);
                    if ($requestChangedField && $currentChangedField) {
                        throw new InvalidArgumentException("This product changed after the request was submitted. Reject it and ask Staff to submit an updated request.");
                    }
                    if (!$requestChangedField) $requestedFields[$field] = $before[$field] ?? null;
                }

                $baseBatches = $submittedBefore['expiryBatches'] ?? [];
                $currentBatches = json_decode((string)($before['expiry_batches'] ?? '[]'), true) ?: [];
                if ($batches !== $baseBatches && $currentBatches !== $baseBatches) {
                    throw new InvalidArgumentException("Expiry batches changed after this request was submitted. Reject it and ask Staff to submit an updated request.");
                }

                if ($batches === $baseBatches) $batches = $currentBatches;
                $encodedBatches = json_encode($batches, JSON_THROW_ON_ERROR);

                $name = $requestedFields['productName'];
                $barcode = $requestedFields['barcode'];
                $description = $requestedFields['description'];
                $cost = $requestedFields['costPrice'];
                $price = $requestedFields['sellingPrice'];
                $category = $requestedFields['category'];
                $supplier = $requestedFields['supplier'];
                $expirationDate = $requestedFields['expirationDate'];
                $threshold = $requestedFields['threshold'];

                $update = $pdo->prepare("UPDATE products SET productName=?, barcode=?, description=?, stockQuantity=?, costPrice=?, sellingPrice=?, category=?, supplier=?, expirationDate=?, expiry_batches=?, threshold=? WHERE id=?");
                $update->execute([$name, $barcode, $description, $stock, $cost, $price, $category, $supplier, $expirationDate, $encodedBatches, $threshold, $productId]);

                $changedBefore = [];
                $changedAfter = [];
                $fields = ['productName' => $name, 'barcode' => $barcode, 'description' => $description, 'costPrice' => $cost, 'sellingPrice' => $price, 'category' => $category, 'supplier' => $supplier, 'expirationDate' => $expirationDate, 'threshold' => $threshold];
                foreach ($fields as $field => $value) {
                    if ((string)($before[$field] ?? '') !== (string)($value ?? '')) { 
                        $changedBefore[$field] = $before[$field] ?? null; 
                        $changedAfter[$field] = $value; 
                    }
                }

                $oldBatches = json_decode((string)($before['expiry_batches'] ?? '[]'), true) ?: [];
                if ($oldBatches !== $batches) { 
                    $changedBefore['expiryBatches'] = $oldBatches; 
                    $changedAfter['expiryBatches'] = $batches; 
                }

                if ($changedAfter !== []) {
                    $audit->execute(['Product Details Update', $productId, $name, json_encode($changedBefore, JSON_THROW_ON_ERROR), json_encode($changedAfter, JSON_THROW_ON_ERROR), null, $name . ' details updated', $originalUserId, $originalUserName]);
                }

                if ($stockDelta !== 0) {
                    $audit->execute([
                        $stockDelta > 0 ? 'Stock Addition' : 'Stock Deduction',
                        $productId,
                        $name,
                        json_encode(['stockQuantity' => (int)$before['stockQuantity']], JSON_THROW_ON_ERROR),
                        json_encode(['stockQuantity' => $stock], JSON_THROW_ON_ERROR),
                        $stockDelta,
                        $name . ' | ' . abs($stockDelta) . ' units ' . ($stockDelta > 0 ? 'added' : 'deducted') . ' | Reason: ' . $reason,
                        $originalUserId,
                        $originalUserName
                    ]);
                }
            }
        }
    }

    $status = $decision === 'approve' ? 'approved' : 'rejected';
    $review = $pdo->prepare("UPDATE inventory_change_requests SET status = ?, reviewed_by = ?, review_note = ?, reviewed_at = NOW() WHERE id = ? AND status = 'pending'");
    $review->execute([$status, $adminId, $note !== '' ? substr($note, 0, 500) : null, $requestId]);

    $pdo->commit();
    sendJsonResponse(true, $decision === 'approve' ? "Request approved and processed successfully." : "Change rejected.");
} catch (InvalidArgumentException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    sendJsonResponse(false, $e->getMessage(), null, 400);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("Review inventory change database error: " . $e->getMessage());
    sendJsonResponse(false, $e->getCode() === '23000' ? "That barcode already exists." : "Unable to review this inventory change.", null, $e->getCode() === '23000' ? 409 : 500);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("Review inventory change error: " . $e->getMessage());
    sendJsonResponse(false, "Unable to review this inventory change.", null, 500);
}
