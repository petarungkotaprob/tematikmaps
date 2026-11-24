/**
 * Main Application Logic for Peta Tematik Kantor Pertanahan Kota Probolinggo
 */

document.addEventListener('DOMContentLoaded', () => {
    const mobileQuery = window.matchMedia('(max-width: 768px), (max-width: 900px) and (max-height: 500px)');

    // ======== 1. INISIALISASI PETA (LEAFLET.JS) ========
    const mapElement = document.getElementById('map');
    let map;
    
    if (mapElement) {
        // Koordinat Kota Probolinggo
        map = L.map('map', { zoomControl: false }).setView([-7.7543, 113.2159], 13);
        const isMobileView = mobileQuery.matches;
        L.control.zoom({ position: isMobileView ? 'topright' : 'bottomright' }).addTo(map);
        window.silisaMap = map;

        // 1b. Lokasi Saya (mobile FAB)
        const locateBtn = document.getElementById('btnLocate');
        if (locateBtn) {
            let locationMarker = null;
            locateBtn.addEventListener('click', () => {
                if (!navigator.geolocation) {
                    alert('Perangkat ini tidak mendukung layanan lokasi.');
                    return;
                }

                const originalIcon = locateBtn.innerHTML;
                locateBtn.disabled = true;
                locateBtn.innerHTML = '<i data-feather="loader"></i>';
                if (typeof feather !== 'undefined') feather.replace();

                const resetButton = () => {
                    locateBtn.disabled = false;
                    locateBtn.innerHTML = originalIcon;
                    if (typeof feather !== 'undefined') feather.replace();
                };

                navigator.geolocation.getCurrentPosition(
                    position => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;

                        if (locationMarker) {
                            locationMarker.setLatLng([lat, lng]);
                        } else {
                            locationMarker = L.circleMarker([lat, lng], {
                                radius: 9,
                                color: '#ffffff',
                                weight: 3,
                                fillColor: '#1d4ed8',
                                fillOpacity: 1
                            }).addTo(map);
                            locationMarker.bindPopup('Lokasi Anda saat ini');
                        }

                        map.flyTo([lat, lng], 17, { animate: true, duration: 1 });
                        locationMarker.openPopup();
                        resetButton();
                    },
                    error => {
                        resetButton();
                        alert('Gagal mendapatkan lokasi: ' + error.message);
                    },
                    { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
                );
            });
        }

        const osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap', maxZoom: 19
        });
        const googleSatelite = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
            maxZoom: 20, subdomains:['mt0','mt1','mt2','mt3'],
            attribution: 'Google Imagery'
        });

        const layers = {
            "satelit": googleSatelite,
            "osm": osmStandard
        };

        const customLayers = {}; // To store custom SHP layers
        let activeBasemaps = [];
        const activeLegends = {}; // To store legend controls for active basemaps

        // ── Pengaturan simbol & label layer spasial ──────────────
        const SPATIAL_SYMBOLS = [
            // Bentuk Dasar
            'circle', 'square', 'triangle', 'diamond', 'star', 'pin', 'pentagon', 'hexagon', 'cross', 'arrow',
            // Toponimi (ArcGIS)
            'capital', 'city', 'town', 'village', 'mountain', 'water',
            // Fasilitas Umum (Google Maps Style)
            'hospital', 'school', 'mosque', 'church', 'government', 'office',
            'shop', 'restaurant', 'hotel', 'park', 'airport', 'harbor',
            'police', 'fire', 'bank', 'gas', 'parking', 'cemetery',
            'factory', 'warehouse', 'stadium', 'library', 'museum', 'market'
        ];

        function escapeSpatialHtml(value) {
            return String(value ?? '').replace(/[&<>"']/g, ch => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
            }[ch]));
        }

        function clampSpatialNumber(value, min, max, fallback) {
            const n = parseInt(value, 10);
            if (!Number.isFinite(n)) return fallback;
            return Math.min(max, Math.max(min, n));
        }

        function spatialSymbolSvg(symbol, size, color, filled = true) {
            const px = clampSpatialNumber(size, 3, 30, 7) * 2;
            const fillOpacity = filled ? 1 : 0;
            const topoStroke = filled ? '#fff' : color;
            const innerFill = filled ? '#fff' : 'none';
            const shapes = {
                circle: `<circle cx="12" cy="12" r="9" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.8"/>`,
                square: `<rect x="3.5" y="3.5" width="17" height="17" rx="2" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.8"/>`,
                triangle: `<polygon points="12,2.5 21.5,20.5 2.5,20.5" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>`,
                diamond: `<polygon points="12,2.5 21.5,12 12,21.5 2.5,12" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>`,
                star: `<polygon points="12,2.2 15,9 22.2,9.3 16.6,14.3 18.6,21.5 12,17.4 5.4,21.5 7.4,14.3 1.8,9.3 9,9" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`,
                pin: `<path d="M12 1.5C7.03 1.5 3 5.53 3 10.5c0 6.75 9 12 9 12s9-5.25 9-12c0-4.97-4.03-9-9-9z" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="10.2" r="3.4" fill="#fff"/>`,
                pentagon: `<polygon points="12,2.4 22,9.7 18.2,21.2 5.8,21.2 2,9.7" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/>`,
                hexagon: `<polygon points="12,2.2 20.6,7.2 20.6,16.8 12,21.8 3.4,16.8 3.4,7.2" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/>`,
                cross: `<path d="M9.5 2h5v7.5H22v5h-7.5V22h-5v-7.5H2v-5h7.5z" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>`,
                arrow: `<polygon points="12,2 21.5,11.5 15.5,11.5 15.5,22 8.5,22 8.5,11.5 2.5,11.5" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`,
                capital: `<circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="${fillOpacity}" stroke="${topoStroke}" stroke-width="1.5"/><polygon points="12,4.6 13.9,9.6 19.2,9.8 15,13.2 16.4,18.3 12,15.4 7.6,18.3 9,13.2 4.8,9.8 10.1,9.6" fill="${innerFill}" stroke="${topoStroke}" stroke-width="1.1" stroke-linejoin="round"/>`,
                city: `<circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="${fillOpacity}" stroke="${topoStroke}" stroke-width="1.5"/><circle cx="12" cy="12" r="4.8" fill="${innerFill}" stroke="${topoStroke}" stroke-width="1.1"/>`,
                town: `<circle cx="12" cy="12" r="9.5" fill="${color}" fill-opacity="${fillOpacity}" stroke="${topoStroke}" stroke-width="1.5"/><circle cx="12" cy="12" r="3.2" fill="${innerFill}" stroke="${topoStroke}" stroke-width="1.1"/>`,
                village: `<circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="4"/><circle cx="12" cy="12" r="6.4" fill="none" stroke="${color}" stroke-width="2.2"/>`,
                mountain: `<path d="M2 20.5 8.4 7.2 12.8 15.4 15.4 10.4 22 20.5Z" fill="${color}" fill-opacity="${fillOpacity}" stroke="${topoStroke}" stroke-width="1.5" stroke-linejoin="round"/>`,
                water: `<path d="M12 2.2C12 2.2 5.2 10.4 5.2 15a6.8 6.8 0 0 0 13.6 0C18.8 10.4 12 2.2 12 2.2Z" fill="${color}" fill-opacity="${fillOpacity}" stroke="${topoStroke}" stroke-width="1.5"/><path d="M9 15.2a3 3 0 0 0 3 3" fill="none" stroke="${filled ? '#fff' : color}" stroke-width="1.3" stroke-linecap="round" opacity="0.9"/>`,
                // === Fasilitas Umum (Google Maps Style) ===
                hospital: `<rect x="2.5" y="2.5" width="19" height="19" rx="4" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.6"/><path d="M12 7v10M7 12h10" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
                school: `<path d="M12 2.5 22 8v1H2V8Z" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><rect x="3" y="9" width="18" height="12.5" rx="1" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4"/><rect x="9.5" y="13" width="5" height="8.5" fill="#fff" fill-opacity="0.9"/>`,
                mosque: `<ellipse cx="12" cy="10" rx="7" ry="6" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4"/><rect x="2" y="10" width="20" height="4" rx="1" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4"/><rect x="10.5" y="2" width="3" height="4" rx="1" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.2"/><path d="M9 14h6v7.5H9z" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.3"/>`,
                church: `<rect x="4" y="9" width="16" height="13" rx="1.5" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4"/><path d="M12 2v8M9 5h6" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none"/>`,
                government: `<rect x="3" y="9" width="18" height="13" rx="1" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4"/><path d="M2 9h20" stroke="#fff" stroke-width="1.6"/><path d="M12 2v7" stroke="#fff" stroke-width="1.6"/><path d="M12 2l5 2.5-5 2.5z" fill="#fff" stroke="#fff" stroke-width="0.8" stroke-linejoin="round"/>`,
                office: `<rect x="4" y="3.5" width="16" height="19" rx="1.5" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.5"/><rect x="6.5" y="6.5" width="4" height="3.5" rx="0.5" fill="#fff" opacity="0.8"/><rect x="13.5" y="6.5" width="4" height="3.5" rx="0.5" fill="#fff" opacity="0.8"/><rect x="6.5" y="12" width="4" height="3.5" rx="0.5" fill="#fff" opacity="0.8"/><rect x="13.5" y="12" width="4" height="3.5" rx="0.5" fill="#fff" opacity="0.8"/>`,
                shop: `<path d="M2 10l2-7h16l2 7z" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="M2 10h20v12H2z" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4"/><rect x="8" y="14" width="8" height="8" rx="0.5" fill="#fff" opacity="0.85"/>`,
                restaurant: `<circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.5"/><path d="M9 7v4a2 2 0 0 0 2 2v4" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M15 7v10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`,
                hotel: `<rect x="2.5" y="4" width="19" height="17.5" rx="2" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.5"/><polygon points="12,7 13.5,10.5 17.5,11 14.5,13.5 15.5,17.5 12,15.5 8.5,17.5 9.5,13.5 6.5,11 10.5,10.5" fill="#fff" stroke="#fff" stroke-width="0.5" stroke-linejoin="round"/>`,
                park: `<ellipse cx="12" cy="9" rx="7.5" ry="7" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.5"/><rect x="10.5" y="15.5" width="3" height="6.5" rx="1" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.3"/>`,
                airport: `<circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.5"/><path d="M12 3.5v5.5L4.5 15h2l5.5-3.5 5.5 3.5h2L12 9V3.5z" fill="#fff" stroke="#fff" stroke-width="0.5" stroke-linejoin="round"/><path d="M6 19.5h12" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`,
                harbor: `<circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="7.5" r="2" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M12 9.5v9" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M6.5 14c0 3 2.5 5 5.5 5s5.5-2 5.5-5" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M9 7.5H15" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>`,
                police: `<path d="M12 2L4 5.5v5c0 4.8 3.5 9.3 8 10.8 4.5-1.5 8-6 8-10.8v-5z" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 7v7M9 10.5h6" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
                fire: `<path d="M12 2.5c0 0-6.5 7-6.5 12a6.5 6.5 0 0 0 13 0C18.5 9.5 12 2.5 12 2.5z" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.5"/><path d="M12 10c0 0-3 3-3 5.5a3 3 0 0 0 6 0C15 13 12 10 12 10z" fill="#fff" opacity="0.85"/>`,
                bank: `<path d="M2 9.5L12 3l10 6.5H2z" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><rect x="2" y="9.5" width="20" height="2" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.3"/><rect x="4.5" y="11.5" width="3" height="8" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.2"/><rect x="10.5" y="11.5" width="3" height="8" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.2"/><rect x="16.5" y="11.5" width="3" height="8" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.2"/>`,
                gas: `<rect x="4" y="4" width="12" height="17" rx="1.5" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4"/><rect x="6" y="8" width="8" height="5" rx="0.8" fill="#fff" opacity="0.85"/><path d="M16 7l4 2v5h-4" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
                parking: `<rect x="2.5" y="2.5" width="19" height="19" rx="3.5" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.6"/><path d="M9 7h5.5a4 4 0 0 1 0 8H9V7z" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 7v10" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
                cemetery: `<rect x="2" y="12" width="20" height="10" rx="1" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4"/><path d="M8 12V7a4 4 0 0 1 8 0v5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M10 9h4" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>`,
                factory: `<rect x="2" y="12" width="20" height="10" rx="1" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4"/><path d="M2 12l6-7v7" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 12l6-7v7" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><rect x="16" y="4" width="3.5" height="8" rx="1" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.3"/>`,
                warehouse: `<rect x="2" y="8" width="20" height="14" rx="1.5" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.5"/><path d="M2 8l10-5.5L22 8" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><rect x="9" y="14" width="6" height="8" rx="0.8" fill="#fff" opacity="0.85"/>`,
                stadium: `<ellipse cx="12" cy="12" rx="10" ry="8" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.6"/><ellipse cx="12" cy="12" rx="6" ry="4.5" fill="none" stroke="#fff" stroke-width="1.4"/><ellipse cx="12" cy="12" rx="2.5" ry="1.8" fill="#fff" opacity="0.7"/>`,
                library: `<rect x="2.5" y="4" width="19" height="17" rx="1.5" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.5"/><path d="M12 7v12" stroke="#fff" stroke-width="1.6"/><path d="M4.5 7h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7z" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M12.5 7h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7z" fill="none" stroke="#fff" stroke-width="1.3"/>`,
                museum: `<path d="M2 10L12 3l10 7H2z" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><rect x="2" y="10" width="20" height="1.8" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.2"/><rect x="4" y="11.8" width="4" height="9.7" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.2"/><rect x="10" y="11.8" width="4" height="9.7" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.2"/><rect x="16" y="11.8" width="4" height="9.7" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.2"/>`,
                market: `<path d="M2 10c0-2 2-4 3.5-4s3.5 2 3.5 4 2-4 3-4 3 2 3 4 2-4 3.5-4S22 8 22 10H2z" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4"/><rect x="2" y="10" width="20" height="12" rx="0.5" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4"/><rect x="5" y="13" width="5" height="6" rx="0.8" fill="#fff" opacity="0.8"/><rect x="14" y="13" width="5" height="6" rx="0.8" fill="#fff" opacity="0.8"/>`
            };
            return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24">${shapes[symbol] || shapes.circle}</svg>`;
        }

        function getSpatialFeatureColor(feature, baseColor, catField, catColors) {
            if (catField && catColors && feature && feature.properties) {
                const val = String(feature.properties[catField] ?? '__null__');
                if (catColors[val]) return catColors[val];
            }
            return baseColor;
        }

        function getSpatialFeatureSymbol(feature, baseSymbol, catField, catSymbols) {
            if (catField && catSymbols && feature && feature.properties) {
                const val = String(feature.properties[catField] ?? '__null__');
                if (SPATIAL_SYMBOLS.includes(catSymbols[val])) return catSymbols[val];
            }
            return baseSymbol;
        }

        function getSpatialGeoJsonFeatures(geojson) {
            if (Array.isArray(geojson)) {
                return geojson.reduce((all, item) => all.concat(Array.isArray(item?.features) ? item.features : []), []);
            }
            return Array.isArray(geojson?.features) ? geojson.features : [];
        }

        function bindSpatialLabel(feature, layer, bm, isPoint) {
            const labelField = bm.label_field;
            if (!labelField || !feature || !feature.properties) return;

            const raw = feature.properties[labelField];
            if (raw === null || raw === undefined || String(raw).trim() === '') return;

            const labelSize = clampSpatialNumber(bm.label_size, 8, 32, 11);
            const labelColor = /^#[0-9a-fA-F]{6}$/.test(bm.label_color || '') ? bm.label_color : '#202124';
            const permanent = (bm.label_mode || 'permanent') !== 'hover';
            const halo = !(bm.label_halo === 0 || bm.label_halo === '0' || bm.label_halo === false || bm.label_halo === 'false');
            const symbolSize = clampSpatialNumber(bm.symbol_size, 3, 30, 7);

            layer.bindTooltip(
                `<span class="spatial-label-text" style="font-size:${labelSize}px;color:${labelColor};">${escapeSpatialHtml(raw)}</span>`,
                {
                    permanent: permanent,
                    direction: isPoint ? 'top' : 'center',
                    offset: isPoint ? [0, -symbolSize] : [0, 0],
                    className: 'spatial-map-label' + (halo ? ' has-halo' : ''),
                    opacity: 1,
                    interactive: false
                }
            );
        }

        // 1. Basemap Switch Logic (Sync Radio & Google Maps Widget Cards & LocalStorage)
        window.setBasemap = function(val) {
            val = val || 'satelit';
            try { localStorage.setItem('silisa_basemap', val); } catch(e){}

            const nextLayer = layers[val] || layers.satelit;
            Object.values(layers).forEach(l => map.removeLayer(l));
            if (nextLayer) nextLayer.addTo(map);

            // Sync radio inputs
            document.querySelectorAll('input[name="basemap"]').forEach(radio => {
                radio.checked = (radio.value === val);
            });

            // Sync GM Basemap Cards
            document.querySelectorAll('.gm-basemap-card').forEach(card => {
                card.classList.toggle('active', card.dataset.basemap === val);
            });

            // Update thumb preview
            const thumbPreview = document.getElementById('layerThumbPreview');
            if (thumbPreview) {
                thumbPreview.className = 'gm-layers-thumb ' + (val === 'satelit' ? 'satelit-thumb' : 'osm-thumb');
            }
        };

        // Initialize with previously selected basemap
        const savedBasemap = localStorage.getItem('silisa_basemap') || 'satelit';
        window.setBasemap(savedBasemap);

        document.querySelectorAll('input[name="basemap"]').forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) window.setBasemap(this.value);
            });
        });

        document.querySelectorAll('.gm-basemap-card').forEach(card => {
            card.addEventListener('click', function() {
                window.setBasemap(this.dataset.basemap);
            });
        });

        // 2. Spatial Layer (Checkbox) Logic
        async function toggleSpatialLayer(id, isChecked) {
            const selectedBasemap = activeBasemaps.find(b => b.id == id);
            if (!selectedBasemap) return;

            // Sync all checkboxes with this id without disturbing active event
            document.querySelectorAll(`input[type="checkbox"][data-layer-id="${id}"], input[type="checkbox"][value="${id}"]`).forEach(cb => {
                if (cb.checked !== isChecked) {
                    cb.checked = isChecked;
                }
            });

            // Persist active spatial layer state to localStorage
            try {
                let saved = JSON.parse(localStorage.getItem('silisa_active_spatial_layers') || '[]');
                const strId = String(id);
                if (isChecked) {
                    if (!saved.includes(strId)) saved.push(strId);
                } else {
                    saved = saved.filter(x => String(x) !== strId);
                }
                localStorage.setItem('silisa_active_spatial_layers', JSON.stringify(saved));
            } catch (e) {}

            if (isChecked) {
                try {
                    if (customLayers[id]) {
                        customLayers[id].addTo(map);

                        // Rebuild the category legend when restoring a previously loaded layer
                        let catField = selectedBasemap.category_field;
                        let catColors = null;
                        let catSymbols = null;
                        if (catField && selectedBasemap.category_colors) {
                            try { catColors = typeof selectedBasemap.category_colors === 'string' ? JSON.parse(selectedBasemap.category_colors) : selectedBasemap.category_colors; } catch(e){}
                        }
                        if (catField && selectedBasemap.category_symbols) {
                            try { catSymbols = typeof selectedBasemap.category_symbols === 'string' ? JSON.parse(selectedBasemap.category_symbols) : selectedBasemap.category_symbols; } catch(e){}
                        }
                        buildSpatialLegend(id, selectedBasemap, catField, catColors, catSymbols, customLayers[id]._spatialHasPoints);
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
                        const symbol = SPATIAL_SYMBOLS.includes(selectedBasemap.symbol) ? selectedBasemap.symbol : 'circle';
                        const symbolSize = clampSpatialNumber(selectedBasemap.symbol_size, 3, 30, 7);
                        
                        let catField = selectedBasemap.category_field;
                        let catColors = null;
                        let catSymbols = null;
                        if (catField && selectedBasemap.category_colors) {
                            try { catColors = typeof selectedBasemap.category_colors === 'string' ? JSON.parse(selectedBasemap.category_colors) : selectedBasemap.category_colors; } catch(e){}
                        }
                        if (catField && selectedBasemap.category_symbols) {
                            try { catSymbols = typeof selectedBasemap.category_symbols === 'string' ? JSON.parse(selectedBasemap.category_symbols) : selectedBasemap.category_symbols; } catch(e){}
                        }

                        const sourceFeatures = getSpatialGeoJsonFeatures(geojson);
                        const hasPointGeometry = sourceFeatures.some(f => f?.geometry && /Point/.test(f.geometry.type));

                        const geoJsonLayer = L.geoJSON(geojson, {
                            style: feature => {
                                const c = getSpatialFeatureColor(feature, layerColor, catField, catColors);
                                return { 
                                    color: c, 
                                    fillColor: c, 
                                    weight: layerWeight, 
                                    fillOpacity: fillOpacity, 
                                    dashArray: dashArray 
                                };
                            },
                            pointToLayer: (feature, latlng) => {
                                const c = getSpatialFeatureColor(feature, layerColor, catField, catColors);
                                const featureSymbol = getSpatialFeatureSymbol(feature, symbol, catField, catSymbols);
                                if (featureSymbol === 'circle') {
                                    return L.circleMarker(latlng, { radius: symbolSize, fillColor: c, color: '#fff', weight: 1.5, opacity: 1, fillOpacity: fillOpacity === 0 ? 0 : 0.9 });
                                }

                                const iconSize = symbolSize * 2;
                                const isPin = featureSymbol === 'pin';
                                return L.marker(latlng, {
                                    icon: L.divIcon({
                                        className: 'spatial-symbol-marker',
                                        html: spatialSymbolSvg(featureSymbol, symbolSize, c, fillOpacity !== 0),
                                        iconSize: [iconSize, iconSize],
                                        iconAnchor: isPin ? [symbolSize, iconSize] : [symbolSize, symbolSize],
                                        popupAnchor: [0, isPin ? -iconSize : -symbolSize]
                                    })
                                });
                            },
                            onEachFeature: (feature, layer) => {
                                if (feature.properties) {
                                    const rows = Object.entries(feature.properties)
                                        .map(([k,v]) => `<tr><td style="color:#5f6368;padding:3px 6px;font-size:0.75rem;">${escapeSpatialHtml(k)}</td><td style="padding:3px 6px;font-size:0.75rem;font-weight:500;">${escapeSpatialHtml(v ?? '-')}</td></tr>`)
                                        .join('');
                                    layer.bindPopup(`<table style="border-collapse:collapse;min-width:180px;">${rows}</table>`, { maxHeight: 200, className: 'gm-leaflet-popup' });
                                }
                                const isPoint = !!(feature.geometry && /Point/.test(feature.geometry.type));
                                bindSpatialLabel(feature, layer, selectedBasemap, isPoint);
                            }
                        }).addTo(map);
                        
                        geoJsonLayer._spatialHasPoints = hasPointGeometry;
                        customLayers[id] = geoJsonLayer;
                        map.fitBounds(geoJsonLayer.getBounds(), { padding: [40, 40] });

                        // Build legend if categorical
                        buildSpatialLegend(id, selectedBasemap, catField, catColors, catSymbols, hasPointGeometry);
                    }
                } catch (e) {
                    console.error("Gagal memuat SHP:", e);
                    alert("Gagal memuat file SHP: " + e.message);
                }
            } else {
                if (customLayers[id]) map.removeLayer(customLayers[id]);
                if (activeLegends[id]) {
                    document.querySelectorAll(`.legend-container-${id}`).forEach(legendDiv => {
                        legendDiv.style.display = 'none';
                        legendDiv.innerHTML = '';
                    });
                    delete activeLegends[id];
                }
            }
        }

        // Render/refresh the category legend for a spatial basemap
        function buildSpatialLegend(id, basemap, catField, catColors, catSymbols, hasPoints) {
            if (!catField || !catColors || Object.keys(catColors).length === 0) return;

            const legendElements = document.querySelectorAll(`.legend-container-${id}`);
            if (legendElements.length === 0) return;

            let html = `<div style="font-weight:600;font-size:0.75rem;text-transform:uppercase;color:#5f6368;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #dadce0;">${basemap.name} - ${catField}</div>`;
            Object.entries(catColors).forEach(([val, color]) => {
                const display = val === '__null__' ? '(kosong)' : val;
                const symbol = catSymbols?.[val];
                const swatch = (hasPoints && SPATIAL_SYMBOLS.includes(symbol))
                    ? `<span style="width:14px;height:14px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;">${spatialSymbolSvg(symbol, 7, color)}</span>`
                    : `<span style="width:12px;height:12px;border-radius:2px;flex-shrink:0;background:${color};"></span>`;
                html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:0.75rem;color:#202124;">${swatch}<span>${escapeSpatialHtml(display)}</span></div>`;
            });

            legendElements.forEach(legendDiv => {
                legendDiv.innerHTML = html;
                legendDiv.style.display = 'block';
            });
            activeLegends[id] = true;
        }

        // Fetch extra basemaps and render in both layer containers
        fetch('api/basemaps.php')
            .then(res => res.json())
            .then(result => {
                if (result.status === 'success') {
                    activeBasemaps = result.data;
                    const targets = [
                        document.getElementById('spatialLayerList'),
                        document.getElementById('gmSpatialLayerList')
                    ].filter(Boolean);

                    targets.forEach(container => {
                        container.innerHTML = '';
                        if (activeBasemaps.length === 0) {
                            container.innerHTML = '<div style="font-size:0.78rem;color:#5f6368;padding:6px 0;">Belum ada layer spasial tambahan.</div>';
                        }
                    });

                    let savedActive = [];
                    try { savedActive = JSON.parse(localStorage.getItem('silisa_active_spatial_layers') || '[]'); } catch(e){}

                    activeBasemaps.forEach(bm => {
                        const isSavedChecked = savedActive.includes(String(bm.id));
                        targets.forEach(container => {
                            const containerDiv = document.createElement('div');
                            containerDiv.style.display = 'flex';
                            containerDiv.style.flexDirection = 'column';
                            containerDiv.style.marginBottom = '6px';

                            const cbId = `spatial_cb_${container.id}_${bm.id}`;
                            const label = document.createElement('label');
                            label.className = 'layer-checkbox gm-spatial-item';
                            label.htmlFor = cbId;
                            label.innerHTML = `
                                <input type="checkbox" id="${cbId}" value="${bm.id}" data-layer-id="${bm.id}" ${isSavedChecked ? 'checked' : ''}>
                                <span style="pointer-events:none;user-select:none;">${bm.name}</span>
                                <div style="width:12px;height:12px;background:${bm.color || '#1a73e8'};border-radius:3px;margin-left:auto;pointer-events:none;flex-shrink:0;"></div>
                            `;

                            const legendDiv = document.createElement('div');
                            legendDiv.className = `legend-container-${bm.id}`;
                            legendDiv.style.display = 'none';
                            legendDiv.style.paddingLeft = '28px';
                            legendDiv.style.marginTop = '4px';

                            const input = label.querySelector('input');
                            // Prevent synthetic double-event on mobile when tapping the checkbox directly
                            input.addEventListener('click', function(e) {
                                e.stopPropagation();
                            });
                            input.addEventListener('change', function() {
                                toggleSpatialLayer(bm.id, this.checked);
                            });

                            containerDiv.appendChild(label);
                            containerDiv.appendChild(legendDiv);
                            container.appendChild(containerDiv);
                        });

                        // Restore layer to map if it was saved as active
                        if (isSavedChecked) {
                            toggleSpatialLayer(bm.id, true);
                        }
                    });
                }
            });

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
                const matched = allReports.find(r => Math.abs(parseFloat(r.latitude) - lat) < 0.0001 && Math.abs(parseFloat(r.longitude) - lng) < 0.0001) || allReports.find(r => r.nama_pemohon === nama);
                if (matched && window.showPlaceDetails) {
                    window.showPlaceDetails(matched);
                }
                // Show toast
                const toast = document.createElement('div');
                const toastBottom = mobileQuery.matches
                    ? 'calc(82px + env(safe-area-inset-bottom))'
                    : '30px';
                toast.style.cssText = 'position:fixed;bottom:' + toastBottom + ';left:50%;transform:translateX(-50%);background:#1a73e8;color:#fff;padding:10px 22px;border-radius:30px;font-size:0.88rem;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);pointer-events:none;';
                toast.textContent = '📍 Menampilkan lokasi: ' + (matched ? matched.nama_pemohon : nama);
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

        // Helper: Google Maps Teardrop SVG Pin
        function getGooglePin(status, hak) {
            let color = '#ea4335'; // Default Google Red
            if (status === 'selesai') color = '#0f9d58'; // Google Green
            else if (status === 'verifikasi') color = '#f9ab00'; // Google Amber
            else if (status === 'mediasi') color = '#1a73e8'; // Google Blue
            else if (hak === 'Milik') color = '#1a73e8';
            else if (hak === 'Guna Bangunan') color = '#ea8600';

            return L.divIcon({
                className: 'gm-marker-pin-wrap',
                html: `
                    <div class="gm-pin-marker" style="--pin-c: ${color};">
                        <svg viewBox="0 0 24 36" width="30" height="42">
                            <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="${color}" stroke="#ffffff" stroke-width="1.2" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.35))"/>
                            <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
                        </svg>
                    </div>
                `,
                iconSize: [30, 42],
                iconAnchor: [15, 42],
                popupAnchor: [0, -38]
            });
        }

        // Global: Google Maps Place Detail Sheet
        window.showPlaceDetails = function(item) {
            if (!item) return;

            // Switch to detail view in panel
            const vList = document.getElementById('viewList');
            const vDetail = document.getElementById('viewDetail');
            if (vList && vDetail) {
                vList.style.display = 'none';
                vDetail.style.display = 'block';
            }

            // Fill details
            const elNama = document.getElementById('detNamaPemohon');
            const elNo = document.getElementById('detNoPermohonan');
            const elBadge = document.getElementById('detStatusBadge');
            const elAlamat = document.getElementById('detAlamat');
            const elHak = document.getElementById('detHak');
            const elLuas = document.getElementById('detLuas');
            const elKep = document.getElementById('detKeperluan');
            const elPem = document.getElementById('detPemohon');
            const elKoor = document.getElementById('detKoordinat');

            if (elNama) elNama.textContent = item.nama_pemohon || '-';
            if (elNo) elNo.textContent = `No. Permohonan: ${item.no_permohonan || '-'} · ${item.created_at || 'Baru'}`;
            if (elBadge) {
                const st = (item.status || 'pending').toLowerCase();
                elBadge.className = `gm-cover-badge st-${st}`;
                elBadge.textContent = st === 'selesai' ? 'Selesai' : (st === 'verifikasi' ? 'Terverifikasi' : (st === 'mediasi' ? 'Mediasi' : 'Proses Verifikasi'));
            }
            if (elAlamat) elAlamat.textContent = `${item.alamat || '-'}, Kel. ${item.kelurahan || '-'}, Kec. ${item.kecamatan || '-'}`;
            if (elHak) elHak.textContent = `${item.jenis_hak || '-'} No. ${item.nomor_hak || '-'}`;
            if (elLuas) elLuas.textContent = `${item.luas_sertipikat || '-'} m²`;
            if (elKep) elKep.textContent = `${item.keadaan_tanah || '-'} · Keperluan: ${item.keperluan || '-'}`;
            if (elPem) elPem.textContent = `NIK: ${item.nik || '-'} · HP: ${item.no_telp || '-'}`;
            if (elKoor) elKoor.textContent = `${parseFloat(item.latitude).toFixed(6)}, ${parseFloat(item.longitude).toFixed(6)}`;

            // Wire action buttons
            const btnFly = document.getElementById('btnDetailFly');
            if (btnFly) {
                btnFly.onclick = () => {
                    map.flyTo([item.latitude, item.longitude], 17, { animate: true, duration: 1.2 });
                    if (item._marker && item._marker.openPopup) item._marker.openPopup();
                    if (window.MobileUI && MobileUI.isMobile()) MobileUI.closeSheets();
                };
            }

            const btnPrint = document.getElementById('btnDetailPrint');
            if (btnPrint) {
                btnPrint.onclick = () => {
                    const printWin = window.open('', '_blank');
                    printWin.document.write(`
                        <html><head><title>Tanda Terima - ${item.no_permohonan}</title>
                        <style>body{font-family:sans-serif;padding:30px;line-height:1.6;}table{width:100%;border-collapse:collapse;margin-top:15px;}td{padding:8px;border-bottom:1px solid #ddd;}strong{color:#1a73e8;}</style></head>
                        <body>
                        <h2>KANTOR PERTANAHAN KOTA PROBOLINGGO</h2>
                        <h3>Tanda Bukti Permohonan Peta Tematik</h3>
                        <table>
                            <tr><td>No. Permohonan</td><td><b>${item.no_permohonan}</b></td></tr>
                            <tr><td>Nama Pemohon</td><td>${item.nama_pemohon}</td></tr>
                            <tr><td>NIK</td><td>${item.nik}</td></tr>
                            <tr><td>Alamat</td><td>${item.alamat}</td></tr>
                            <tr><td>Kecamatan / Kelurahan</td><td>${item.kecamatan} / ${item.kelurahan}</td></tr>
                            <tr><td>Jenis Hak</td><td>${item.jenis_hak} No. ${item.nomor_hak}</td></tr>
                            <tr><td>Luas Sertipikat</td><td>${item.luas_sertipikat} m²</td></tr>
                            <tr><td>Koordinat</td><td>${item.latitude}, ${item.longitude}</td></tr>
                        </table>
                        <br><p style="font-size:0.8rem;color:#666;">Dicetak otomatis melalui Peta Tematik Kota Probolinggo</p>
                        </body></html>
                    `);
                    printWin.document.close();
                    printWin.focus();
                    setTimeout(() => printWin.print(), 300);
                };
            }

            const btnCopy = document.getElementById('btnDetailCopy');
            if (btnCopy) {
                btnCopy.onclick = () => {
                    const shareText = `Lokasi Lahan: ${item.nama_pemohon} (${item.no_permohonan}) - https://maps.google.com/?q=${item.latitude},${item.longitude}`;
                    navigator.clipboard.writeText(shareText).then(() => {
                        alert('Tautan lokasi berhasil disalin ke clipboard!');
                    });
                };
            }

            // Fly to marker & open popup
            map.flyTo([item.latitude, item.longitude], 16, { animate: true, duration: 1 });
            if (item._marker && item._marker.openPopup) item._marker.openPopup();

            // Mobile: open bottom sheet
            if (window.MobileUI && MobileUI.isMobile()) {
                MobileUI.openSheet('sidebarPanel');
            }

            if (typeof feather !== 'undefined') feather.replace();
        };

        // Wire Back to List button
        const btnBackToList = document.getElementById('btnBackToList');
        if (btnBackToList && !btnBackToList.hasListener) {
            btnBackToList.addEventListener('click', () => {
                const vList = document.getElementById('viewList');
                const vDetail = document.getElementById('viewDetail');
                if (vList && vDetail) {
                    vDetail.style.display = 'none';
                    vList.style.display = 'block';
                }
            });
            btnBackToList.hasListener = true;
        }

        // Only render visible (non-hidden) items on map
        visibleData.forEach(item => {
            const popupContent = `
                <div class="gm-popup-card">
                    <div class="gm-popup-header">
                        <span class="gm-popup-badge">${item.no_permohonan}</span>
                        <span class="gm-popup-status st-${(item.status || 'pending').toLowerCase()}">${item.status || 'Pending'}</span>
                    </div>
                    <strong class="gm-popup-title">${item.nama_pemohon}</strong>
                    <div class="gm-popup-sub">${item.kecamatan}, ${item.kelurahan}</div>
                    <div class="gm-popup-detail">
                        <div><b>Hak:</b> ${item.jenis_hak} No. ${item.nomor_hak}</div>
                        <div><b>Luas:</b> ${item.luas_sertipikat || '-'} m²</div>
                    </div>
                    <button type="button" class="gm-popup-action-btn" onclick="window.showPlaceDetails && window.showPlaceDetails(window.allReportsData.find(x => x.id == ${item.id}))">
                        Lihat Rincian Lahan &rarr;
                    </button>
                </div>
            `;

            const createMarker = () => {
                const pinIcon = getGooglePin(item.status, item.jenis_hak);
                const marker = L.marker([item.latitude, item.longitude], { icon: pinIcon }).addTo(map);
                marker.bindPopup(popupContent, { maxWidth: 260, className: 'gm-leaflet-popup' });
                marker.on('click', () => { 
                    window.showPlaceDetails(item);
                });
                item._marker = marker;
            };

            if (item.shp_file) {
                fetch(item.shp_file).then(res => res.arrayBuffer()).then(buffer => {
                    shp(buffer).then(geojson => {
                        const layers = Array.isArray(geojson) ? geojson : [geojson];
                        const combinedFeatures = [];
                        layers.forEach(layer => { if (layer?.features) combinedFeatures.push(...layer.features); });
                        const combinedGeojson = { type: 'FeatureCollection', features: combinedFeatures };

                        const shpColor    = item.color      || '#1a73e8';
                        const fillType    = item.fill_type  || 'fill';
                        const shpWeight   = parseInt(item.weight) || 2;
                        const dashArray   = item.dash_array || null;
                        const fillOpacity = fillType === 'hollow' ? 0 : 0.45;

                        let catField  = item.category_field  || null;
                        let catColors = {};
                        if (item.category_colors) {
                            try { catColors = typeof item.category_colors === 'string' ? JSON.parse(item.category_colors) : item.category_colors; } catch(e) {}
                        }

                        const layer = L.geoJSON(combinedGeojson, {
                            style: (feature) => {
                                let featureColor = shpColor;
                                if (catField && feature.properties) {
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
                        layer.bindPopup(popupContent, { maxWidth: 260, className: 'gm-leaflet-popup' });
                        layer.on('click', () => { 
                            map.fitBounds(layer.getBounds(), { padding: [50, 50] }); 
                            window.showPlaceDetails(item);
                        });
                        item._marker = layer;
                    }).catch(e => createMarker());
                }).catch(e => createMarker());
            } else {
                createMarker();
            }
        });

        window.allReportsData = visibleData;
    }

    const searchInput = document.getElementById('dashboardSearch');
    if (searchInput && !searchInput.hasListener) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            filteredReports = allReports.filter(item => 
                (item.nama_pemohon && item.nama_pemohon.toLowerCase().includes(val)) || 
                (item.kecamatan && item.kecamatan.toLowerCase().includes(val)) ||
                (item.kelurahan && item.kelurahan.toLowerCase().includes(val)) ||
                (item.nomor_hak && item.nomor_hak.toLowerCase().includes(val)) ||
                (item.no_permohonan && item.no_permohonan.toLowerCase().includes(val))
            );
            sidebarPage = 1;
            updateSidebarList();
        });
        searchInput.hasListener = true;
    }

    // Google Maps Filter Chips logic
    document.querySelectorAll('.gm-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.gm-chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const filter = this.dataset.filter;

            if (filter === 'all') {
                filteredReports = allReports;
            } else if (filter.startsWith('status-')) {
                const st = filter.replace('status-', '');
                filteredReports = allReports.filter(item => (item.status || '').toLowerCase() === st);
            } else {
                filteredReports = allReports.filter(item => item.jenis_hak === filter);
            }
            sidebarPage = 1;
            updateSidebarList();

            // Open sheet on mobile so user sees the filtered list
            if (window.MobileUI && MobileUI.isMobile()) {
                const vList = document.getElementById('viewList');
                const vDetail = document.getElementById('viewDetail');
                if (vList && vDetail) {
                    vDetail.style.display = 'block';
                    vList.style.display = 'block';
                    // If in detail mode, switch back to list
                    vDetail.style.display = 'none';
                }
                MobileUI.openSheet('sidebarPanel');
            }
        });
    });

    function updateSidebarList() {
        const container = document.getElementById('reportList');
        const pagination = document.getElementById('sidebarPagination');
        const info = document.getElementById('sidePaginationInfo');
        const prevBtn = document.getElementById('sidePrevBtn');
        const nextBtn = document.getElementById('sideNextBtn');
        const totalBadge = document.getElementById('totalCountBadge');

        if (!container) return;
        container.innerHTML = '';

        if (totalBadge) {
            totalBadge.textContent = `${filteredReports.length} lokasi lahan ditemukan`;
        }

        if (filteredReports.length === 0) {
            container.innerHTML = `
                <div class="gm-empty-state">
                    <i data-feather="map-pin" style="width:36px;height:36px;color:#dadce0;margin-bottom:8px;"></i>
                    <p style="font-size:0.9rem;color:#5f6368;margin:0;">Tidak ada permohonan yang sesuai dengan filter.</p>
                </div>
            `;
            if (pagination) pagination.style.display = 'none';
            if (typeof feather !== 'undefined') feather.replace();
            return;
        }

        if (pagination) pagination.style.display = 'flex';

        const start = (sidebarPage - 1) * sidebarLimit;
        const end = start + sidebarLimit;
        const pageData = filteredReports.slice(start, end);

        pageData.forEach(item => {
            const st = (item.status || 'pending').toLowerCase();
            let statusLabel = st === 'selesai' ? 'Selesai' : (st === 'verifikasi' ? 'Verifikasi' : (st === 'mediasi' ? 'Mediasi' : 'Pending'));

            const listItem = document.createElement('div');
            listItem.className = `gm-place-card`;
            listItem.innerHTML = `
                <div class="gm-card-main">
                    <div class="gm-card-icon-wrap">
                        <i data-feather="map-pin"></i>
                    </div>
                    <div class="gm-card-body">
                        <div class="gm-card-title-row">
                            <span class="gm-card-title">${item.nama_pemohon}</span>
                            <span class="gm-status-pill st-${st}">${statusLabel}</span>
                        </div>
                        <div class="gm-card-subtitle">${item.no_permohonan} · ${item.jenis_hak} No. ${item.nomor_hak}</div>
                        <div class="gm-card-address">${item.kecamatan}, ${item.kelurahan} · Luas: ${item.luas_sertipikat || '-'} m²</div>
                    </div>
                </div>
                <div class="gm-card-actions">
                    <button type="button" class="gm-card-chip">
                        <i data-feather="navigation" style="width:12px;height:12px;"></i> Rute
                    </button>
                    <button type="button" class="gm-card-chip">
                        <i data-feather="info" style="width:12px;height:12px;"></i> Rincian
                    </button>
                </div>
            `;
            
            listItem.addEventListener('click', () => {
                window.showPlaceDetails(item);
            });

            container.appendChild(listItem);
        });

        if (info) info.innerText = `${start + 1}-${Math.min(end, filteredReports.length)} dari ${filteredReports.length}`;
        if (prevBtn) prevBtn.disabled = sidebarPage === 1;
        if (nextBtn) nextBtn.disabled = end >= filteredReports.length;
        
        if (typeof feather !== 'undefined') feather.replace();
    }

    // ======== 4. FUNGSI UNTUK HALAMAN REPORT ========
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        if (document.body.classList.contains('report-page') && !document.getElementById('mobileSubmitFab')) {
            const submitFab = document.createElement('button');
            submitFab.type = 'button';
            submitFab.id = 'mobileSubmitFab';
            submitFab.className = 'mobile-submit-fab';
            submitFab.innerHTML = '<i data-feather="save"></i> Simpan Data Permohonan';
            document.body.appendChild(submitFab);
            if (typeof feather !== 'undefined') feather.replace();

            submitFab.addEventListener('click', () => {
                if (typeof reportForm.requestSubmit === 'function') {
                    reportForm.requestSubmit();
                } else {
                    reportForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
            });
        }

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
