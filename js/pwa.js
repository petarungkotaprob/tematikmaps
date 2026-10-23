if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                console.log('Service Worker registered', reg);
                reg.update();
            })
            .catch(err => console.log('Service Worker registration failed', err));
    });
}

// --- Anti-Screenshot & DevTools Security Suite ---
(function() {
    // 1. Right Click Block
    document.addEventListener('contextmenu', e => e.preventDefault());

    // 2. Keyboard & Shortcut Prevention
    document.addEventListener('keydown', e => {
        // Block F12 (Inspect Element)
        if (e.key === 'F12') {
            e.preventDefault();
        }
        // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
        if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
            e.preventDefault();
        }
        // Block Ctrl+U (View Source)
        if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
            e.preventDefault();
        }
        // Block Ctrl+P (Print Screen / Save to PDF)
        if (e.ctrlKey && (e.key === 'P' || e.key === 'p')) {
            e.preventDefault();
        }
        // Block Ctrl+S (Save Webpage)
        if (e.ctrlKey && (e.key === 'S' || e.key === 's')) {
            e.preventDefault();
        }
        // Block PrintScreen key
        if (e.key === 'PrintScreen' || e.keyCode === 44) {
            e.preventDefault();
            navigator.clipboard.writeText(''); // Wipe clipboard
        }
    });

    // 3. Copy/Clipboard Protection
    document.addEventListener('copy', e => {
        e.preventDefault();
        // Option to inject clean empty clipboard
        if (e.clipboardData) {
            e.clipboardData.setData('text/plain', '[Data Dilindungi - Peta Tematik]');
        }
    });
})();
