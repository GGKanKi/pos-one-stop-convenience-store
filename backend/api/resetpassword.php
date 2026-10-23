<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') sendJsonResponse(false, "Method not allowed.", null, 405);
$input = getJsonInput();
$token = trim($input['token'] ?? '');
$password = $input['password'] ?? '';
if (!preg_match('/^[a-f0-9]{64}$/i', $token)) sendJsonResponse(false, "This reset link is invalid or has expired.", null, 400);
if (!is_string($password) || strlen($password) < 8) sendJsonResponse(false, "Password must be at least 8 characters.", null, 400);

try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("SELECT id, user_id FROM password_reset_tokens WHERE token_hash = ? AND expires_at > NOW() LIMIT 1 FOR UPDATE");
    $stmt->execute([hash('sha256', $token)]);
    $reset = $stmt->fetch();
    if (!$reset) {
        $pdo->rollBack();
        sendJsonResponse(false, "This reset link is invalid or has expired.", null, 400);
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $updateUser = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    $updateUser->execute([$hash, $reset['user_id']]);
    if ($updateUser->rowCount() !== 1) {
        throw new RuntimeException("Password reset did not update exactly one user.");
    }
    $verify = $pdo->prepare("SELECT password_hash FROM users WHERE id = ? LIMIT 1");
    $verify->execute([$reset['user_id']]);
    if (!password_verify($password, (string) $verify->fetchColumn())) {
        throw new RuntimeException("Password reset hash verification failed after update.");
    }
    $pdo->prepare("DELETE FROM password_reset_tokens WHERE user_id = ?")->execute([$reset['user_id']]);
    $pdo->prepare("DELETE FROM auth_sessions WHERE user_id = ?")->execute([$reset['user_id']]);
    $pdo->commit();
    sendJsonResponse(true, "Password updated. You can now sign in.");
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("Password reset failed: " . $e->getMessage());
    sendJsonResponse(false, "Unable to reset the password right now.", null, 500);
}
