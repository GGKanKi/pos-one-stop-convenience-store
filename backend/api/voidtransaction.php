<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

require __DIR__ . '/../config/db.php';
$data = json_decode(file_get_contents('php://input'), true);
$transactionId = filter_var($data['transaction_id'] ?? null, FILTER_VALIDATE_INT);
$type = $data['type'] ?? '';
$itemId = filter_var($data['item_id'] ?? null, FILTER_VALIDATE_INT);
$reason = trim((string)($data['reason'] ?? ''));
$actor = is_array($data['actor'] ?? null) ? $data['actor'] : [];
$actorId = filter_var($actor['id'] ?? null, FILTER_VALIDATE_INT);
$actorId = $actorId && $actorId > 0 ? $actorId : null;
$actorName = trim((string)($actor['name'] ?? ''));
$actorName = $actorName !== '' ? substr($actorName, 0, 120) : null;

if (!$transactionId || $transactionId < 1 || !in_array($type, ['item', 'invoice'], true) ||
    ($type === 'item' && (!$itemId || $itemId < 1)) || $reason === '' || strlen($reason) > 2000) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'A valid transaction, void type, and reason are required.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Lock the sale first so simultaneous void requests cannot restore its stock twice.
    $findSale = $pdo->prepare('SELECT id, status, total_amount FROM transactions WHERE id = ? FOR UPDATE');
    $findSale->execute([$transactionId]);
    $sale = $findSale->fetch();
    if (!$sale) {
        throw new OutOfBoundsException('Transaction not found.');
    }
    if ($sale['status'] !== 'completed') {
        throw new DomainException('This transaction has already been voided.');
    }

    $findItem = $pdo->prepare(
        'SELECT id, product_id, product_name, quantity, price, discount
         FROM transaction_items WHERE transaction_id = ? AND voided_at IS NULL' .
         ($type === 'item' ? ' AND id = ?' : '') . ' FOR UPDATE'
    );
    $type === 'item' ? $findItem->execute([$transactionId, $itemId]) : $findItem->execute([$transactionId]);
    $items = $findItem->fetchAll();
    if ($items === []) {
        throw new OutOfBoundsException($type === 'item' ? 'Sale item not found or already voided.' : 'No active items remain in this sale.');
    }

    $findProduct = $pdo->prepare('SELECT stockQuantity FROM products WHERE id = ? FOR UPDATE');
    $restoreStock = $pdo->prepare('UPDATE products SET stockQuantity = stockQuantity + ? WHERE id = ?');
    $insertAudit = $pdo->prepare(
        'INSERT INTO inventory_audit (action_type, product_id, product_name, before_data, after_data, quantity_change, reason, user_id, user_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $updateItem = $pdo->prepare('UPDATE transaction_items SET voided_at = NOW(), void_reason = ? WHERE id = ? AND voided_at IS NULL');
    $totalToRemove = 0.0;

    foreach ($items as $item) {
        $findProduct->execute([(int)$item['product_id']]);
        $product = $findProduct->fetch();
        if (!$product) {
            throw new RuntimeException('Cannot restore stock because a product in this sale no longer exists.');
        }

        $beforeStock = (int)$product['stockQuantity'];
        $quantity = (int)$item['quantity'];
        $restoreStock->execute([$quantity, (int)$item['product_id']]);
        $updateItem->execute([$reason, (int)$item['id']]);
        if ($updateItem->rowCount() !== 1) {
            throw new DomainException('The sale item changed while the void was being processed. Please retry.');
        }

        $insertAudit->execute([
            'Stock Addition',
            (int)$item['product_id'],
            $item['product_name'],
            json_encode(['stockQuantity' => $beforeStock], JSON_THROW_ON_ERROR),
            json_encode(['stockQuantity' => $beforeStock + $quantity], JSON_THROW_ON_ERROR),
            $quantity,
            'Void sale #' . $transactionId . ' | ' . $reason,
            $actorId,
            $actorName,
        ]);
        $insertAudit->execute([
            'Voided Items/Invoice',
            (int)$item['product_id'],
            $item['product_name'],
            null,
            null,
            -$quantity,
            'Sale #' . $transactionId . ' | ' . $reason,
            $actorId,
            $actorName,
        ]);

        $totalToRemove += max(0, (float)$item['price'] * $quantity - (float)$item['discount']);
    }

    $activeCount = $pdo->prepare('SELECT COUNT(*) FROM transaction_items WHERE transaction_id = ? AND voided_at IS NULL');
    $activeCount->execute([$transactionId]);
    $allItemsVoided = (int)$activeCount->fetchColumn() === 0;
    $newTotal = $type === 'invoice' || $allItemsVoided
        ? 0.0
        : max(0, round((float)$sale['total_amount'] - $totalToRemove, 2));

    if ($allItemsVoided) {
        $updateSale = $pdo->prepare(
            "UPDATE transactions SET status = 'voided', total_amount = 0, voided_at = NOW(), void_reason = ?, voided_by_id = ?, voided_by_name = ? WHERE id = ?"
        );
        $updateSale->execute([$reason, $actorId, $actorName, $transactionId]);
    } else {
        $updateSale = $pdo->prepare('UPDATE transactions SET total_amount = ? WHERE id = ?');
        $updateSale->execute([$newTotal, $transactionId]);
    }

    $pdo->commit();
    echo json_encode([
        'success' => true,
        'message' => 'Transaction voided and stock restored.',
        'transaction_id' => $transactionId,
        'total_amount' => $newTotal,
        'transaction_voided' => $allItemsVoided,
    ]);
} catch (OutOfBoundsException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(404);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (DomainException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(409);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Void transaction error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to void the transaction.']);
}
