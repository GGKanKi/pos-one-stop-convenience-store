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
$password = $input['password'] ?? '';
if (!is_string($password) || $password === '') sendJsonResponse(false, "Enter a staff password.", null, 400);

try {
    $stmt = $pdo->query("SELECT id, first_name, last_name, email, password_hash FROM users WHERE role = 'staff'");
    foreach ($stmt->fetchAll() as $staffUser) {
        if (password_verify($password, $staffUser['password_hash'])) {
            $staffToken = createAuthSession($pdo, (int)$staffUser['id']);
            unset($staffUser['password_hash']);
            $staffUser['role'] = 'staff';
            sendJsonResponse(true, "Staff verification successful.", ["staff" => $staffUser, "token" => $staffToken]);
        }
    }
    sendJsonResponse(false, "The staff password is incorrect.", null, 401);
} catch (Throwable $e) {
    error_log("Staff password verification failed: " . $e->getMessage());
    sendJsonResponse(false, "Unable to verify staff access right now.", null, 500);
}
