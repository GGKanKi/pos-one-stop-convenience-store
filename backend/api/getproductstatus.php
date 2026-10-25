<?php
// product status API endpoint
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
    // Strictly require expirationDate to be set, not empty, and either expired or within the next 30 days
    $stmt = $pdo->prepare("
        SELECT 
            id,
            COALESCE(barcode, CONCAT('SKU-', LPAD(id, 3, '0'))) AS sku,
            productName,
            category,
            stockQuantity,
            costPrice,
            expirationDate,
            DATEDIFF(expirationDate, CURDATE()) AS days_remaining
        FROM products
        WHERE expirationDate IS NOT NULL 
          AND TRIM(expirationDate) != ''
          AND expirationDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        ORDER BY expirationDate ASC, id DESC
    ");
    $stmt->execute();
    $rawProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $items = [];

    foreach ($rawProducts as $p) {
        $expDate = $p['expirationDate'];
        $daysRemaining = (int)($p['days_remaining'] ?? 0);
        
        // Determine status safely
        if ($daysRemaining < 0) {
            $status = 'EXPIRED';
        } elseif ($daysRemaining <= 30) {
            $status = 'NEAR_EXPIRY';
        } else {
            // Skip if it somehow bypassed the SQL filter
            continue;
        }

        $items[] = [
            'id' => (string)$p['id'],
            'sku' => $p['sku'],
            'inventoryName' => $p['productName'],
            'category' => $p['category'] ?? 'General',
            'quantity' => (int)$p['stockQuantity'],
            'unitCost' => (float)$p['costPrice'],
            'expiryDate' => $expDate,
            'status' => $status,
            'daysRemaining' => $daysRemaining
        ];
    }

    echo json_encode(['success' => true, 'items' => $items]);

} catch (Throwable $e) {
    error_log('Product status error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB Error: ' . $e->getMessage()]);
}