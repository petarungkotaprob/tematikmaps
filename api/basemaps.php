<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM basemaps WHERE is_active = 1 ORDER BY created_at DESC");
        $basemaps = $stmt->fetchAll();
        echo json_encode(['status' => 'success', 'data' => $basemaps]);
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (isset($input['action']) && $input['action'] === 'update') {
        $id = $input['id'];
        $color = $input['color'];
        $name = $input['name'];
        $fill_type = isset($input['fill_type']) ? $input['fill_type'] : 'fill';
        $weight = isset($input['weight']) ? (int)$input['weight'] : 3;
        $dash_array = isset($input['dash_array']) ? $input['dash_array'] : '';
        $category_field = isset($input['category_field']) ? $input['category_field'] : null;
        $category_colors = isset($input['category_colors']) ? json_encode($input['category_colors']) : null;
        try {
            $stmt = $pdo->prepare("UPDATE basemaps SET color = ?, name = ?, fill_type = ?, weight = ?, dash_array = ?, category_field = ?, category_colors = ? WHERE id = ?");
            $stmt->execute([$color, $name, $fill_type, $weight, $dash_array, $category_field, $category_colors, $id]);
            echo json_encode(['status' => 'success', 'message' => 'Layer berhasil diupdate']);
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
} elseif ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id > 0) {
        try {
            // Soft delete or hard delete. Let's hard delete for simplicity or just delete row
            // We should also delete the file if we want, but let's just delete the DB record
            $stmtFilePath = $pdo->prepare("SELECT file_path FROM basemaps WHERE id = ?");
            $stmtFilePath->execute([$id]);
            if ($row = $stmtFilePath->fetch()) {
                $filePath = '../' . $row['file_path'];
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
            }
            $stmt = $pdo->prepare("DELETE FROM basemaps WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success', 'message' => 'Basemap berhasil dihapus']);
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid ID']);
    }
}
