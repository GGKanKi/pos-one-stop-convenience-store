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
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

try {
    $user = requireAuthUser($pdo);
    if (!in_array($user['role'], ['cashier', 'staff'], true)) {
        sendJsonResponse(false, 'Cashier or Staff access required.', null, 403);
    }
    $userId = (int)$user['id'];

    $pdo->beginTransaction();

    // Serialize clock-ins per employee so two POS tabs cannot create parallel shifts.
    $userLock = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role IN ('cashier', 'staff') FOR UPDATE");
    $userLock->execute([$userId]);
    if (!$userLock->fetchColumn()) {
        $pdo->rollBack();
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Unauthorized."]);
        exit;
    }

    // Reuse an existing open shift if POS is revisited during the same day.
    $stmt = $pdo->prepare("SELECT id, clock_in, clock_out, date FROM attendance WHERE user_id = ? AND date = CURDATE() AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1");
    $stmt->execute([$userId]);
    $existingRecord = $stmt->fetch();
    if ($existingRecord) {
        $pdo->commit();
        echo json_encode([
            "success" => true,
            "message" => "Already clocked in today.",
            "already_clocked_in" => true,
            "time_in" => date("h:i A", strtotime($existingRecord['clock_in'])),
            "record" => $existingRecord
        ]);
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
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error: " . $e->getMessage()]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Server error."]);
}
?>
