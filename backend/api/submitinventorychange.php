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

$action = $input['action'] ?? $input['action_type'] ?? '';
$payload = $input['product'] ?? $input['requested_data'] ?? null;

if (!in_array($action, ['add', 'update', 'restock'], true) || !is_array($payload)) {
    sendJsonResponse(false, "Invalid inventory change request format.", null, 400);
}

try {
    // Attempt standard authentication, fall back to payload actor if session token is missing
    $requester = null;
    try {
        $requester = requireAuthUser($pdo);
    } catch (Throwable $authErr) {
        $actorPayload = $payload['actor'] ?? $input['actor'] ?? null;
        if (is_array($actorPayload) && !empty($actorPayload['id'])) {
            $requester = [
                'id' => (int)$actorPayload['id'],
                'first_name' => $actorPayload['name'] ?? 'Staff',
                'last_name' => '',
                'role' => $actorPayload['role'] ?? 'staff'
            ];
        }
    }

    if (!$requester) {
        sendJsonResponse(false, "Authentication required. Please log in again.", null, 401);
    }

    $requesterId = (int)($requester['id'] ?? 0);
    $requesterName = trim(($requester['first_name'] ?? '') . ' ' . ($requester['last_name'] ?? '')) ?: 'Staff';

    $productId = null;
    $productName = trim((string)($payload['productName'] ?? $payload['name'] ?? ''));
    $before = null;

    if ($action === 'update' || $action === 'restock') {
        $productId = filter_var($payload['id'] ?? $payload['product_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$productId || $productId < 1) {
            sendJsonResponse(false, "A valid product ID is required for $action requests.", null, 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ? LIMIT 1");
        $stmt->execute([$productId]);
        $before = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$before) {
            sendJsonResponse(false, "Product not found.", null, 404);
        }

        if (empty($productName)) {
            $productName = trim((string)($before['productName'] ?? $before['name'] ?? ''));
        }

        $before['expiryBatches'] = json_decode((string)($before['expiry_batches'] ?? '[]'), true) ?: [];
        unset($before['expiry_batches']);
    }

    // Preserve stock change reason
    $stockReason = $payload['stockChangeReason'] ?? $payload['reason'] ?? $payload['stock_change_reason'] ?? null;
    if ($stockReason !== null) {
        $payload['stockChangeReason'] = trim((string)$stockReason);
    }

    // Clean payload metadata before storing as requested_data JSON
    $cleanPayload = $payload;
    unset($cleanPayload['actor']);

    // Check table columns dynamically
    $columnsStmt = $pdo->query("SHOW COLUMNS FROM inventory_change_requests");
    $existingColumns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN);

    $insertFields = ['action_type', 'product_id', 'before_data', 'requested_data', 'status', 'created_at'];
    $insertValues = [
        $action, 
        $productId, 
        $before === null ? null : json_encode($before, JSON_THROW_ON_ERROR), 
        json_encode($cleanPayload, JSON_THROW_ON_ERROR), 
        'pending', 
        date('Y-m-d H:i:s')
    ];

    if (in_array('requested_by', $existingColumns, true)) {
        $insertFields[] = 'requested_by';
        $insertValues[] = $requesterId;
    }
    if (in_array('product_name', $existingColumns, true)) {
        $insertFields[] = 'product_name';
        $insertValues[] = $productName;
    }
    if (in_array('user_id', $existingColumns, true)) {
        $insertFields[] = 'user_id';
        $insertValues[] = $requesterId;
    }
    if (in_array('user_name', $existingColumns, true)) {
        $insertFields[] = 'user_name';
        $insertValues[] = $requesterName;
    }

    $fieldList = implode(', ', $insertFields);
    $placeholders = implode(', ', array_fill(0, count($insertFields), '?'));

    $insert = $pdo->prepare("INSERT INTO inventory_change_requests ($fieldList) VALUES ($placeholders)");
    $insert->execute($insertValues);

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