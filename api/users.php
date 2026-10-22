<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE");

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT id, username, role, created_at FROM users ORDER BY id DESC");
        $users = $stmt->fetchAll();
        echo json_encode(['status' => 'success', 'data' => $users]);
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) $input = $_POST;

    if (isset($input['username']) && isset($input['password']) && isset($input['role'])) {
        try {
            // Simple check if user exists
            $check = $pdo->prepare("SELECT id FROM users WHERE username = ?");
            $check->execute([$input['username']]);
            if ($check->fetch()) {
                echo json_encode(['status' => 'error', 'message' => 'Username sudah terdaftar']);
                exit;
            }

            $stmt = $pdo->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
            $stmt->execute([$input['username'], $input['password'], $input['role']]);
            echo json_encode(['status' => 'success', 'message' => 'User berhasil ditambahkan']);
        } catch(Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Lengkapi data user']);
    }
} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if ($id) {
        try {
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success', 'message' => 'User berhasil dihapus']);
        } catch(Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
}
?>
