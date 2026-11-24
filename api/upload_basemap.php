<?php
error_reporting(0);
ini_set('display_errors', 0);
header("Content-Type: application/json");
require_once 'db.php';

const SHP_MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Validasi file SHP yang diunggah (.shp / .zip).
 * Mengembalikan pesan error, atau null jika valid.
 */
function shpUploadValidationError(array $file) {
    if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
        return 'Gagal mengunggah file (kode error: ' . ($file['error'] ?? 'unknown') . ')';
    }
    $ext = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
    if (!in_array($ext, ['shp', 'zip'], true)) {
        return 'Format file harus .shp atau .zip';
    }
    if (($file['size'] ?? 0) > SHP_MAX_UPLOAD_BYTES) {
        return 'Ukuran file maksimal 50 MB';
    }
    if (!is_uploaded_file($file['tmp_name'])) {
        return 'File upload tidak valid';
    }
    return null;
}

function shpSafeFilename($originalName) {
    $clean = preg_replace('/[^a-zA-Z0-9_\.-]/', '_', basename((string)$originalName));
    if ($clean === '' || $clean === null) $clean = 'upload.shp';
    return time() . '_' . bin2hex(random_bytes(4)) . '_' . $clean;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? $_GET['action'] ?? null;
    $id = isset($_POST['id']) ? (int)$_POST['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);

    // KASUS 1: UPDATE FILE SHP DENGAN SHP BARU UNTUK BASEMAP YANG SUDAH ADA
    if ($action === 'update_shp' || ($id > 0 && isset($_FILES['basemap']) && !isset($_POST['name']))) {
        if ($id <= 0 || !isset($_FILES['basemap'])) {
            echo json_encode(['status' => 'error', 'message' => 'ID layer dan file SHP baru wajib ada']);
            exit;
        }

        $file = $_FILES['basemap'];
        $uploadError = shpUploadValidationError($file);
        if ($uploadError !== null) {
            echo json_encode(['status' => 'error', 'message' => $uploadError]);
            exit;
        }

        // Ambil info file lama
        $stmtOld = $pdo->prepare("SELECT file_path, name FROM basemaps WHERE id = ?");
        $stmtOld->execute([$id]);
        $oldRow = $stmtOld->fetch();
        if (!$oldRow) {
            echo json_encode(['status' => 'error', 'message' => 'Layer basemap tidak ditemukan']);
            exit;
        }

        $uploadDir = '../uploads/basemaps/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $fileName = shpSafeFilename($file['name']);
        $targetFile = $uploadDir . $fileName;

        if (move_uploaded_file($file['tmp_name'], $targetFile)) {
            // Hapus file lama dari disk jika ada
            if (!empty($oldRow['file_path'])) {
                $oldDiskPath = '../' . $oldRow['file_path'];
                if (file_exists($oldDiskPath) && is_file($oldDiskPath)) {
                    @unlink($oldDiskPath);
                }
            }

            try {
                $newPath = 'uploads/basemaps/' . $fileName;
                $stmt = $pdo->prepare("UPDATE basemaps SET file_path = ? WHERE id = ?");
                $stmt->execute([$newPath, $id]);
                echo json_encode([
                    'status' => 'success',
                    'message' => 'File SHP berhasil diperbarui dengan SHP baru',
                    'file_path' => $newPath
                ]);
            } catch(Exception $e) {
                echo json_encode(['status' => 'error', 'message' => 'Gagal memperbarui database: ' . $e->getMessage()]);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Gagal memindahkan file yang diunggah']);
        }
        exit;
    }

    // KASUS 2: UPLOAD BASEMAP BARU
    if (isset($_FILES['basemap']) && isset($_POST['name'])) {
        $name = trim((string)$_POST['name']);
        if ($name === '') {
            echo json_encode(['status' => 'error', 'message' => 'Nama basemap tidak boleh kosong']);
            exit;
        }
        $file = $_FILES['basemap'];
        $uploadError = shpUploadValidationError($file);
        if ($uploadError !== null) {
            echo json_encode(['status' => 'error', 'message' => $uploadError]);
            exit;
        }
        
        $uploadDir = '../uploads/basemaps/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        
        $color = isset($_POST['color']) ? $_POST['color'] : '#3b82f6';
        $fileName = shpSafeFilename($file['name']);
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
