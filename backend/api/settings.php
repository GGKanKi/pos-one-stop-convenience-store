<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // Check if Current User if Authorized


require __DIR__ . '/../config/db.php'; // PDO connection


$headers = getallheaders();
$token = $headers['Authorization'] ?? '';


if ($token) {
    // Extract User through decoding
    $decodedToken = base64_decode($token);

    $parts = explode(':', $decodedToken);
    $userId = $parts[0] ?? null;

}



try {

    if (!$userId) {
        http_response_code(401);
        echo json_encode([
            "success" => false,
            "message" => "Unauthorized. Invalid token format."
        ]);
        exit;
    }


    // QUERY DB
    // JOIN TABLE TO GET ALL DATA
    // SELECT * AND DATA FROM STAFF_IDS TABLE WHERE THE USER ID MATCHES THE DECODED USER ID FROM LOGIN TOKEN
    $stmt = $pdo->prepare(
        "SELECT u.*, s.avatar as staff_avatar, s.staff_id
        FROM users u
        LEFT JOIN staff_ids s ON u.id = s.user_id
        WHERE u.id = ?"
    );
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if ($user) {
        echo json_encode([
            "success" => true,
            "user" => [
                "id" => $user['id'],
                "first_name" => $user['first_name'],
                "last_name" => $user['last_name'],
                "email" => $user['email'],
                "role" => $user['role'],
                "staff_id" => $user['staff_id'] ?? null,
                "avatar" => $user['staff_avatar'] ?? null
            ]
        ]);
    } else {
        http_response_code(404);
        echo json_encode([
            "success" => false,
            "message" => "User not found."
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "An error occurred while fetching user data."
    ]);
}

?>