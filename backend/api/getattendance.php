<?php
// Auth: Optional - if no user_id param, returns all staff attendance (admin mode)
// If user_id provided (via auth or param), returns single user attendance (staff mode)
// Response (staff mode): {success, attendance: [...], today_status: {... or null}}
// Response (admin mode): {success, attendance: [...], date: YYYY-MM-DD}

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require __DIR__ . '/../config/db.php';

// Get date from query param (default: today) - for admin mode
$date = $_GET['date'] ?? date('Y-m-d');

// FIXED: Support both JWT token and staff_id authentication - BLACKBOXAI
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
$token = str_replace('Bearer ', '', $authHeader);

// Get JSON body for staff_id method
$rawInput = file_get_contents("php://input");
$jsonData = json_decode($rawInput, true);
$staffIdFromBody = $jsonData['staff_id'] ?? null;

// Check for admin mode (no auth = get all staff attendance for date)
$adminMode = empty($token) && empty($staffIdFromBody);

$userId = 0;

// Method 1: JWT token in Authorization header (staff mode)
if ($token) {
    $decoded = base64_decode($token);
    $parts = explode(':', $decoded);
    $userId = (int)($parts[0] ?? 0);
}
// Method 2: staff_id in JSON body (staff mode)
elseif ($staffIdFromBody) {
    $stmt = $pdo->prepare("SELECT user_id FROM staff_ids WHERE staff_id = ?");
    $stmt->execute([$staffIdFromBody]);
    $row = $stmt->fetch();
    $userId = $row ? (int)$row['user_id'] : 0;
}

try {
    // ADMIN MODE: Return all staff attendance for a specific date
    if ($adminMode) {
        // Validate date format
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Invalid date format. Use YYYY-MM-DD."]);
            exit;
        }

        $stmt = $pdo->prepare("
            SELECT 
                u.id as user_id,
                s.staff_id,
                u.first_name,
                u.last_name,
                a.clock_in,
                a.clock_out,
                a.date
            FROM users u
            LEFT JOIN staff_ids s ON u.id = s.user_id
            LEFT JOIN attendance a ON u.id = a.user_id AND a.date = ?
            WHERE u.role = 'staff'
            ORDER BY u.first_name ASC, u.last_name ASC, a.clock_in DESC
        ");
        $stmt->execute([$date]);
        $attendance = $stmt->fetchAll();

        echo json_encode([
            "success" => true,
            "attendance" => $attendance,
            "date" => $date
        ]);
        exit;
    }

    // STAFF MODE: Return single user's attendance
    if (!$userId) {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Unauthorized."]);
        exit;
    }

    // Fetch recent attendance (last 30)
    $stmt = $pdo->prepare("
        SELECT id, clock_in, clock_out, date 
        FROM attendance 
        WHERE user_id = ? 
        ORDER BY date DESC, clock_in DESC 
        LIMIT 30
    ");
    $stmt->execute([$userId]);
    $attendance = $stmt->fetchAll();

    // Today's status - get the most recent record with clock_out IS NULL (open attendance)
    // FIXED: Check for open attendance first, then get latest record - BLACKBOXAI
    $stmt = $pdo->prepare("
        SELECT id, clock_in, clock_out 
        FROM attendance 
        WHERE user_id = ? AND date = CURDATE() AND clock_out IS NULL
        ORDER BY clock_in DESC
        LIMIT 1
    ");
    $stmt->execute([$userId]);
    $todayStatus = $stmt->fetch();
    
    // If no open attendance, get the most recent one (even if clocked out)
    if (!$todayStatus) {
        $stmt = $pdo->prepare("
            SELECT id, clock_in, clock_out 
            FROM attendance 
            WHERE user_id = ? AND date = CURDATE()
            ORDER BY clock_in DESC
            LIMIT 1
        ");
        $stmt->execute([$userId]);
        $todayStatus = $stmt->fetch();
    }

    echo json_encode([
        "success" => true,
        "attendance" => $attendance,
        "today_status" => $todayStatus ?: null
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Server error."
    ]);
}
?>
