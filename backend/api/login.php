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
$responseHelperPath = realpath(__DIR__ . '/helpers/response.php') ?: realpath(__DIR__ . '/../helpers/response.php');

if (!$dbPath || !file_exists($dbPath)) {
    echo json_encode(["success" => false, "message" => "Database config file missing."]);
    exit;
}

if (!$responseHelperPath || !file_exists($responseHelperPath)) {
    echo json_encode(["success" => false, "message" => "Response helper file missing."]);
    exit;
}

require_once $dbPath;
require_once $responseHelperPath;

$input = getJsonInput();

$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if (empty($email) || empty($password)) {
    sendJsonResponse(false, "Please enter both email and password.", null, 400);
}

try {
    // 1. Query users table 
    $stmt = $pdo->prepare("
        SELECT id, first_name, last_name, email, password_hash, role 
        FROM users 
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // 2. Verify Bcrypt hash
    if ($user && password_verify($password, $user['password_hash'])) {
        
        $staffInfo = null;

        // 3. Query staff_ids table using exact column name 'avatar'
        try {
            $staffStmt = $pdo->prepare("
                SELECT staff_id, avatar 
                FROM staff_ids 
                WHERE user_id = ? 
                LIMIT 1
            ");
            $staffStmt->execute([$user['id']]);
            $staffInfo = $staffStmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log("Staff ID fetch error: " . $e->getMessage());
        }

        $token = base64_encode($user['id'] . ':' . time());

        $responseData = [
            "token" => $token,
            "user" => [
                'id' => $user['id'],
                'first_name' => $user['first_name'],
                'last_name' => $user['last_name'],
                'role' => $user['role'],
                'hasStaffId' => !empty($staffInfo['staff_id']),
                'staff_id' => $staffInfo['staff_id'] ?? null,
                'staff_avatar' => $staffInfo['avatar'] ?? null
            ]
        ];

        sendJsonResponse(true, "Login successful.", $responseData, 200);

    } else {
        sendJsonResponse(false, "Invalid email or password.", null, 401);
    }

} catch (PDOException $e) {
    error_log("Login DB Error: " . $e->getMessage());
    sendJsonResponse(false, "Database connection or query error.", null, 500);
}
?>