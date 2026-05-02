<?php
// No auth required - public list
// Response: {success, staff: [{id, first_name, last_name, staff_id, avatar}, ...]}
// MODIFIED: Added try-catch for stmt methods (execute, fetchAll) - BLACKBOXAI

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require __DIR__ . '/../config/db.php';

try {
    // Fetch all staff (role='staff') LEFT JOIN staff_ids
    $stmt = $pdo->prepare("
        SELECT u.id, u.first_name, u.last_name, s.staff_id, s.avatar 
        FROM users u 
        LEFT JOIN staff_ids s ON u.id = s.user_id 
        WHERE u.role = 'staff' 
        ORDER BY u.first_name ASC, u.last_name ASC
    ");
    
    // MODIFIED: Wrapped execute() in try-catch - BLACKBOXAI
    try {
        $stmt->execute();
    } catch (PDOException $e) {
        throw new PDOException("Execute failed: " . $e->getMessage(), (int)$e->getCode(), $e);
    }
    
    // MODIFIED: Wrapped fetchAll() in try-catch - BLACKBOXAI
    $staff = [];
    try {
        $staff = $stmt->fetchAll();
    } catch (PDOException $e) {
        throw new PDOException("FetchAll failed: " . $e->getMessage(), (int)$e->getCode(), $e);
    }

    echo json_encode([
        "success" => true,
        "staff" => $staff
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
}
?>
