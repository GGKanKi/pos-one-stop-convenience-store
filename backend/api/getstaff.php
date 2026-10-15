<?php
// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Fail-safe file loading for helpers and db config
$dbPath = realpath(__DIR__ . '/../config/db.php');
$responseHelperPath = realpath(__DIR__ . '/helpers/response.php') 
                   ?: realpath(__DIR__ . '/../helpers/response.php');

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

// Get request body
$input = getJsonInput();

$userId  = $input['user_id'] ?? null;
$email   = trim($input['email'] ?? '');
$staffId = trim($input['staff_id'] ?? '');
$avatar  = trim($input['avatar'] ?? '/pictures/avatar1.jpg');

// If user_id is missing from request body, look up user_id using email
if (empty($userId) && !empty($email)) {
    try {
        $userStmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $userStmt->execute([$email]);
        $userRow = $userStmt->fetch(PDO::FETCH_ASSOC);
        if ($userRow) {
            $userId = $userRow['id'];
        }
    } catch (PDOException $e) {
        sendJsonResponse(false, "Failed to resolve user account.", null, 500);
    }
}

if (empty($userId) || empty($staffId)) {
    sendJsonResponse(false, "User ID / Email and Staff ID are required.", null, 400);
}

try {
    // 1. Check if the staff_id is already claimed by another user
    $checkStmt = $pdo->prepare("SELECT user_id FROM staff_ids WHERE staff_id = ? AND user_id != ?");
    $checkStmt->execute([$staffId, $userId]);
    
    if ($checkStmt->fetch()) {
        sendJsonResponse(false, "This Staff ID is already registered to another account.", null, 400);
    }

    // 2. Insert or update record in staff_ids table matching HeidiSQL columns (user_id, staff_id, avatar)
    $stmt = $pdo->prepare("
        INSERT INTO staff_ids (user_id, staff_id, avatar) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            staff_id = VALUES(staff_id), 
            avatar = VALUES(avatar)
    ");
    
    if ($stmt->execute([$userId, $staffId, $avatar])) {
        sendJsonResponse(true, "Profile saved successfully!", [
            "staff_id" => $staffId,
            "avatar"   => $avatar
        ], 200);
    } else {
        sendJsonResponse(false, "Failed to save profile.", null, 500);
    }

} catch (PDOException $e) {
    error_log("Set Staff ID Error: " . $e->getMessage());
    sendJsonResponse(false, "Database query error: " . $e->getMessage(), null, 500);
}
?>