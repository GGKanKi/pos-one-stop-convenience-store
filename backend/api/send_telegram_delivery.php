<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { 
    http_response_code(200); 
    exit; 
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/TelegramBotService.php';
require_once __DIR__ . '/../helpers/response.php';

try {
    // 1. Fetch recent delivery records matching your database schema
    $stmt = $pdo->query("SELECT * FROM deliveries ORDER BY id DESC LIMIT 5");
    $deliveriesRaw = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($deliveriesRaw)) {
        sendJsonResponse(true, "No delivery transactions found to send.", []);
        exit;
    }

    $deliveries = [];
    foreach ($deliveriesRaw as $del) {
        $delId = $del['id'];
        
        $itemStmt = $pdo->prepare("SELECT * FROM delivery_items WHERE delivery_id = ?");
        $itemStmt->execute([$delId]);
        $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

        $formattedItems = [];
        foreach ($items as $item) {
            $formattedItems[] = [
                'productName' => $item['product_name'],
                'quantity' => (int)$item['quantity'],
                'barcode' => $item['barcode']
            ];
        }

        $deliveries[] = [
            'supplierName' => $del['source'],
            'deliveryDate' => date('F j, Y h:i A', strtotime($del['created_at'])),
            'referenceNo' => $del['batch_id'],
            'totalAmount' => (float)$del['receipt_total'],
            'receivedBy' => $del['staff_name'],
            'items' => $formattedItems
        ];
    }

    // 2. Format Telegram message
    $message = "🚚 *RECENT DELIVERY TRANSACTIONS* 🚚\n\n";

    foreach ($deliveries as $deliv) {
        $message .= "🏢 *{$deliv['supplierName']}* (Ref: `{$deliv['referenceNo']}`)\n";
        $message .= "📅 Date: {$deliv['deliveryDate']}\n";
        $message .= "💰 Total: ₱" . number_format($deliv['totalAmount'], 2) . " | By: {$deliv['receivedBy']}\n";
        $message .= "📦 *Items Received:*\n";

        foreach ($deliv['items'] as $item) {
            $message .= "  • {$item['productName']} — *{$item['quantity']} pcs*\n";
        }
        $message .= "\n----------------------------------\n\n";
    }

    // 3. Send using your TelegramBotService
    $telegram = new TelegramBotService();
    $result = $telegram->sendLowStockAlert($message); // Uses your core notification sender

    if (isset($result['ok']) && $result['ok'] === true) {
        sendJsonResponse(true, "Delivery transactions report sent successfully to Telegram!", [
            "deliveries_sent_count" => count($deliveries)
        ]);
    } else {
        sendJsonResponse(false, "Failed to send via Telegram API", $result, 500);
    }

} catch (Throwable $e) {
    sendJsonResponse(false, "Error: " . $e->getMessage(), null, 500);
}
?>