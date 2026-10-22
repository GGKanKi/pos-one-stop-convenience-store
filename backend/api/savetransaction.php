<?php
ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
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
if (!is_array($data) || !isset($data['items']) || !is_array($data['items']) || $data['items'] === []) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'A sale must include at least one item.']);
    exit;
}

try {
    $pdo->beginTransaction();
    $paymentMethod = trim((string)($data['paymentMethod'] ?? 'Cash'));
    if ($paymentMethod === '' || strlen($paymentMethod) > 50) {
        throw new InvalidArgumentException('Choose a valid payment method.');
    }

    $sale = $pdo->prepare(
        'INSERT INTO transactions (payment_method, total_amount, created_at) VALUES (?, ?, NOW())'
    );
    // The total is calculated from locked product prices, rather than trusting the POS total.
    $sale->execute([$paymentMethod, 0]);
    $transactionId = (int)$pdo->lastInsertId();

    $findProduct = $pdo->prepare(
        'SELECT id, productName, sellingPrice, costPrice, stockQuantity FROM products WHERE id = ? FOR UPDATE'
    );
    $insertItem = $pdo->prepare(
        'INSERT INTO transaction_items (transaction_id, product_id, product_name, price, unit_cost, discount, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $decrementStock = $pdo->prepare(
        'UPDATE products SET stockQuantity = stockQuantity - ? WHERE id = ? AND stockQuantity >= ?'
    );
    $insertAudit = $pdo->prepare(
        'INSERT INTO inventory_audit (action_type, product_id, product_name, before_data, after_data, quantity_change, reason, user_id, user_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    $actor = is_array($data['actor'] ?? null) ? $data['actor'] : [];
    $actorId = filter_var($actor['id'] ?? null, FILTER_VALIDATE_INT);
    $actorName = trim((string)($actor['name'] ?? ''));
    $actorId = $actorId && $actorId > 0 ? $actorId : null;
    $actorName = $actorName !== '' ? substr($actorName, 0, 120) : null;
    $calculatedTotal = 0.0;
    $savedItems = [];

    foreach ($data['items'] as $item) {
        if (!is_array($item)) {
            throw new InvalidArgumentException('Each sale item must be valid.');
        }

        $productId = filter_var($item['id'] ?? null, FILTER_VALIDATE_INT);
        $quantity = filter_var($item['qty'] ?? null, FILTER_VALIDATE_INT);
        $discount = filter_var($item['discount'] ?? 0, FILTER_VALIDATE_FLOAT);
        if (!$productId || $productId < 1 || !$quantity || $quantity < 1 || $discount === false || $discount < 0) {
            throw new InvalidArgumentException('Each sale item needs a valid product, quantity, and discount.');
        }

        // Keep the row lock until commit so two checkouts cannot sell the same final units.
        $findProduct->execute([$productId]);
        $product = $findProduct->fetch();
        if (!$product) {
            throw new InvalidArgumentException('A product in this sale no longer exists.');
        }
        if ((int)$product['stockQuantity'] < $quantity) {
            throw new InvalidArgumentException(
                'Not enough stock for ' . $product['productName'] . '. Available: ' . $product['stockQuantity'] . '.'
            );
        }

        $lineSubtotal = (float)$product['sellingPrice'] * $quantity;
        if ($discount > $lineSubtotal) {
            throw new InvalidArgumentException('A discount cannot exceed the item subtotal.');
        }
        $calculatedTotal += $lineSubtotal - $discount;

        $insertItem->execute([
            $transactionId,
            $productId,
            $product['productName'],
            (float)$product['sellingPrice'],
            (float)$product['costPrice'],
            $discount,
            $quantity,
        ]);
        $savedItems[] = [
            'transactionItemId' => (int)$pdo->lastInsertId(),
            'productId' => $productId,
        ];
        $decrementStock->execute([$quantity, $productId, $quantity]);
        if ($decrementStock->rowCount() !== 1) {
            throw new InvalidArgumentException('Stock changed during checkout. Please retry the sale.');
        }

        $beforeStock = (int)$product['stockQuantity'];
        $insertAudit->execute([
            'Stock Deduction',
            $productId,
            $product['productName'],
            json_encode(['stockQuantity' => $beforeStock], JSON_THROW_ON_ERROR),
            json_encode(['stockQuantity' => $beforeStock - $quantity], JSON_THROW_ON_ERROR),
            -$quantity,
            'Sale #' . $transactionId,
            $actorId,
            $actorName,
        ]);
    }

    $calculatedTotal = round($calculatedTotal, 2);
    $updateTotal = $pdo->prepare('UPDATE transactions SET total_amount = ? WHERE id = ?');
    $updateTotal->execute([$calculatedTotal, $transactionId]);
    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Transaction saved and inventory updated.',
        'transaction_id' => $transactionId,
        'total_amount' => $calculatedTotal,
        'items' => $savedItems,
    ]);
} catch (InvalidArgumentException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(409);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Save transaction error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to complete the sale.']);
}
