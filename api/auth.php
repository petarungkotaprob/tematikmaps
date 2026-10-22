<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'db.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_POST;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($input['username']) && isset($input['password'])) {
        $username = trim($input['username']);
        $password = trim($input['password']);

        try {
            // Find User
            $stmt = $pdo->prepare("SELECT id, username, password, role FROM users WHERE username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            if ($user && (password_verify($password, $user['password']) || $password === $user['password'] || md5($password) === $user['password'])) {
                // Secure Session Simulation (Just return success with token/data for JS)
                // In production, we'd use session_start() and $_SESSION
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Login Berhasil',
                    'user' => [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'role' => $user['role']
                    ]
                ]);
            } else {
                http_response_code(401);
                echo json_encode(['status' => 'error', 'message' => 'Username atau Password salah!']);
            }
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal koneksi server: ' . $e->getMessage()]);
        }
    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Username dan Password wajib diisi']);
    }
} else {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
}
?>
