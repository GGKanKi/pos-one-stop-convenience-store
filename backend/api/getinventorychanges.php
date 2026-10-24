<?php
// inventory approvals part
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
    // Check if user_id or requested_by exists in the table
    $columnsStmt = $pdo->query("SHOW COLUMNS FROM inventory_change_requests");
    $columns = $columnsStmt->fetchAll(PDO::FETCH_COLUMN);
    
    $userCol = in_array('user_id', $columns) ? 'user_id' : (in_array('requested_by', $columns) ? 'requested_by' : null);
    
    $userJoinSql = "";
    $userSelectSql = "1 AS requested_by, 'Staff' AS first_name, '' AS last_name, '' AS email,";
    
    if ($userCol) {
        $userSelectSql = "COALESCE(r.{$userCol}, 1) AS requested_by, COALESCE(u.first_name, 'Staff') AS first_name, COALESCE(u.last_name, '') AS last_name, u.email,";
        $userJoinSql = "LEFT JOIN users u ON r.{$userCol} = u.id";
    }

    $stmt = $pdo->prepare("
        SELECT 
            r.id,
            r.action_type,
            r.product_id,
            p.productName AS db_product_name,
            {$userSelectSql}
            r.before_data,
            r.requested_data,
            r.status,
            r.created_at
        FROM inventory_change_requests r
        LEFT JOIN products p ON r.product_id = p.id
        {$userJoinSql}
        WHERE LOWER(TRIM(r.status)) = 'pending'
        ORDER BY r.created_at DESC
    ");
    
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $formattedRequests = [];
    foreach ($rows as $row) {
        $beforeData = !empty($row['before_data']) ? json_decode($row['before_data'], true) : null;
        $requestedData = !empty($row['requested_data']) ? json_decode($row['requested_data'], true) : [];

        $pName = $row['db_product_name'] ?? '';
        if (empty($pName) && is_array($requestedData)) {
            $pName = $requestedData['productName'] ?? $requestedData['name'] ?? 'Unnamed Product';
        }

        $formattedRequests[] = [
            'id' => (int)$row['id'],
            'action_type' => strtolower(trim($row['action_type'])),
            'product_id' => $row['product_id'] ? (int)$row['product_id'] : null,
            'requested_by' => (int)($row['requested_by'] ?? 1),
            'first_name' => $row['first_name'] ?? 'Staff',
            'last_name' => $row['last_name'] ?? '',
            'email' => $row['email'] ?? '',
            'before_data' => $beforeData,
            'requested_data' => $requestedData,
            'status' => $row['status'],
            'created_at' => $row['created_at'],
        ];
    }

    echo json_encode([
        'success' => true,
        'message' => 'Pending requests fetched successfully.',
        'data' => [
            'requests' => $formattedRequests,
            'count' => count($formattedRequests)
        ]
    ]);

} catch (Throwable $e) {
    error_log("Get inventory changes error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Unable to retrieve requests: ' . $e->getMessage()
    ]);
}