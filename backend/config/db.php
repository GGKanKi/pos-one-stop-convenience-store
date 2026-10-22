<?php
//database configuration (host, db name, user, pass)
$host = "localhost";
$dbname = "onestop_store";
$user = "root";
$pass = "";

//creating a pdo connection to the mysql database
try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $user,
        $pass
    );  

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    // Keep API responses parseable and log the underlying details only on the server.
    error_log("Database connection failed: " . $e->getMessage());
    http_response_code(500);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode(["success" => false, "message" => "Database connection failed."]);
    exit;
}
?>
