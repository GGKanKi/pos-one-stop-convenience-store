<?php
// Pigilan ang PHP HTML Output para maiwasan ang JSON parse errors
ini_set('display_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // 1. DATABASE CONNECTION SETUP
    $host = "localhost";
    $dbname = "onestop_store";
    $user = "root";
    $pass = "";

    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

    // 2. READING THE PAYLOAD FROM THE POS
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);

    if (!$data || empty($data['items'])) {
        echo json_encode([
            "success" => false,
            "message" => "Walang natanggap na items o invalid JSON format."
        ]);
        exit();
    }

    $paymentMethod = isset($data['paymentMethod']) ? strval($data['paymentMethod']) : 'Cash';
    $totalAmount = isset($data['totalAmount']) ? floatval($data['totalAmount']) : 0.00;
    $items = $data['items'];

    // 3.SAVING SA MAIN TRANSACTIONS TABLE
    $stmt = $pdo->prepare("INSERT INTO transactions (payment_method, total_amount, created_at) VALUES (?, ?, NOW())");
    $stmt->execute([$paymentMethod, $totalAmount]);
    $transactionId = $pdo->lastInsertId();

    // 4. SAVING SA TRANSACTION_ITEMS TABLE
    $itemStmt = $pdo->prepare("INSERT INTO transaction_items (transaction_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)");

    foreach ($items as $item) {
        $pId = isset($item['id']) ? intval($item['id']) : 0;
        $pName = isset($item['name']) ? strval($item['name']) : 'Item';
        $pPrice = isset($item['price']) ? floatval($item['price']) : 0.00;
        $pQty = isset($item['qty']) ? intval($item['qty']) : 1;

        $itemStmt->execute([$transactionId, $pId, $pName, $pPrice, $pQty]);
    }

    // 5. SUCCESSFUL JSON RESPONSE
    echo json_encode([
        "success" => true,
        "message" => "Transaction saved successfully!",
        "transaction_id" => $transactionId
    ]);
    exit();

} catch (PDOException $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database Error: " . $e->getMessage()
    ]);
    exit();
} catch (Throwable $e) {
    echo json_encode([
        "success" => false,
        "message" => "Server Error: " . $e->getMessage()
    ]);
    exit();
}
?>