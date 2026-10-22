<?php
error_reporting(0);
ini_set('display_errors', 0);
header("Content-Type: application/json");
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_FILES['basemap']) && isset($_POST['name'])) {
        $name = $_POST['name'];
        $file = $_FILES['basemap'];
        
        $uploadDir = '../uploads/basemaps/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        $color = isset($_POST['color']) ? $_POST['color'] : '#3b82f6';
        $fileName = time() . '_' . basename($file['name']);
        $targetFile = $uploadDir . $fileName;
        
        if (move_uploaded_file($file['tmp_name'], $targetFile)) {
            try {
                $stmt = $pdo->prepare("INSERT INTO basemaps (name, file_path, is_active, color) VALUES (?, ?, 1, ?)");
                $stmt->execute([$name, 'uploads/basemaps/' . $fileName, $color]);
                echo json_encode(['status' => 'success', 'message' => 'Basemap berhasil diunggah']);
            } catch(Exception $e) {
                echo json_encode(['status' => 'error', 'message' => 'Gagal simpan ke database: ' . $e->getMessage()]);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Gagal mengunggah file']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Parameter tidak lengkap']);
    }
}
?>
