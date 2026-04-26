<?php
require __DIR__ . '/../config/db.php'; //database connection (pdo)

//response type json  and allow cross-origin requests from any domain
header("Content-Type: application/json"); 
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");

//handle preflight OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
//get the raw input and decode the json data
$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput);

// DEBUG LINE
if (!$data) {
    echo json_encode([
        "success" => false, 
        "message" => "JSON Decode Failed. Raw input was: " . $rawInput
    ]);
    exit;
}

//validate the input data and check if email and password are provided
if (!$data || !isset($data->email, $data->password)) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request. Email and password are required."
    ]);
    exit;
}

$email = trim($data->email);
$password = $data->password;

try {
    // USER FETCH with staff_id check (LEFT JOIN for SetStaffId flow - BLACKBOXAI)
    $stmt = $pdo->prepare("
        SELECT u.*, s.staff_id, s.avatar as staff_avatar 
        FROM users u 
        LEFT JOIN staff_ids s ON u.id = s.user_id 
        WHERE u.email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])){

        // Token Generation For User Session
        $tokenData = $user['id'] . ':'  .time();
        $token = base64_encode($tokenData); // User Data Encryption

        echo json_encode([
            "success" => true,
            "token" => $token, // Token Response to Frontend
            "user" => [
                'id' => $user['id'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'role' => $user['role'],
                'hasStaffId' => !empty($user['staff_id']), // New: true if staff_id set
                'staff_id' => $user['staff_id'] ?? null,
                'staff_avatar' => $user['staff_avatar'] ?? null
            ]
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Invalid email or password."
        ]);
    }
// Catch Database Error for Specific Debugging problems - always use this!
} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>