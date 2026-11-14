<?php
class TelegramBotService {
    private $token = '9207372500:AAEgC46x60QiqZZ8vdIen1vK3r2EQKercWs';
    private $chatId = 5993608350; // Cast as an integer to prevent API payload errors

    public function sendNotification($message) {
        $url = "https://api.telegram.org/bot" . $this->token . "/sendMessage";
        
        $data = [
            'chat_id' => $this->chatId,
            'text' => $message,
            'parse_mode' => 'Markdown'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);

        $response = curl_exec($ch);
        $curlError = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($response === false) {
            return [
                "ok" => false, 
                "error_code" => 500, 
                "description" => "cURL Failed: " . $curlError
            ];
        }

        return json_decode($response, true);
    }

    /**
     * Send Inventory Discrepancy Log to Telegram
     */
    public function sendDiscrepancyLog($productName, $barcode, $expected, $actual, $difference, $status) {
        $statusEmoji = $status === 'Resolved' ? '✅' : '⚠️';
        $diffText = $difference < 0 ? "SHORT ({$difference})" : "OVER (+{$difference})";
        
        // Escape markdown special characters in names to prevent Telegram parsing errors
        $safeProductName = str_replace(['_', '*', '`', '['], ['\_', '\*', '\`', '\['], $productName);
        $safeBarcode = str_replace(['_', '*', '`', '['], ['\_', '\*', '\`', '\['], $barcode);

        $message = "{$statusEmoji} *Inventory Discrepancy Alert*\n\n" .
                   "*Product:* {$safeProductName}\n" .
                   "*Barcode:* `{$safeBarcode}`\n" .
                   "*Expected:* {$expected} | *Actual:* {$actual}\n" .
                   "*Difference:* {$diffText}\n" .
                   "*Status:* {$status}";

        return $this->sendNotification($message);
    }

    /**
     * Send Restock Attention Alert / List to Telegram
     */
    public function sendLowStockAlert($messageContent) {
        return $this->sendNotification($messageContent);
    }

    /**
     * Send Daily Sales Report to Telegram
     */
    public function sendDailySalesReport($reportDate, $totalRevenue, $totalCash, $totalEPayments, $transactionCount) {
        $formattedDate = date('F j, Y', strtotime($reportDate));
        
        $message = "📊 *DAILY SALES REPORT* 📊\n";
        $message .= "📅 Date: *{$formattedDate}*\n\n";
        $message .= "💰 *Grand Total:* ₱" . number_format($totalRevenue, 2) . "\n";
        $message .= "💵 Total Cash: ₱" . number_format($totalCash, 2) . "\n";
        $message .= "📱 Total e-Payments: ₱" . number_format($totalEPayments, 2) . "\n";
        $message .= "🧾 Total Transactions: {$transactionCount}";

        return $this->sendNotification($message);
    }

    /**
     * Send Delivery Transactions Summary to Telegram
     */
    public function sendDeliveryNotification($deliveries) {
        $message = "🚚 *RECENT DELIVERY TRANSACTIONS* 🚚\n\n";
        
        $recentDeliveries = array_slice($deliveries, 0, 5);

        foreach ($recentDeliveries as $deliv) {
            $supplier = $deliv['supplierName'] ?? 'Unknown Supplier';
            $ref = $deliv['referenceNo'] ?? 'N/A';
            $date = $deliv['deliveryDate'] ?? 'N/A';
            $total = number_format($deliv['totalAmount'] ?? 0, 2);
            $receivedBy = $deliv['receivedBy'] ?? 'Admin';
            
            $message .= "🏢 *{$supplier}* (Ref: `{$ref}`)\n";
            $message .= "📅 Date: {$date} | By: {$receivedBy}\n";
            $message .= "💰 Receipt Total: *₱{$total}*\n";
            $message .= "📦 *Items Received:*\n";

            if (!empty($deliv['items'])) {
                foreach ($deliv['items'] as $item) {
                    $pName = $item['productName'] ?? 'Item';
                    $qty = $item['quantity'] ?? 0;
                    $message .= "  • {$pName} — *{$qty} pcs*\n";
                }
            }
            $message .= "\n----------------------------------\n\n";
        }

        return $this->sendNotification($message);
    }
}
?>