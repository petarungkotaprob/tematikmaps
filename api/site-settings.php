<?php
/**
 * Site Settings API - get/save
 */
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'db.php';

try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
} catch (Exception $e) {}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $stmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
        $settings = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $settings[$row['setting_key']] = $row['setting_value'];
        }
        // Defaults
        if (!isset($settings['app_name'])) $settings['app_name'] = 'Peta Tematik';
        if (!isset($settings['app_motto'])) $settings['app_motto'] = 'Peta Tematik Kantor Pertanahan Kota Probolinggo';
        if (!isset($settings['app_logo'])) $settings['app_logo'] = 'images/logo.png';
        if (!isset($settings['app_favicon'])) $settings['app_favicon'] = 'images/favicon.png';
        echo json_encode(['status' => 'success', 'settings' => $settings]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }
    
    try {
        $pdo->beginTransaction();
        $allowed = ['app_name','app_motto','app_logo','app_favicon','app_logo2','app_short_name'];
        foreach ($allowed as $key) {
            if (isset($input[$key])) {
                $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
                $stmt->execute([$key, $input[$key]]);
            }
        }
        $pdo->commit();
        echo json_encode(['status' => 'success', 'message' => 'Pengaturan sistem berhasil disimpan']);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

http_response_code(405);
echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
