/* ═══════════════════════════════════════════════════════════
   Admin Dashboard — Image Processor (Gift Factory + Nuevo Usuario)
   Extraído de recursos/admin.html (líneas 6952-7486 y 7489-7698)
═══════════════════════════════════════════════════════════ */

/* ── Image Processor: Gift Factory ── */
    (function() {
        'use strict';

        /* â”€â”€ ConfiguraciÃ³n de tamaÃ±os â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        const TARGETS = {
            inst:  { w: 280, h: 180, label: 'Logo institucional' },
            prof:  { w: 160, h: 160, label: 'Logo profesional' },
            firma: { w: 500, h: 200, label: 'Firma digital' }
        };

        /* â”€â”€ Preview temporal (antes de aplicar con "Usar esta imagen") â”€â”€ */
        const _giftImagePreview = { inst: null, prof: null, firma: null };

        /* â”€â”€ Estado â”€â”€ */
        let _originalImage = null;
        let _resultB64 = null;

        /* â”€â”€ Utilidades Canvas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

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
            out.width = maxW; out.height = maxH;
            const ctx = out.getContext('2d');
            const offX = Math.round((maxW - newW) / 2);
            const offY = Math.round((maxH - newH) / 2);
            ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, offX, offY, newW, newH);
            return out;
        }

        /* â”€â”€ Carga dinÃ¡mica de la librerÃ­a AI de background removal â”€â”€ */
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
                s.onerror = () => resolve(null); // fallback al mÃ©todo canvas
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
                        // Convertir canvas â†’ blob para la IA
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
                    console.warn('[imgproc] AI bg removal fallÃ³, usando mÃ©todo canvas:', e.message);
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

        /* â”€â”€ InicializaciÃ³n al entrar al Step 5 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
        window._imgprocInitStep5 = function() { /* estado persistente mientras el modal estÃ© abierto */ };

        /* â”€â”€ Factory: crea un procesador independiente por tipo de imagen â”€â”€â”€ */
        function _makeImageSection(cfg) {
            // cfg: { type, prefix, getFromPrev, saveResult, target }
            const g = (id) => document.getElementById(cfg.prefix + id);
            const state = { origImg: null, resultB64: null, rot: 0, fH: false, fV: false, br: 100, cn: 100 };

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
                // Apply brightness/contrast via canvas
                const base = new Image();
                base.onload = () => {
                    const sw = base.naturalWidth, sh = base.naturalHeight;
                    const rot = state.rot, swapped = rot === 90 || rot === 270;
                    const ow = swapped ? sh : sw, oh = swapped ? sw : sh;
                    const c = document.createElement('canvas'); c.width = ow; c.height = oh;
                    const ctx = c.getContext('2d');
                    ctx.filter = `brightness(${state.br}%) contrast(${state.cn}%)`;
                    ctx.save();
                    ctx.translate(ow/2, oh/2);
                    ctx.rotate(rot * Math.PI/180);
                    ctx.scale(state.fH ? -1 : 1, state.fV ? -1 : 1);
                    ctx.drawImage(base, -sw/2, -sh/2);
                    ctx.restore();
                    const edited = c.toDataURL('image/png');
                    const ri = g('-result'); if (ri) ri.src = edited;
                    // tambiÃ©n actualizar thumb si ya estaba procesado
                    showThumb(edited);
                    // Actualizar preview PDF en tiempo real
                    _giftImagePreview[cfg.type] = edited;
                    _updatePdfSim();
                };
                base.src = state.resultB64;
            }

            function getEditedB64() {
                return new Promise(resolve => {
                    if (!state.resultB64) { resolve(null); return; }
                    const base = new Image();
                    base.onload = () => {
                        const sw = base.naturalWidth, sh = base.naturalHeight;
                        const rot = state.rot, swapped = rot === 90 || rot === 270;
                        const ow = swapped ? sh : sw, oh = swapped ? sw : sh;
                        const c = document.createElement('canvas'); c.width = ow; c.height = oh;
                        const ctx = c.getContext('2d');
                        ctx.filter = `brightness(${state.br}%) contrast(${state.cn}%)`;
                        ctx.save(); ctx.translate(ow/2,oh/2); ctx.rotate(rot*Math.PI/180);
                        ctx.scale(state.fH?-1:1,state.fV?-1:1);
                        ctx.drawImage(base,-sw/2,-sh/2); ctx.restore();
                        resolve(c.toDataURL('image/png'));
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
                const br = g('-br'); if (br) { br.value = '100'; }
                const brval = g('-brval'); if (brval) brval.textContent = '100';
                const cn = g('-cn'); if (cn) { cn.value = '100'; }
                const cnval = g('-cnval'); if (cnval) cnval.textContent = '100';
                const cl = g('-clear'); if (cl) cl.style.display = 'inline-flex';
                // Resetear preview PDF al cargar nueva imagen
                _giftImagePreview[cfg.type] = null;
                _updatePdfSim();
                setStatus('Listo para procesar', '#3b82f6');
            }

            // â”€â”€ Upload â”€â”€
            const fileInput = g('-file');
            if (fileInput) {
                fileInput.addEventListener('change', async (e) => {
                    const file = e.target.files[0]; if (!file) return;
                    if (file.size > 5*1024*1024) { alert('MÃ¡x 5 MB'); fileInput.value=''; return; }
                    const reader = new FileReader();
                    reader.onload = async (ev) => { try { await loadB64(ev.target.result); } catch(err) { alert('Error: '+err.message); } };
                    reader.readAsDataURL(file);
                });
            }

            // â”€â”€ Cargar del paso anterior â”€â”€
            const fromBtn = g('-from2') || g('-from3');
            if (fromBtn) {
                fromBtn.addEventListener('click', async () => {
                    let b64 = cfg.getFromPrev ? cfg.getFromPrev() : null;
                    if (!b64) {
                        if (typeof dashAlert === 'function') dashAlert('No hay imagen subida en el paso anterior para este tipo. SubÃ­ una primero.', 'ðŸ“·');
                        else alert('No hay imagen anterior para este tipo.');
                        return;
                    }
                    try { await loadB64(b64); } catch(err) { alert('Error: '+err.message); }
                });
            }

            // â”€â”€ Quitar â”€â”€
            const clearBtn = g('-clear');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    state.origImg = null; state.resultB64 = null;
                    const tw = g('-thumb-wrap'); if (tw) tw.style.display = 'none';
                    const ps = g('-proc-section'); if (ps) ps.style.display = 'none';
                    const es = g('-edit-section'); if (es) es.style.display = 'none';
                    clearBtn.style.display = 'none';
                    setStatus('VacÃ­o', '');
                    cfg.saveResult && cfg.saveResult(null);
                    if (fileInput) fileInput.value = '';
                    _giftImagePreview[cfg.type] = null;
                    _updatePdfSim();
                });
            }

            // â”€â”€ Procesar â”€â”€
            const procBtn = g('-process');
            if (procBtn) {
                procBtn.addEventListener('click', async () => {
                    if (!state.origImg) return;
                    procBtn.disabled = true;
                    procBtn.textContent = 'â³ Iniciando...';
                    try {
                        const opts = {
                            removeBackground: (g('-bg') || {}).checked !== false,
                            threshold: 30, autoTrim: (g('-trim') || {}).checked !== false,
                            scale: (g('-scale') || {}).checked !== false
                        };
                        state.resultB64 = await processImage(state.origImg, cfg.type, opts, (key, pct) => {
                            if (key.includes('load') || key.includes('fetch')) procBtn.textContent = 'ðŸ¤– Cargando modelo... ' + pct + '%';
                            else if (key.includes('compute') || key.includes('inference')) procBtn.textContent = 'ðŸ¤– Procesando IA... ' + pct + '%';
                        });
                        // Mostrar previews
                        const oi = g('-orig'); if (oi && state.origImg) oi.src = state.origImg.src;
                        const ri = g('-result'); if (ri) ri.src = state.resultB64;
                        showThumb(state.resultB64);
                        // Mostrar editor, ocultar opciones
                        const ps = g('-proc-section'); if (ps) ps.style.display = 'none';
                        const es = g('-edit-section'); if (es) es.style.display = 'block';
                        setStatus('âœ… Procesada', '#10b981');
                        // Actualizar preview PDF con imagen procesada
                        _giftImagePreview[cfg.type] = state.resultB64;
                        _updatePdfSim();
                    } catch (err) {
                        alert('Error al procesar: ' + err.message);
                    } finally {
                        procBtn.disabled = false;
                        procBtn.textContent = 'âš™ï¸ Procesar imagen';
                    }
                });
            }

            // â”€â”€ Controles de ediciÃ³n â”€â”€
            const brSlider = g('-br'), brVal = g('-brval');
            if (brSlider) brSlider.addEventListener('input', () => { state.br = parseInt(brSlider.value,10); if(brVal) brVal.textContent = state.br; renderResult(); });
            const cnSlider = g('-cn'), cnVal = g('-cnval');
            if (cnSlider) cnSlider.addEventListener('input', () => { state.cn = parseInt(cnSlider.value,10); if(cnVal) cnVal.textContent = state.cn; renderResult(); });
            const szSlider = g('-sz'), szVal = g('-szval'), szDesc = g('-szdesc');
            if (szSlider) szSlider.addEventListener('input', () => {
                const sz = parseInt(szSlider.value, 10);
                if (szVal) szVal.textContent = sz;
                if (szDesc) szDesc.textContent = sz <= 45 ? '(pequeÃ±o)' : sz <= 80 ? '(normal)' : '(grande)';
                if (cfg.type === 'inst') _giftImageData.instLogoSize = sz;
                else if (cfg.type === 'prof') _giftImageData.proLogoSize = sz;
                else _giftImageData.firmaSize = sz;
                _updatePdfSim();
            });

            const rotLBtn = g('-rotL'); if (rotLBtn) rotLBtn.addEventListener('click', () => { state.rot = (state.rot - 90 + 360) % 360; renderResult(); });
            const rotRBtn = g('-rotR'); if (rotRBtn) rotRBtn.addEventListener('click', () => { state.rot = (state.rot + 90) % 360; renderResult(); });
            const fHBtn   = g('-fH');   if (fHBtn)   fHBtn.addEventListener('click',   () => { state.fH = !state.fH; renderResult(); });
            const fVBtn   = g('-fV');   if (fVBtn)   fVBtn.addEventListener('click',   () => { state.fV = !state.fV; renderResult(); });
            const resetBtn = g('-reset');
            if (resetBtn) resetBtn.addEventListener('click', () => {
                state.rot = 0; state.fH = false; state.fV = false; state.br = 100; state.cn = 100;
                if (brSlider) { brSlider.value = '100'; if(brVal) brVal.textContent = '100'; }
                if (cnSlider) { cnSlider.value = '100'; if(cnVal) cnVal.textContent = '100'; }
                renderResult();
            });

            // â”€â”€ Aplicar â”€â”€
            const applyBtn = g('-apply');
            if (applyBtn) {
                applyBtn.addEventListener('click', async () => {
                    const edited = await getEditedB64();
                    if (!edited) return;
                    cfg.saveResult(edited);
                    _updatePdfSim();
                    if (typeof dashAlert === 'function') dashAlert('âœ… Imagen guardada y lista para incluir en el link.', 'ðŸ–¼ï¸');
                    else alert('Imagen aplicada.');
                });
            }
        }

        function _updatePdfSim() {
            const simBox = document.getElementById('imgprocSimBox');
            if (!simBox) return;

            // Leer datos dinÃ¡micos del wizard
            const nombre     = (document.getElementById('giftNombre') || {}).value?.trim() || 'Dr. Nombre Ejemplo';
            const matricula  = (document.getElementById('giftMatricula') || {}).value?.trim() || 'MP-000';
            const especialidad = (document.getElementById('giftEspecialidad') || {}).value || '';
            const wpName     = (document.getElementById('gwWpName0') || {}).value?.trim() || '';
            const wpAddress  = (document.getElementById('gwWpAddress0') || {}).value?.trim() || '';
            const wpPhone    = (document.getElementById('gwWpPhone0') || {}).value?.trim() || '';
            const accent     = _giftSelectedColor || '#1a56a0';

            // Aplicar color de acento al preview
            simBox.style.setProperty('--sim-accent', accent);

            // â”€â”€ Banner del lugar de trabajo â”€â”€
            const simBanner  = document.getElementById('imgprocSimBanner');
            const simLL      = document.getElementById('imgprocSimLogoLeft');
            const firstWpKey = Object.keys(_giftWpLogoData || {})[0];
            const instB64    = _giftImagePreview.inst || (firstWpKey ? _giftWpLogoData[firstWpKey] : null);
            const instSize   = _giftImageData.instLogoSize || 60;

            if (simBanner) {
                const hasWpData = wpName || wpAddress || wpPhone || instB64;
                simBanner.style.display = hasWpData ? 'flex' : 'none';
                simBanner.style.background = accent;
                // Logo institucional en banner
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
                if (simWpN) simWpN.textContent = wpName || '';
                if (simWpD) {
                    const parts = [wpAddress, wpPhone ? 'Tel: ' + wpPhone : ''].filter(Boolean);
                    simWpD.textContent = parts.join(' â€¢ ');
                }
            }

            // â”€â”€ Fila de estudio â”€â”€
            const simStudy = document.getElementById('imgprocSimStudy');
            if (simStudy) simStudy.textContent = especialidad || 'Estudio';
            const simDate = document.getElementById('imgprocSimDate');
            if (simDate) simDate.textContent = new Date().toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'});

            // â”€â”€ Encabezado profesional â”€â”€
            const simProfName = document.getElementById('imgprocSimProfName');
            const simProfSpec = document.getElementById('imgprocSimProfSpec');
            if (simProfName) simProfName.textContent = nombre;
            if (simProfSpec) simProfSpec.textContent = [especialidad, matricula ? 'Mat. ' + matricula : ''].filter(Boolean).join(' Â· ');

            // Logo del mÃ©dico
            const simLR  = document.getElementById('imgprocSimLogoRight');
            const profB64 = _giftImagePreview.prof || (_giftImageData && _giftImageData.proLogo);
            const profSize = _giftImageData.proLogoSize || 60;
            if (simLR) {
                simLR.innerHTML = '';
                if (profB64) {
                    const i = document.createElement('img');
                    i.src = profB64;
                    i.style.height = Math.round(profSize * 0.6) + 'px';
                    i.style.width = 'auto';
                    i.style.objectFit = 'contain';
                    simLR.appendChild(i);
                }
            }

            // â”€â”€ Firma â”€â”€
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
                    i.style.maxWidth = Math.round(firmaSize * 2) + 'px';
                    i.style.maxHeight = Math.round(firmaSize * 0.8) + 'px';
                    i.style.objectFit = 'contain';
                    simFirmaImg.appendChild(i);
                } else { simFirma.style.display = 'none'; }
            }
            if (simFirmaName) simFirmaName.textContent = nombre + ' Â· Mat. ' + matricula;

            const hasAny = instB64 || profB64 || firmaB64;
            simBox.style.display = hasAny ? 'block' : 'none';
        }

        function initImageProcessor() {
            // SecciÃ³n Logo Institucional
            _makeImageSection({
                type: 'inst', prefix: 'imgInst',
                getFromPrev: () => {
                    const firstKey = Object.keys(_giftWpLogoData || {})[0];
                    return firstKey ? _giftWpLogoData[firstKey] : null;
                },
                saveResult: (b64) => {
                    const firstKey = Object.keys(_giftWpLogoData || {});
                    const key = firstKey.length > 0 ? firstKey[0] : '0';
                    _giftWpLogoData[key] = b64;
                    // Actualizar preview en paso 2
                    const prev = document.getElementById('gwWpLogoPreview0');
                    if (prev && b64) prev.innerHTML = '<img src="'+b64+'" alt="Logo" style="max-height:50px;">';
                }
            });
            // SecciÃ³n Logo del MÃ©dico
            _makeImageSection({
                type: 'prof', prefix: 'imgProf',
                getFromPrev: () => _giftImageData && _giftImageData.proLogo,
                saveResult: (b64) => {
                    _giftImageData.proLogo = b64;
                    const prev = document.getElementById('giftProLogoPreview');
                    if (prev && b64) prev.innerHTML = '<img src="'+b64+'" alt="Logo" style="max-height:50px;">';
                }
            });
            // SecciÃ³n Firma Digital
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

        // Inicializar cuando el DOM estÃ© listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initImageProcessor);
        } else {
            initImageProcessor();
        }
    })();

