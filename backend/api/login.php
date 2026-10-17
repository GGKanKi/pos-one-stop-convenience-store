
<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Include required files
$dbPath = realpath(__DIR__ . '/../config/db.php');

$responseHelperPath = realpath(__DIR__ . '/helpers/response.php')
    ?: realpath(__DIR__ . '/../helpers/response.php');

if (!$dbPath || !file_exists($dbPath)) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database config file missing."
    ]);
    exit;
}

if (!$responseHelperPath || !file_exists($responseHelperPath)) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Response helper file missing."
    ]);
    exit;
}

require_once $dbPath;
require_once $responseHelperPath;

// Get request body
$input = getJsonInput();

$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if ($email === '' || $password === '') {
    sendJsonResponse(
        false,
        "Please enter both email and password.",
        null,
        400
    );
    exit;
}

try {
    // 1. Find user by email
    $stmt = $pdo->prepare("
        SELECT id, first_name, last_name, email, password_hash, role
        FROM users
        WHERE email = ?
        LIMIT 1
    ");

    $stmt->execute([$email]);

    // FIX: Fetch the user record
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // 2. Verify user credentials
    if (!$user || !password_verify($password, $user['password_hash'])) {
        sendJsonResponse(
            false,
            "Invalid email or password.",
            null,
            401
        );
        exit;
    }

    // 3. Return user information without the password hash
    unset($user['password_hash']);

    sendJsonResponse(
        true,
        "Login successful.",
        ["user" => $user],
        200
    );

} catch (PDOException $e) {
    error_log("Login database error: " . $e->getMessage());

    sendJsonResponse(
        false,
        "A database error occurred. Please try again.",
        null,
        500
    );
} catch (Throwable $e) {
    error_log("Login error: " . $e->getMessage());

    sendJsonResponse(
        false,
        "An unexpected error occurred. Please try again.",
        null,
        500
    );
}
