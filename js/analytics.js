/**
 * Analytics Dashboard Logic for SILISA
 */

document.addEventListener('DOMContentLoaded', () => {

    const summaryBlock = document.getElementById('summaryBlock');
    const ctxType = document.getElementById('typeChart');
    const ctxStatus = document.getElementById('statusChart');

    if (!summaryBlock || !ctxType || !ctxStatus) return;

    // Theme detection for Chart.js
    const isLightMode = localStorage.getItem('silisa_theme') === 'light';
    Chart.defaults.color = isLightMode ? '#475569' : '#94a3b8';
    Chart.defaults.borderColor = isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

    async function loadAnalytics() {
        try {
            const response = await fetch('api/reports.php');
            const result = await response.json();

            if (result.status === 'success') {
                processData(result.data);
            }
        } catch (error) {
            console.error(error);
            // Fallback for demo
            const dummyData = [
                { kecamatan: 'Kanigaran', status: 'selesai' },
                { kecamatan: 'Kanigaran', status: 'pending' },
                { kecamatan: 'Mayangan', status: 'pending' },
                { kecamatan: 'Kademangan', status: 'verifikasi' },
                { kecamatan: 'Kedopok', status: 'verifikasi' },
                { kecamatan: 'Wonoasih', status: 'pending' }
            ];
            processData(dummyData);
        }
    }

    function processData(data) {
        const total = data.length;
        const pending = data.filter(d => d.status === 'pending').length;
        const verifikasi = data.filter(d => d.status === 'verifikasi').length;
        const selesai = data.filter(d => d.status === 'selesai').length;

        // Count by Kecamatan
        const kecCounts = {};
        data.forEach(d => {
            kecCounts[d.kecamatan] = (kecCounts[d.kecamatan] || 0) + 1;
        });

        renderSummary({ total, pending, verifikasi, selesai });
        renderCharts(kecCounts, { pending, verifikasi, selesai });
    }

    function renderSummary(s) {
        summaryBlock.innerHTML = `
            <div class="stat-card" style="margin: 0; background: rgba(59, 130, 246, 0.1);">
                <div class="stat-value" style="color: var(--accent-blue)">${s.total}</div>
                <div class="stat-label">Total Permohonan</div>
            </div>
            <div class="stat-card" style="margin: 0; background: rgba(234, 179, 8, 0.1);">
                <div class="stat-value" style="color: #eab308">${s.pending}</div>
                <div class="stat-label">Baru (Pending)</div>
            </div>
            <div class="stat-card" style="margin: 0; background: rgba(249, 115, 22, 0.1);">
                <div class="stat-value" style="color: var(--accent-orange)">${s.verifikasi}</div>
                <div class="stat-label">Verifikasi</div>
            </div>
            <div class="stat-card" style="margin: 0; background: rgba(16, 185, 129, 0.1);">
                <div class="stat-value" style="color: #10b981">${s.selesai}</div>
                <div class="stat-label">Selesai</div>
            </div>
        `;
    }

    function renderCharts(kecCounts, statusDist) {
        // 1. Pie Chart Komposisi Wilayah
        new Chart(ctxType, {
            type: 'pie',
            data: {
                labels: Object.keys(kecCounts),
                datasets: [{
                    data: Object.values(kecCounts),
                    backgroundColor: ['#1d4ed8', '#d4af37', '#10b981', '#ef4444', '#8b5cf6'],
                    borderWidth: 1,
                    borderColor: isLightMode ? '#fff' : '#070e1c'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // 2. Bar Chart Status
        new Chart(ctxStatus, {
            type: 'bar',
            data: {
                labels: ['Pending', 'Verifikasi', 'Selesai'],
                datasets: [{
                    label: 'Jumlah',
                    data: [statusDist.pending, statusDist.verifikasi, statusDist.selesai],
                    backgroundColor: ['#94a3b8', '#eab308', '#22c55e'],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }

    loadAnalytics();
});
