<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
require __DIR__ . '/../config/db.php';

try {
    if (isset($_GET['month'])) {
        $month = $_GET['month'];
        if (!preg_match('/^\d{4}-\d{2}$/', $month) || !checkdate((int)substr($month, 5, 2), 1, (int)substr($month, 0, 4))) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid month. Use YYYY-MM."]);
            exit;
        }
        $start = $month . '-01';
        $end = date('Y-m-d', strtotime($start . ' +1 month'));
        $stmt = $pdo->prepare("SELECT u.id AS user_id, u.staff_id, u.first_name, u.last_name, a.id AS attendance_id, a.clock_in, a.clock_out, a.date FROM users u LEFT JOIN attendance a ON u.id = a.user_id AND a.date >= ? AND a.date < ? WHERE u.role IN ('cashier', 'staff') ORDER BY u.first_name, u.last_name, a.date DESC, (a.clock_out IS NULL) DESC, a.clock_in DESC, a.id DESC");
        $stmt->execute([$start, $end]);
        echo json_encode(["success" => true, "attendance" => $stmt->fetchAll(), "month" => $month]);
        exit;
    }
    $date = $_GET['date'] ?? date('Y-m-d');
    $parsed = DateTime::createFromFormat('!Y-m-d', $date);
    if (!$parsed || $parsed->format('Y-m-d') !== $date) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid date. Use YYYY-MM-DD."]);
        exit;
    }
    $stmt = $pdo->prepare("SELECT u.id AS user_id, u.staff_id, u.first_name, u.last_name, a.id AS attendance_id, a.clock_in, a.clock_out, a.date FROM users u LEFT JOIN attendance a ON a.id = (SELECT a2.id FROM attendance a2 WHERE a2.user_id = u.id AND a2.date = ? ORDER BY (a2.clock_out IS NULL) DESC, a2.clock_in DESC, a2.id DESC LIMIT 1) WHERE u.role IN ('cashier', 'staff') ORDER BY u.first_name, u.last_name");
    $stmt->execute([$date]);
    echo json_encode(["success" => true, "attendance" => $stmt->fetchAll(), "date" => $date]);
} catch (PDOException $e) {
    error_log("Get attendance error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Unable to fetch attendance."]);
}
?>
