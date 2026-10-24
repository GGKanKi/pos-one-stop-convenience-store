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
        ORDER BY id DESC
    ");
    $stmt->execute();
    $rawProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $items = [];

    foreach ($rawProducts as $p) {
        $expDate = $p['expirationDate'];
        
        // If no expiry date is set in DB yet, treat as Near Expiry or default for testing
        if (empty($expDate)) {
            $status = 'NEAR_EXPIRY';
            $daysRemaining = 10;
            $expDate = date('Y-m-d', strtotime('+10 days'));
        } else {
            $daysRemaining = (int)($p['days_remaining'] ?? 0);
            $status = ($daysRemaining < 0) ? 'EXPIRED' : 'NEAR_EXPIRY';
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