<?php
require __DIR__ . '/../config/db.php';

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed."]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid JSON request."]);
    exit;
}

$required = ['productName', 'barcode', 'stockQuantity', 'costPrice', 'sellingPrice', 'category'];
foreach ($required as $field) {
    if (!isset($data[$field]) || trim((string)$data[$field]) === '') {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Required field missing: " . $field]);
        exit;
    }
}

$productName = trim((string)$data['productName']);
$barcode = trim((string)$data['barcode']);
$stockQuantity = filter_var($data['stockQuantity'], FILTER_VALIDATE_INT);
$costPrice = filter_var($data['costPrice'], FILTER_VALIDATE_FLOAT);
$sellingPrice = filter_var($data['sellingPrice'], FILTER_VALIDATE_FLOAT);
$threshold = isset($data['threshold']) && $data['threshold'] !== ''
    ? filter_var($data['threshold'], FILTER_VALIDATE_INT)
    : 5;

if ($stockQuantity === false || $stockQuantity < 0 ||
    $costPrice === false || $costPrice < 0 ||
    $sellingPrice === false || $sellingPrice < 0 ||
    $threshold === false || $threshold < 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Stock, prices, and threshold must be valid non-negative numbers."]);
    exit;
}

$expirationDate = !empty($data['expirationDate']) ? $data['expirationDate'] : null;
if ($expirationDate !== null) {
    $date = DateTime::createFromFormat('Y-m-d', $expirationDate);
    if (!$date || $date->format('Y-m-d') !== $expirationDate) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Expiration date must use YYYY-MM-DD format."]);
        exit;
    }
}

try {
    $stmt = $pdo->prepare("
        INSERT INTO products
            (productName, barcode, description, stockQuantity, costPrice, sellingPrice,
             category, supplier, expirationDate, threshold)
        VALUES
            (:productName, :barcode, :description, :stockQuantity, :costPrice, :sellingPrice,
             :category, :supplier, :expirationDate, :threshold)
    ");

    $stmt->execute([
        ':productName' => $productName,
        ':barcode' => $barcode,
        ':description' => isset($data['description']) && trim((string)$data['description']) !== ''
            ? trim((string)$data['description']) : null,
        ':stockQuantity' => $stockQuantity,
        ':costPrice' => $costPrice,
        ':sellingPrice' => $sellingPrice,
        ':category' => trim((string)$data['category']),
        ':supplier' => isset($data['supplier']) && trim((string)$data['supplier']) !== ''
            ? trim((string)$data['supplier']) : null,
        ':expirationDate' => $expirationDate,
        ':threshold' => $threshold
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Product added successfully.",
        "id" => (int)$pdo->lastInsertId()
    ]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "That barcode already exists. Please use a unique barcode."]);
    } else {
        error_log("Add product error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Unable to save the product."]);
    }
}
?>
