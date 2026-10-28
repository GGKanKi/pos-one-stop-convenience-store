<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['success'=>false,'message'=>'Method not allowed.']); exit; }
require __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

try {
    $user = requireAuthUser($pdo);
    if (!in_array($user['role'], ['cashier', 'staff'], true)) sendJsonResponse(false, 'Cashier access required.', null, 403);
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) throw new InvalidArgumentException('Invalid register request.');
    $action = $data['action'] ?? '';
    $amount = filter_var($data['amount'] ?? null, FILTER_VALIDATE_FLOAT);
    if (!in_array($action, ['open', 'close'], true) || $amount === false || $amount < 0 || $amount > 99999999.99) {
        throw new InvalidArgumentException('Enter a valid cash count.');
    }

    $pdo->beginTransaction();
    $lock = $pdo->prepare('SELECT id FROM users WHERE id = ? FOR UPDATE');
    $lock->execute([(int)$user['id']]);
    if (!$lock->fetchColumn()) throw new RuntimeException('Signed-in user was not found.');
    $find = $pdo->prepare('SELECT id FROM cash_register_sessions WHERE user_id = ? AND closed_at IS NULL ORDER BY id DESC LIMIT 1 FOR UPDATE');
    $find->execute([(int)$user['id']]);
    $sessionId = $find->fetchColumn();

    if ($action === 'open') {
        if ($sessionId) {
            $pdo->commit();
            echo json_encode(['success'=>true, 'message'=>'Register is already open.', 'session_id'=>(int)$sessionId]);
            exit;
        }
        $insert = $pdo->prepare('INSERT INTO cash_register_sessions (user_id, opening_amount) VALUES (?, ?)');
        $insert->execute([(int)$user['id'], round($amount, 2)]);
        $sessionId = (int)$pdo->lastInsertId();
    } else {
        if (!$sessionId) throw new InvalidArgumentException('No open cash register session was found.');
        $update = $pdo->prepare('UPDATE cash_register_sessions SET closing_amount = ?, closed_at = NOW() WHERE id = ? AND closed_at IS NULL');
        $update->execute([round($amount, 2), $sessionId]);
    }
    $pdo->commit();
    echo json_encode(['success'=>true, 'message'=>$action === 'open' ? 'Register opened.' : 'Register closed.', 'session_id'=>(int)$sessionId]);
} catch (InvalidArgumentException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(409); echo json_encode(['success'=>false, 'message'=>$e->getMessage()]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('Cash register error: '.$e->getMessage());
    http_response_code(500); echo json_encode(['success'=>false, 'message'=>'Unable to save the cash register count.']);
}
