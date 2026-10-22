<?php
require 'api/db.php';
try {
    $pdo->exec('ALTER TABLE permohonan ADD COLUMN shp_file VARCHAR(255) DEFAULT NULL;');
    echo 'OK';
} catch (Exception $e) {
    echo $e->getMessage();
}
?>
