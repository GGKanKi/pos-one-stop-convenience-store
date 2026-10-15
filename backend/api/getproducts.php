<?php
require __DIR__ . '/../config/db.php';

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Method not allowed."
    ]);
    exit;
}

try {
    $stmt = $pdo->query("
        SELECT
            id,
            productName,
            barcode,
            description,
            stockQuantity,
            costPrice,
            sellingPrice,
            category,
            supplier,
            expirationDate,
            threshold
        FROM products
        ORDER BY productName ASC
    ");

    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "count" => count($products),
        "products" => $products
    ]);

} catch (PDOException $e) {
    http_response_code(500);

    error_log("Get products error: " . $e->getMessage());

    echo json_encode([
        "success" => false,
        "message" => "Unable to retrieve products."
    ]);
}
?>