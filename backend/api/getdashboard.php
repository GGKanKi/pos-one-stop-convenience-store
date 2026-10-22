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
$date = is_string($_GET['date'] ?? null) ? $_GET['date'] : '';
$trendDays = filter_var($_GET['trendDays'] ?? 7, FILTER_VALIDATE_INT);
$trendDays = in_array($trendDays, [7, 30], true) ? $trendDays : 7;
$parsedDate = DateTime::createFromFormat('!Y-m-d', $date);
if (!$parsedDate || $parsedDate->format('Y-m-d') !== $date) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid date. Use YYYY-MM-DD.']);
    exit;
}

try {
    $salesStmt = $pdo->prepare("SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE DATE(created_at) = ? AND status = 'completed'");
    $salesStmt->execute([$date]);
    $grossSales = (float)$salesStmt->fetchColumn();

    // Aggregate sold totals by day, then fill missing dates so the graph always has a continuous range.
    $trendStart = (new DateTime($date))->modify('-' . ($trendDays - 1) . ' days')->format('Y-m-d');
    $trendStmt = $pdo->prepare(
        "SELECT DATE(created_at) AS sale_date, SUM(total_amount) AS total
         FROM transactions WHERE DATE(created_at) BETWEEN ? AND ? AND status = 'completed'
         GROUP BY DATE(created_at)"
    );
    $trendStmt->execute([$trendStart, $date]);
    $salesByDate = [];
    foreach ($trendStmt->fetchAll() as $row) {
        $salesByDate[$row['sale_date']] = (float)$row['total'];
    }
    $salesTrend = [];
    $trendDate = new DateTime($trendStart);
    for ($day = 0; $day < $trendDays; $day++) {
        $dayValue = $trendDate->format('Y-m-d');
        $salesTrend[] = ['date' => $dayValue, 'sales' => $salesByDate[$dayValue] ?? 0];
        $trendDate->modify('+1 day');
    }

    // New sales retain their unit cost; old rows fall back to the product's current cost and are flagged as estimates.
    $profitStmt = $pdo->prepare(
        "SELECT COALESCE(SUM(t.total_amount - COALESCE(c.cost_total, 0)), 0) AS net_profit,
                COALESCE(SUM(c.estimated_items), 0) AS estimated_items
         FROM transactions t
         LEFT JOIN (
             SELECT ti.transaction_id,
                    SUM(COALESCE(ti.unit_cost, p.costPrice) * ti.quantity) AS cost_total,
                    SUM(ti.unit_cost IS NULL) AS estimated_items
             FROM transaction_items ti
             LEFT JOIN products p ON p.id = ti.product_id
             WHERE ti.voided_at IS NULL
             GROUP BY ti.transaction_id
         ) c ON c.transaction_id = t.id
         WHERE DATE(t.created_at) = ? AND t.status = 'completed'"
    );
    $profitStmt->execute([$date]);
    $profit = $profitStmt->fetch();

    $topStmt = $pdo->prepare(
        "SELECT ti.product_id AS id, ti.product_name AS name, SUM(ti.quantity) AS quantity
         FROM transaction_items ti
         INNER JOIN transactions t ON t.id = ti.transaction_id AND t.status = 'completed'
         WHERE DATE(t.created_at) = ? AND ti.voided_at IS NULL
         GROUP BY ti.product_id, ti.product_name
         ORDER BY quantity DESC, ti.product_name ASC
         LIMIT 5"
    );
    $topStmt->execute([$date]);
    $topProducts = $topStmt->fetchAll();

    $lowStock = $pdo->query(
        'SELECT id, productName AS name, barcode, stockQuantity, threshold
         FROM products
         WHERE stockQuantity <= threshold
         ORDER BY (threshold - stockQuantity) DESC, productName ASC'
    )->fetchAll();

    $latestStmt = $pdo->query(
        'SELECT id, action_type AS action, product_name, quantity_change, reason, user_name, created_at
         FROM inventory_audit ORDER BY created_at DESC, id DESC LIMIT 6'
    );
    $latest = [];
    foreach ($latestStmt->fetchAll() as $entry) {
        $quantity = $entry['quantity_change'] === null ? null : abs((int)$entry['quantity_change']);
        $detail = $entry['reason'] ?: '';
        if ($quantity !== null && in_array($entry['action'], ['Stock Addition', 'Stock Deduction'], true)) {
            $verb = $entry['action'] === 'Stock Addition' ? 'added' : 'deducted';
            $unit = $quantity === 1 ? 'unit' : 'units';
            $detail = $quantity . ' ' . $unit . ' ' . $verb . ($detail ? ' - ' . $detail : '');
        }
        $latest[] = [
            'id' => $entry['id'],
            'action' => $entry['action'],
            'product' => $entry['product_name'],
            'description' => trim($entry['product_name'] . ($detail ? ' - ' . $detail : '')),
            'user' => $entry['user_name'] ?: 'Unknown',
            'date' => $entry['created_at'],
        ];
    }

    echo json_encode([
        'success' => true,
        'date' => $date,
        'grossSales' => $grossSales,
        'netProfit' => (float)($profit['net_profit'] ?? 0),
        'profitEstimated' => (int)($profit['estimated_items'] ?? 0) > 0,
        'salesTrend' => $salesTrend,
        'salesTrendDays' => $trendDays,
        'bestSeller' => $topProducts[0] ?? null,
        'topProducts' => $topProducts,
        'lowStock' => $lowStock,
        'latestInventoryTransactions' => $latest,
    ], JSON_INVALID_UTF8_SUBSTITUTE);
} catch (Throwable $e) {
    error_log('Dashboard error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to load dashboard data.']);
}
