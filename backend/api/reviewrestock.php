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

$requestId = $data['request_id'] ?? null;
$action = $data['action'] ?? null; // 'approve' or 'reject'
$managerName = $data['manager_name'] ?? 'Manager';

if (!$requestId || !in_array($action, ['approve', 'reject'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid request parameters.']);
    exit;
}

$newStatus = ($action === 'approve') ? 'approved' : 'rejected';

try {
    $stmt = $pdo->prepare("
        UPDATE inventory_change_requests 
        SET status = ?, user_name = CONCAT(user_name, ' (Approved by ', ?, ')')
        WHERE id = ?
    ");
    $stmt->execute([$newStatus, $managerName, $requestId]);

    echo json_encode(['success' => true, 'message' => 'Restock request ' . $newStatus . ' successfully.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB Error: ' . $e->getMessage()]);
}