<?php
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


require __DIR__ . '/../config/db.php'; //database connection (pdo)


//get the raw input and decode the json data
$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput);

if (!$data || json_last_error() !== JSON_ERROR_NONE || !isset($data->first_name, $data->last_name, $data->email, $data->password_hash)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid request. All fields are required."
    ]);
    exit;
}

try {
    $first_name = trim($data->first_name);
    $last_name = trim($data->last_name);
    $email = trim($data->email);
    $password_hash = password_hash($data->password_hash, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, email, password_hash, role) VALUES (?, ?, ?, ?, 'staff')");

    if ($stmt->execute([$first_name, $last_name, $email, $password_hash])) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false]);
    }

} catch (PDOException $e) {
    if ($e->getCode() == 23000) {
            echo json_encode(["success" => false, "message" => "Email already registered!"]);
        } else {
            echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
        }
    exit;
} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "An unexpected error occurred."]);
    exit;
}


?>

