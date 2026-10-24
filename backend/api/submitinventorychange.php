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
$action = $input['action'] ?? '';
$payload = $input['product'] ?? null;

// Allow 'restock' alongside 'add' and 'update'
if (!in_array($action, ['add', 'update', 'restock'], true) || !is_array($payload)) {
    sendJsonResponse(false, "Invalid inventory change request.", null, 400);
}

try {
    $requester = requireAuthUser($pdo);
    
    // Allow both staff and admin/manager users to submit requests
    $allowedRoles = ['staff', 'admin', 'manager'];
    if (!in_array(strtolower($requester['role'] ?? ''), $allowedRoles, true)) {
        sendJsonResponse(false, "Unauthorized role to submit inventory changes.", null, 403);
    }
    
    $requesterId = (int)$requester['id'];

    $productId = null;
    $before = null;

    // For updates and restock requests, validate that the product exists in the DB
    if ($action === 'update' || $action === 'restock') {
        $productId = filter_var($payload['id'] ?? null, FILTER_VALIDATE_INT);
        if (!$productId || $productId < 1) {
            sendJsonResponse(false, "A valid product ID is required for $action requests.", null, 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ? LIMIT 1");
        $stmt->execute([$productId]);
        $before = $stmt->fetch();
        
        if (!$before) {
            sendJsonResponse(false, "Product not found.", null, 404);
        }

        $before['expiryBatches'] = json_decode((string)($before['expiry_batches'] ?? '[]'), true) ?: [];
        unset($before['expiry_batches']);
    }

    // ENSURE STOCK CHANGE REASON IS PRESERVED IN THE REQUESTED DATA PAYLOAD
    $stockReason = $payload['stockChangeReason'] ?? $payload['reason'] ?? $payload['stock_change_reason'] ?? null;
    if ($stockReason !== null) {
        $payload['stockChangeReason'] = trim((string)$stockReason);
    }

    // Clean payload metadata before storing as requested_data JSON
    unset($payload['actor']);

    $insert = $pdo->prepare("
        INSERT INTO inventory_change_requests 
        (action_type, product_id, requested_by, before_data, requested_data, created_at) 
        VALUES (?, ?, ?, ?, ?, NOW())
    ");
    
    $insert->execute([
        $action,
        $productId,
        $requesterId,
        $before === null ? null : json_encode($before, JSON_THROW_ON_ERROR),
        json_encode($payload, JSON_THROW_ON_ERROR),
    ]);

    sendJsonResponse(
        true, 
        "Your " . ($action === 'restock' ? "restock request" : "inventory change") . " was submitted for approval.", 
        ["request_id" => (int)$pdo->lastInsertId()], 
        201
    );
} catch (Throwable $e) {
    error_log("Submit inventory change error: " . $e->getMessage());
    sendJsonResponse(false, "Unable to submit the inventory change: " . $e->getMessage(), null, 500);
}