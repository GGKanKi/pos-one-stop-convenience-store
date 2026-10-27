<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { 
    http_response_code(200); 
    exit; 
}

require_once __DIR__ . '/../config/db.php';

try {
    $stmt = $pdo->query("SELECT * FROM deliveries ORDER BY id DESC");
    $deliveriesRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $deliveries = [];
    foreach ($deliveriesRaw as $del) {
        $delId = $del['id'];
        
        $itemStmt = $pdo->prepare("SELECT * FROM delivery_items WHERE delivery_id = ?");
        $itemStmt->execute([$delId]);
        $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

        $formattedItems = [];
        foreach ($items as $item) {
            $formattedItems[] = [
                'id' => (int)$item['id'],
                'productName' => $item['product_name'],
                'barcode' => $item['barcode'],
                'quantity' => (int)$item['quantity'],
                'expirationDate' => $item['expiration_date']
            ];
        }

        $deliveries[] = [
            'id' => (int)$del['id'],
            'supplierName' => $del['source'],
            'deliveryDate' => date('Y-m-d h:i A', strtotime($del['created_at'])),
            'referenceNo' => $del['batch_id'],
            'totalAmount' => (float)$del['receipt_total'],
            'receivedBy' => $del['staff_name'],
            'items' => $formattedItems
        ];
    }

    // Direktang ibalik ang success at ang deliveries array
    echo json_encode([
        'success' => true,
        'deliveries' => $deliveries
    ]);

} catch (Throwable $e) {
    echo json_encode([
        'success' => false,
        'message' => "Error: " . $e->getMessage()
    ]);
}