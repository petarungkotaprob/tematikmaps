if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.log('Service Worker registration failed', err));
    });
}

// Global Landscape Rotation Prevention Overlay System
(function() {
    // 1. Inject the Landscape overlay CSS
    const style = document.createElement('style');
    style.textContent = `
        @media (max-width: 900px) and (orientation: landscape) {
            .rotate-warning-overlay {
                display: flex !important;
            }
            body {
                overflow: hidden !important;
                height: 100vh !important;
            }
        }
        @keyframes rotateDeviceAnim {
            0% { transform: rotate(0deg); }
            50% { transform: rotate(-90deg); }
            100% { transform: rotate(0deg); }
        }
    `;
    document.head.appendChild(style);

    // 2. Inject the Landscape overlay HTML when DOM is ready
    const injectOverlay = () => {
        if (document.querySelector('.rotate-warning-overlay')) return; // Avoid double injection
        
        const overlay = document.createElement('div');
        overlay.className = 'rotate-warning-overlay';
        overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(7, 14, 28, 0.97);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            z-index: 9999999;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            text-align: center;
            padding: 2rem;
            box-sizing: border-box;
            font-family: 'Inter', sans-serif;
        `;
        
        overlay.innerHTML = `
            <div style="margin-bottom: 1.5rem; animation: rotateDeviceAnim 2s infinite ease-in-out; display: flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-smartphone"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            </div>
            <h3 style="margin-bottom: 0.8rem; font-weight: 700; letter-spacing: 0.5px; font-size: 1.3rem; margin-top: 0; color: #fff;">Gunakan Mode Portrait</h3>
            <p style="color: rgba(255,255,255,0.6); max-width: 290px; font-size: 0.95rem; line-height: 1.6; margin: 0 auto;">Untuk kenyamanan terbaik dalam menggunakan aplikasi SILISA, mohon putar perangkat Anda kembali ke posisi tegak (Portrait).</p>
        `;
        document.body.appendChild(overlay);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectOverlay);
    } else {
        injectOverlay();
    }
})();

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

    // 3. Dynamic Blur Defense on Focus Loss
    // (Activates when OS screenshot overlay triggers, mobile app switcher opens, or Snipping Tool is selected)
    const applyBlur = () => {
        document.body.style.filter = 'blur(20px)';
        document.body.style.transition = 'filter 0.2s ease';
    };
    
    const removeBlur = () => {
        document.body.style.filter = 'none';
    };

    window.addEventListener('blur', applyBlur);
    window.addEventListener('focus', removeBlur);

    // 4. Copy/Clipboard Protection
    document.addEventListener('copy', e => {
        e.preventDefault();
        // Option to inject clean empty clipboard
        if (e.clipboardData) {
            e.clipboardData.setData('text/plain', '[Data Dilindungi - SILISA]');
        }
    });
})();
