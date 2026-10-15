<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';

$input = getJsonInput();

$firstName = trim($input['first_name'] ?? '');
$lastName  = trim($input['last_name'] ?? '');
$email     = trim($input['email'] ?? '');
$password  = $input['password'] ?? '';

if (empty($firstName) || empty($lastName) || empty($email) || empty($password)) {
    sendJsonResponse(false, "All fields are required.", null, 400);
}

try {
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("
        INSERT INTO users (first_name, last_name, email, password_hash, role) 
        VALUES (?, ?, ?, ?, 'staff')
    ");

    if ($stmt->execute([$firstName, $lastName, $email, $passwordHash])) {
        sendJsonResponse(true, "Registration successful.", null, 201);
    } else {
        sendJsonResponse(false, "Failed to create account.", null, 500);
    }

} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
        sendJsonResponse(false, "This email is already registered.", null, 409);
    } else {
        error_log("Registration DB Error: " . $e->getMessage());
        sendJsonResponse(false, "Database error occurred.", null, 500);
    }
}
?>