/* ── Image Processor: Modal Nuevo Usuario ── */
    (function() {
        'use strict';

        const NU_TARGETS = {
            inst:  { w: 280, h: 180, label: 'Logo institucional' },
            prof:  { w: 160, h: 160, label: 'Logo profesional' },
            firma: { w: 500, h: 200, label: 'Firma digital' }
        };

        let _nuOrigImg = null;
        let _nuResultB64 = null;

        // Reutilizar funciones Canvas del procesador gift (estÃ¡n en scope global via window)
        function _nuLoadImg(src) {
            return new Promise((res, rej) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => res(img);
                img.onerror = () => rej(new Error('No se pudo cargar'));
                img.src = src;
            });
        }

        function _nuDetectBg(imageData) {
            const { data, width, height } = imageData;
            const sz = Math.min(10, Math.floor(Math.min(width, height) / 4));
            let rS=0,gS=0,bS=0,c=0;
            [{x:0,y:0},{x:width-sz,y:0},{x:0,y:height-sz},{x:width-sz,y:height-sz}].forEach(corner => {
                for(let dy=0;dy<sz;dy++) for(let dx=0;dx<sz;dx++) {
                    const i=((corner.y+dy)*width+(corner.x+dx))*4;
                    rS+=data[i]; gS+=data[i+1]; bS+=data[i+2]; c++;
                }
            });
            return {r:Math.round(rS/c),g:Math.round(gS/c),b:Math.round(bS/c)};
        }

        function _nuRemoveColor(imageData, bg, threshold) {
            const d=imageData.data, t2=threshold*threshold;
            for(let i=0;i<d.length;i+=4){
                const dr=d[i]-bg.r,dg=d[i+1]-bg.g,db=d[i+2]-bg.b,dist2=dr*dr+dg*dg+db*db;
                if(dist2<t2){ d[i+3]=Math.round(d[i+3]*Math.max(0,(Math.sqrt(dist2)/threshold)*0.8)); }
            }
        }

        function _nuTrim(canvas) {
            const ctx=canvas.getContext('2d'),id=ctx.getImageData(0,0,canvas.width,canvas.height);
            const d=id.data,w=id.width,h=id.height;
            let top=h,left=w,bottom=0,right=0;
            for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
                if(d[(y*w+x)*4+3]>10){ if(y<top)top=y; if(y>bottom)bottom=y; if(x<left)left=x; if(x>right)right=x; }
            }
            if(top>bottom||left>right) return canvas;
            const tw=right-left+1,th=bottom-top+1,tc=document.createElement('canvas');
            tc.width=tw; tc.height=th;
            tc.getContext('2d').drawImage(canvas,left,top,tw,th,0,0,tw,th);
            return tc;
        }

        function _nuScale(canvas, maxW, maxH) {
            const r=Math.min(maxW/canvas.width,maxH/canvas.height,1);
            const nw=Math.round(canvas.width*r),nh=Math.round(canvas.height*r);
            const out=document.createElement('canvas'); out.width=maxW; out.height=maxH;
            const ctx=out.getContext('2d');
            ctx.drawImage(canvas,0,0,canvas.width,canvas.height,Math.round((maxW-nw)/2),Math.round((maxH-nh)/2),nw,nh);
            return out;
        }

        async function _nuProcess(img, type, opts) {
            const c=document.createElement('canvas'); c.width=img.naturalWidth||img.width; c.height=img.naturalHeight||img.height;
            const ctx=c.getContext('2d'); ctx.drawImage(img,0,0);
            if(opts.removeBg) { const id=ctx.getImageData(0,0,c.width,c.height); _nuRemoveColor(id,_nuDetectBg(id),opts.threshold); ctx.putImageData(id,0,0); }
            let res=c;
            if(opts.trim) res=_nuTrim(c);
            if(opts.scale) { const t=NU_TARGETS[type]; res=_nuScale(res,t.w,t.h); }
            return res.toDataURL('image/png');
        }

        function initNuImageProcessor() {
            const el = (id) => document.getElementById(id);
            const elType=el('nuImgprocType'), elFile=el('nuImgprocFile'), elPaste=el('nuImgprocPasteUrl');
            const elRemBg=el('nuImgprocRemoveBg'), elThresh=el('nuImgprocThreshold'), elThreshVal=el('nuImgprocThresholdVal');
            const elThreshRow=el('nuImgprocThresholdRow'), elTrim=el('nuImgprocTrim'), elScale=el('nuImgprocScale');
            const elProcess=el('nuImgprocProcess'), elOrigPrev=el('nuImgprocOrigPreview'), elResPrev=el('nuImgprocResultPreview');
            const elSimBox=el('nuImgprocSimBox'), elSimLL=el('nuImgprocSimLogoLeft'), elSimLR=el('nuImgprocSimLogoRight');
            const elSimFirma=el('nuImgprocSimFirma'), elSimFirmaImg=el('nuImgprocSimFirmaImg');
            const elActions=el('nuImgprocActions'), elDownload=el('nuImgprocDownload'), elCopyB64=el('nuImgprocCopyB64');
            const elApply=el('nuImgprocApply'), elB64Info=el('nuImgprocB64Info'), elLoad=el('nuImgprocLoadUploaded');

            if (!elType || !elProcess) return;

            function showOrig(img) {
                _nuOrigImg=img;
                elOrigPrev.innerHTML='';
                const p=document.createElement('img'); p.src=img.src; p.alt='Original';
                p.style.maxWidth='100%'; p.style.maxHeight='180px'; p.style.objectFit='contain';
                elOrigPrev.appendChild(p);
                elProcess.disabled=false;
                elResPrev.innerHTML='<span class="imgproc-placeholder">â€”</span>';
                elActions.style.display='none'; elSimBox.style.display='none'; elB64Info.style.display='none';
                _nuResultB64=null;
            }

            // Cargar desde uploads de SecciÃ³n 6
            elLoad.addEventListener('click', async () => {
                const type=elType.value;
                let fileInput=null;
                if(type==='prof') fileInput=el('newLogoMedico');
                else if(type==='firma') fileInput=el('newFirma');
                else fileInput=el('newLogosInstituciones');

                if(!fileInput || !fileInput.files || !fileInput.files[0]) {
                    alert('No hay imagen subida de este tipo en la secciÃ³n de arriba. SubÃ­ una primero.');
                    return;
                }
                const reader=new FileReader();
                reader.onload=async(ev)=>{
                    try { const img=await _nuLoadImg(ev.target.result); showOrig(img); }
                    catch(e){ alert('Error: '+e.message); }
                };
                reader.readAsDataURL(fileInput.files[0]);
            });

            elFile.addEventListener('change', async(e)=>{
                const f=e.target.files[0]; if(!f) return;
                if(f.size>5*1024*1024){ alert('Max 5 MB'); elFile.value=''; return; }
                const reader=new FileReader();
                reader.onload=async(ev)=>{
                    try { const img=await _nuLoadImg(ev.target.result); showOrig(img); }
                    catch(e){ alert('Error: '+e.message); }
                };
                reader.readAsDataURL(f);
            });

            elPaste.addEventListener('click', async()=>{
                const url=prompt('PegÃ¡ la URL de la imagen:');
                if(!url||!url.trim()) return;
                try { const img=await _nuLoadImg(url.trim()); showOrig(img); }
                catch(e){ alert('No se pudo cargar desde esa URL.'); }
            });

            elThresh.addEventListener('input',()=>{ elThreshVal.textContent=elThresh.value; });
            elRemBg.addEventListener('change',()=>{ elThreshRow.style.display=elRemBg.checked?'flex':'none'; });

            elProcess.addEventListener('click', async()=>{
                if(!_nuOrigImg) return;
                elProcess.disabled=true; elProcess.textContent='â³ Procesando...';
                try {
                    const type=elType.value;
                    _nuResultB64=await _nuProcess(_nuOrigImg, type, {
                        removeBg:elRemBg.checked, threshold:parseInt(elThresh.value,10),
                        trim:elTrim.checked, scale:elScale.checked
                    });
                    elResPrev.innerHTML='';
                    const ri=document.createElement('img'); ri.src=_nuResultB64; ri.alt='Resultado';
                    ri.style.maxWidth='100%'; ri.style.maxHeight='180px'; ri.style.objectFit='contain';
                    elResPrev.appendChild(ri);

                    const kb=Math.round((_nuResultB64.length*3/4)/1024);
                    elB64Info.textContent='TamaÃ±o: ~'+kb+' KB'; elB64Info.style.display='block';

                    // Sim PDF
                    elSimBox.style.display='block';
                    elSimLL.innerHTML=''; elSimLR.innerHTML=''; elSimFirma.style.display='none';
                    const si=document.createElement('img'); si.src=_nuResultB64;
                    si.style.maxWidth=type==='inst'?'70px':type==='prof'?'40px':'120px';
                    si.style.maxHeight=type==='inst'?'45px':type==='prof'?'40px':'50px';
                    if(type==='inst') elSimLL.appendChild(si);
                    else if(type==='prof') elSimLR.appendChild(si);
                    else { elSimFirma.style.display='block'; elSimFirmaImg.innerHTML=''; elSimFirmaImg.appendChild(si); }

                    elActions.style.display='flex';
                } catch(e){ alert('Error: '+e.message); }
                finally { elProcess.disabled=false; elProcess.textContent='âš™ï¸ Procesar imagen'; }
            });

            elDownload.addEventListener('click',()=>{
                if(!_nuResultB64) return;
                const a=document.createElement('a');
                a.href=_nuResultB64;
                a.download=NU_TARGETS[elType.value].label.replace(/\s+/g,'_')+'_'+Date.now()+'.png';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
            });

            elCopyB64.addEventListener('click', async()=>{
                if(!_nuResultB64) return;
                try { await navigator.clipboard.writeText(_nuResultB64); }
                catch(_){ const ta=document.createElement('textarea'); ta.value=_nuResultB64; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
                elCopyB64.textContent='âœ… Copiado!';
                setTimeout(()=>{ elCopyB64.textContent='ðŸ“‹ Copiar Base64'; },2000);
            });

            elApply.addEventListener('click',()=>{
                if(!_nuResultB64) return;
                const type=elType.value;
                let prevId='';
                if(type==='prof') prevId='previewLogoMedico';
                else if(type==='firma') prevId='previewFirma';
                else prevId='previewLogosInst';
                const prev=document.getElementById(prevId);
                if(prev) prev.innerHTML='<img src="'+_nuResultB64+'" alt="Procesada" style="max-height:80px;">';
                if(typeof dashAlert==='function') dashAlert('âœ… '+NU_TARGETS[type].label+' procesado y listo.','ðŸ–¼ï¸');
                else alert(NU_TARGETS[type].label+' aplicado.');
            });
        }

        if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initNuImageProcessor);
        else initNuImageProcessor();
    })();
