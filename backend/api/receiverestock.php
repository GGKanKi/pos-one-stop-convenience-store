<?php
// inventory and approvals
// admin receives restock from supplier and updates inventory, also updates the inventory_change_requests table to mark the request as completed
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

// Support both single item (legacy) and bulk items array format
$items = $input['items'] ?? null;
$deliverySource = trim((string)($input['source'] ?? ''));
$customReceiptNo = trim((string)($input['receipt_no'] ?? ''));
$rawReceiptTotal = $input['receipt_total'] ?? 0;
$receiptTotal = is_numeric($rawReceiptTotal) ? (float)$rawReceiptTotal : 0.00;
$staffName = trim((string)($input['staff_name'] ?? 'Staff'));

if (!is_array($items) || empty($items)) {
    $requestId = filter_var($input['request_id'] ?? null, FILTER_VALIDATE_INT);
    $actualQty = filter_var($input['actual_qty'] ?? null, FILTER_VALIDATE_INT);
    $expirationDate = trim((string)($input['expiration_date'] ?? ''));
    
    if (!$requestId || $actualQty === false || $actualQty <= 0) {
        sendJsonResponse(false, "Valid request ID and received quantity are required.", null, 400);
    }
    
    $items = [[
        'request_id' => $requestId,
        'actual_qty' => $actualQty,
        'expiration_date' => $expirationDate
    ]];
}

