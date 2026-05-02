<?php
// MARK: NEW FILE - Backend API for SetStaffId feature
// Allows staff to set unique 6-char staffId + avatar after login
// Payload: POST JSON {email, staffId (6 alphanum), avatar}
// Response: {success, message, user data} or error

// Standard headers: JSON + CORS
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");

// Handle preflight OPTIONS for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require __DIR__ . '/../config/db.php'; // PDO connection

// Get raw JSON input
$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput, true); // Assoc array

// Validate required fields
if (!$data || !isset($data['email']) || !isset($data['staffId']) || !isset($data['avatar'])) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid request. Requires email, staffId (6 chars), avatar."
    ]);
    exit;
}

$email = trim($data['email']);
$staffId = strtoupper(trim(preg_replace('/[^A-Z0-9]/', '', $data['staffId']))); // Clean/upper alphanum
$avatar = trim($data['avatar']);

// Additional validation
if (strlen($staffId) !== 6 || !preg_match('/^[A-Z0-9]{6}$/', $staffId)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "staffId must be exactly 6 alphanumeric characters."
    ]);
    exit;
}

// Allowed avatars (from frontend)
$allowedAvatars = ['/pictures/avatar1.jpg', '/pictures/avatar2.jpg', '/pictures/avatar3.jpg', '/pictures/avatar4.jpg'];

// Validate avatar - either a local path or a URL
$isValidUrl = filter_var($avatar, FILTER_VALIDATE_URL) !== false;
$isAllowedAvatar = in_array($avatar, $allowedAvatars);

if (!$isValidUrl && !$isAllowedAvatar) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid avatar. Must be one of the allowed profile pictures."
    ]);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Find user by email + staff role
    $stmt = $pdo->prepare("SELECT id, first_name, last_name FROM users WHERE email = ? AND role = 'staff'");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "Staff user not found with this email."
        ]);
        exit;
    }

    $userId = $user['id'];

    // 2. Check if staff_id already taken (unique check)
    $stmt = $pdo->prepare("SELECT user_id FROM staff_ids WHERE staff_id = ?");
    $stmt->execute([$staffId]);
    if ($stmt->fetch()) {
        $pdo->rollBack();
        http_response_code(409); // Conflict
        echo json_encode([
            "success" => false,
            "message" => "Staff ID already assigned to another user."
        ]);
        exit;
    }

    // 3. Check if user already has staff_id (prevent duplicate)
    $stmt = $pdo->prepare("SELECT id FROM staff_ids WHERE user_id = ?");
    $stmt->execute([$userId]);
    if ($stmt->fetch()) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode([
            "success" => false,
            "message" => "Staff ID already set for this user."
        ]);
        exit;
    }

    // 4. Insert into staff_ids
    $stmt = $pdo->prepare("INSERT INTO staff_ids (user_id, staff_id, avatar) VALUES (?, ?, ?)");
    $stmt->execute([$userId, $staffId, $avatar]);

    $pdo->commit();

    // Success response with user data
    echo json_encode([
        "success" => true,
        "message" => "Staff ID set successfully.",
        "user" => [
            'id' => $userId,
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'staff_id' => $staffId,
            'avatar' => $avatar
        ]
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>

