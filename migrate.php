<?php
require_once 'api/db.php';

try {
    // 1. Rename tempat_tgl_lahir to no_telp if exists
    $pdo->exec("ALTER TABLE permohonan CHANGE COLUMN tempat_tgl_lahir no_telp VARCHAR(150) NOT NULL");
    echo "Renamed tempat_tgl_lahir to no_telp\n";
} catch (Exception $e) {
    echo "Warning or Info: " . $e->getMessage() . "\n";
}

try {
    // 2. Add luas_sertipikat
    $pdo->exec("ALTER TABLE permohonan ADD COLUMN luas_sertipikat VARCHAR(100) DEFAULT NULL AFTER nomor_hak");
    echo "Added luas_sertipikat\n";
} catch (Exception $e) {
    echo "Warning or Info: " . $e->getMessage() . "\n";
}

try {
    // 3. Add keadaan_tanah
    $pdo->exec("ALTER TABLE permohonan ADD COLUMN keadaan_tanah VARCHAR(255) DEFAULT NULL AFTER luas_sertipikat");
    echo "Added keadaan_tanah\n";
} catch (Exception $e) {
    echo "Warning or Info: " . $e->getMessage() . "\n";
}

echo "Database migration finished.\n";
?>
