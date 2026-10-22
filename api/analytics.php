<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");

require_once 'db.php';

try {
    // 1. Total ringkasan
    $stmt1 = $pdo->query("SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'selesai' THEN 1 ELSE 0 END) as selesai,
        SUM(CASE WHEN status = 'verifikasi' THEN 1 ELSE 0 END) as verifikasi,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM permohonan");
    $summary = $stmt1->fetch();

    // 2. Sebaran per status
    $stmt2 = $pdo->query("SELECT status, COUNT(*) as count FROM permohonan GROUP BY status");
    $statusCounts = $stmt2->fetchAll(PDO::FETCH_KEY_PAIR);
    
    // Pastikan semua status ada walau 0
    $allStatuses = ['pending' => 0, 'verifikasi' => 0, 'selesai' => 0];
    foreach($statusCounts as $k => $v) {
        $allStatuses[$k] = (int)$v;
    }

    echo json_encode([
        'status' => 'success',
        'data' => [
            'summary' => [
                'total' => (int)($summary['total'] ?? 0),
                'selesai' => (int)($summary['selesai'] ?? 0),
                'verifikasi' => (int)($summary['verifikasi'] ?? 0),
                'pending' => (int)($summary['pending'] ?? 0)
            ],
            'status_distribution' => $allStatuses
        ]
    ]);
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
