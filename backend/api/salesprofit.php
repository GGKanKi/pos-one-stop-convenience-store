<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';

$fromDate = $_GET['from'] ?? date('Y-m-d');
$toDate = $_GET['to'] ?? date('Y-m-d');

try {
    // Query na kumukuha ng mga naibentang produkto sa pagitan ng From at To date
    $stmt = $pdo->prepare("
        SELECT 
            p.id as product_id,
            p.productName as inventoryName,
            SUM(ti.quantity) as qtySold,
            COALESCE(p.costPrice, 0) as avgCostPrice,
            AVG(ti.price) as avgSellingPrice,
            SUM(ti.quantity * ti.price) as grossSales,
            SUM(ti.quantity * COALESCE(p.costPrice, 0)) as totalCost,
            SUM(ti.quantity * (ti.price - COALESCE(p.costPrice, 0))) as salesProfit
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        LEFT JOIN products p ON ti.product_id = p.id
        WHERE t.status = 'completed' 
          AND DATE(t.created_at) >= ? 
          AND DATE(t.created_at) <= ?
          AND (ti.voided_at IS NULL)
        GROUP BY p.id, p.productName, p.costPrice
        ORDER BY grossSales DESC
    ");
    
    $stmt->execute([$fromDate, $toDate]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $reportData = [];
    $idCounter = 1;

    foreach ($results as $row) {
        $reportData[] = [
            "id" => (string)$idCounter++,
            "inventoryName" => $row['inventoryName'] ?: 'Unknown Product',
            "qtySold" => (float)$row['qtySold'],
            "avgCostPrice" => (float)$row['avgCostPrice'],
            "avgSellingPrice" => (float)$row['avgSellingPrice'],
            "grossSales" => (float)$row['grossSales'],
            "totalCost" => (float)$row['totalCost'],
            "salesProfit" => (float)$row['salesProfit']
        ];
    }

    echo json_encode([
        "success" => true,
        "data" => $reportData
    ], JSON_INVALID_UTF8_SUBSTITUTE);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'DB Error: ' . $e->getMessage()
    ]);
}
?>