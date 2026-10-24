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

$data = json_decode(file_get_contents('php://input'), true);

$productId = $data['product_id'] ?? null;
$productName = $data['product_name'] ?? null;
$requestedQty = $data['quantity'] ?? null;
$userName = $data['user_name'] ?? 'Staff';

if (!$productId || !$requestedQty) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Product and quantity are required.']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO inventory_change_requests (product_id, product_name, quantity_change, reason, status, user_name, created_at)
        VALUES (?, ?, ?, 'Restock Request', 'pending', ?, NOW())
    ");
    $stmt->execute([$productId, $productName, $requestedQty, $userName]);

    echo json_encode(['success' => true, 'message' => 'Restock request submitted successfully.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB Error: ' . $e->getMessage()]);
}