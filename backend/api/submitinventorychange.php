<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') sendJsonResponse(false, "Method not allowed.", null, 405);

$input = getJsonInput();
$action = $input['action'] ?? '';
$payload = $input['product'] ?? null;
if (!in_array($action, ['add', 'update'], true) || !is_array($payload)) {
    sendJsonResponse(false, "Invalid inventory change request.", null, 400);
}

try {
    $requester = requireAuthUser($pdo);
    if ($requester['role'] !== 'staff') sendJsonResponse(false, "Only Staff accounts can submit inventory changes for approval.", null, 403);
    $requesterId = (int)$requester['id'];

    $productId = null;
    $before = null;
    if ($action === 'update') {
        $productId = filter_var($payload['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$productId || $productId < 1) sendJsonResponse(false, "A valid product ID is required.", null, 400);
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ? LIMIT 1");
        $stmt->execute([$productId]);
        $before = $stmt->fetch();
        if (!$before) sendJsonResponse(false, "Product not found.", null, 404);
        $before['expiryBatches'] = json_decode((string)($before['expiry_batches'] ?? '[]'), true) ?: [];
        unset($before['expiry_batches']);
    }
    unset($payload['actor']);
    $insert = $pdo->prepare("INSERT INTO inventory_change_requests (action_type, product_id, requested_by, before_data, requested_data) VALUES (?, ?, ?, ?, ?)");
    $insert->execute([
        $action,
        $productId,
        $requesterId,
        $before === null ? null : json_encode($before, JSON_THROW_ON_ERROR),
        json_encode($payload, JSON_THROW_ON_ERROR),
    ]);
    sendJsonResponse(true, "Your inventory change was submitted for Admin approval.", ["request_id" => (int)$pdo->lastInsertId()], 201);
} catch (Throwable $e) {
    error_log("Submit inventory change error: " . $e->getMessage());
    sendJsonResponse(false, "Unable to submit the inventory change.", null, 500);
}
