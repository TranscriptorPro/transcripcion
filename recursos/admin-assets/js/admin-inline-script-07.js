(function() {
        'use strict';

        /* ── Configuración de tamaños ─────────────────────────────── */
        const TARGETS = {
            inst:  { w: 280, h: 180, label: 'Logo institucional' },
            prof:  { w: 160, h: 160, label: 'Logo profesional' },
            firma: { w: 500, h: 200, label: 'Firma digital' }
        };

        /* ── Preview temporal — declaración movida al bloque GIFT state (arriba) ── */

        /* ── Estado ── */
        let _originalImage = null;
        let _resultB64 = null;

        /* ── Utilidades Canvas ──────────────────────────────────── */

        function loadImageFromSrc(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
                img.src = src;
            });
        }

        function detectBackgroundColor(imageData) {
            const { data, width, height } = imageData;
            const sampleSize = Math.min(10, Math.floor(Math.min(width, height) / 4));
            let rSum = 0, gSum = 0, bSum = 0, count = 0;
            const corners = [
                { x: 0, y: 0 },
                { x: width - sampleSize, y: 0 },
                { x: 0, y: height - sampleSize },
                { x: width - sampleSize, y: height - sampleSize }
            ];
            for (const corner of corners) {
                for (let dy = 0; dy < sampleSize; dy++) {
                    for (let dx = 0; dx < sampleSize; dx++) {
                        const idx = ((corner.y + dy) * width + (corner.x + dx)) * 4;
                        rSum += data[idx]; gSum += data[idx + 1]; bSum += data[idx + 2]; count++;
                    }
                }
            }
            return { r: Math.round(rSum / count), g: Math.round(gSum / count), b: Math.round(bSum / count) };
        }

        function removeColor(imageData, bgColor, threshold) {
            const { data } = imageData;
            const t2 = threshold * threshold;
            for (let i = 0; i < data.length; i += 4) {
                const dr = data[i] - bgColor.r;
                const dg = data[i + 1] - bgColor.g;
                const db = data[i + 2] - bgColor.b;
                const dist2 = dr * dr + dg * dg + db * db;
                if (dist2 < t2) {
                    const distNorm = Math.sqrt(dist2) / threshold;
                    data[i + 3] = Math.round(data[i + 3] * Math.max(0, distNorm * 0.8));
                }
            }
        }

        function trimTransparent(canvas) {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const { data, width, height } = imageData;
            let top = height, left = width, bottom = 0, right = 0;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (data[(y * width + x) * 4 + 3] > 10) {
                        if (y < top) top = y;
                        if (y > bottom) bottom = y;
                        if (x < left) left = x;
                        if (x > right) right = x;
                    }
                }
            }
            if (top > bottom || left > right) return canvas;
            const trimW = right - left + 1, trimH = bottom - top + 1;
            const trimmed = document.createElement('canvas');
            trimmed.width = trimW; trimmed.height = trimH;
            trimmed.getContext('2d').drawImage(canvas, left, top, trimW, trimH, 0, 0, trimW, trimH);
            return trimmed;
        }

        function scaleToFit(canvas, maxW, maxH) {
            const ratio = Math.min(maxW / canvas.width, maxH / canvas.height, 1);
            const newW = Math.round(canvas.width * ratio);
            const newH = Math.round(canvas.height * ratio);
            const out = document.createElement('canvas');
            out.width = newW; out.height = newH;
            const ctx = out.getContext('2d');
            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, newW, newH);
            return out;
        }

        /* ── Carga dinámica de la librería AI de background removal ── */
        let _bgLibLoading = null;
        async function loadBgRemovalLib() {
            if (window._imglyBgRemoval) return window._imglyBgRemoval;
            if (_bgLibLoading) return _bgLibLoading;
            _bgLibLoading = new Promise((resolve) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/bundle/index.umd.js';
                s.onload = () => {
                    const lib = window['@imgly/background-removal'] || window.BackgroundRemoval || null;
                    window._imglyBgRemoval = lib;
                    resolve(lib);
                };
                s.onerror = () => resolve(null); // fallback al método canvas
                document.head.appendChild(s);
            });
            return _bgLibLoading;
        }

        async function processImage(img, type, options, onProgress) {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            if (options.removeBackground) {
                let aiDone = false;
                try {
                    const lib = await loadBgRemovalLib();
                    if (lib && lib.removeBackground) {
                        // Convertir canvas → blob para la IA
                        const inputBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
                        const resultBlob = await lib.removeBackground(inputBlob, {
                            model: 'small',
                            debug: false,
                            progress: (key, cur, total) => {
                                if (typeof onProgress === 'function' && total > 0) {
                                    onProgress(key, Math.round(cur / total * 100));
                                }
                            }
                        });
                        // Volcar resultado de vuelta al canvas
                        const objUrl = URL.createObjectURL(resultBlob);
                        const aiImg = await loadImageFromSrc(objUrl);
                        canvas.width = aiImg.naturalWidth;
                        canvas.height = aiImg.naturalHeight;
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(aiImg, 0, 0);
                        URL.revokeObjectURL(objUrl);
                        aiDone = true;
                    }
                } catch (e) {
                    console.warn('[imgproc] AI bg removal falló, usando método canvas:', e.message);
                }
                if (!aiDone) {
                    // Fallback: algoritmo canvas (muestreo de esquinas)
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const bgColor = detectBackgroundColor(imageData);
                    removeColor(imageData, bgColor, options.threshold);
                    ctx.putImageData(imageData, 0, 0);
                }
            }

            let result = canvas;
            if (options.autoTrim) result = trimTransparent(canvas);
            if (options.scale) {
                const t = TARGETS[type];
                result = scaleToFit(result, t.w, t.h);
            }
            return result.toDataURL('image/png');
        }

        /* ── Inicialización al entrar al Step 5 (logo institucional ya se edita en cada WP) ── */
        window._imgprocInitStep5 = function() {
            // No-op: el logo institucional ahora se edita en la sección del lugar de trabajo
        };

        /* ── Factory: crea un procesador independiente por tipo de imagen ─── */
        function _makeImageSection(cfg) {
            // cfg: { type, prefix, getFromPrev, saveResult, target }
            const g = (id) => document.getElementById(cfg.prefix + id);
            const state = { origImg: null, resultB64: null, rot: 0, fH: false, fV: false, br: 100, cn: 100, rw: 0, rh: 0, cmp: 92, ratioLock: true, aspectRatio: 1, baseW: 0, baseH: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 };

            function notifyPreview(b64) {
                if (cfg.onPreviewUpdate) { cfg.onPreviewUpdate(cfg.type, b64); return; }
                _giftImagePreview[cfg.type] = b64;
                _updatePdfSim();
            }
            function notifySize(type, sz) {
                if (cfg.onSizeUpdate) { cfg.onSizeUpdate(type, sz); return; }
                if (type === 'inst') _giftImageData.instLogoSize = sz;
                else if (type === 'prof') _giftImageData.proLogoSize = sz;
                else _giftImageData.firmaSize = sz;
                _updatePdfSim();
            }

            function setStatus(text, color) {
                const el = g('-status');
                if (!el) return;
                el.textContent = text;
                el.style.background = color || '#f1f5f9';
                el.style.color = color ? '#fff' : '#64748b';
            }

            function showThumb(src) {
                const wrap = g('-thumb-wrap'), img = g('-thumb');
                if (!wrap || !img) return;
                img.src = src; wrap.style.display = 'block';
            }

            function renderResult() {
                if (!state.resultB64) return;
                const base = new Image();
                base.onload = () => {
                    let srcX = 0, srcY = 0, srcW = base.naturalWidth, srcH = base.naturalHeight;
                    // Apply crop first (in original image coordinates)
                    if (state.cropW > 0 && state.cropH > 0) {
                        srcX = state.cropX; srcY = state.cropY;
                        srcW = state.cropW; srcH = state.cropH;
                    }
                    let sw = srcW, sh = srcH;
                    // Apply custom resize if set
                    if (state.rw > 0 && state.rh > 0) { sw = state.rw; sh = state.rh; }
                    const rot = state.rot, swapped = rot === 90 || rot === 270;
                    const ow = swapped ? sh : sw, oh = swapped ? sw : sh;
                    const c = document.createElement('canvas'); c.width = ow; c.height = oh;
                    const ctx = c.getContext('2d');
                    ctx.filter = `brightness(${state.br}%) contrast(${state.cn}%)`;
                    ctx.save();
                    ctx.translate(ow/2, oh/2);
                    ctx.rotate(rot * Math.PI/180);
                    ctx.scale(state.fH ? -1 : 1, state.fV ? -1 : 1);
                    ctx.drawImage(base, srcX, srcY, srcW, srcH, -sw/2, -sh/2, sw, sh);
                    ctx.restore();
                    const q = state.cmp / 100;
                    // Siempre PNG para preservar transparencia (JPEG pone fondo negro)
                    let edited;
                    if (q < 1) {
                        const c2 = document.createElement('canvas');
                        const s = Math.max(q, 0.3);
                        c2.width = Math.round(ow * s); c2.height = Math.round(oh * s);
                        const ctx2 = c2.getContext('2d');
                        ctx2.drawImage(c, 0, 0, c2.width, c2.height);
                        edited = c2.toDataURL('image/png');
                    } else {
                        edited = c.toDataURL('image/png');
                    }
                    const ri = g('-result'); if (ri) ri.src = edited;
                    showThumb(edited);
                    notifyPreview(edited);
                    // Show file size estimate
                    const cmpInfo = g('-cmpinfo');
                    if (cmpInfo) {
                        const finalW = q < 1 ? Math.round(ow * Math.max(q, 0.3)) : ow;
                        const finalH = q < 1 ? Math.round(oh * Math.max(q, 0.3)) : oh;
                        const kb = Math.round(edited.length * 0.75 / 1024);
                        cmpInfo.textContent = `~${kb} KB · ${finalW}×${finalH}px · PNG`;
                    }
                };
                base.src = state.resultB64;
            }

            function getEditedB64() {
                return new Promise(resolve => {
                    if (!state.resultB64) { resolve(null); return; }
                    const base = new Image();
                    base.onload = () => {
                        let srcX = 0, srcY = 0, srcW = base.naturalWidth, srcH = base.naturalHeight;
                        if (state.cropW > 0 && state.cropH > 0) {
                            srcX = state.cropX; srcY = state.cropY;
                            srcW = state.cropW; srcH = state.cropH;
                        }
                        let sw = srcW, sh = srcH;
                        if (state.rw > 0 && state.rh > 0) { sw = state.rw; sh = state.rh; }
                        const rot = state.rot, swapped = rot === 90 || rot === 270;
                        const ow = swapped ? sh : sw, oh = swapped ? sw : sh;
                        const c = document.createElement('canvas'); c.width = ow; c.height = oh;
                        const ctx = c.getContext('2d');
                        ctx.filter = `brightness(${state.br}%) contrast(${state.cn}%)`;
                        ctx.save(); ctx.translate(ow/2,oh/2); ctx.rotate(rot*Math.PI/180);
                        ctx.scale(state.fH?-1:1,state.fV?-1:1);
                        ctx.drawImage(base, srcX, srcY, srcW, srcH, -sw/2,-sh/2,sw,sh); ctx.restore();
                        const q = state.cmp / 100;
                        if (q < 1) {
                            const c2 = document.createElement('canvas');
                            const s = Math.max(q, 0.3);
                            c2.width = Math.round(ow * s); c2.height = Math.round(oh * s);
                            c2.getContext('2d').drawImage(c, 0, 0, c2.width, c2.height);
                            resolve(c2.toDataURL('image/png'));
                        } else {
                            resolve(c.toDataURL('image/png'));
                        }
                    };
                    base.src = state.resultB64;
                });
            }

            async function loadB64(b64) {
                state.origImg = await loadImageFromSrc(b64);
                const oi = g('-orig'); if (oi) oi.src = b64;
                showThumb(b64);
                const ps = g('-proc-section'); if (ps) ps.style.display = 'block';
                const es = g('-edit-section'); if (es) es.style.display = 'none';
                state.resultB64 = null;
                state.rot = 0; state.fH = false; state.fV = false;
                state.br = 100; state.cn = 100;
                state.rw = 0; state.rh = 0; state.cmp = 92; state.ratioLock = true;
                state.cropX = 0; state.cropY = 0; state.cropW = 0; state.cropH = 0;
                state.aspectRatio = (state.origImg.naturalWidth || 1) / (state.origImg.naturalHeight || 1);
                const br = g('-br'); if (br) { br.value = '100'; }
                const brval = g('-brval'); if (brval) brval.textContent = '100';
                const cn = g('-cn'); if (cn) { cn.value = '100'; }
                const cnval = g('-cnval'); if (cnval) cnval.textContent = '100';
                state.baseW = state.origImg.naturalWidth;
                state.baseH = state.origImg.naturalHeight;
                const rscale = g('-rscale'); if (rscale) rscale.value = '100';
                const rsval = g('-scaleval'); if (rsval) rsval.textContent = '100';
                const rdims = g('-rdims'); if (rdims) rdims.textContent = `${state.origImg.naturalWidth}×${state.origImg.naturalHeight}px`;
                const cmpSlider = g('-cmp'); if (cmpSlider) cmpSlider.value = '92';
                const cmpVal = g('-cmpval'); if (cmpVal) cmpVal.textContent = '92';
                const cmpInfo = g('-cmpinfo'); if (cmpInfo) cmpInfo.textContent = '';
                const cl = g('-clear'); if (cl) cl.style.display = 'inline-flex';
                notifyPreview(null);
                setStatus('Listo para procesar', '#3b82f6');
            }

            // ── Upload ──
            const fileInput = g('-file');
            if (fileInput) {
                fileInput.addEventListener('change', async (e) => {
                    const file = e.target.files[0]; if (!file) return;
                    if (file.size > 5*1024*1024) { alert('Máx 5 MB'); fileInput.value=''; return; }
                    const reader = new FileReader();
                    reader.onload = async (ev) => { try { await loadB64(ev.target.result); } catch(err) { alert('Error: '+err.message); } };
                    reader.readAsDataURL(file);
                });
            }

            // ── Cargar del paso anterior ──
            const fromBtn = g('-from2') || g('-from3');
            if (fromBtn) {
                fromBtn.addEventListener('click', async () => {
                    let b64 = cfg.getFromPrev ? cfg.getFromPrev() : null;
                    if (!b64) {
                        if (typeof dashAlert === 'function') dashAlert('No hay imagen subida en el paso anterior para este tipo. Subí una primero.', '📷');
                        else alert('No hay imagen anterior para este tipo.');
                        return;
                    }
                    try { await loadB64(b64); } catch(err) { alert('Error: '+err.message); }
                });
            }

            // ── Quitar ──
            function clearSection() {
                state.origImg = null; state.resultB64 = null;
                const tw = g('-thumb-wrap'); if (tw) tw.style.display = 'none';
                const ps = g('-proc-section'); if (ps) ps.style.display = 'none';
                const es = g('-edit-section'); if (es) es.style.display = 'none';
                const cl = g('-clear'); if (cl) cl.style.display = 'none';
                setStatus('Vacío', '');
                cfg.saveResult && cfg.saveResult(null);
                if (fileInput) fileInput.value = '';
                notifyPreview(null);
            }
            const clearBtn = g('-clear');
            if (clearBtn) {
                clearBtn.addEventListener('click', clearSection);
            }

            // ── Procesar ──
            const procBtn = g('-process');
            if (procBtn) {
                procBtn.addEventListener('click', async () => {
                    if (!state.origImg) return;
                    procBtn.disabled = true;
                    procBtn.textContent = '⏳ Iniciando...';
                    try {
                        const opts = {
                            removeBackground: (g('-bg') || {}).checked !== false,
                            threshold: 30, autoTrim: (g('-trim') || {}).checked !== false,
                            scale: (g('-scale') || {}).checked !== false
                        };
                        state.resultB64 = await processImage(state.origImg, cfg.type, opts, (key, pct) => {
                            if (key.includes('load') || key.includes('fetch')) procBtn.textContent = '🤖 Cargando modelo... ' + pct + '%';
                            else if (key.includes('compute') || key.includes('inference')) procBtn.textContent = '🤖 Procesando IA... ' + pct + '%';
                        });
                        // Mostrar previews
                        const oi = g('-orig'); if (oi && state.origImg) oi.src = state.origImg.src;
                        const ri = g('-result'); if (ri) ri.src = state.resultB64;
                        showThumb(state.resultB64);
                        // Mostrar editor, ocultar opciones
                        const ps = g('-proc-section'); if (ps) ps.style.display = 'none';
                        const es = g('-edit-section'); if (es) es.style.display = 'block';
                        setStatus('✅ Procesada', '#10b981');
                        // Determinar dimensiones del resultado procesado (síncrono con await)
                        const _procImg = await loadImageFromSrc(state.resultB64);
                        state.aspectRatio = _procImg.naturalWidth / _procImg.naturalHeight;
                        state.baseW = _procImg.naturalWidth;
                        state.baseH = _procImg.naturalHeight;
                        state.rw = 0; state.rh = 0;
                        const _rd = g('-rdims'); if (_rd) _rd.textContent = `${_procImg.naturalWidth}×${_procImg.naturalHeight}px`;
                        const _rs = g('-rscale'); if (_rs) { _rs.value = '100'; const _sv = g('-scaleval'); if (_sv) _sv.textContent = '100'; }
                        notifyPreview(state.resultB64);
                    } catch (err) {
                        alert('Error al procesar: ' + err.message);
                    } finally {
                        procBtn.disabled = false;
                        procBtn.textContent = '⚙️ Procesar imagen';
                    }
                });
            }

            // ── Controles de edición ──
            const brSlider = g('-br'), brVal = g('-brval');
            if (brSlider) brSlider.addEventListener('input', () => { state.br = parseInt(brSlider.value,10); if(brVal) brVal.textContent = state.br; renderResult(); });
            const cnSlider = g('-cn'), cnVal = g('-cnval');
            if (cnSlider) cnSlider.addEventListener('input', () => { state.cn = parseInt(cnSlider.value,10); if(cnVal) cnVal.textContent = state.cn; renderResult(); });

            // ── Escala (slider) ──
            const rscaleSlider = g('-rscale'), rscaleVal = g('-scaleval'), rdimsEl = g('-rdims');
            if (rscaleSlider) rscaleSlider.addEventListener('input', () => {
                const scale = parseInt(rscaleSlider.value, 10);
                if (rscaleVal) rscaleVal.textContent = scale;
                if (state.baseW > 0 && state.baseH > 0) {
                    state.rw = Math.round(state.baseW * scale / 100);
                    state.rh = Math.round(state.baseH * scale / 100);
                    if (rdimsEl) rdimsEl.textContent = `${state.rw}×${state.rh}px`;
                }
                if (state.resultB64) renderResult();
            });

            // ── Compresión ──
            const cmpSlider = g('-cmp'), cmpVal = g('-cmpval');
            if (cmpSlider) cmpSlider.addEventListener('input', () => {
                state.cmp = parseInt(cmpSlider.value, 10);
                if (cmpVal) cmpVal.textContent = state.cmp;
                renderResult();
            });

            const szSlider = g('-sz'), szVal = g('-szval'), szDesc = g('-szdesc');
            if (szSlider) szSlider.addEventListener('input', () => {
                const sz = parseInt(szSlider.value, 10);
                if (szVal) szVal.textContent = sz;
                if (szDesc) szDesc.textContent = sz <= 45 ? '(pequeño)' : sz <= 80 ? '(normal)' : '(grande)';
                notifySize(cfg.type, sz);
            });

            const rotLBtn = g('-rotL'); if (rotLBtn) rotLBtn.addEventListener('click', () => { state.rot = (state.rot - 90 + 360) % 360; renderResult(); });
            const rotRBtn = g('-rotR'); if (rotRBtn) rotRBtn.addEventListener('click', () => { state.rot = (state.rot + 90) % 360; renderResult(); });
            const fHBtn   = g('-fH');   if (fHBtn)   fHBtn.addEventListener('click',   () => { state.fH = !state.fH; renderResult(); });
            const fVBtn   = g('-fV');   if (fVBtn)   fVBtn.addEventListener('click',   () => { state.fV = !state.fV; renderResult(); });

            // ── Recortar (Crop) ──
            const cropBtn = g('-crop');
            if (cropBtn) cropBtn.addEventListener('click', () => {
                if (!state.resultB64) return;
                // Crear overlay de recorte
                const overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;z-index:90000;background:#1a1a2e;display:flex;flex-direction:column;align-items:center;justify-content:center;';
                const toolbar = document.createElement('div');
                toolbar.style.cssText = 'display:flex;gap:10px;margin-bottom:12px;align-items:center;background:rgba(0,0,0,.5);padding:8px 16px;border-radius:8px;';
                toolbar.innerHTML = '<span style="color:#e0e0e0;font-size:.95rem;margin-right:8px;">✂️ Arrastrá sobre la imagen para seleccionar el área de recorte</span>'
                    + '<button type="button" id="_cropConfirm" style="padding:6px 16px;background:#10b981;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.9rem;font-weight:600;">✅ Aplicar recorte</button>'
                    + '<button type="button" id="_cropCancel" style="padding:6px 16px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.9rem;font-weight:600;">✖ Cancelar</button>';
                overlay.appendChild(toolbar);
                const wrap = document.createElement('div');
                wrap.style.cssText = 'position:relative;display:inline-block;max-width:90vw;max-height:75vh;cursor:crosshair;border:2px solid #444;border-radius:4px;';
                const img = document.createElement('img');
                img.src = state.resultB64;
                img.style.cssText = 'max-width:90vw;max-height:75vh;display:block;user-select:none;-webkit-user-drag:none;';
                img.draggable = false;
                wrap.appendChild(img);
                // Selection rectangle
                const sel = document.createElement('div');
                sel.style.cssText = 'position:absolute;border:3px solid #00ff88;background:rgba(0,255,136,.2);display:none;pointer-events:none;box-shadow:0 0 0 9999px rgba(0,0,0,.55);';
                wrap.appendChild(sel);
                overlay.appendChild(wrap);
                document.body.appendChild(overlay);

                let drawing = false, sx = 0, sy = 0, ex = 0, ey = 0;
                const rect = () => wrap.getBoundingClientRect();

                function updateSel() {
                    const r = rect();
                    const x1 = Math.max(0, Math.min(sx, ex));
                    const y1 = Math.max(0, Math.min(sy, ey));
                    const x2 = Math.min(r.width, Math.max(sx, ex));
                    const y2 = Math.min(r.height, Math.max(sy, ey));
                    sel.style.left = x1 + 'px'; sel.style.top = y1 + 'px';
                    sel.style.width = (x2 - x1) + 'px'; sel.style.height = (y2 - y1) + 'px';
                    sel.style.display = 'block';
                }

                wrap.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    const r = rect();
                    sx = e.clientX - r.left; sy = e.clientY - r.top;
                    ex = sx; ey = sy; drawing = true;
                    updateSel();
                });
                wrap.addEventListener('mousemove', (e) => {
                    if (!drawing) return;
                    const r = rect();
                    ex = e.clientX - r.left; ey = e.clientY - r.top;
                    updateSel();
                });
                const stopDraw = () => { drawing = false; };
                wrap.addEventListener('mouseup', stopDraw);
                wrap.addEventListener('mouseleave', stopDraw);

                // Touch support
                wrap.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    const t = e.touches[0], r = rect();
                    sx = t.clientX - r.left; sy = t.clientY - r.top;
                    ex = sx; ey = sy; drawing = true;
                    updateSel();
                }, { passive: false });
                wrap.addEventListener('touchmove', (e) => {
                    if (!drawing) return;
                    e.preventDefault();
                    const t = e.touches[0], r = rect();
                    ex = t.clientX - r.left; ey = t.clientY - r.top;
                    updateSel();
                }, { passive: false });
                wrap.addEventListener('touchend', stopDraw);

                overlay.querySelector('#_cropCancel').addEventListener('click', () => overlay.remove());

                overlay.querySelector('#_cropConfirm').addEventListener('click', () => {
                    const r = rect();
                    const imgW = img.naturalWidth, imgH = img.naturalHeight;
                    const scaleX = imgW / r.width, scaleY = imgH / r.height;
                    const x1 = Math.max(0, Math.min(sx, ex));
                    const y1 = Math.max(0, Math.min(sy, ey));
                    const x2 = Math.min(r.width, Math.max(sx, ex));
                    const y2 = Math.min(r.height, Math.max(sy, ey));
                    const cw = x2 - x1, ch = y2 - y1;
                    if (cw < 5 || ch < 5) { overlay.remove(); return; }
                    state.cropX = Math.round(x1 * scaleX);
                    state.cropY = Math.round(y1 * scaleY);
                    state.cropW = Math.round(cw * scaleX);
                    state.cropH = Math.round(ch * scaleY);
                    // Update base dimensions to match cropped size
                    state.baseW = state.cropW;
                    state.baseH = state.cropH;
                    state.aspectRatio = state.cropW / state.cropH;
                    // Reset scale to 100% of cropped size
                    state.rw = 0; state.rh = 0;
                    if (rscaleSlider) { rscaleSlider.value = '100'; if (rscaleVal) rscaleVal.textContent = '100'; }
                    if (rdimsEl) rdimsEl.textContent = `${state.cropW}×${state.cropH}px`;
                    overlay.remove();
                    cropBtn.textContent = '✂️ Recortado';
                    cropBtn.style.background = '#10b981'; cropBtn.style.color = '#fff';
                    renderResult();
                });
            });

            const resetBtn = g('-reset');
            if (resetBtn) resetBtn.addEventListener('click', () => {
                state.rot = 0; state.fH = false; state.fV = false; state.br = 100; state.cn = 100;
                state.rw = 0; state.rh = 0; state.cmp = 92;
                state.cropX = 0; state.cropY = 0; state.cropW = 0; state.cropH = 0;
                // Restore original base dimensions
                if (state.origImg) {
                    state.baseW = state.origImg.naturalWidth;
                    state.baseH = state.origImg.naturalHeight;
                    state.aspectRatio = state.baseW / state.baseH;
                }
                if (brSlider) { brSlider.value = '100'; if(brVal) brVal.textContent = '100'; }
                if (cnSlider) { cnSlider.value = '100'; if(cnVal) cnVal.textContent = '100'; }
                if (rscaleSlider) { rscaleSlider.value = '100'; if(rscaleVal) rscaleVal.textContent = '100'; }
                if (rdimsEl && state.baseW) rdimsEl.textContent = `${state.baseW}×${state.baseH}px`;
                if (cmpSlider) { cmpSlider.value = '92'; if(cmpVal) cmpVal.textContent = '92'; }
                const cmpInfo = g('-cmpinfo'); if (cmpInfo) cmpInfo.textContent = '';
                if (cropBtn) { cropBtn.textContent = '✂️ Recortar'; cropBtn.style.background = ''; cropBtn.style.color = ''; }
                renderResult();
            });

            // ── Aplicar ──
            const applyBtn = g('-apply');
            if (applyBtn) {
                applyBtn.addEventListener('click', async () => {
                    const edited = await getEditedB64();
                    if (!edited) return;
                    cfg.saveResult(edited);
                    notifyPreview(edited);
                    if (typeof dashAlert === 'function') dashAlert('✅ Imagen guardada y lista para incluir en el link.', '🖼️');
                    else alert('Imagen aplicada.');
                });
            }

            // ── API pública del editor ──
            return { loadB64, getEditedB64, clear: clearSection };
        }

        function _updatePdfSim() {
            const simBox = document.getElementById('imgprocSimBox');
            if (!simBox) return;

            // Leer datos dinámicos del wizard
            const rawNombre  = (document.getElementById('giftNombre') || {}).value?.trim() || 'Nombre';
            const sexoSel    = (document.getElementById('giftSexo') || {}).value || 'M';
            const nombre     = (typeof window._formatGiftProfessionalDisplay === 'function')
                ? window._formatGiftProfessionalDisplay(rawNombre, sexoSel).fullName
                : (((String(sexoSel).toUpperCase() === 'F') ? 'Dra.' : 'Dr.') + ' ' + rawNombre);
            const matricula  = (document.getElementById('giftMatricula') || {}).value?.trim() || 'MP-000';
            const especialidad = (document.getElementById('giftEspecialidad') || {}).value || '';
            const wpIdx      = _giftActiveInstWp;
            const wpName     = (document.getElementById('gwWpName' + wpIdx) || {}).value?.trim() || '';
            const wpAddress  = (document.getElementById('gwWpAddress' + wpIdx) || {}).value?.trim() || '';
            const wpPhone    = (document.getElementById('gwWpPhone' + wpIdx) || {}).value?.trim() || '';
            const accent     = _giftSelectedColor || '#1a56a0';

            // Aplicar color de acento al preview (en el .pdf-sim-page)
            const simPage = simBox.querySelector('.pdf-sim-page');
            if (simPage) simPage.style.setProperty('--sim-accent', accent);

            // ── Banner del lugar de trabajo ──
            const simBanner  = document.getElementById('imgprocSimBanner');
            const simLL      = document.getElementById('imgprocSimLogoLeft');
            const instB64    = _giftImagePreview.inst || (_giftWpLogoData[wpIdx] || null);
            const instSize   = _giftImageData.instLogoSize || 60;

            if (simBanner) {
                const hasWpData = wpName || wpAddress || wpPhone || instB64;
                simBanner.style.display = hasWpData ? 'flex' : 'none';
                simBanner.style.background = accent;
                if (simLL) {
                    simLL.innerHTML = '';
                    if (instB64) {
                        const i = document.createElement('img');
                        i.src = instB64;
                        i.style.maxHeight = Math.round(instSize * 0.75) + 'px';
                        i.style.maxWidth = Math.round(instSize * 1.2) + 'px';
                        i.style.objectFit = 'contain';
                        simLL.appendChild(i);
                    }
                }
                const simWpN = document.getElementById('imgprocSimWpName');
                const simWpD = document.getElementById('imgprocSimWpDetails');
                if (simWpN) simWpN.textContent = wpName ? wpName.toUpperCase() : '';
                if (simWpD) {
                    const parts = [wpAddress, wpPhone ? 'Tel: ' + wpPhone : ''].filter(Boolean);
                    simWpD.textContent = parts.join(' · ');
                }
            }

            // ── Encabezado profesional ──
            const simProfName = document.getElementById('imgprocSimProfName');
            const simProfSpec = document.getElementById('imgprocSimProfSpec');
            if (simProfName) simProfName.textContent = nombre;
            if (simProfSpec) simProfSpec.textContent = [especialidad, matricula ? 'Mat. ' + matricula : ''].filter(Boolean).join(' · ');

            // Logo del médico
            const simLR  = document.getElementById('imgprocSimLogoRight');
            const profB64 = _giftImagePreview.prof || (_giftImageData && _giftImageData.proLogo);
            const profSize = _giftImageData.proLogoSize || 60;
            if (simLR) {
                simLR.innerHTML = '';
                if (profB64) {
                    const i = document.createElement('img');
                    i.src = profB64;
                    i.style.height = Math.round(profSize * 0.55) + 'px';
                    i.style.width = 'auto';
                    i.style.objectFit = 'contain';
                    simLR.appendChild(i);
                }
            }

            // ── Fila de estudio ──
            const simStudy = document.getElementById('imgprocSimStudy');
            if (simStudy) simStudy.textContent = especialidad || 'Estudio';
            const simDate = document.getElementById('imgprocSimDate');
            if (simDate) simDate.textContent = new Date().toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});

            // ── Firma ──
            const simFirma    = document.getElementById('imgprocSimFirma');
            const simFirmaImg = document.getElementById('imgprocSimFirmaImg');
            const simFirmaName = document.getElementById('imgprocSimFirmaName');
            const firmaB64 = _giftImagePreview.firma || (_giftImageData && _giftImageData.firma);
            const firmaSize = _giftImageData.firmaSize || 60;
            if (simFirma && simFirmaImg) {
                if (firmaB64) {
                    simFirma.style.display = 'block';
                    simFirmaImg.innerHTML = '';
                    const i = document.createElement('img');
                    i.src = firmaB64;
                    i.style.maxWidth = Math.round(firmaSize * 1.5) + 'px';
                    i.style.maxHeight = Math.round(firmaSize * 0.7) + 'px';
                    i.style.objectFit = 'contain';
                    simFirmaImg.appendChild(i);
                } else { simFirma.style.display = 'none'; }
            }
            if (simFirmaName) simFirmaName.textContent = nombre + ' · Mat. ' + matricula;

            // ── Nota de pie de página del lugar activo ──
            const wpFooter = (document.getElementById('gwWpFooter' + wpIdx) || {}).value?.trim() || '';
            const simFooter = document.getElementById('imgprocSimFooter');
            if (simFooter) simFooter.textContent = wpFooter || '© Transcriptor Médico Pro';

            const hasAny = instB64 || profB64 || firmaB64;
            simBox.style.display = hasAny ? 'block' : 'none';
        }

        function initImageProcessor() {
            // Logo institucional se edita ahora en la sección de cada lugar de trabajo
            // Sección Logo del Médico
            _makeImageSection({
                type: 'prof', prefix: 'imgProf',
                getFromPrev: () => _giftImageData && _giftImageData.proLogo,
                saveResult: (b64) => {
                    _giftImageData.proLogo = b64;
                    const prev = document.getElementById('giftProLogoPreview');
                    if (prev && b64) prev.innerHTML = '<img src="'+b64+'" alt="Logo" style="max-height:50px;">';
                }
            });
            // Sección Firma Digital
            _makeImageSection({
                type: 'firma', prefix: 'imgFirma',
                getFromPrev: () => _giftImageData && _giftImageData.firma,
                saveResult: (b64) => {
                    _giftImageData.firma = b64;
                    const prev = document.getElementById('giftFirmaPreview');
                    if (prev && b64) prev.innerHTML = '<img src="'+b64+'" alt="Firma" style="max-height:50px;">';
                }
            });
        }

        // Exponer factory y funciones para reuso desde inline handlers y modal de aprobación
        window._makeImageSection = _makeImageSection;
        window._updatePdfSim = _updatePdfSim;

        // Inicializar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initImageProcessor);
        } else {
            initImageProcessor();
        }
    })();
    