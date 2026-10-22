<?php
/**
 * API for SILISA (Sistem Layanan Informasi Lahan Baku Sawah)
 */
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? null;

    if ($action === 'get_next_no') {
        try {
            $year = date('Y');
            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM permohonan WHERE no_permohonan LIKE ?");
            $stmt->execute(['%/' . $year]);
            $row = $stmt->fetch();
            $next_no = str_pad($row['total'] + 1, 3, '0', STR_PAD_LEFT);
            echo json_encode(['next_no' => $next_no]);
        } catch(Exception $e) {
            echo json_encode(['next_no' => '001']);
        }
    } elseif ($action === 'check_status') {
        $no = $_GET['no'] ?? '';
        try {
            $stmt = $pdo->prepare("SELECT * FROM permohonan WHERE no_permohonan = ?");
            $stmt->execute([$no]);
            $report = $stmt->fetch();
            if ($report) {
                echo json_encode(['status' => 'success', 'data' => $report]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Nomor permohonan tidak ditemukan']);
            }
        } catch(Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    } else {
        try {
            $stmt = $pdo->query("SELECT * FROM permohonan ORDER BY created_at DESC");
            $reports = $stmt->fetchAll();
            echo json_encode(['status' => 'success', 'data' => $reports]);
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    $action = $_GET['action'] ?? $input['action'] ?? null;

    if ($action === 'update_status') {
        if (!isset($input['id']) || !isset($input['status'])) {
            echo json_encode(['status' => 'error', 'message' => 'ID dan Status wajib ada']);
            exit;
        }
        try {
            // Auto-add style columns if not exist
            try { $pdo->exec("ALTER TABLE permohonan ADD COLUMN color VARCHAR(20) DEFAULT '#3b82f6'"); } catch(Exception $e) {}
            try { $pdo->exec("ALTER TABLE permohonan ADD COLUMN fill_type VARCHAR(20) DEFAULT 'fill'"); } catch(Exception $e) {}
            try { $pdo->exec("ALTER TABLE permohonan ADD COLUMN weight INT DEFAULT 2"); } catch(Exception $e) {}
            try { $pdo->exec("ALTER TABLE permohonan ADD COLUMN dash_array VARCHAR(20) DEFAULT ''"); } catch(Exception $e) {}

            $stmt = $pdo->prepare("UPDATE permohonan SET status=?, color=?, fill_type=?, weight=?, dash_array=? WHERE id=?");
            $stmt->execute([
                $input['status'],
                $input['color']      ?? '#3b82f6',
                $input['fill_type']  ?? 'fill',
                $input['weight']     ?? 2,
                $input['dash_array'] ?? '',
                $input['id']
            ]);
            echo json_encode(['status' => 'success', 'message' => 'Permohonan berhasil diperbarui']);
        } catch(Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'update_category') {
        if (!isset($input['id'])) {
            echo json_encode(['status' => 'error', 'message' => 'ID wajib ada']);
            exit;
        }
        try {
            // Add columns if they don't exist yet
            try { $pdo->exec("ALTER TABLE permohonan ADD COLUMN category_field VARCHAR(100) DEFAULT NULL"); } catch(Exception $e) {}
            try { $pdo->exec("ALTER TABLE permohonan ADD COLUMN category_colors TEXT DEFAULT NULL"); } catch(Exception $e) {}

            $category_field  = $input['category_field'] ?? null;
            $category_colors = isset($input['category_colors']) ? json_encode($input['category_colors']) : null;
            $stmt = $pdo->prepare("UPDATE permohonan SET category_field = ?, category_colors = ? WHERE id = ?");
            $stmt->execute([$category_field, $category_colors, $input['id']]);
            echo json_encode(['status' => 'success', 'message' => 'Konfigurasi warna kategori tersimpan']);
        } catch(Exception $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit;
    }

    $required = ['nama_pemohon', 'kecamatan', 'kelurahan'];
    $missing = [];
    foreach($required as $f) {
        if (!isset($input[$f]) || empty($input[$f])) {
            $missing[] = $f;
        }
    }

    if (empty($missing)) {
        try {
            $shp_file_path = null;
            if (isset($_FILES['shp_file']) && $_FILES['shp_file']['error'] === UPLOAD_ERR_OK) {
                $upload_dir = '../uploads/shp/';
                if (!is_dir($upload_dir)) mkdir($upload_dir, 0777, true);
                
                $filename = time() . '_' . basename($_FILES['shp_file']['name']);
                $target = $upload_dir . $filename;
                
                if (move_uploaded_file($_FILES['shp_file']['tmp_name'], $target)) {
                    $shp_file_path = 'uploads/shp/' . $filename;
                }
            }

            $stmt = $pdo->prepare("INSERT INTO permohonan (
                no_permohonan, nik, nama_pemohon, nama_kuasa, no_telp, 
                alamat, jenis_hak, nomor_hak, luas_sertipikat, keadaan_tanah,
                kecamatan, kelurahan, latitude, longitude, keperluan, shp_file, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')");
            
            $stmt->execute([
                $input['no_permohonan'] ?? null,
                $input['nik'] ?? null,
                $input['nama_pemohon'],
                $input['nama_kuasa'] ?? null,
                $input['no_telp'] ?? null,
                $input['alamat'] ?? null,
                $input['jenis_hak'] ?? null,
                $input['nomor_hak'] ?? null,
                $input['luas_sertipikat'] ?? null,
                $input['keadaan_tanah'] ?? null,
                $input['kecamatan'],
                $input['kelurahan'],
                $input['latitude'] ?? null,
                $input['longitude'] ?? null,
                $input['keperluan'] ?? null,
                $shp_file_path
            ]);
            
            echo json_encode(['status' => 'success', 'message' => 'Laporan berhasil disimpan', 'id' => $pdo->lastInsertId()]);
        } catch(Exception $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Lengkapi kolom mandatory parameter saat input data', 'missing' => $missing]);
    }
} elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        echo json_encode(['status' => 'error', 'message' => 'ID wajib ada']);
        exit;
    }
    try {
        $stmt = $pdo->prepare("DELETE FROM permohonan WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['status' => 'success', 'message' => 'Permohonan berhasil dihapus']);
    } catch(Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}
?>
