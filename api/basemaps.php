<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");

require_once 'db.php';

/**
 * Pastikan kolom pengaturan simbol & label tersedia.
 * Migrasi otomatis agar instalasi lama tetap berjalan.
 */
function ensureBasemapStyleColumns($pdo) {
    static $done = false;
    if ($done) return;
    $done = true;

    try {
        $existing = [];
        foreach ($pdo->query("SHOW COLUMNS FROM basemaps") as $row) {
            $existing[$row['Field']] = true;
        }

        $columns = [
            'symbol'      => "VARCHAR(20) NOT NULL DEFAULT 'circle'",
            'symbol_size' => "INT(3) NOT NULL DEFAULT 7",
            'label_field' => "VARCHAR(100) DEFAULT NULL",
            'label_size'  => "INT(3) NOT NULL DEFAULT 11",
            'label_color' => "VARCHAR(20) NOT NULL DEFAULT '#202124'",
            'label_halo'  => "TINYINT(1) NOT NULL DEFAULT 1",
            'label_mode'  => "VARCHAR(20) NOT NULL DEFAULT 'permanent'",
        ];

        foreach ($columns as $column => $definition) {
            if (!isset($existing[$column])) {
                $pdo->exec("ALTER TABLE basemaps ADD COLUMN `$column` $definition");
            }
        }
    } catch (Exception $e) {
        // Biarkan query utama menampilkan pesan error yang lebih jelas.
    }
}

function isHexColor($value) {
    return is_string($value) && preg_match('/^#[0-9a-fA-F]{6}$/', $value) === 1;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    ensureBasemapStyleColumns($pdo);
    try {
        $stmt = $pdo->query("SELECT * FROM basemaps WHERE is_active = 1 ORDER BY created_at DESC");
        $basemaps = $stmt->fetchAll();
        echo json_encode(['status' => 'success', 'data' => $basemaps]);
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    ensureBasemapStyleColumns($pdo);

    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        $input = [];
    }

    if (!isset($input['action']) || $input['action'] !== 'update') {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Aksi tidak valid']);
        exit;
    }

    $id = isset($input['id']) ? (int)$input['id'] : 0;
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'ID tidak valid']);
        exit;
    }

    $allowedSymbols = ['circle', 'square', 'triangle', 'diamond', 'star', 'pin'];
    $updates = [];
    $params  = [];

    try {
        if (array_key_exists('name', $input)) {
            $name = trim((string)$input['name']);
            if ($name === '' || mb_strlen($name) > 100) {
                throw new InvalidArgumentException('Nama layer tidak valid.');
            }
            $updates[] = 'name = ?';
            $params[]  = $name;
        }

        if (array_key_exists('color', $input)) {
            if (!isHexColor($input['color'])) throw new InvalidArgumentException('Warna layer tidak valid.');
            $updates[] = 'color = ?';
            $params[]  = strtolower($input['color']);
        }

        if (array_key_exists('fill_type', $input)) {
            $fillType = $input['fill_type'];
            if (!in_array($fillType, ['fill', 'hollow'], true)) throw new InvalidArgumentException('Tipe fill tidak valid.');
            $updates[] = 'fill_type = ?';
            $params[]  = $fillType;
        }

        if (array_key_exists('weight', $input)) {
            $weight = (int)$input['weight'];
            if ($weight < 1 || $weight > 10) throw new InvalidArgumentException('Ketebalan garis harus 1-10.');
            $updates[] = 'weight = ?';
            $params[]  = $weight;
        }

        if (array_key_exists('dash_array', $input)) {
            $dash = (string)$input['dash_array'];
            if (!in_array($dash, ['', '5,5', '10,5'], true)) throw new InvalidArgumentException('Pola garis tidak valid.');
            $updates[] = 'dash_array = ?';
            $params[]  = $dash;
        }

        if (array_key_exists('category_field', $input)) {
            $field = $input['category_field'];
            if ($field === '' || $field === null) {
                $field = null;
            } elseif (!is_string($field) || mb_strlen($field) > 100) {
                throw new InvalidArgumentException('Field kategori tidak valid.');
            }
            $updates[] = 'category_field = ?';
            $params[]  = $field;
        }

        if (array_key_exists('category_colors', $input)) {
            $colors = $input['category_colors'];
            if (is_string($colors)) {
                $decoded = json_decode($colors, true);
                $colors = is_array($decoded) ? $decoded : null;
            }
            if ($colors === null || $colors === '') {
                $jsonColors = null;
            } elseif (is_array($colors)) {
                $clean = [];
                foreach ($colors as $key => $value) {
                    if (isHexColor($value)) $clean[(string)$key] = strtolower($value);
                }
                $jsonColors = json_encode($clean, JSON_UNESCAPED_UNICODE);
            } else {
                throw new InvalidArgumentException('Warna kategori tidak valid.');
            }
            $updates[] = 'category_colors = ?';
            $params[]  = $jsonColors;
        }

        if (array_key_exists('symbol', $input)) {
            $symbol = $input['symbol'];
            if (!in_array($symbol, $allowedSymbols, true)) throw new InvalidArgumentException('Simbol tidak valid.');
            $updates[] = 'symbol = ?';
            $params[]  = $symbol;
        }

        if (array_key_exists('symbol_size', $input)) {
            $symbolSize = (int)$input['symbol_size'];
            if ($symbolSize < 3 || $symbolSize > 30) throw new InvalidArgumentException('Ukuran simbol harus 3-30.');
            $updates[] = 'symbol_size = ?';
            $params[]  = $symbolSize;
        }

        if (array_key_exists('label_field', $input)) {
            $labelField = $input['label_field'];
            if ($labelField === '' || $labelField === null) {
                $labelField = null;
            } elseif (!is_string($labelField) || mb_strlen($labelField) > 100) {
                throw new InvalidArgumentException('Field label tidak valid.');
            }
            $updates[] = 'label_field = ?';
            $params[]  = $labelField;
        }

        if (array_key_exists('label_size', $input)) {
            $labelSize = (int)$input['label_size'];
            if ($labelSize < 8 || $labelSize > 32) throw new InvalidArgumentException('Ukuran label harus 8-32.');
            $updates[] = 'label_size = ?';
            $params[]  = $labelSize;
        }

        if (array_key_exists('label_color', $input)) {
            if (!isHexColor($input['label_color'])) throw new InvalidArgumentException('Warna label tidak valid.');
            $updates[] = 'label_color = ?';
            $params[]  = strtolower($input['label_color']);
        }

        if (array_key_exists('label_halo', $input)) {
            $updates[] = 'label_halo = ?';
            $params[]  = $input['label_halo'] ? 1 : 0;
        }

        if (array_key_exists('label_mode', $input)) {
            $mode = $input['label_mode'];
            if (!in_array($mode, ['permanent', 'hover'], true)) throw new InvalidArgumentException('Mode label tidak valid.');
            $updates[] = 'label_mode = ?';
            $params[]  = $mode;
        }

        if (count($updates) === 0) {
            echo json_encode(['status' => 'success', 'message' => 'Tidak ada perubahan']);
            exit;
        }

        $params[] = $id;
        $stmt = $pdo->prepare("UPDATE basemaps SET " . implode(', ', $updates) . " WHERE id = ?");
        $stmt->execute($params);
        echo json_encode(['status' => 'success', 'message' => 'Layer berhasil diupdate']);
    } catch (InvalidArgumentException $e) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    } catch(Exception $e) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
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
