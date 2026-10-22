<?php
header("Content-Type: application/json");
require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_FILES['csv_file']) && $_FILES['csv_file']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['csv_file']['tmp_name'];
        $handle = fopen($file, "r");
        
        $successCount = 0;
        
        // Skip header
        fgetcsv($handle);
        
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("INSERT INTO permohonan (
                no_permohonan, nik, nama_pemohon, no_telp, 
                alamat, jenis_hak, nomor_hak, luas_sertipikat, keadaan_tanah,
                kecamatan, kelurahan, keperluan, status, latitude, longitude
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
                // assume structure matches export
                // 0:no, 1:tgl, 2:nik, 3:nama, 4:telp, 5:alamat, 6:hak, 7:no_hak, 8:luas, 9:keadaan, 10:kec, 11:kel, 12:kep, 13:status, 14:lat, 15:lng
                // let's do a basic insert if enough columns
                if (count($data) >= 16) {
                    $stmt->execute([
                        $data[0], $data[2], trim($data[3], '"'), trim($data[4], '"'),
                        str_replace('""', '"', trim($data[5], '"')), $data[6], $data[7], 
                        $data[8], $data[9],
                        $data[10], $data[11], str_replace('""', '"', trim($data[12], '"')), 
                        strtolower($data[13]), $data[14], $data[15]
                    ]);
                    $successCount++;
                }
            }
            $pdo->commit();
            echo json_encode(['status' => 'success', 'message' => "Berhasil mengimpor $successCount data dari CSV."]);
        } catch(Exception $e) {
            $pdo->rollBack();
            echo json_encode(['status' => 'error', 'message' => 'Gagal import: ' . $e->getMessage()]);
        }
        fclose($handle);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'File tidak valid']);
    }
}
?>
