<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(0); }
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';

$input = getJsonInput();
$firstName = trim($input['first_name'] ?? '');
$lastName = trim($input['last_name'] ?? '');
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';
if ($firstName === '' || $lastName === '' || $email === '' || $password === '') {
    sendJsonResponse(false, "All fields are required.", null, 400);
}

try {
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $hireDate = date('Y-m-d');
    $period = date('my', strtotime($hireDate));
    $insert = $pdo->prepare("INSERT INTO users (first_name, last_name, email, password_hash, role, staff_id, hire_date) VALUES (?, ?, ?, ?, 'cashier', ?, ?)");

    for ($attempt = 0; $attempt < 20; $attempt++) {
        $staffId = 'OS-' . $period . '-' . str_pad((string) random_int(0, 99), 2, '0', STR_PAD_LEFT);
        $check = $pdo->prepare("SELECT 1 FROM users WHERE staff_id = ? LIMIT 1");
        $check->execute([$staffId]);
        if ($check->fetchColumn()) continue;

        try {
            $insert->execute([$firstName, $lastName, $email, $passwordHash, $staffId, $hireDate]);
            sendJsonResponse(true, "Registration successful.", ["staff_id" => $staffId], 201);
            exit;
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                $emailCheck = $pdo->prepare("SELECT 1 FROM users WHERE email = ? LIMIT 1");
                $emailCheck->execute([$email]);
                if ($emailCheck->fetchColumn()) {
                    sendJsonResponse(false, "This email is already registered.", null, 409);
                    exit;
                }
                // A concurrent registration may have claimed this random ID; choose another.
                continue;
            }
            throw $e;
        }
    }
    sendJsonResponse(false, "Could not generate a unique staff ID. Please try again.", null, 500);
} catch (PDOException $e) {
    error_log("Registration DB Error: " . $e->getMessage());
    sendJsonResponse(false, "Database error occurred.", null, 500);
}
?>
