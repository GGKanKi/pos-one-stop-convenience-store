<?php
require __DIR__. '/../config/db.php'; // add database connection (pdo)

try {

    // insert test user
    $stmt = $pdo->prepare("
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES (:email, :password, :first_name, :last_name, 'admin')
    ");

    $stmt->execute([
        'email' => 'admin@gmail.com',
        'password' => password_hash('123456', PASSWORD_DEFAULT),
        'first_name' => 'Admin',
        'last_name' => 'Admin'
    ]);
    echo "Test user inserted successfully.";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
