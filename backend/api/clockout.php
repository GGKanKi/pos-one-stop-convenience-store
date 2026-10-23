
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
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

try {
    $user = requireAuthUser($pdo);
    if (!in_array($user['role'], ['cashier', 'staff'], true)) {
        sendJsonResponse(false, 'Cashier or Staff access required.', null, 403);
    }
    $userId = (int)$user['id'];

    $pdo->beginTransaction();

    // Lock the user row so a concurrent clock-in cannot race this clock-out.
    $userLock = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role IN ('cashier', 'staff') FOR UPDATE");
    $userLock->execute([$userId]);
    if (!$userLock->fetchColumn()) {
        $pdo->rollBack();
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Unauthorized."]);
        exit;
    }

    // Close every open row for today in case older duplicate sessions exist.
    $stmt = $pdo->prepare("UPDATE attendance SET clock_out = NOW() WHERE user_id = ? AND date = CURDATE() AND clock_out IS NULL");
    $stmt->execute([$userId]);
    if ($stmt->rowCount() === 0) {
        $pdo->rollBack();
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "No open clock-in today. Clock in first."]);
        exit;
    }

    $pdo->commit();

    // Return the latest attendance row after closing the open shift(s).
    $stmt = $pdo->prepare("SELECT id, clock_in, clock_out, date FROM attendance WHERE user_id = ? AND date = CURDATE() ORDER BY id DESC LIMIT 1");
    $stmt->execute([$userId]);
    $updatedRecord = $stmt->fetch();

    echo json_encode([
        "success" => true,
        "message" => "Clocked OUT successfully.",
        "record" => $updatedRecord
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error."]);
}
?>

