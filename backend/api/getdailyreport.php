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

$date = $_GET['date'] ?? date('Y-m-d');

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    echo json_encode(['success' => false, 'message' => 'Invalid date format. Use YYYY-MM-DD.']);
    exit;
}

try {
    // 1. PRODUCTS SOLD BREAKDOWN
    $itemsStmt = $pdo->prepare("
        SELECT 
            ti.product_name,
            SUM(ti.quantity) AS qty,
            SUM(ti.subtotal) AS total,
            COALESCE(p.category, 'Uncategorized') AS category
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        LEFT JOIN products p ON ti.product_id = p.id
        WHERE t.status = 'completed' 
          AND DATE(t.created_at) = ? 
          AND ti.voided_at IS NULL
        GROUP BY ti.product_name, p.category
        ORDER BY total DESC
    ");
    $itemsStmt->execute([$date]);
    $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

    // 2. SALES BY CATEGORY
    $catStmt = $pdo->prepare("
        SELECT 
            COALESCE(p.category, 'Uncategorized') AS category,
            SUM(ti.subtotal) AS total
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        LEFT JOIN products p ON ti.product_id = p.id
        WHERE t.status = 'completed' 
          AND DATE(t.created_at) = ? 
          AND ti.voided_at IS NULL
        GROUP BY category
        ORDER BY total DESC
    ");
    $catStmt->execute([$date]);
    $categories = $catStmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. CASHIERS & REGISTER METRICS
    $cashierStmt = $pdo->prepare("
        SELECT 
            COALESCE(a.user_name, 'Staff') AS cashier_name,
            MIN(t.created_at) AS start_time,
            33177.00 AS register_start,
            SUM(CASE WHEN t.payment_method = 'Cash' THEN t.total_amount ELSE 0 END) AS cash_sales,
            SUM(CASE WHEN t.payment_method = 'e-Payment' THEN t.total_amount ELSE 0 END) AS epayment_sales,
            SUM(CASE WHEN t.payment_method = 'GCash' THEN t.total_amount ELSE 0 END) AS gcash_sales,
            SUM(CASE WHEN t.payment_method = 'Credit' THEN t.total_amount ELSE 0 END) AS credit_payments
        FROM transactions t
        LEFT JOIN inventory_audit a ON a.reason = CONCAT('Sale #', t.id)
        WHERE t.status = 'completed' AND DATE(t.created_at) = ?
        GROUP BY cashier_name
        LIMIT 1
    ");
    $cashierStmt->execute([$date]);
    $cashierData = $cashierStmt->fetch(PDO::FETCH_ASSOC);

    $cashiers = $cashierData ? [$cashierData] : [];

    // 4. OVERALL TOTALS & METRICS
    $totalsStmt = $pdo->prepare("
        SELECT 
            COALESCE(SUM(t.total_amount), 0) AS grand_total,
            COALESCE(SUM(CASE WHEN t.payment_method = 'Cash' THEN t.total_amount ELSE 0 END), 0) AS total_cash,
            COALESCE(SUM(CASE WHEN t.payment_method = 'e-Payment' THEN t.total_amount ELSE 0 END), 0) AS total_epayments,
            COALESCE(SUM(CASE WHEN t.payment_method = 'GCash' THEN t.total_amount ELSE 0 END), 0) AS total_gcash,
            COALESCE(SUM(CASE WHEN t.payment_method = 'Credit' THEN t.total_amount ELSE 0 END), 0) AS total_credit,
            COALESCE(SUM(t.discount), 0) AS total_discounts,
            COUNT(t.id) AS transaction_count
        FROM transactions t
        WHERE t.status = 'completed' AND DATE(t.created_at) = ?
    ");
    $totalsStmt->execute([$date]);
    $tRow = $totalsStmt->fetch(PDO::FETCH_ASSOC);

    // Total items sold count
    $itemCountStmt = $pdo->prepare("
        SELECT COALESCE(SUM(ti.quantity), 0) AS total_items
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE t.status = 'completed' AND DATE(t.created_at) = ? AND ti.voided_at IS NULL
    ");
    $itemCountStmt->execute([$date]);
    $itemCountRow = $itemCountStmt->fetch(PDO::FETCH_ASSOC);

    $grandTotal = (float)($tRow['grand_total'] ?? 0);
    $totalDiscounts = (float)($tRow['total_discounts'] ?? 0);

    echo json_encode([
        'success' => true,
        'data' => [
            'items' => $items,
            'categories' => $categories,
            'cashiers' => $cashiers,
            'totals' => [
                'grandTotal' => $grandTotal,
                'totalCash' => (float)($tRow['total_cash'] ?? 0),
                'totalEpayments' => (float)($tRow['total_epayments'] ?? 0),
                'totalGcash' => (float)($tRow['total_gcash'] ?? 0),
                'totalCredit' => (float)($tRow['total_credit'] ?? 0),
                'returned' => 0.00,
                'voidedAmount' => 0.00,
                'transactionCount' => (int)($tRow['transaction_count'] ?? 0),
                'totalItemCount' => (int)($itemCountRow['total_items'] ?? 0),
                'totalDiscounts' => $totalDiscounts,
                'netSales' => $grandTotal - $totalDiscounts,
            ]
        ]
    ]);

} catch (Throwable $e) {
    error_log("Get daily report error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Unable to load daily report: ' . $e->getMessage()]);
}