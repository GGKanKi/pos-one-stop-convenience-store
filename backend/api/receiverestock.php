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
$actualQty = filter_var($input['actual_qty'] ?? null, FILTER_VALIDATE_INT);
$expirationDate = trim((string)($input['expiration_date'] ?? ''));
$staffName = trim((string)($input['staff_name'] ?? 'Staff'));

if (!$requestId || $actualQty === false || $actualQty <= 0) {
    sendJsonResponse(false, "Valid request ID and received quantity are required.", null, 400);
}

try {
    $pdo->beginTransaction();

    $reqStmt = $pdo->prepare("SELECT * FROM inventory_change_requests WHERE id = ? AND status = 'approved' LIMIT 1 FOR UPDATE");
    $reqStmt->execute([$requestId]);
    $request = $reqStmt->fetch(PDO::FETCH_ASSOC);

    if (!$request) {
        $pdo->rollBack();
        sendJsonResponse(false, "Approved restock order not found or already received.", null, 404);
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

    // Push new batch row as a separate entry
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

    $completeStmt = $pdo->prepare("UPDATE inventory_change_requests SET status = 'completed' WHERE id = ?");
    $completeStmt->execute([$requestId]);

    $pdo->commit();
    sendJsonResponse(true, "Restock received successfully! Added to inventory and recorded in transaction history.");

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    sendJsonResponse(false, "Error: " . $e->getMessage(), null, 500);
}