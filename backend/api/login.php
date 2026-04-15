<?php
require __DIR__ . '/../config/db.php'; //database connection (pdo)

//response type json  and allow cross-origin requests from any domain
header("Content-Type: application/json"); 
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");

//handle preflight OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
//get the raw input and decode the json data
$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput);

//validate the input data and check if email and password are provided
if (!$data || json_last_error() !== JSON_ERROR_NONE || !isset($data->email, $data->password)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid request. Email and password are required."
    ]);
    exit;
}

$email = trim($data->email);
$password = $data->password;
$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$email]);

$user = $stmt->fetch();

if ($user && password_verify($password, $user['password'])) {
    echo json_encode([
        "success" => true,
        "user" => [
            "id" => $user['id'],
            "first_name" => $user['first_name']
        ]
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Invalid email or password"
    ]);
}
?>