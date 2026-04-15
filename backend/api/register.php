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

if (!$data || json_last_error() !== JSON_ERROR_NONE || !isset($data->first_name, $data->last_name, $data->email, $data->password)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid request. All fields are required."
    ]);
    exit;
}

$first_name = trim($data->first_name);
$last_name = trim($data->last_name);
$email = trim($data->email);
$password = password_hash($data->password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)");

if ($stmt->execute([$first_name, $last_name, $email, $password])) {
    echo json_encode(["success" => true]);
} else {
    echo json_encode(["success" => false]);
}
?>