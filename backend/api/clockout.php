
<?php
// POST, auth token
// UPDATE today's open record clock_out=NOW()

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

    // Find today's open record
    $stmt = $pdo->prepare("SELECT id FROM attendance WHERE user_id = ? AND date = CURDATE() AND clock_out IS NULL");
    $stmt->execute([$userId]);
    $record = $stmt->fetch();

    if (!$record) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "No open clock-in today. Clock in first."]);
        exit;
    }

    $recordId = $record['id'];

    // UPDATE clock_out
    $stmt = $pdo->prepare("UPDATE attendance SET clock_out = NOW() WHERE id = ?");
    $stmt->execute([$recordId]);

    $pdo->commit();

    // Return record
    $stmt = $pdo->prepare("SELECT id, clock_in, clock_out, date FROM attendance WHERE id = ?");
    $stmt->execute([$recordId]);
    $updatedRecord = $stmt->fetch();

    echo json_encode([
        "success" => true,
        "message" => "Clocked OUT successfully.",
        "record" => $updatedRecord
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

