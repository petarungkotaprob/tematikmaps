<?php
require 'api/db.php';
$stmt = $pdo->query('SELECT no_permohonan, shp_file FROM permohonan ORDER BY id DESC LIMIT 5');
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
