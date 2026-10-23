<?php
require_once 'api/db.php';
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $defaults = [
        ['app_name','Peta Tematik'],
        ['app_motto','Peta Tematik Kantor Pertanahan Kota Probolinggo'],
        ['app_logo','images/logo.png'],
        ['app_favicon','images/favicon.png'],
        ['app_short_name','PetaTematik']
    ];
    foreach ($defaults as $d) {
        $stmt = $pdo->prepare('INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (?, ?)');
        $stmt->execute($d);
    }
    echo "OK\n";
} catch (Exception $e) {
    echo "ERR: " . $e->getMessage() . "\n";
}
