<?php
// POST, auth token
// If no open record today, INSERT clock_in=NOW()
// Error if already clocked in today without clock_out

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require __DIR__ . '/../config/db.php';

// FIXED: Support both JWT token and staff_id authentication - BLACKBOXAI
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
$token = str_replace('Bearer ', '', $authHeader);

// Get JSON body for staff_id method
$rawInput = file_get_contents("php://input");
$jsonData = json_decode($rawInput, true);
$staffIdFromBody = $jsonData['staff_id'] ?? null;

$userId = 0;

// Method 1: JWT token in Authorization header
if ($token) {
    $decoded = base64_decode($token);
    $parts = explode(':', $decoded);
    $userId = (int)($parts[0] ?? 0);
}
// Method 2: staff_id in JSON body (from LoginId.tsx)
elseif ($staffIdFromBody) {
    $stmt = $pdo->prepare("SELECT user_id FROM staff_ids WHERE staff_id = ?");
    $stmt->execute([$staffIdFromBody]);
    $row = $stmt->fetch();
    $userId = $row ? (int)$row['user_id'] : 0;
}

if (!$userId) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Unauthorized."]);
    exit;
}

try {

    $pdo->beginTransaction();

    // Check today status
    $stmt = $pdo->prepare("SELECT id FROM attendance WHERE user_id = ? AND date = CURDATE() AND clock_out IS NULL");
    $stmt->execute([$userId]);
    if ($stmt->fetch()) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "Already clocked in today. Clock out first."]);
        exit;
    }

    // INSERT new
    $stmt = $pdo->prepare("INSERT INTO attendance (user_id, clock_in, date) VALUES (?, NOW(), CURDATE())");
    $stmt->execute([$userId]);
    $recordId = $pdo->lastInsertId();

    $pdo->commit();

    // Return record
    $stmt = $pdo->prepare("SELECT id, clock_in, clock_out, date FROM attendance WHERE id = ?");
    $stmt->execute([$recordId]);
    $record = $stmt->fetch();

// FIXED: Return time_in for frontend display - BLACKBOXAI
    $timeIn = $record['clock_in'] ? date("h:i A", strtotime($record['clock_in'])) : null;
    
    echo json_encode([
        "success" => true,
        "message" => "Clocked IN successfully.",
        "time_in" => $timeIn,
        "record" => $record
    ]);

} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error."]);
}
?>
