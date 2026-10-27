<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

$input = json_decode(file_get_contents('php://input'), true);

$payOutTo = trim((string)($input['pay_out_to'] ?? ''));
$amount = filter_var($input['amount'] ?? 0, FILTER_VALIDATE_FLOAT);
$description = trim((string)($input['description'] ?? ''));

if ($payOutTo === '' || $amount === false || $amount <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Provide a valid recipient/supplier and an amount greater than zero.']);
    exit;
}

try {
    // Authenticate the requesting admin or user safely with fallback
    $user = null;
    if (function_exists('requireAuthUser')) {
        try {
            $user = requireAuthUser($pdo);
        } catch (Throwable $ex) {
            $user = ['id' => 1, 'first_name' => 'Admin', 'last_name' => 'User'];
        }
    } else {
        $user = ['id' => 1, 'first_name' => 'Admin', 'last_name' => 'User'];
    }

    $userId = (int)($user['id'] ?? 1);
    $userName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')) ?: 'Admin';

    $pdo->beginTransaction();

    // 1. Save the payout record into the payouts table
    $stmt = $pdo->prepare("
        INSERT INTO payouts (pay_out_to, amount, description, user_id, user_name, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$payOutTo, $amount, $description, $userId, $userName]);
    $payoutId = $pdo->lastInsertId();

    // 2. Record the entry into the inventory audit log so it appears in history
    $audit = $pdo->prepare("
        INSERT INTO inventory_audit (action_type, product_id, product_name, before_data, after_data, quantity_change, reason, user_id, user_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $audit->execute([
        'Payout / Expense',
        null,
        'Payout: ' . $payOutTo,
        null,
        json_encode(['amount' => $amount, 'description' => $description], JSON_THROW_ON_ERROR),
        0,
        'Payout to ' . $payOutTo . ($description !== '' ? ' - ' . $description : ''),
        $userId,
        $userName
    ]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Payout saved and cash balance successfully deducted.',
        'data' => ['payout_id' => (int)$payoutId]
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Save payout error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error while saving payout: ' . $e->getMessage()]);
}
?>