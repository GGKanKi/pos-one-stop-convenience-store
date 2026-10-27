<?php
// CORS Headers configuration for API access
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Ensure the request method is strictly GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
    exit;
}

// Locate and include database configuration file safely
$dbPath = realpath(__DIR__ . '/../config/db.php');

if ($dbPath && file_exists($dbPath)) {
    require_once $dbPath;
} else {
    echo json_encode(["success" => false, "message" => "Database config file (config/db.php) missing."]);
    exit;
}

try {
    // Retrieve search query parameter if provided
    $search = trim($_GET['search'] ?? '');

    if (!empty($search)) {
        // Query products table matching search term against name, barcode, category, or supplier
        $stmt = $pdo->prepare("
            SELECT 
                id, 
                barcode,
                barcode AS code, 
                productName,
                productName AS name, 
                description, 
                costPrice,
                sellingPrice,
                sellingPrice AS price, 
                stockQuantity,
                stockQuantity AS stock,
                category,
                supplier,
                expirationDate,
                expiry_batches,
                threshold
            FROM products 
            WHERE productName LIKE ? OR barcode LIKE ? OR category LIKE ? OR supplier LIKE ?
            ORDER BY productName ASC
        ");
        $likeSearch = "%" . $search . "%";
        $stmt->execute([$likeSearch, $likeSearch, $likeSearch, $likeSearch]);
    } else {
        // Fetch all products without limitation, ordered alphabetically by product name
        $stmt = $pdo->query("
            SELECT 
                id, 
                barcode,
                barcode AS code, 
                productName,
                productName AS name, 
                description, 
                costPrice,
                sellingPrice,
                sellingPrice AS price, 
                stockQuantity,
                stockQuantity AS stock,
                category,
                supplier,
                expirationDate,
                expiry_batches,
                threshold
            FROM products 
            ORDER BY productName ASC
        ");
    }

    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Decode the JSON column so the inventory/POS receives a real batch array.
    foreach ($products as &$product) {
        $decodedBatches = json_decode((string)($product['expiry_batches'] ?? ''), true);
        $product['expiryBatches'] = is_array($decodedBatches) ? $decodedBatches : [];
        unset($product['expiry_batches']);
    }
    unset($product);

    // Return the successful JSON response with product count and list
    echo json_encode([
        "success" => true,
        "count" => count($products),
        "products" => $products
    ]);

} catch (Throwable $e) {
    // Catch database errors, log them, and return a 500 error response
    error_log("Get products error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Unable to retrieve products."]);
}
?>