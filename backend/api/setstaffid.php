```php
<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load database config and response helper
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

// Read request body
$input = getJsonInput();

$userId = $input['user_id'] ?? null;
$email = trim($input['email'] ?? '');
$staffId = trim($input['staff_id'] ?? $input['staffId'] ?? '');
$avatar = trim($input['avatar'] ?? '/pictures/avatar1.jpg');

// Validate required fields
if (empty($userId) && $email === '') {
    sendJsonResponse(
        false,
        "User ID or email is required.",
        null,
        400
    );
    exit;
}

if ($staffId === '') {
    sendJsonResponse(
        false,
        "Staff ID is required.",
        null,
        400
    );
    exit;
}

try {
    // Resolve user ID using email when user_id is not provided
    if (empty($userId)) {
        $userStmt = $pdo->prepare(
            "SELECT id FROM users WHERE email = ? LIMIT 1"
        );
        $userStmt->execute([$email]);

        $userRow = $userStmt->fetch(PDO::FETCH_ASSOC);

        if (!$userRow) {
            sendJsonResponse(
                false,
                "User account not found.",
                null,
                404
            );
            exit;
        }

        $userId = $userRow['id'];
    }

    // Verify that the user exists
    $userStmt = $pdo->prepare(
        "SELECT id FROM users WHERE id = ? LIMIT 1"
    );
    $userStmt->execute([$userId]);

    if (!$userStmt->fetch(PDO::FETCH_ASSOC)) {
        sendJsonResponse(
            false,
            "User account not found.",
            null,
            404
        );
        exit;
    }

    // Check whether another user already uses this Staff ID
    $checkStmt = $pdo->prepare("
        SELECT user_id
        FROM staff_ids
        WHERE staff_id = ?
          AND user_id != ?
        LIMIT 1
    ");
    $checkStmt->execute([$staffId, $userId]);

    if ($checkStmt->fetch(PDO::FETCH_ASSOC)) {
        sendJsonResponse(
            false,
            "This Staff ID is already registered to another user.",
            null,
            409
        );
        exit;
    }

    // Insert or update the staff_ids record
    $stmt = $pdo->prepare("
        INSERT INTO staff_ids (user_id, staff_id, avatar)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            staff_id = VALUES(staff_id),
            avatar = VALUES(avatar)
    ");

    $stmt->execute([$userId, $staffId, $avatar]);

    sendJsonResponse(
        true,
        "Profile saved successfully!",
        [
            "user_id" => $userId,
            "staff_id" => $staffId,
            "avatar" => $avatar
        ],
        200
    );

} catch (PDOException $e) {
    error_log("Set Staff ID Error: " . $e->getMessage());

    sendJsonResponse(
        false,
        "Unable to save the staff profile.",
        null,
        500
    );
}

?>
```