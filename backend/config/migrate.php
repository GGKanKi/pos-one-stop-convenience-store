<?php
require_once __DIR__ . '/db.php'; // Connection

// TO RUN THIS TYPE THIS IN TERMINAL
// php backend/config/migrate.php


$conn = $pdo;


// Migration Tracker For New Database Addition For Local Machine
$conn->query("
    CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR (255) NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
");


// Get already-run migrations
$ran = []; // Already Running SQL Databases
$result = $conn->query("SELECT filename FROM migrations");
while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
    $ran[] = $row['filename'];
}


// Scan Migrations Files By Number (Sorting)
$files = glob(__DIR__ . '/../migrations/*.sql'); // * Means ALL FILE that are .sql
sort($files);


// Iteration Looping
$count = 0;
foreach ($files as $file) {

    $filename = basename($file);


    // If FIle name is already running in Database and is Checked by function skip table creation
    if (in_array($filename, $ran)) {
        echo " [skip] $filename\n";
        continue;
    }

    $sql = file_get_contents($file);

    // Run through each file INDIVIDUALLY (Checker)
    $conn->exec(sql);


    // Record the Files By Inserting File Data into MIGRATIONS table
    $stmt = $conn->prepare("INSERT IGNORE INTO migrations (filename) VALUES (?)");
    $stmt->execute([$filename]);


    // Continouos Logging Of File Transfer Until All files are ran
    echo "  [OK]    $filename\n";
    $count++;

}

echo "\nDone. $count migration(s) ran.\n";
$conn = null;

?>