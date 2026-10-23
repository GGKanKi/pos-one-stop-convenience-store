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
$email = trim($input['email'] ?? '');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) sendJsonResponse(false, "Enter a valid email address.", null, 400);

try {
    $stmt = $pdo->prepare("SELECT id, first_name FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if ($user) {
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $pdo->beginTransaction();
        $pdo->prepare("DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at < NOW()")->execute([$user['id']]);
        $pdo->prepare("INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))")
            ->execute([$user['id'], $tokenHash]);
        $pdo->commit();

        $appUrl = rtrim(getenv('APP_URL') ?: 'http://localhost:5173', '/');
        $resetUrl = $appUrl . '/reset-password?token=' . rawurlencode($token);
        $subject = 'Reset your One Stop Convenience Store password';
        $message = "Hello {$user['first_name']},\n\nUse the link below to choose a new password. This link expires in one hour and can only be used once.\n\n{$resetUrl}\n\nIf you did not request this, you can ignore this email.";
        $from = getenv('PASSWORD_RESET_FROM') ?: 'no-reply@localhost';
        // Laragon's bundled Mailpit captures local mail on port 1025. Runtime
        // settings keep the app working without editing the PHP installation.
        if (PHP_OS_FAMILY === 'Windows') {
            ini_set('SMTP', getenv('SMTP_HOST') ?: '127.0.0.1');
            ini_set('smtp_port', getenv('SMTP_PORT') ?: '1025');
            ini_set('sendmail_from', $from);
        }
        if (!@mail($email, $subject, $message, "From: {$from}\r\nContent-Type: text/plain; charset=UTF-8")) {
            $pdo->prepare("DELETE FROM password_reset_tokens WHERE token_hash = ?")->execute([$tokenHash]);
            error_log("Password reset email could not be sent; configure PHP mail transport.");
            sendJsonResponse(false, "We could not send the reset email right now. Please try again later.", null, 503);
        }
    }
    sendJsonResponse(true, "If an account exists for that email, a password reset link has been sent.");
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("Password reset request failed: " . $e->getMessage());
    sendJsonResponse(false, "Unable to process the request right now.", null, 500);
}
