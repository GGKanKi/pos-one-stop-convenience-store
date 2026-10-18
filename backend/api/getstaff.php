<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';

try {
    $stmt = $pdo->prepare(
        "SELECT id, first_name, last_name, email, role, staff_id, avatar
         FROM users
         WHERE role = 'staff'
         ORDER BY first_name, last_name"
    );
    $stmt->execute();

    echo json_encode([
        "success" => true,
        "staff" => $stmt->fetchAll(PDO::FETCH_ASSOC)
    ]);
} catch (PDOException $e) {
    error_log("Get staff error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Unable to fetch staff profiles."
    ]);
}
?>