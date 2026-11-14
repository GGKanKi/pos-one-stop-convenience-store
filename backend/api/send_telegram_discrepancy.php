<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { 
    http_response_code(200); 
    exit; 
}

require_once __DIR__ . '/TelegramBotService.php';
require_once __DIR__ . '/../helpers/response.php';

$input = json_decode(file_get_contents('php://input'), true);

$productName = $input['productName'] ?? 'Unknown Item';
$barcode = $input['barcode'] ?? 'N/A';
$expected = $input['expected'] ?? 0;
$actual = $input['actual'] ?? 0;
$difference = $input['difference'] ?? 0;
$status = $input['status'] ?? 'Resolved';

try {
    $telegram = new TelegramBotService();
    $result = $telegram->sendDiscrepancyLog($productName, $barcode, $expected, $actual, $difference, $status);
    
    sendJsonResponse(true, "Telegram discrepancy notification sent successfully!", $result);
} catch (Throwable $e) {
    sendJsonResponse(false, "Failed to send Telegram notification: " . $e->getMessage(), null, 500);
}
?>