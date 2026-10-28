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
    // 1. Gross Sales
    $salesStmt = $pdo->prepare("SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE DATE(created_at) = ? AND status = 'completed'");
    $salesStmt->execute([$date]);
    $grossSales = (float)$salesStmt->fetchColumn();

    // 2. Sales Trend
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

    // 3. Net Profit Calculation
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

    // 4. Top Selling Products
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

    // 5. Low Stock Products (Excluding items with pending restock requests) - Added ceiling here
    $lowStockStmt = $pdo->prepare(
        'SELECT id, productName AS name, barcode, stockQuantity, threshold, ceiling
         FROM products p
         WHERE p.stockQuantity <= p.threshold
           AND NOT EXISTS (
               SELECT 1 FROM inventory_change_requests icr 
               WHERE icr.product_id = p.id 
                 AND icr.action_type = "restock" 
                 AND icr.status = "pending"
           )
         ORDER BY (p.threshold - p.stockQuantity) DESC, p.productName ASC'
    );
    $lowStockStmt->execute();
    $lowStock = $lowStockStmt->fetchAll(PDO::FETCH_ASSOC);

    // 6. Approved Restock Requests (Purchases to be bought)
    $approvedRestocksStmt = $pdo->query("
        SELECT 
            icr.id,
            icr.product_id,
            p.productName,
            p.barcode,
            CAST(JSON_UNQUOTE(JSON_EXTRACT(icr.requested_data, '$.restockQty')) AS UNSIGNED) AS approvedQty,
            icr.reviewed_at AS approvedAt
        FROM inventory_change_requests icr
        LEFT JOIN products p ON icr.product_id = p.id
        WHERE icr.action_type = 'restock' 
          AND icr.status = 'approved'
        ORDER BY icr.reviewed_at DESC
        LIMIT 20
    ");
    $approvedRestocks = $approvedRestocksStmt->fetchAll(PDO::FETCH_ASSOC);

    // 7. Latest Inventory Activity Log
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

    // Response array
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
        'approvedRestocks' => $approvedRestocks,
        'latestInventoryTransactions' => $latest,
    ], JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $e) {
    error_log('Dashboard error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to load dashboard data.']);
}