try {
    $pdo->beginTransaction();

    // 1. Save delivery header (Batch ID / Receipt No, Source, Receipt Total)
    $deliveryBatchId = !empty($customReceiptNo) ? $customReceiptNo : ('DEL-' . date('Ymd') . '-' . rand(1000, 9999));
    
    $delInsert = $pdo->prepare("
        INSERT INTO deliveries (batch_id, source, receipt_total, staff_name, created_at) 
        VALUES (?, ?, ?, ?, NOW())
    ");
    $delInsert->execute([
        $deliveryBatchId, 
        $deliverySource ?: 'General Supplier', 
        $receiptTotal, 
        $staffName
    ]);
    $deliveryId = $pdo->lastInsertId();

    if (!$deliveryId) {
        throw new Exception("Failed to insert delivery header record.");
    }

    // --- IDINAGDAG: Awtomatikong i-record din bilang Payout kung may Receipt Total ---
    if ($receiptTotal > 0) {
        // Alamin ang user id kung meron man, o default sa 1
        $userId = 1;
        if (function_exists('requireAuthUser')) {
            try {
                $authUser = requireAuthUser($pdo);
                $userId = (int)($authUser['id'] ?? 1);
            } catch (Throwable $ex) {
                $userId = 1;
            }
        }

        $payOutTo = $deliverySource ?: 'General Supplier';
        $payoutDesc = 'Restock Delivery Payment (Batch/Ref: ' . $deliveryBatchId . ')';

        // Pagsasave sa payouts table para lumitaw sa Daily Sales Report / Payouts breakdown
        $payoutStmt = $pdo->prepare("
            INSERT INTO payouts (pay_out_to, amount, description, user_id, user_name, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $payoutStmt->execute([$payOutTo, $receiptTotal, $payoutDesc, $userId, $staffName]);

        // Paglalagay din ng entry sa inventory_audit para tugma sa struktura ng payouts.php
        $payoutAudit = $pdo->prepare("
            INSERT INTO inventory_audit (action_type, product_id, product_name, before_data, after_data, quantity_change, reason, user_id, user_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $payoutAudit->execute([
            'Payout / Expense',
            null,
            'Payout: ' . $payOutTo,
            null,
            json_encode(['amount' => $receiptTotal, 'description' => $payoutDesc], JSON_THROW_ON_ERROR),
            0,
            'Payout to ' . $payOutTo . ' - ' . $payoutDesc,
            $userId,
            $staffName
        ]);
    }
    // -------

    foreach ($items as $item) {
        $requestId = filter_var($item['request_id'] ?? null, FILTER_VALIDATE_INT);
        $actualQty = filter_var($item['actual_qty'] ?? null, FILTER_VALIDATE_INT);
        $expirationDate = trim((string)($item['expiration_date'] ?? ''));

        if (!$requestId || $actualQty === false || $actualQty <= 0) {
            continue;
        }

        $reqStmt = $pdo->prepare("SELECT * FROM inventory_change_requests WHERE id = ? LIMIT 1 FOR UPDATE");
        $reqStmt->execute([$requestId]);
        $request = $reqStmt->fetch(PDO::FETCH_ASSOC);

        if (!$request) {
            continue;
        }

        $productId = (int)($request['product_id'] ?? 0);

        if ($productId <= 0 && !empty($request['requested_data'])) {
            $jsonData = json_decode($request['requested_data'], true);
            if (is_array($jsonData)) {
                $productId = (int)($jsonData['product_id'] ?? $jsonData['id'] ?? $jsonData['product']['id'] ?? 0);
            }
        }

        if ($productId <= 0) {
            continue;
        }

        $prodStmt = $pdo->prepare("SELECT * FROM products WHERE id = ? LIMIT 1 FOR UPDATE");
        $prodStmt->execute([$productId]);
        $product = $prodStmt->fetch(PDO::FETCH_ASSOC);

        if (!$product) {
            continue;
        }

        $productName = $product['productName'] ?? $product['name'] ?? ('Product #' . $productId);
        $barcode = $product['barcode'] ?? $product['code'] ?? '';
        $oldStock = (int)($product['stockQuantity'] ?? $product['stock'] ?? 0);
        $newStock = $oldStock + $actualQty;

        // 2. Save each product into delivery_items linked to this delivery batch
        $delItemInsert = $pdo->prepare("
            INSERT INTO delivery_items (delivery_id, product_id, product_name, barcode, quantity, expiration_date) 
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $delItemInsert->execute([
            $deliveryId,
            $productId,
            $productName,
            $barcode,
            $actualQty,
            !empty($expirationDate) ? $expirationDate : 'No Expiry Date'
        ]);

        // Load existing batches and append new batch separately
        $existingBatchesRaw = $product['expiry_batches'] ?? $product['expiryBatches'] ?? null;
        $batches = [];
        
        if (!empty($existingBatchesRaw)) {
            if (is_string($existingBatchesRaw)) {
                $decoded = json_decode($existingBatchesRaw, true);
                if (is_array($decoded)) {
                    $batches = $decoded;
                }
            } elseif (is_array($existingBatchesRaw)) {
                $batches = $existingBatchesRaw;
            }
        }

        if (empty($batches)) {
            $legacyExpiry = $product['expirationDate'] ?? $product['expiration_date'] ?? null;
            if (!empty($legacyExpiry) && $oldStock > 0) {
                $batches[] = ['date' => (string)$legacyExpiry, 'qty' => $oldStock];
            }
        }

        if (!empty($expirationDate)) {
            $batches[] = ['date' => $expirationDate, 'qty' => $actualQty];
        } else {
            $batches[] = ['date' => 'No Expiry Date', 'qty' => $actualQty];
        }

        $colStmt = $pdo->query("SHOW COLUMNS FROM products");
        $productColumns = $colStmt->fetchAll(PDO::FETCH_COLUMN);

        $updateFields = ["stockQuantity = ?"];
        $updateValues = [$newStock];

        $encodedFinalBatches = json_encode($batches, JSON_THROW_ON_ERROR);

        if (in_array('expiry_batches', $productColumns, true)) {
            $updateFields[] = "expiry_batches = ?";
            $updateValues[] = $encodedFinalBatches;
        } elseif (in_array('expiryBatches', $productColumns, true)) {
            $updateFields[] = "expiryBatches = ?";
            $updateValues[] = $encodedFinalBatches;
        }

        $updateValues[] = $productId;
        $setClause = implode(", ", $updateFields);

        $updateStmt = $pdo->prepare("UPDATE products SET $setClause WHERE id = ?");
        $updateStmt->execute($updateValues);

        $auditStmt = $pdo->prepare("
            INSERT INTO inventory_audit (action_type, product_id, product_name, before_data, after_data, quantity_change, reason, user_name, created_at) 
            VALUES ('Stock Addition', ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $auditStmt->execute([
            $productId,
            $productName,
            json_encode(['stockQuantity' => $oldStock], JSON_THROW_ON_ERROR),
            json_encode(['stockQuantity' => $newStock, 'expiryBatches' => $batches], JSON_THROW_ON_ERROR),
            $actualQty,
            $productName . ' | ' . $actualQty . ' units added | Reason: Restock Order #' . $requestId . ' received (Source: ' . ($deliverySource ?: 'N/A') . ', Batch: ' . $deliveryBatchId . ')' . (!empty($expirationDate) ? " (New Batch Expiry: $expirationDate)" : ""),
            $staffName
        ]);

        // 3. Update inventory_change_requests table to status = 'completed' and sync quantities safely
        $reqColStmt = $pdo->query("SHOW COLUMNS FROM inventory_change_requests");
        $reqColumns = $reqColStmt->fetchAll(PDO::FETCH_COLUMN);

        $reqUpdateFields = ["status = 'completed'"];
        $reqUpdateValues = [];

        if (in_array('quantity', $reqColumns, true)) {
            $reqUpdateFields[] = "quantity = ?";
            $reqUpdateValues[] = $actualQty;
        } elseif (in_array('approved_quantity', $reqColumns, true)) {
            $reqUpdateFields[] = "approved_quantity = ?";
            $reqUpdateValues[] = $actualQty;
        }

        if (!empty($request['requested_data'])) {
            $reqJson = json_decode($request['requested_data'], true);
            if (is_array($reqJson)) {
                if (isset($reqJson['quantity'])) $reqJson['quantity'] = $actualQty;
                if (isset($reqJson['qty'])) $reqJson['qty'] = $actualQty;
                if (isset($reqJson['approved_quantity'])) $reqJson['approved_quantity'] = $actualQty;
                $reqUpdateFields[] = "requested_data = ?";
                $reqUpdateValues[] = json_encode($reqJson, JSON_THROW_ON_ERROR);
            }
        }

        $reqUpdateValues[] = $requestId;
        $reqSetClause = implode(", ", $reqUpdateFields);

        $completeStmt = $pdo->prepare("UPDATE inventory_change_requests SET $reqSetClause WHERE id = ?");
        $completeStmt->execute($reqUpdateValues);
    }

    $pdo->commit();
    sendJsonResponse(true, "Restock received successfully! Added to inventory, updated requests, and recorded in delivery.");

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJsonResponse(false, "Error: " . $e->getMessage(), null, 500);
}