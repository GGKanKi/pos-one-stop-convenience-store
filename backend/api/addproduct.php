<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

require __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';
$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON request.']);
    exit;
}

$required = ['productName', 'barcode', 'costPrice', 'sellingPrice', 'category'];
foreach ($required as $field) {
    if (!isset($data[$field]) || trim((string)$data[$field]) === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Required field missing: ' . $field]);
        exit;
    }
}

$productName = trim((string)$data['productName']);
$barcode = trim((string)$data['barcode']);
$category = trim((string)$data['category']);
$stockQuantity = 0;
$costPrice = filter_var($data['costPrice'], FILTER_VALIDATE_FLOAT);
$sellingPrice = filter_var($data['sellingPrice'], FILTER_VALIDATE_FLOAT);
$threshold = isset($data['threshold']) && $data['threshold'] !== ''
    ? filter_var($data['threshold'], FILTER_VALIDATE_INT)
    : 5;

// Parse ceiling value (default to 100 if not provided or invalid)
$ceiling = isset($data['ceiling']) && $data['ceiling'] !== ''
    ? filter_var($data['ceiling'], FILTER_VALIDATE_INT)
    : 100;

if ($productName === '' || $barcode === '' || $category === '' ||
    $costPrice === false || $costPrice < 0 ||
    $sellingPrice === false || $sellingPrice < 0 ||
    $threshold === false || $threshold < 0 ||
    $ceiling === false || $ceiling < 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Product fields must contain valid non-negative values.']);
    exit;
}

$expirationDate = null;
$expiryBatches = [];
$authenticatedUser = requireAuthUser($pdo);
if ($authenticatedUser['role'] !== 'admin') sendJsonResponse(false, 'Admin access required.', null, 403);
$actorId = (int)$authenticatedUser['id'];
$actorName = trim($authenticatedUser['first_name'] . ' ' . $authenticatedUser['last_name']);

try {
    $pdo->beginTransaction();

    $insert = $pdo->prepare(
        'INSERT INTO products (productName, barcode, description, stockQuantity, costPrice, sellingPrice, category, supplier, expirationDate, expiry_batches, threshold, ceiling)
         VALUES (:productName, :barcode, :description, :stockQuantity, :costPrice, :sellingPrice, :category, :supplier, :expirationDate, :expiryBatches, :threshold, :ceiling)'
    );
    $insert->execute([
        ':productName' => $productName,
        ':barcode' => $barcode,
        ':description' => trim((string)($data['description'] ?? '')) ?: null,
        ':stockQuantity' => $stockQuantity,
        ':costPrice' => $costPrice,
        ':sellingPrice' => $sellingPrice,
        ':category' => $category,
        ':supplier' => trim((string)($data['supplier'] ?? '')) ?: null,
        ':expirationDate' => $expirationDate,
        ':expiryBatches' => json_encode($expiryBatches, JSON_THROW_ON_ERROR),
        ':threshold' => $threshold,
        ':ceiling' => $ceiling,
    ]);
    $productId = (int)$pdo->lastInsertId();

    // Keep product creation and its opening-stock audit in one transaction.
    $audit = $pdo->prepare(
        'INSERT INTO inventory_audit (action_type, product_id, product_name, after_data, quantity_change, user_id, user_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $audit->execute([
        'Added New Product',
        $productId,
        $productName,
        json_encode(['stockQuantity' => $stockQuantity, 'barcode' => $barcode, 'ceiling' => $ceiling], JSON_THROW_ON_ERROR),
        $stockQuantity,
        $actorId,
        $actorName,
    ]);

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => 'Product added successfully.', 'id' => $productId]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'That barcode already exists. Please use a unique barcode.']);
    } else {
        error_log('Add product error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Unable to save the product.']);
    }
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Add product error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to save the product.']);
}
