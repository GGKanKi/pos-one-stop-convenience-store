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
    // Select only columns that exist in the products table
    $stmt = $pdo->prepare("
        SELECT 
            id,
            COALESCE(barcode, CONCAT('SKU-', LPAD(id, 3, '0'))) AS sku,
            productName,
            category,
            stockQuantity,
            costPrice,
            sellingPrice,
            threshold,
            barcode,
            expirationDate,
            expiry_batches
        FROM products
    ");
    $stmt->execute();
    $rawProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $items = [];
    $currentDate = new DateTime();
    $currentDate->setTime(0, 0, 0);
    
// Loop through each product and check for expiration status
    foreach ($rawProducts as $p) {
        $productId = (string)$p['id'];
        $sku = $p['sku'];
        $productName = $p['productName'];
        $category = $p['category'] ?? 'General';
        $unitCost = (float)$p['costPrice'];
        $sellingPrice = (float)($p['sellingPrice'] ?? 0);
        $threshold = (int)($p['threshold'] ?? 10);
        $barcode = $p['barcode'] ?? $sku;

        $batchesRaw = $p['expiry_batches'] ?? null;
        $batches = [];
        if (!empty($batchesRaw)) {
            $decoded = is_string($batchesRaw) ? json_decode($batchesRaw, true) : $batchesRaw;
            if (is_array($decoded)) {
                $batches = $decoded;
            }
        }

        if (!empty($batches)) {
            foreach ($batches as $index => $batch) {
                $batchDateStr = $batch['date'] ?? '';
                $batchQty = (int)($batch['qty'] ?? 0);

                if (empty($batchDateStr) || $batchDateStr === 'No Expiry Date' || $batchQty <= 0) {
                    continue;
                }

                $batchDate = DateTime::createFromFormat('!Y-m-d', $batchDateStr);
                if (!$batchDate) {
                    $batchDate = new DateTime($batchDateStr);
                }
                if (!$batchDate) continue;
                $batchDate->setTime(0, 0, 0);

                $interval = $currentDate->diff($batchDate);
                $daysRemaining = (int)$interval->format('%r%a');

                if ($daysRemaining <= 30) {
                    $status = ($daysRemaining < 0) ? 'EXPIRED' : 'NEAR_EXPIRY';

                    $items[] = [
                        'id' => $productId,
                        'sku' => $sku,
                        'inventoryName' => $productName,
                        'category' => $category,
                        'quantity' => $batchQty, // Exact batch quantity (e.g. 1 pc)
                        'unitCost' => $unitCost,
                        'sellingPrice' => $sellingPrice,
                        'threshold' => $threshold,
                        'barcode' => $barcode,
                        'expiryDate' => $batchDate->format('Y-m-d'),
                        'status' => $status,
                        'daysRemaining' => $daysRemaining,
                        'batchIndex' => $index,
                        'batches' => $batches
                    ];
                }
            }
        } else {
            $expDate = $p['expirationDate'] ?? null;
            if (empty($expDate) || trim($expDate) === '') continue;

            $expDateTime = DateTime::createFromFormat('!Y-m-d', $expDate);
            if (!$expDateTime) {
                $expDateTime = new DateTime($expDate);
            }
            if (!$expDateTime) continue;
            $expDateTime->setTime(0, 0, 0);

            $interval = $currentDate->diff($expDateTime);
            $daysRemaining = (int)$interval->format('%r%a');

            if ($daysRemaining <= 30) {
                $status = ($daysRemaining < 0) ? 'EXPIRED' : 'NEAR_EXPIRY';

                $items[] = [
                    'id' => $productId,
                    'sku' => $sku,
                    'inventoryName' => $productName,
                    'category' => $category,
                    'quantity' => (int)$p['stockQuantity'],
                    'unitCost' => $unitCost,
                    'sellingPrice' => $sellingPrice,
                    'threshold' => $threshold,
                    'barcode' => $barcode,
                    'expiryDate' => $expDateTime->format('Y-m-d'),
                    'status' => $status,
                    'daysRemaining' => $daysRemaining,
                    'batchIndex' => null,
                    'batches' => []
                ];
            }
        }
    }

    echo json_encode(['success' => true, 'items' => $items]);

} catch (Throwable $e) {
    error_log('Product status error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB Error: ' . $e->getMessage()]);
}