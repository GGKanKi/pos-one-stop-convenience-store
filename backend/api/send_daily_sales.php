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
    $chatId = 5993608350; // Your verified Telegram chat ID

    // Get date from query parameter (e.g., ?date=2026-11-13) or default to today
    $reportDate = $_GET['date'] ?? date('Y-m-d');

    // 1. Fetch sales summary for the given date (adjust table/column names to match your DB schema)
    // Assuming you have a transactions / sales table with created_at or date and total_amount
    $stmt = $pdo->prepare("SELECT * FROM transactions WHERE DATE(created_at) = ?");
    $stmt->execute([$reportDate]);
    $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalCash = 0;
    $totalEPayments = 0;
    $totalRevenue = 0;
    $transactionCount = count($transactions);

    foreach ($transactions as $txn) {
        $amount = (float)($txn['total_amount'] ?? $txn['grand_total'] ?? 0);
        $totalRevenue += $amount;
        
        $paymentType = strtolower($txn['payment_method'] ?? 'cash');
        if ($paymentType === 'cash') {
            $totalCash += $amount;
        } else {
            $totalEPayments += $amount;
        }
    }

    // 2. Format Telegram message card
    $formattedDate = date('F j, Y', strtotime($reportDate));
    $message = "📊 *DAILY SALES REPORT* 📊\n";
    $message .= "📅 Date: *{$formattedDate}*\n\n";
    
    $message .= "💰 *Grand Total:* ₱" . number_format($totalRevenue, 2) . "\n";
    $message .= "💵 Total Cash: ₱" . number_format($totalCash, 2) . "\n";
    $message .= "📱 Total e-Payments: ₱" . number_format($totalEPayments, 2) . "\n";
    $message .= "🧾 Total Transactions: {$transactionCount}\n";

    // 3. Send via Telegram API
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
        sendJsonResponse(true, "Daily sales report sent successfully to Telegram!", [
            "date" => $reportDate,
            "total_revenue" => $totalRevenue,
            "transaction_count" => $transactionCount
        ]);
    } else {
        sendJsonResponse(false, "Failed to send via Telegram API", $telegramResult, 500);
    }

} catch (Throwable $e) {
    sendJsonResponse(false, "Error: " . $e->getMessage(), null, 500);
}
?>