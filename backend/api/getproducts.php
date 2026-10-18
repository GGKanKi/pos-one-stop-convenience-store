<?php
// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Locate database configuration
$dbPath = realpath(__DIR__ . '/../config/db.php');

if ($dbPath && file_exists($dbPath)) {
    require_once $dbPath;
} else {
    echo json_encode(["success" => false, "message" => "Database config file (config/db.php) missing."]);
    exit;
}

try {
    $search = trim($_GET['search'] ?? '');

    if (!empty($search)) {
        // Query products table by productName OR barcode
        $stmt = $pdo->prepare("
            SELECT 
                id, 
                barcode AS code, 
                productName AS name, 
                description, 
                sellingPrice AS price, 
                stockQuantity AS stock,
                category
            FROM products 
            WHERE productName LIKE ? OR barcode LIKE ?
            ORDER BY productName ASC
            LIMIT 25
        ");
        $likeSearch = "%" . $search . "%";
        $stmt->execute([$likeSearch, $likeSearch]);
    } else {
        // Fetch products list
        $stmt = $pdo->query("
            SELECT 
                id, 
                barcode AS code, 
                productName AS name, 
                description, 
                sellingPrice AS price, 
                stockQuantity AS stock,
                category
            FROM products 
            ORDER BY productName ASC
            LIMIT 50
        ");
    }

    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "count" => count($products),
        "products" => $products
    ]);

} catch (PDOException $e) {
    error_log("Get products error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => "Unable to retrieve products."
    ]);
}
?>