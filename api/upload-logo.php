<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

$targetDir = __DIR__ . '/../images/';
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0777, true);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_FILES['logo']) || isset($_FILES['logo2'])) {
        $file = isset($_FILES['logo']) ? $_FILES['logo'] : $_FILES['logo2'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg','jpeg','png','gif','webp','ico','svg'];
        if (!in_array($ext, $allowed)) {
            http_response_code(400);
            echo json_encode(['status'=>'error','message'=>'Format tidak diizinkan']);
            exit;
        }
        $name = 'logo_' . time() . '_' . rand(100,999) . '.' . $ext;
        $target = $targetDir . $name;
        if (move_uploaded_file($file['tmp_name'], $target)) {
            echo json_encode(['status'=>'success','path'=>'images/'.$name]);
        } else {
            http_response_code(500);
            echo json_encode(['status'=>'error','message'=>'Gagal upload']);
        }
        exit;
    }
    if (isset($_FILES['favicon'])) {
        $file = $_FILES['favicon'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg','jpeg','png','gif','webp','ico','svg'];
        if (!in_array($ext, $allowed)) {
            http_response_code(400);
            echo json_encode(['status'=>'error','message'=>'Format tidak diizinkan']);
            exit;
        }
        $name = 'favicon_' . time() . '_' . rand(100,999) . '.' . $ext;
        $target = $targetDir . $name;
        if (move_uploaded_file($file['tmp_name'], $target)) {
            echo json_encode(['status'=>'success','path'=>'images/'.$name]);
        } else {
            http_response_code(500);
            echo json_encode(['status'=>'error','message'=>'Gagal upload']);
        }
        exit;
    }
}

http_response_code(400);
echo json_encode(['status'=>'error','message'=>'No file uploaded']);
