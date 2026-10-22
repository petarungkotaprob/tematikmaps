<?php
/**
 * SILISA - Database Connection
 */
require_once __DIR__ . '/env.php';

loadEnv(dirname(__DIR__) . '/.env');

$host    = envValue('DB_HOST', '127.0.0.1');
$db      = envValue('DB_NAME', 'tematik_db');
$user    = envValue('DB_USER', 'root');
$pass    = envValue('DB_PASS', '');
$charset = envValue('DB_CHARSET', 'utf8mb4');

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Koneksi database gagal.']);
    exit;
}
