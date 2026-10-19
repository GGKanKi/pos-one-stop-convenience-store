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
        // Query products table by productName, barcode, category, OR supplier
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
                threshold
            FROM products 
            WHERE productName LIKE ? OR barcode LIKE ? OR category LIKE ? OR supplier LIKE ?
            ORDER BY productName ASC
        ");
        $likeSearch = "%" . $search . "%";
        $stmt->execute([$likeSearch, $likeSearch, $likeSearch, $likeSearch]);
    } else {
        // Kukunin ang LAHAT ng 111 products (WALANG LIMIT)
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
                threshold
            FROM products 
            ORDER BY productName ASC
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
        "message" => "Unable to retrieve products: " . $e->getMessage()
    ]);
}
?>