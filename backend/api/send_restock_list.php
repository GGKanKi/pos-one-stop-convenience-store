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
    $token = '9207372500:AAEgC46x60QiqZZ8vdIen1vK3r2EQKercWs';
    $chatId = 5993608350; // Hardcoded correctly to your exact Telegram chat ID

    // 1. Query all products currently at or below threshold
    $stmt = $pdo->query("SELECT * FROM products WHERE stockQuantity <= threshold ORDER BY stockQuantity ASC");
    $currentLowStock = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($currentLowStock)) {
        sendJsonResponse(true, "No items are currently at or below the restock threshold.", []);
        exit;
    }

    // 2. Filter out items that have already been alerted (unless stock dropped even lower)
    $newlyLowItems = [];
    foreach ($currentLowStock as $item) {
        $barcode = $item['barcode'] ?? $item['code'] ?? '';
        $stock = (int)($item['stockQuantity'] ?? $item['stock'] ?? 0);

        // Check if this item was already logged in low_stock_alerts
        $checkStmt = $pdo->prepare("SELECT last_notified_stock FROM low_stock_alerts WHERE barcode = ?");
        $checkStmt->execute([$barcode]);
        $existingAlert = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existingAlert) {
            // Brand new low stock item!
            $newlyLowItems[] = $item;

            // Record it so it won't trigger again
            $insertStmt = $pdo->prepare("INSERT INTO low_stock_alerts (barcode, last_notified_stock) VALUES (?, ?) ON DUPLICATE KEY UPDATE last_notified_stock = ?");
            $insertStmt->execute([$barcode, $stock, $stock]);
        } else {
            // Already alerted before, but did the stock drop *even further* since last alert?
            if ($stock < (int)$existingAlert['last_notified_stock']) {
                $newlyLowItems[] = $item;

                // Update tracker
                $updateStmt = $pdo->prepare("UPDATE low_stock_alerts SET last_notified_stock = ? WHERE barcode = ?");
                $updateStmt->execute([$stock, $barcode]);
            }
        }
    }

    // If there are no *new* or *worsening* low stock items, do nothing
    if (empty($newlyLowItems)) {
        sendJsonResponse(true, "Checked low stock. No new threshold violations found.", []);
        exit;
    }

    // 3. Format the Telegram notification for NEW items only
    $message = "🚨 *NEW RESTOCK ATTENTION REQUIRED* 🚨\n";
    $message .= "The following items have newly crossed below their threshold:\n\n";

    foreach ($newlyLowItems as $item) {
        $name = $item['productName'] ?? $item['name'] ?? 'Unknown Item';
        $stock = $item['stockQuantity'] ?? $item['stock'] ?? 0;
        $threshold = $item['threshold'] ?? 0;
        $barcode = $item['barcode'] ?? $item['code'] ?? 'N/A';

        $safeName = str_replace(['_', '*', '`', '['], ['\_', '\*', '\`', '\['], $name);

        $message .= "• *{$safeName}* (`{$barcode}`)\n";
        $message .= "  Stock: *{$stock}* | Min Threshold: {$threshold}\n\n";
    }

    // 4. Send message via cURL
    $sendUrl = "https://api.telegram.org/bot{$token}/sendMessage";
    $postData = [
        'chat_id' => $chatId,
        'text' => $message,
        'parse_mode' => 'Markdown'
    ];

    $ch = curl_init($sendUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    $sendResponse = curl_exec($ch);
    curl_close($ch);

    $telegramResult = json_decode($sendResponse, true);

    if (isset($telegramResult['ok']) && $telegramResult['ok'] === true) {
        sendJsonResponse(true, "New low-stock alerts sent successfully to Telegram!", [
            "detected_chat_id" => $chatId,
            "new_alerts_count" => count($newlyLowItems),
            "telegram_response" => $telegramResult
        ]);
    } else {
        sendJsonResponse(false, "Failed to send via Telegram API", $telegramResult, 500);
    }

} catch (Throwable $e) {
    sendJsonResponse(false, "Error: " . $e->getMessage(), null, 500);
}
?>