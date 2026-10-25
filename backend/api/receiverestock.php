<?php
// inventory and approvals
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
$actualQty = filter_var($input['actual_qty'] ?? null, FILTER_VALIDATE_INT);
$expirationDate = trim((string)($input['expiration_date'] ?? ''));
$staffName = trim((string)($input['staff_name'] ?? 'Staff'));

if (!$requestId || $actualQty === false || $actualQty <= 0) {
    sendJsonResponse(false, "Valid request ID and received quantity are required.", null, 400);
}

try {
    $pdo->beginTransaction();

    $reqStmt = $pdo->prepare("SELECT * FROM inventory_change_requests WHERE id = ? LIMIT 1 FOR UPDATE");
    $reqStmt->execute([$requestId]);
    $request = $reqStmt->fetch(PDO::FETCH_ASSOC);

    if (!$request) {
        $pdo->rollBack();
        sendJsonResponse(false, "Restock order not found.", null, 404);
    }

    $productId = (int)($request['product_id'] ?? 0);

    if ($productId <= 0 && !empty($request['requested_data'])) {
        $jsonData = json_decode($request['requested_data'], true);
        if (is_array($jsonData)) {
            $productId = (int)($jsonData['product_id'] ?? $jsonData['id'] ?? $jsonData['product']['id'] ?? 0);
        }
    }

    if ($productId <= 0) {
        $pdo->rollBack();
        sendJsonResponse(false, "Could not determine product ID for this restock request.", null, 400);
    }

    $prodStmt = $pdo->prepare("SELECT * FROM products WHERE id = ? LIMIT 1 FOR UPDATE");
    $prodStmt->execute([$productId]);
    $product = $prodStmt->fetch(PDO::FETCH_ASSOC);

    if (!$product) {
        $pdo->rollBack();
        sendJsonResponse(false, "Product ID $productId no longer exists in inventory.", null, 404);
    }

    $productName = $product['productName'] ?? $product['name'] ?? ('Product #' . $productId);
    $oldStock = (int)($product['stockQuantity'] ?? $product['stock'] ?? 0);
    $newStock = $oldStock + $actualQty;

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
        $productName . ' | ' . $actualQty . ' units added | Reason: Restock Order #' . $requestId . ' received' . (!empty($expirationDate) ? " (New Batch Expiry: $expirationDate)" : ""),
        $staffName
    ]);

    // Update inventory_change_requests table: status = 'completed', and update quantity/requested_data JSON safely
    // ex. admin changed the quantity approved to a different value than originally requested, so we need to reflect that in the request record
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

    $pdo->commit();
    sendJsonResponse(true, "Restock received successfully! Added to inventory and recorded in transaction history.");

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJsonResponse(false, "Error: " . $e->getMessage(), null, 500);
}