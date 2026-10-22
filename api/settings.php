<?php
/**
 * Update Account / Settings API
 */
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
    if (isset($input['user_id']) && isset($input['new_username'])) {
        $userId = (int)$input['user_id'];
        $newUsername = trim($input['new_username']);
        $newPassword = isset($input['new_password']) ? trim($input['new_password']) : '';

        try {
            // Cek apakah username sudah dipakai orang lain
            $checkStmt = $pdo->prepare("SELECT id FROM users WHERE username = ? AND id != ?");
            $checkStmt->execute([$newUsername, $userId]);
            if ($checkStmt->fetch()) {
                http_response_code(409);
                echo json_encode(['status' => 'error', 'message' => 'Username tersebut sudah dipakai.']);
                exit;
            }

            // Update proses
            if (!empty($newPassword)) {
                // Update Keduanya
                $stmt = $pdo->prepare("UPDATE users SET username = ?, password = ? WHERE id = ?");
                $stmt->execute([$newUsername, $newPassword, $userId]);
            } else {
                // Update Username saja (password tetap)
                $stmt = $pdo->prepare("UPDATE users SET username = ? WHERE id = ?");
                $stmt->execute([$newUsername, $userId]);
            }

            echo json_encode([
                'status' => 'success',
                'message' => 'Informasi akun berhasil diubah!',
                'new_username' => $newUsername
            ]);

        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => 'Gagal mengubah pengaturan: ' . $e->getMessage()]);
        }
    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'User ID dan Username Baru wajib diisi']);
    }
} else {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
}
?>
