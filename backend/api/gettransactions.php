<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

require __DIR__ . '/../config/db.php';

try {
    // Recall needs database IDs for safe void requests and product snapshots for the item breakdown.
    $stmt = $pdo->query(
        "SELECT t.id, t.created_at, t.payment_method, t.total_amount,
                ti.id AS transaction_item_id, ti.product_id, ti.product_name,
                ti.price, ti.quantity, ti.discount, p.barcode
         FROM transactions t
         LEFT JOIN transaction_items ti ON ti.transaction_id = t.id AND ti.voided_at IS NULL
         LEFT JOIN products p ON p.id = ti.product_id
         WHERE t.status = 'completed'
         ORDER BY t.created_at DESC, t.id DESC, ti.id"
    );

    $transactions = [];
    foreach ($stmt->fetchAll() as $row) {
        $id = (int)$row['id'];
        if (!isset($transactions[$id])) {
            $transactions[$id] = [
                'id' => $id,
                'dbTransactionId' => $id,
                'time' => $row['created_at'],
                'itemCount' => 0,
                'paymentMethod' => $row['payment_method'],
                'totalAmount' => (float)$row['total_amount'],
                'items' => [],
            ];
        }
        if ($row['transaction_item_id'] === null) {
            continue;
        }

        $quantity = (int)$row['quantity'];
        $transactions[$id]['itemCount'] += $quantity;
        $transactions[$id]['items'][] = [
            'id' => (int)$row['product_id'],
            'transactionItemId' => (int)$row['transaction_item_id'],
            'code' => (string)($row['barcode'] ?? ''),
            'name' => $row['product_name'],
            'price' => (float)$row['price'],
            'discount' => (float)$row['discount'],
            'qty' => $quantity,
        ];
    }

    echo json_encode(['success' => true, 'transactions' => array_values($transactions)], JSON_INVALID_UTF8_SUBSTITUTE);
} catch (Throwable $e) {
    error_log('Get transactions error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to load transactions.']);
}
