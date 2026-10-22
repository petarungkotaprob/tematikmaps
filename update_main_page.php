<?php
// Script to set portal as main page

// Step 1: Update referencing links in HTML files
$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator(__DIR__),
    RecursiveIteratorIterator::LEAVES_ONLY
);

foreach ($files as $name => $file) {
    if (!$file->isDir()) {
        $ext = $file->getExtension();
        if ($ext === 'html') {
            $path = $file->getRealPath();
            $content = file_get_contents($path);
            
            // If it's the portal page, replace portal.html with index.html
            if (basename($path) === 'portal.html') {
                $updated = str_replace('href="portal.html"', 'href="index.html"', $content);
                file_put_contents($path, $updated);
            } 
            // For all other pages, redirect index.html to dashboard.html
            else {
                $updated = str_replace('href="index.html"', 'href="dashboard.html"', $content);
                // Just in case portal.html was linked somewhere else, change it to index.html
                $updated = str_replace('href="portal.html"', 'href="index.html"', $updated);
                file_put_contents($path, $updated);
            }
        }
    }
}

// Step 2: Rename index.html to dashboard.html
if (file_exists('index.html')) {
    rename('index.html', 'dashboard.html');
    echo "Renamed index.html to dashboard.html\n";
}

// Step 3: Rename portal.html to index.html
if (file_exists('portal.html')) {
    rename('portal.html', 'index.html');
    echo "Renamed portal.html to index.html\n";
}

echo "Migration to make portal the main page is complete.\n";
