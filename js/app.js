/**
 * Main Application Logic for SILISA (Sistem Layanan Informasi Lahan Baku Sawah)
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // ======== 1. INISIALISASI PETA (LEAFLET.JS) ========
    const mapElement = document.getElementById('map');
    let map;
    
    if (mapElement) {
        // Koordinat Kota Probolinggo
        map = L.map('map', { zoomControl: false }).setView([-7.7543, 113.2159], 13);
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        const osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap', maxZoom: 19
        });
        const googleSatelite = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
            maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'],
            attribution: 'Google Imagery'
        });

        googleSatelite.addTo(map);
        const layers = {
            "satelit": googleSatelite,
            "osm": osmStandard
        };

        const customLayers = {}; // To store custom SHP layers
        let activeBasemaps = [];
        const activeLegends = {}; // To store legend controls for active basemaps

        // 1. Basemap Radio Logic
        document.querySelectorAll('input[name="basemap"]').forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    const val = this.value;
                    const nextLayer = layers[val] || layers.satelit;
                    Object.values(layers).forEach(l => map.removeLayer(l));
                    if (nextLayer) nextLayer.addTo(map);
                }
            });
        });

        // 2. Spatial Layer (Checkbox) Logic
        async function toggleSpatialLayer(id, isChecked) {
            const selectedBasemap = activeBasemaps.find(b => b.id == id);
            if (!selectedBasemap) return;

            if (isChecked) {
                try {
                    if (customLayers[id]) {
                        customLayers[id].addTo(map);
                        if (activeLegends[id]) activeLegends[id].addTo(map);
                    } else {
                        // Load using shpjs
                        const response = await fetch(selectedBasemap.file_path);
                        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                        
                        const buffer = await response.arrayBuffer();
                        const geojson = await shp(buffer);
                        
                        const layerColor = selectedBasemap.color || '#22c55e';
                        const layerWeight = selectedBasemap.weight || 3;
                        const fillOpacity = selectedBasemap.fill_type === 'hollow' ? 0 : 0.25;
                        const dashArray = selectedBasemap.dash_array || '';
                        
                        let catField = selectedBasemap.category_field;
                        let catColors = null;
                        if (catField && selectedBasemap.category_colors) {
                            try { catColors = typeof selectedBasemap.category_colors === 'string' ? JSON.parse(selectedBasemap.category_colors) : selectedBasemap.category_colors; } catch(e){}
                        }

                        const geoJsonLayer = L.geoJSON(geojson, {
                            style: feature => {
                                let c = layerColor;
                                if (catColors && feature.properties) {
                                    const val = String(feature.properties[catField] ?? '__null__');
                                    if (catColors[val]) c = catColors[val];
                                }
                                return { 
                                    color: c, 
                                    fillColor: c,
                                    weight: layerWeight, 
                                    fillOpacity: fillOpacity,
                                    dashArray: dashArray
                                };
                            },
                            pointToLayer: (feature, latlng) => {
                                let c = layerColor;
                                if (catColors && feature.properties) {
                                    const val = String(feature.properties[catField] ?? '__null__');
                                    if (catColors[val]) c = catColors[val];
                                }
                                return L.circleMarker(latlng, { radius: 7, fillColor: c, color: '#fff', weight: 1.5, opacity: 1, fillOpacity: fillOpacity === 0 ? 0 : 0.9 });
                            },
                            onEachFeature: (feature, layer) => {
                                if (feature.properties) {
                                    const rows = Object.entries(feature.properties)
                                        .map(([k,v]) => `<tr><td style="color:#94a3b8;padding:2px 6px;font-size:0.75rem;">${k}</td><td style="padding:2px 6px;font-size:0.75rem;">${v ?? '-'}</td></tr>`)
                                        .join('');
                                    layer.bindPopup(`<table style="border-collapse:collapse;min-width:160px;">${rows}</table>`, { maxHeight: 200 });
                                }
                            }
                        }).addTo(map);
                        
                        customLayers[id] = geoJsonLayer;
                        
                        // Fit bounds only if it's the first time
                        map.fitBounds(geoJsonLayer.getBounds());

                        // Build legend if categorical
                        if (catColors) {
                            const legendDiv = document.getElementById(`legend-container-${id}`);
                            if (legendDiv) {
                                let html = `<div style="font-weight:700;font-size:0.75rem;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1);">${selectedBasemap.name} - ${catField}</div>`;
                                Object.entries(catColors).forEach(([val, color]) => {
                                    const display = val === '__null__' ? '(kosong)' : val;
                                    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;font-size:0.75rem;color:#fff;"><span style="width:12px;height:12px;border-radius:2px;flex-shrink:0;border:1px solid rgba(255,255,255,0.15);background:${color};"></span><span>${display}</span></div>`;
                                });
                                legendDiv.innerHTML = html;
                                legendDiv.style.display = 'block';
                                activeLegends[id] = true;
                            }
                        }
                    }
                } catch (e) {
                    console.error("Gagal memuat SHP:", e);
                    alert("Gagal memuat file SHP. Pesan Error: " + e.message);
                }
            } else {
                if (customLayers[id]) map.removeLayer(customLayers[id]);
                if (activeLegends[id]) {
                    const legendDiv = document.getElementById(`legend-container-${id}`);
                    if (legendDiv) {
                        legendDiv.style.display = 'none';
                        legendDiv.innerHTML = '';
                    }
                    delete activeLegends[id];
                }
            }
        }

        // Fetch extra basemaps and render list
        const spatialContainer = document.getElementById('spatialLayerList');
        if (spatialContainer) {
            fetch('api/basemaps.php')
                .then(res => res.json())
                .then(result => {
                    if (result.status === 'success') {
                        activeBasemaps = result.data;
                        spatialContainer.innerHTML = '';
                        
                        if (activeBasemaps.length === 0) {
                            spatialContainer.innerHTML = '<div style="font-size: 0.75rem; color: #64748b;">Belum ada layer tambahan.</div>';
                        }

                        activeBasemaps.forEach(bm => {
                            const containerDiv = document.createElement('div');
                            containerDiv.style.display = 'flex';
                            containerDiv.style.flexDirection = 'column';
                            containerDiv.style.marginBottom = '8px';

                            const label = document.createElement('label');
                            label.className = 'layer-checkbox';
                            label.style.marginBottom = '0'; // Override gap behavior slightly
                            label.innerHTML = `
                                <input type="checkbox" value="${bm.id}">
                                <span>${bm.name}</span>
                                <div style="width: 12px; height: 12px; background: ${bm.color || '#22c55e'}; border-radius: 2px; margin-left: auto;"></div>
                            `;

                            const legendDiv = document.createElement('div');
                            legendDiv.id = `legend-container-${bm.id}`;
                            legendDiv.style.display = 'none';
                            legendDiv.style.paddingLeft = '32px';
                            legendDiv.style.paddingRight = '12px';
                            legendDiv.style.paddingBottom = '8px';
                            legendDiv.style.marginTop = '4px';
                            
                            label.querySelector('input').addEventListener('change', function() {
                                toggleSpatialLayer(bm.id, this.checked);
                            });
                            
                            containerDiv.appendChild(label);
                            containerDiv.appendChild(legendDiv);
                            spatialContainer.appendChild(containerDiv);
                        });
                    }
                });
        }

        fetchReports();
    }

    // ======== 2. FUNGSI FETCH DATA DARI API ========
    async function fetchReports() {
        try {
            const response = await fetch('api/reports.php');
            if(!response.ok) throw new Error('Network response was not ok');
            
            const result = await response.json();
            if(result.status === 'success' && result.data) {
                renderReports(result.data);
            checkFocusTarget();
            } else {
                throw new Error('Data format error');
            }
        } catch (error) {
            console.error("Gagal mengambil data, menggunakan demo mode", error);
            const demoData = [
                {
                    no_permohonan: '001/2026', nik: '3513000000000001', nama_pemohon: 'H. Ahmad',
                    kecamatan: 'Kanigaran', kelurahan: 'Kanigaran', jenis_hak: 'Milik', nomor_hak: '123',
                    latitude: -7.7543, longitude: 113.2159, keperluan: 'Pendataan LBS', status: 'pending'
                },
                {
                    no_permohonan: '002/2026', nik: '3513000000000002', nama_pemohon: 'Siti Maryam',
                    kecamatan: 'Mayangan', kelurahan: 'Mayangan', jenis_hak: 'Milik', nomor_hak: '456',
                    latitude: -7.7600, longitude: 113.2200, keperluan: 'Permohonan Sertifikasi', status: 'verifikasi'
                }
            ];
            renderReports(demoData);
            checkFocusTarget();
        }
    }

    // ── Fly to from Tracker viewDetail ─────────────────────────
    function checkFocusTarget() {
        const lat = parseFloat(sessionStorage.getItem('focusLat'));
        const lng = parseFloat(sessionStorage.getItem('focusLng'));
        const nama = sessionStorage.getItem('focusNama') || '';
        if (!isNaN(lat) && !isNaN(lng) && map) {
            sessionStorage.removeItem('focusLat');
            sessionStorage.removeItem('focusLng');
            sessionStorage.removeItem('focusNama');
            setTimeout(() => {
                map.flyTo([lat, lng], 17, { animate: true, duration: 1.2 });
                // Show toast
                const toast = document.createElement('div');
                toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#1d4ed8;color:#fff;padding:10px 22px;border-radius:30px;font-size:0.88rem;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.4);pointer-events:none;';
                toast.textContent = '📍 Menampilkan lokasi: ' + nama;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3500);
            }, 600);
        }
    }

    // ======== 3. RENDER MARKERS & SIDEBAR LIST ========
    let sidebarPage = 1;
    const sidebarLimit = 5;
    let allReports = [];
    let filteredReports = [];

    function renderReports(data) {
        if (!mapElement) return;
        allReports = data;

        // Filter out items hidden by user from tracker.html
        const hiddenIds = (() => { try { return JSON.parse(localStorage.getItem('hiddenPermohonanIds') || '[]'); } catch(e) { return []; } })();
        const visibleData = data.filter(item => !hiddenIds.includes(String(item.id)));

        filteredReports = visibleData;



        const reportListContainer = document.getElementById('reportList');
        if (reportListContainer) {
            updateSidebarList();
            
            // Add listeners once
            const prevBtn = document.getElementById('sidePrevBtn');
            const nextBtn = document.getElementById('sideNextBtn');
            if (prevBtn && !prevBtn.hasListener) {
                prevBtn.addEventListener('click', () => {
                    if (sidebarPage > 1) {
                        sidebarPage--;
                        updateSidebarList();
                    }
                });
                prevBtn.hasListener = true;
            }
            if (nextBtn && !nextBtn.hasListener) {
                nextBtn.addEventListener('click', () => {
                    if (sidebarPage * sidebarLimit < filteredReports.length) {
                        sidebarPage++;
                        updateSidebarList();
                    }
                });
                nextBtn.hasListener = true;
            }
        }

        // Only render visible (non-hidden) items on map
        visibleData.forEach(item => {
            let colorHex = '#3b82f6';

            const popupContent = `
                <div style="font-family: var(--font-family); color: #333; min-width: 200px;">
                    <span class="badge" style="background:#1d4ed8; margin-bottom:5px; display:inline-block;">${item.no_permohonan}</span><br>
                    <strong style="font-size: 14px;">${item.nama_pemohon}</strong><br>
                    <span style="font-size: 11px; color: #666;">${item.kecamatan}, ${item.kelurahan}</span><br>
                    <div style="margin: 5px 0; font-size: 12px; border-top: 1px solid #eee; padding-top: 5px;">
                        <b>Jenis Hak:</b> ${item.jenis_hak} No. ${item.nomor_hak}<br>
                        <b>Keperluan:</b> ${item.keperluan}
                    </div>
                </div>
            `;

            const createMarker = () => {
                const circleMarker = L.circleMarker([item.latitude, item.longitude], {
                    radius: 10,
                    fillColor: colorHex, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 0.8
                }).addTo(map);
                circleMarker.bindPopup(popupContent);
                circleMarker.on('click', () => { 
                    map.setView([item.latitude, item.longitude], 15); 
                    item._marker = circleMarker; // Store for sidebar click
                });
                item._marker = circleMarker;
            };

            if (item.shp_file) {
                fetch(item.shp_file).then(res => res.arrayBuffer()).then(buffer => {
                    shp(buffer).then(geojson => {
                        const layers = Array.isArray(geojson) ? geojson : [geojson];
                        const combinedFeatures = [];
                        layers.forEach(layer => { if (layer?.features) combinedFeatures.push(...layer.features); });
                        const combinedGeojson = { type: 'FeatureCollection', features: combinedFeatures };

                        // Apply style from admin settings
                        const shpColor    = item.color      || colorHex || '#3b82f6';
                        const fillType    = item.fill_type  || 'fill';
                        const shpWeight   = parseInt(item.weight) || 2;
                        const dashArray   = item.dash_array || null;
                        const fillOpacity = fillType === 'hollow' ? 0 : 0.4;

                        // Category colors per feature
                        let catField  = item.category_field  || null;
                        let catColors = {};
                        if (item.category_colors) {
                            try { catColors = typeof item.category_colors === 'string' ? JSON.parse(item.category_colors) : item.category_colors; } catch(e) {}
                        }

                        const layer = L.geoJSON(combinedGeojson, {
                            style: (feature) => {
                                let featureColor = shpColor;
                                if (catField && feature.properties && feature.properties[catField] !== undefined) {
                                    const val = String(feature.properties[catField] ?? '__null__');
                                    featureColor = catColors[val] || shpColor;
                                }
                                return {
                                    color:       featureColor,
                                    fillColor:   featureColor,
                                    weight:      shpWeight,
                                    fillOpacity: fillOpacity,
                                    dashArray:   dashArray
                                };
                            }
                        }).addTo(map);
                        layer.bindPopup(popupContent);
                        layer.on('click', () => { 
                            map.fitBounds(layer.getBounds()); 
                            item._marker = layer;
                        });
                        item._marker = layer;
                    }).catch(e => createMarker());
                }).catch(e => createMarker());
            } else {
                createMarker();
            }
        });
    }

    
        const searchInput = document.getElementById('dashboardSearch');
        if (searchInput && !searchInput.hasListener) {
            searchInput.addEventListener('input', (e) => {
                const val = e.target.value.toLowerCase();
                filteredReports = allReports.filter(item => 
                    item.nama_pemohon.toLowerCase().includes(val) || 
                    item.kecamatan.toLowerCase().includes(val) ||
                    item.no_permohonan.toLowerCase().includes(val)
                );
                sidebarPage = 1;
                updateSidebarList();
            });
            searchInput.hasListener = true;
        }

    function updateSidebarList() {
        const container = document.getElementById('reportList');
        const pagination = document.getElementById('sidebarPagination');
        const info = document.getElementById('sidePaginationInfo');
        const prevBtn = document.getElementById('sidePrevBtn');
        const nextBtn = document.getElementById('sideNextBtn');

        if (!container) return;
        container.innerHTML = '';

        if (filteredReports.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #94a3b8; margin-top: 2rem;">Tidak ada data.</div>';
            if (pagination) pagination.style.display = 'none';
            return;
        }

        if (pagination) pagination.style.display = 'flex';

        const start = (sidebarPage - 1) * sidebarLimit;
        const end = start + sidebarLimit;
        const pageData = filteredReports.slice(start, end);

        pageData.forEach(item => {
            let colorHex = '#3b82f6';

            const listItem = document.createElement('div');
            listItem.className = `report-item animated`;
            listItem.style.borderLeft = `4px solid ${colorHex}`;
            listItem.innerHTML = `
                <div class="report-header">
                    <div class="report-title">${item.nama_pemohon}</div>
                    
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                    ${item.no_permohonan} | ${item.jenis_hak}
                </div>
                <div style="font-size: 0.85rem;">
                    ${item.kecamatan} - ${item.kelurahan}
                </div>
            `;
            
            listItem.addEventListener('click', () => {
                map.flyTo([item.latitude, item.longitude], 16, { animate: true, duration: 1 });
                if (item._marker) item._marker.openPopup();
            });

            container.appendChild(listItem);
        });

        if (info) info.innerText = `${start + 1}-${Math.min(end, filteredReports.length)} / ${filteredReports.length}`;
        if (prevBtn) prevBtn.disabled = sidebarPage === 1;
        if (nextBtn) nextBtn.disabled = end >= filteredReports.length;
        
        feather.replace();
    }

    // ======== 4. FUNGSI UNTUK HALAMAN REPORT ========
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData();
            formData.append('no_permohonan', document.getElementById('no_permohonan').value);
            formData.append('nik', document.getElementById('nik').value);
            formData.append('nama_pemohon', document.getElementById('nama_pemohon').value);
            formData.append('nama_kuasa', document.getElementById('nama_kuasa').value);
            formData.append('no_telp', document.getElementById('no_telp').value);
            formData.append('alamat', document.getElementById('alamat').value);
            formData.append('jenis_hak', document.getElementById('jenis_hak').value);
            formData.append('nomor_hak', document.getElementById('nomor_hak').value);
            formData.append('luas_sertipikat', document.getElementById('luas_sertipikat').value);
            formData.append('keadaan_tanah', document.getElementById('keadaan_tanah').value);
            formData.append('kecamatan', document.getElementById('kecamatan').value);
            formData.append('kelurahan', document.getElementById('kelurahan').value);
            formData.append('keperluan', document.getElementById('keperluan').value);
            formData.append('latitude', document.getElementById('latitude').value);
            formData.append('longitude', document.getElementById('longitude').value);
            
            const shpInput = document.getElementById('shpFileInput');
            if (shpInput && shpInput.files[0]) {
                formData.append('shp_file', shpInput.files[0]);
            }

            if (!formData.get('latitude') || !formData.get('longitude')) {
                alert("Mohon tentukan titik lokasi pada peta satelit!");
                return;
            }

            try {
                const response = await fetch('api/reports.php', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                if(result.status === 'success') {
                    // Tampilkan Modal sukses instead of alert
                    document.getElementById('sum_no').innerText = formData.no_permohonan;
                    document.getElementById('sum_nama').innerText = formData.nama_pemohon;
                    document.getElementById('sum_telp').innerText = formData.no_telp;
                    
                    const modal = document.getElementById('successModal');
                    if (modal) {
                        modal.style.display = 'flex';
                    } else {
                        // Fallback if modal not found
                        alert('Permohonan berhasil disimpan!');
                        window.location.href = 'tracker.html';
                    }
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (err) {
                console.error(err);
                alert('Terjadi kesalahan saat menyimpan data.');
            }
        });
    }
});
