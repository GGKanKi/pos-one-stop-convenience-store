<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';
if ($_SERVER['REQUEST_METHOD'] !== 'GET') sendJsonResponse(false, "Method not allowed.", null, 405);
try {
    $admin = requireAuthUser($pdo);
    if ($admin['role'] !== 'admin') sendJsonResponse(false, "Admin access required.", null, 403);
    $stmt = $pdo->query("SELECT r.id, r.action_type, r.product_id, r.requested_by, r.before_data, r.requested_data, r.status, r.review_note, r.created_at, u.staff_id, u.first_name, u.last_name
        FROM inventory_change_requests r JOIN users u ON u.id = r.requested_by
        WHERE r.status = 'pending' ORDER BY r.created_at ASC");
    $requests = $stmt->fetchAll();
    foreach ($requests as &$request) {
        $request['before_data'] = $request['before_data'] ? json_decode($request['before_data'], true) : null;
        $request['requested_data'] = json_decode($request['requested_data'], true) ?: [];
    }
    unset($request);
    sendJsonResponse(true, "Pending inventory changes loaded.", ["requests" => $requests]);
} catch (Throwable $e) {
    error_log("Get inventory changes error: " . $e->getMessage());
    sendJsonResponse(false, "Unable to load pending inventory changes.", null, 500);
}
