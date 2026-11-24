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
            // Google Maps POI & Fasilitas
            'cafe', 'restaurant', 'shop', 'hotel', 'hospital', 'school',
            'mosque', 'church', 'government', 'office', 'park', 'airport',
            'harbor', 'police', 'fire', 'bank', 'gas', 'parking', 'cemetery',
            'factory', 'warehouse', 'stadium', 'library', 'museum', 'market',
            'pin',
            // Bentuk Dasar
            'circle', 'square', 'triangle', 'diamond', 'star', 'pentagon', 'hexagon', 'cross', 'arrow',
            // Toponimi (ArcGIS)
            'capital', 'city', 'town', 'village', 'mountain', 'water'
        ];

        const GM_PIN_SYMBOLS = [
            'cafe', 'restaurant', 'shop', 'hotel', 'hospital', 'school',
            'mosque', 'church', 'government', 'office', 'park', 'airport',
            'harbor', 'police', 'fire', 'bank', 'gas', 'parking', 'cemetery',
            'factory', 'warehouse', 'stadium', 'library', 'museum', 'market',
            'pin'
        ];

        function isGMapPinSymbol(symbol) {
            return GM_PIN_SYMBOLS.includes(symbol);
        }

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

            // Google Maps POI Pin Badge Format (pin teardrop putih + lingkaran warna + icon putih)
            const gmGlyphs = {
                cafe: `<path d="M9.5 7.8h4.2v2.8a2.1 2.1 0 0 1-2.1 2.1 2.1 2.1 0 0 1-2.1-2.1V7.8z" fill="#fff"/><path d="M13.7 8.5h0.9a1 1 0 0 1 1 1v0.4a1 1 0 0 1-1 1h-0.9" fill="none" stroke="#fff" stroke-width="0.9" stroke-linecap="round"/><line x1="8.6" y1="13.6" x2="15.4" y2="13.6" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/>`,
                restaurant: `<path d="M9.6 6.5v2.3a1.1 1.1 0 0 0 1.1 1.1v3.6" stroke="#fff" stroke-width="1" stroke-linecap="round" fill="none"/><path d="M8.7 6.5h1.8" stroke="#fff" stroke-width="0.9" stroke-linecap="round"/><path d="M14.2 6.5v7" stroke="#fff" stroke-width="1" stroke-linecap="round"/><ellipse cx="14.2" cy="7.7" rx="1.1" ry="1.3" fill="#fff"/>`,
                shop: `<path d="M8.6 9h6.8v4.2a1 1 0 0 1-1 1h-4.8a1 1 0 0 1-1-1V9z" fill="#fff"/><path d="M10 9V7.8a2 2 0 0 1 4 0V9" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round"/>`,
                hotel: `<rect x="8.5" y="10" width="7" height="3" rx="0.5" fill="#fff"/><path d="M8.2 8.6v4.8M15.8 10.2v3.2" stroke="#fff" stroke-width="1" stroke-linecap="round"/><circle cx="10" cy="9.2" r="0.8" fill="#fff"/>`,
                hospital: `<path d="M12 6.8v6.4M8.8 10h6.4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`,
                school: `<polygon points="12,6.8 16.5,9.2 12,11.4 7.5,9.2" fill="#fff"/><path d="M9 10.2v2.2c0 1 1.3 1.8 3 1.8s3-.8 3-1.8v-2.2" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round"/><path d="M15.6 9.8v3" stroke="#fff" stroke-width="0.8" stroke-linecap="round"/>`,
                mosque: `<ellipse cx="12" cy="10.2" rx="4.2" ry="3.5" fill="#fff"/><rect x="7.8" y="10.2" width="8.4" height="3.2" fill="#fff"/><circle cx="12" cy="6.4" r="0.8" fill="#fff"/>`,
                church: `<path d="M12 6.2v3.2M10.6 7.4h2.8" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/><path d="M9.2 10.2h5.6v3.3H9.2z" fill="#fff"/>`,
                government: `<polygon points="12,6.6 16.5,8.8 7.5,8.8" fill="#fff"/><line x1="7.2" y1="8.8" x2="16.8" y2="8.8" stroke="#fff" stroke-width="0.8"/><rect x="8.5" y="9.5" width="1.2" height="3.2" fill="#fff"/><rect x="11.4" y="9.5" width="1.2" height="3.2" fill="#fff"/><rect x="14.3" y="9.5" width="1.2" height="3.2" fill="#fff"/><rect x="7.5" y="12.7" width="9" height="0.9" rx="0.3" fill="#fff"/>`,
                office: `<rect x="8.8" y="6.8" width="6.4" height="6.6" rx="0.6" fill="#fff"/><rect x="9.8" y="7.8" width="1.3" height="1.1" fill="${color}"/><rect x="12.9" y="7.8" width="1.3" height="1.1" fill="${color}"/><rect x="9.8" y="9.8" width="1.3" height="1.1" fill="${color}"/><rect x="12.9" y="9.8" width="1.3" height="1.1" fill="${color}"/>`,
                park: `<ellipse cx="12" cy="9.2" rx="3.8" ry="3.4" fill="#fff"/><rect x="11.2" y="12" width="1.6" height="2" rx="0.4" fill="#fff"/>`,
                airport: `<path d="M12 6.5l1.2 3.2 3.2 1-3.2.4-.6 1.8 1.4.9v.5l-2-.5-2 .5v-.5l1.4-.9-.6-1.8-3.2-.4 3.2-1z" fill="#fff"/>`,
                harbor: `<circle cx="12" cy="7.2" r="1" fill="none" stroke="#fff" stroke-width="0.9"/><line x1="12" y1="8.2" x2="12" y2="13.2" stroke="#fff" stroke-width="1"/><path d="M8.8 10.8c0 2.2 1.4 3.2 3.2 3.2s3.2-1 3.2-3.2" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round"/><line x1="10.2" y1="9.4" x2="13.8" y2="9.4" stroke="#fff" stroke-width="1" stroke-linecap="round"/>`,
                police: `<path d="M12 6.8l3.4 1.4v2.4c0 2.2-1.5 3.8-3.4 4.4-1.9-.6-3.4-2.2-3.4-4.4V8.2z" fill="#fff"/><circle cx="12" cy="10" r="1.1" fill="${color}"/>`,
                fire: `<path d="M12 6.5c0 1.6-1.8 2.6-1.8 3.8 0 1.2 1 2.2 2.2 2.2s2.2-1 2.2-2.2c0-1.8-1.5-2.2-1.5-3.8z" fill="#fff"/>`,
                bank: `<polygon points="12,6.8 16,8.8 8,8.8" fill="#fff"/><rect x="9" y="9.4" width="1.2" height="2.8" fill="#fff"/><rect x="13.8" y="9.4" width="1.2" height="2.8" fill="#fff"/><rect x="8.2" y="12.2" width="7.6" height="1" rx="0.3" fill="#fff"/><text x="12" y="11.6" font-size="2.6" font-weight="bold" fill="#fff" text-anchor="middle" font-family="sans-serif">$</text>`,
                gas: `<rect x="8.5" y="7.2" width="4.5" height="6.2" rx="0.6" fill="#fff"/><rect x="9.4" y="8.2" width="2.7" height="1.8" rx="0.3" fill="${color}"/><path d="M13 8.5l1.6 1v2.5h-1" fill="none" stroke="#fff" stroke-width="0.9" stroke-linecap="round"/>`,
                parking: `<path d="M10.2 7.2h2.2a1.8 1.8 0 0 1 0 3.6h-2.2v2.6" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
                cemetery: `<path d="M9.5 13.5V9a2.5 2.5 0 0 1 5 0v4.5z" fill="#fff"/><path d="M12 8.5v3M10.8 9.7h2.4" stroke="${color}" stroke-width="0.8" stroke-linecap="round"/>`,
                factory: `<path d="M8.5 13.5v-3.2l2.5 1.5v-1.5l2.5 1.5V7.5h1.8v6z" fill="#fff"/>`,
                warehouse: `<polygon points="12,7 16,9 12,11 8,9" fill="#fff"/><polygon points="8,9.5 12,11.5 12,13.5 8,11.5" fill="#fff" opacity="0.85"/><polygon points="16,9.5 12,11.5 12,13.5 16,11.5" fill="#fff" opacity="0.7"/>`,
                stadium: `<ellipse cx="12" cy="10" rx="4.5" ry="3.2" fill="none" stroke="#fff" stroke-width="1.2"/><ellipse cx="12" cy="10" rx="2" ry="1.2" fill="#fff"/>`,
                library: `<path d="M8.2 8.5a4 4 0 0 1 3.8 1.5v3.2a4 4 0 0 0-3.8-1.5z" fill="#fff"/><path d="M15.8 8.5a4 4 0 0 0-3.8 1.5v3.2a4 4 0 0 1 3.8-1.5z" fill="#fff"/>`,
                museum: `<polygon points="12,6.8 16.2,8.8 7.8,8.8" fill="#fff"/><rect x="8.8" y="9.4" width="1.1" height="3" fill="#fff"/><rect x="11.4" y="9.4" width="1.1" height="3" fill="#fff"/><rect x="14" y="9.4" width="1.1" height="3" fill="#fff"/><rect x="7.8" y="12.4" width="8.4" height="0.9" fill="#fff"/>`,
                market: `<path d="M8 8.5l1.6-1.5h4.8l1.6 1.5z" fill="#fff"/><rect x="8.5" y="8.5" width="7" height="4.8" fill="#fff"/><rect x="10.5" y="10.5" width="3" height="2.8" fill="${color}"/>`,
                pin: `<circle cx="12" cy="10" r="2.8" fill="#fff"/>`
            };

            if (gmGlyphs[symbol]) {
                const w = Math.round(px * 1.15);
                const h = Math.round(w * 1.167);
                return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 24 28" style="overflow:visible;">`
                     + `<path d="M12 1.5C7.3 1.5 3.5 5.3 3.5 10c0 5.4 7.3 14.7 8 15.6.3.3.7.3 1 0 .7-.9 8-10.2 8-15.6 0-4.7-3.8-8.5-8.5-8.5z" fill="#ffffff" stroke="rgba(0,0,0,0.18)" stroke-width="0.75"/>`
                     + `<circle cx="12" cy="10" r="6.6" fill="${color}"/>`
                     + gmGlyphs[symbol]
                     + `</svg>`;
            }

            const shapes = {
                circle: `<circle cx="12" cy="12" r="9" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.8"/>`,
                square: `<rect x="3.5" y="3.5" width="17" height="17" rx="2" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.8"/>`,
                triangle: `<polygon points="12,2.5 21.5,20.5 2.5,20.5" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>`,
                diamond: `<polygon points="12,2.5 21.5,12 12,21.5 2.5,12" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>`,
                star: `<polygon points="12,2.2 15,9 22.2,9.3 16.6,14.3 18.6,21.5 12,17.4 5.4,21.5 7.4,14.3 1.8,9.3 9,9" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`,
                pentagon: `<polygon points="12,2.4 22,9.7 18.2,21.2 5.8,21.2 2,9.7" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/>`,
                hexagon: `<polygon points="12,2.2 20.6,7.2 20.6,16.8 12,21.8 3.4,16.8 3.4,7.2" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.7" stroke-linejoin="round"/>`,
                cross: `<path d="M9.5 2h5v7.5H22v5h-7.5V22h-5v-7.5H2v-5h7.5z" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>`,
                arrow: `<polygon points="12,2 21.5,11.5 15.5,11.5 15.5,22 8.5,22 8.5,11.5 2.5,11.5" fill="${color}" fill-opacity="${fillOpacity}" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`,
                capital: `<circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="${fillOpacity}" stroke="${topoStroke}" stroke-width="1.5"/><polygon points="12,4.6 13.9,9.6 19.2,9.8 15,13.2 16.4,18.3 12,15.4 7.6,18.3 9,13.2 4.8,9.8 10.1,9.6" fill="${innerFill}" stroke="${topoStroke}" stroke-width="1.1" stroke-linejoin="round"/>`,
                city: `<circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="${fillOpacity}" stroke="${topoStroke}" stroke-width="1.5"/><circle cx="12" cy="12" r="4.8" fill="${innerFill}" stroke="${topoStroke}" stroke-width="1.1"/>`,
                town: `<circle cx="12" cy="12" r="9.5" fill="${color}" fill-opacity="${fillOpacity}" stroke="${topoStroke}" stroke-width="1.5"/><circle cx="12" cy="12" r="3.2" fill="${innerFill}" stroke="${topoStroke}" stroke-width="1.1"/>`,
                village: `<circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="4"/><circle cx="12" cy="12" r="6.4" fill="none" stroke="${color}" stroke-width="2.2"/>`,
                mountain: `<path d="M2 20.5 8.4 7.2 12.8 15.4 15.4 10.4 22 20.5Z" fill="${color}" fill-opacity="${fillOpacity}" stroke="${topoStroke}" stroke-width="1.5" stroke-linejoin="round"/>`,
                water: `<path d="M12 2.2C12 2.2 5.2 10.4 5.2 15a6.8 6.8 0 0 0 13.6 0C18.8 10.4 12 2.2 12 2.2Z" fill="${color}" fill-opacity="${fillOpacity}" stroke="${topoStroke}" stroke-width="1.5"/><path d="M9 15.2a3 3 0 0 0 3 3" fill="none" stroke="${filled ? '#fff' : color}" stroke-width="1.3" stroke-linecap="round" opacity="0.9"/>`
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

                                const isGMapPin = isGMapPinSymbol(featureSymbol);
                                const iconW = isGMapPin ? Math.round(symbolSize * 2.3) : symbolSize * 2;
                                const iconH = isGMapPin ? Math.round(iconW * 1.167) : symbolSize * 2;
                                return L.marker(latlng, {
                                    icon: L.divIcon({
                                        className: 'spatial-symbol-marker',
                                        html: spatialSymbolSvg(featureSymbol, symbolSize, c, fillOpacity !== 0),
                                        iconSize: [iconW, iconH],
                                        iconAnchor: isGMapPin ? [Math.round(iconW / 2), iconH] : [Math.round(iconW / 2), Math.round(iconH / 2)],
                                        popupAnchor: [0, isGMapPin ? -iconH : -Math.round(iconH / 2)]
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
