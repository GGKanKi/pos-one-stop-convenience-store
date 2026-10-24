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

try {
    // 1. PRODUCTS SOLD BREAKDOWN (Excluding voided items)
    $itemsStmt = $pdo->prepare("
        SELECT 
            ti.product_name,
            SUM(ti.quantity) AS qty,
            SUM(ti.quantity * ti.price) AS total,
            COALESCE(p.category, 'General') AS category
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
            COALESCE(p.category, 'General') AS category,
            SUM(ti.quantity * ti.price) AS total
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

    // 3. OVERALL TOTALS & METRICS (Including Voided Amount Calculation)
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

    // Calculate total voided items amount for the day
    $voidStmt = $pdo->prepare("
        SELECT COALESCE(SUM(ti.quantity * ti.price), 0) AS voided_amount
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        WHERE DATE(t.created_at) = ? AND ti.voided_at IS NOT NULL
    ");
    $voidStmt->execute([$date]);
    $voidRow = $voidStmt->fetch(PDO::FETCH_ASSOC);

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
    $voidedAmount = (float)($voidRow['voided_amount'] ?? 0);

    echo json_encode([
        'success' => true,
        'data' => [
            'items' => $items,
            'categories' => $categories,
            'cashiers' => [
                ['cashier_name' => 'Partisala Rose', 'start_time' => '6:17:53 am', 'register_start' => 33177.00]
            ],
            'totals' => [
                'grandTotal' => $grandTotal,
                'totalCash' => (float)($tRow['total_cash'] ?? 0),
                'totalEpayments' => (float)($tRow['total_epayments'] ?? 0),
                'totalGcash' => (float)($tRow['total_gcash'] ?? 0),
                'totalCredit' => (float)($tRow['total_credit'] ?? 0),
                'returned' => 0.00,
                'voidedAmount' => $voidedAmount,
                'transactionCount' => (int)($tRow['transaction_count'] ?? 0),
                'totalItemCount' => (int)($itemCountRow['total_items'] ?? 0),
                'totalDiscounts' => $totalDiscounts,
                'netSales' => $grandTotal - $totalDiscounts,
            ]
        ]
    ]);

} catch (Throwable $e) {
    echo json_encode([
        'success' => false, 
        'message' => 'DB Error: ' . $e->getMessage()
    ]);
}