<?php
$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator(__DIR__),
    RecursiveIteratorIterator::LEAVES_ONLY
);

foreach ($files as $name => $file) {
    if (!$file->isDir()) {
        $ext = $file->getExtension();
        if ($ext === 'html' || $ext === 'js' || $ext === 'php') {
            $content = file_get_contents($file->getRealPath());
            $updated1 = str_replace('SILISA', 'SILISA', $content);
            $updated2 = str_replace('Sistem Layanan Informasi Lahan Baku Sawah', 'Sistem Layanan Informasi Lahan Baku Sawah', $updated1);
            if ($content !== $updated2) {
                file_put_contents($file->getRealPath(), $updated2);
                echo "Updated: " . $file->getRealPath() . "\n";
            }
        }
    }
}
echo "Done replacing.\n";
