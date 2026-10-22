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

/** Normalize historical text before returning it to the browser. */
function cleanHistoryText($value): string
{
    $value = (string)$value;
    $clean = @iconv('UTF-8', 'UTF-8//IGNORE', $value);
    if ($clean !== false) {
        $value = $clean;
    }
    $value = str_replace("\xEF\xBF\xBD", '', $value);
    return trim(preg_replace('/\s+/', ' ', $value) ?? $value);
}

function isValidDate(string $date): bool
{
    $parsed = DateTime::createFromFormat('!Y-m-d', $date);
    return $parsed !== false && $parsed->format('Y-m-d') === $date;
}

$startValue = $_GET['start'] ?? date('Y-m-01');
$endValue = $_GET['end'] ?? date('Y-m-d');
$actionValue = $_GET['action'] ?? '';
$searchValue = $_GET['search'] ?? '';
$start = is_string($startValue) ? $startValue : '';
$end = is_string($endValue) ? $endValue : '';
$action = is_string($actionValue) ? trim($actionValue) : '';
$search = is_string($searchValue) ? trim($searchValue) : '';
$validActions = ['', 'Stock Deduction', 'Stock Addition', 'Sale', 'Voided Items/Invoice', 'Added New Product', 'Product Details Update'];

if (!isValidDate($start) || !isValidDate($end) || $start > $end) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Choose a valid date range.']);
    exit;
}
if (!in_array($action, $validActions, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid action type.']);
    exit;
}

try {
    $rows = [];
    $auditStmt = $pdo->prepare(
        'SELECT id, action_type, product_name, before_data, after_data, quantity_change, reason, user_name, created_at
         FROM inventory_audit WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)'
    );
    $auditStmt->execute([$start, $end]);
    $fieldLabels = [
        'productName' => 'Name',
        'barcode' => 'Barcode',
        'description' => 'Description',
        'costPrice' => 'Cost price',
        'sellingPrice' => 'Selling price',
        'category' => 'Category',
        'supplier' => 'Supplier',
        'expirationDate' => 'Expiry date',
        'expiryBatches' => 'Expiry batches',
        'threshold' => 'Low-stock threshold',
    ];

    foreach ($auditStmt->fetchAll() as $entry) {
        $name = cleanHistoryText($entry['product_name']);
        $reason = cleanHistoryText($entry['reason'] ?? '');
        $description = $name;

        if (in_array($entry['action_type'], ['Stock Addition', 'Stock Deduction'], true)) {
            $quantity = abs((int)$entry['quantity_change']);
            $verb = $entry['action_type'] === 'Stock Addition' ? 'added' : 'deducted';
            $description .= ' | ' . $quantity . ' ' . ($quantity === 1 ? 'unit' : 'units') . ' ' . $verb;
            if ($reason !== '') {
                $description .= ' | Reason: ' . $reason;
            }
        } elseif ($entry['action_type'] === 'Added New Product') {
            $after = json_decode($entry['after_data'] ?: '{}', true) ?: [];
            $quantity = (int)($after['stockQuantity'] ?? 0);
            $description .= ' | Opening stock: ' . $quantity . ' ' . ($quantity === 1 ? 'unit' : 'units');
        } elseif ($entry['action_type'] === 'Product Details Update') {
            $before = json_decode($entry['before_data'] ?: '{}', true) ?: [];
            $after = json_decode($entry['after_data'] ?: '{}', true) ?: [];
            $changes = [];
            foreach ($after as $field => $value) {
                $label = $fieldLabels[$field] ?? $field;
                $old = is_scalar($before[$field] ?? null) ? cleanHistoryText($before[$field]) : '';
                $new = is_scalar($value) ? cleanHistoryText($value) : '';
                $changes[] = $label . ': ' . ($old !== '' ? $old : '—') . ' to ' . ($new !== '' ? $new : '—');
            }
            $description .= $changes ? ' | Updated ' . implode('; ', $changes) : ' | Product details updated';
        } elseif ($entry['action_type'] === 'Voided Items/Invoice' && $reason !== '') {
            $description .= ' | ' . $reason;
        }

        $rows[] = [
            'id' => 'inventory-' . $entry['id'],
            'date' => $entry['created_at'],
            'action' => $entry['action_type'],
            'entities' => 'Inventory',
            'description' => $description,
            'user' => cleanHistoryText($entry['user_name'] ?: 'Unknown'),
        ];
    }

    // Sales rows are assembled separately from audit rows so the history can filter each action type cleanly.
    $salesStmt = $pdo->prepare(
        "SELECT t.id, t.created_at, t.total_amount,
                SUM(ti.quantity) AS item_count,
                GROUP_CONCAT(CONCAT(ti.quantity, ' x ', ti.product_name) ORDER BY ti.id SEPARATOR '; ') AS items,
                (SELECT a.user_name FROM inventory_audit a
                 WHERE a.reason = CONCAT('Sale #', t.id) AND a.action_type = 'Stock Deduction'
                 ORDER BY a.id LIMIT 1) AS cashier
         FROM transactions t
         LEFT JOIN transaction_items ti ON ti.transaction_id = t.id AND ti.voided_at IS NULL
         WHERE t.status = 'completed' AND t.created_at >= ? AND t.created_at < DATE_ADD(?, INTERVAL 1 DAY)
         GROUP BY t.id, t.created_at, t.total_amount
         ORDER BY t.created_at DESC"
    );
    $salesStmt->execute([$start, $end]);
    foreach ($salesStmt->fetchAll() as $sale) {
        $itemCount = (int)($sale['item_count'] ?? 0);
        $description = $itemCount . ' ' . ($itemCount === 1 ? 'item' : 'items') . ' | Total: PHP ' . number_format((float)$sale['total_amount'], 2);
        if (!empty($sale['items'])) {
            $description .= ' | ' . cleanHistoryText($sale['items']);
        }
        $rows[] = [
            'id' => 'sale-' . $sale['id'],
            'date' => $sale['created_at'],
            'action' => 'Sale',
            'entities' => 'Product',
            'description' => $description,
            'user' => cleanHistoryText($sale['cashier'] ?: '—'),
        ];
    }

    if ($action !== '') {
        $rows = array_values(array_filter($rows, fn($row) => $row['action'] === $action));
    }
    if ($search !== '') {
        $rows = array_values(array_filter($rows, fn($row) => stripos(
            implode(' ', [$row['description'], $row['action'], $row['entities'], $row['user']]),
            $search
        ) !== false));
    }

    usort($rows, fn($left, $right) => strcmp($right['date'], $left['date']));
    echo json_encode(['success' => true, 'transactions' => $rows], JSON_INVALID_UTF8_SUBSTITUTE);
} catch (Throwable $e) {
    error_log('Transaction history error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to load transaction history.']);
}
