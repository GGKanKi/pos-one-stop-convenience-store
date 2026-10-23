<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
    exit;
}

require __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

try {
    $user = requireAuthUser($pdo);
    if ($user['role'] !== 'staff') sendJsonResponse(false, 'Staff access required.', null, 403);
    $userId = (int)$user['id'];

    $stmt = $pdo->prepare("SELECT id, clock_in, clock_out, date FROM attendance WHERE user_id = ? AND date = CURDATE() ORDER BY (clock_out IS NULL) DESC, clock_in DESC, id DESC LIMIT 1");
    $stmt->execute([$userId]);
    $record = $stmt->fetch();
    echo json_encode(["success" => true, "attendance" => $record ?: null]);
} catch (PDOException $e) {
    error_log("Get staff attendance error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Unable to load Staff attendance."]);
}
?>
