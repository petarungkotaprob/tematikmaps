/**
 * Authentication Module
 */

// Declare globally for use in other scripts
window.currentUser = JSON.parse(localStorage.getItem('silisa_user'));

document.addEventListener('DOMContentLoaded', () => {

    // 1. Logika Halaman Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        // Explicitly clear credentials on load to prevent auto-fill
        const uField = document.getElementById('username');
        const pField = document.getElementById('password');
        if (uField) uField.value = '';
        if (pField) pField.value = '';

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnLogin');
            const errBox = document.getElementById('loginError');
            
            btn.innerHTML = 'Memproses...';
            btn.disabled = true;
            errBox.style.display = 'none';

            const user = document.getElementById('username').value;
            const pass = document.getElementById('password').value;

            try {
                const response = await fetch('api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user, password: pass })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    // Simpan sesi di browser local storage (Simulasi token JWT / Session PHP)
                    localStorage.setItem('silisa_user', JSON.stringify(data.user));
                    window.location.href = 'dashboard.html'; // Pindah ke dashboard
                } else {
                    throw new Error(data.message || 'Login gagal.');
                }
            } catch (err) {
                // Fallback / Error Handling
                errBox.style.display = 'block';
                errBox.innerText = err.message;
                if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
                    errBox.innerText = 'Gagal terhubung ke API. Pastikan server dan database aktif.';
                }
            } finally {
                btn.innerHTML = '<i data-feather="log-in" style="width: 16px; height: 16px; margin-right: 5px; vertical-align: middle;"></i> Masuk';
                btn.disabled = false;
                if(typeof feather !== 'undefined') feather.replace();
            }
        });
    }

    // 2. Logika Proteksi Halaman & Render Navigasi
    const currentUser = window.currentUser;
    
    // Halaman yang dilindungi (redirect ke login jika belum login)
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const protectedPages = ['dashboard.html', 'admin.html', 'tracker.html', 'report.html', 'settings.html'];

    // Jika sudah login dan mengakses login.html, otomatis arahkan ke dashboard
    if (currentPage === 'login.html' && currentUser) {
        window.location.replace('dashboard.html');
        return;
    }

    if (protectedPages.includes(currentPage) && !currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Proteksi Tambahan: Halaman Admin hanya untuk role admin
    if (currentPage === 'admin.html' && currentUser && currentUser.role !== 'admin') {
        alert("Akses Ditolak: Halaman ini hanya untuk Administrator.");
        window.location.href = 'dashboard.html';
    }

    // Ubah Navigasi Dinamis
    if (currentUser) {
        const navContainer = document.querySelector('.nav-links');
        if (navContainer) {
            // Check if Admin Link already exists to prevent duplicate (Hanya untuk role admin)
            if (!document.getElementById('adminLink') && currentUser.role === 'admin') {
                 const adminA = document.createElement('a');
                 adminA.href = 'admin.html';
                 adminA.id = 'adminLink';
                 adminA.innerHTML = 'Admin';
                 if (currentPage === 'admin.html') adminA.className = 'active';
                 navContainer.appendChild(adminA);
            }

            // Tambahkan identitas user dan logout & settings & theme switch
            const userBadge = document.createElement('div');
            userBadge.style.display = 'flex';
            userBadge.style.alignItems = 'center';
            userBadge.style.gap = '15px';
            userBadge.style.marginLeft = '20px';
            userBadge.style.paddingLeft = '20px';
            userBadge.style.borderLeft = '1px solid var(--glass-border)';

            userBadge.innerHTML = `
                <div style="text-align: right; line-height: 1.2;">
                    <span style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; max-width: 100px; white-space: nowrap;">${currentUser.username}</span>
                    <span style="display: block; font-size: 0.7rem; color: var(--accent-orange); text-transform: uppercase;">${currentUser.role}</span>
                </div>
                <div style="display: flex; gap: 5px;">
                    <a href="#" id="btnTheme" style="color: #eab308; background: rgba(0,0,0, 0.05); padding: 5px 10px; border-radius: 4px;" title="Ganti Mode"><i data-feather="sun" id="themeIcon" style="width: 14px; height: 14px;"></i></a>
                    <a href="settings.html" style="color: var(--text-secondary); background: rgba(0,0,0, 0.05); padding: 5px 10px; border-radius: 4px;" title="Pengaturan Akun"><i data-feather="settings" style="width: 14px; height: 14px;"></i></a>
                    <a href="#" id="btnLogout" style="color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 5px 10px; border-radius: 4px;" title="Logout"><i data-feather="log-out" style="width: 14px; height: 14px;"></i></a>
                </div>
            `;
            navContainer.appendChild(userBadge);
            if(typeof feather !== 'undefined') feather.replace();

            // Theme Logic
            const btnTheme = document.getElementById('btnTheme');
            let isLightMode = localStorage.getItem('silisa_theme') === 'light';
            
            function renderTheme() {
                if (isLightMode) {
                    document.body.classList.add('light-mode');
                    document.getElementById('themeIcon').setAttribute('data-feather', 'moon');
                } else {
                    document.body.classList.remove('light-mode');
                    document.getElementById('themeIcon').setAttribute('data-feather', 'sun');
                }
                if(typeof feather !== 'undefined') feather.replace();
            }
            renderTheme(); // initial run

            btnTheme.addEventListener('click', (e) => {
                e.preventDefault();
                isLightMode = !isLightMode;
                localStorage.setItem('silisa_theme', isLightMode ? 'light' : 'dark');
                renderTheme();
            });

            document.getElementById('btnLogout').addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('silisa_user');
                window.location.href = 'login.html';
            });
        }
    }
});
