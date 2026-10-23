<?php

/** Issue an opaque bearer token and store only its hash. */
function createAuthSession(PDO $pdo, int $userId): string
{
    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $stmt = $pdo->prepare("INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 12 HOUR))");
    $stmt->execute([$userId, $tokenHash]);

    // Opportunistically remove expired sessions.
    $pdo->exec("DELETE FROM auth_sessions WHERE expires_at <= NOW()");
    return $token;
}

/** Return the account represented by this request's bearer token. */
function requireAuthUser(PDO $pdo): array
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($header === '') {
        // Apache/FastCGI setups do not always populate HTTP_AUTHORIZATION.
        $requestHeaders = function_exists('getallheaders') ? getallheaders() : [];
        if (!is_array($requestHeaders)) $requestHeaders = [];
        foreach ($requestHeaders as $name => $value) {
            if (strcasecmp((string)$name, 'Authorization') === 0) {
                $header = (string)$value;
                break;
            }
        }
    }
    if (!preg_match('/^Bearer\s+([a-f0-9]{64})$/i', trim($header), $matches)) {
        sendJsonResponse(false, 'Sign in again to continue.', null, 401);
    }

    $stmt = $pdo->prepare("SELECT u.id, u.first_name, u.last_name, u.email, u.role
        FROM auth_sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > NOW() LIMIT 1");
    $stmt->execute([hash('sha256', $matches[1])]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) sendJsonResponse(false, 'Your session is invalid or expired. Sign in again.', null, 401);
    return $user;
}
