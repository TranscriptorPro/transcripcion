// ============ OUTPUT PROFILES — Sistema de perfiles de salida ============
// Un "perfil" = configuración nombrada de salida (lugar + profesional + formato PDF)
// Se persisten en localStorage('output_profiles')

(function () {
    'use strict';

    const STORAGE_KEY = 'output_profiles';

    // ── CRUD ─────────────────────────────────────────────────────────
    function getProfiles() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
        catch { return []; }
    }

    function saveProfiles(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    function generateId() {
        return 'prof_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    }

    // ── Capturar config actual del modal ─────────────────────────────
    function captureCurrentConfig() {
        const val = id => document.getElementById(id)?.value || '';
        const chk = (id, def) => document.getElementById(id)?.checked ?? def;
        return {
            workplaceIndex: val('pdfWorkplace'),
            professionalIndex: val('pdfProfessional'),
            pageSize: val('pdfPageSize') || 'a4',
            orientation: val('pdfOrientation') || 'portrait',
            margins: val('pdfMargins') || 'normal',
            font: val('pdfFont') || 'helvetica',
            fontSize: val('pdfFontSize') || '11',
            lineSpacing: val('pdfLineSpacing') || '1.5',
            showHeader: chk('pdfShowHeader', true),
            showFooter: chk('pdfShowFooter', true),
            showPageNum: chk('pdfShowPageNum', true),
            showDate: chk('pdfShowDate', false),
            showSignLine: chk('pdfShowSignLine', true),
            showSignName: chk('pdfShowSignName', true),
            showSignMatricula: chk('pdfShowSignMatricula', true),
            footerText: val('pdfFooterText')
        };
    }

    // ── Aplicar perfil a los controles del modal ─────────────────────
    function applyProfileToUI(profile) {
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };
        const setChk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = v; };

        // Workplace — setear select y disparar change para que cargue datos
        const wpSel = document.getElementById('pdfWorkplace');
        if (wpSel && profile.workplaceIndex !== '' && profile.workplaceIndex !== undefined) {
            wpSel.value = profile.workplaceIndex;
            wpSel.dispatchEvent(new Event('change'));
        }

        // Profesional — necesita un pequeño delay para que se populen las opciones
        if (profile.professionalIndex !== '' && profile.professionalIndex !== undefined) {
            setTimeout(() => {
                const profSel = document.getElementById('pdfProfessional');
                if (profSel) {
                    profSel.value = profile.professionalIndex;
                    profSel.dispatchEvent(new Event('change'));
                }
            }, 100);
        }

        // Formato
        set('pdfPageSize', profile.pageSize);
        set('pdfOrientation', profile.orientation);
        set('pdfMargins', profile.margins);
        set('pdfFont', profile.font);
        set('pdfFontSize', profile.fontSize);
        set('pdfLineSpacing', profile.lineSpacing);

        // Checkboxes
        setChk('pdfShowHeader', profile.showHeader !== false);
        setChk('pdfShowFooter', profile.showFooter !== false);
        setChk('pdfShowPageNum', profile.showPageNum !== false);
        setChk('pdfShowDate', profile.showDate === true);
        setChk('pdfShowSignLine', profile.showSignLine !== false);
        setChk('pdfShowSignName', profile.showSignName !== false);
        setChk('pdfShowSignMatricula', profile.showSignMatricula !== false);

        // Footer
        set('pdfFooterText', profile.footerText);
    }

    // ── Guardar perfil nuevo ─────────────────────────────────────────
    function saveCurrentAsProfile(name) {
        if (!name || !name.trim()) return null;
        const profiles = getProfiles();
        const cfg = captureCurrentConfig();
        const profile = {
            id: generateId(),
            name: name.trim(),
            ...cfg,
            isDefault: profiles.length === 0, // el primero es default
            createdAt: Date.now(),
            lastUsed: Date.now()
        };
        profiles.push(profile);
        saveProfiles(profiles);
        return profile;
    }

    // ── Actualizar perfil existente ──────────────────────────────────
    function updateProfile(id) {
        const profiles = getProfiles();
        const idx = profiles.findIndex(p => p.id === id);
        if (idx === -1) return false;
        const cfg = captureCurrentConfig();
        profiles[idx] = { ...profiles[idx], ...cfg, lastUsed: Date.now() };
        saveProfiles(profiles);
        return true;
    }

    // ── Eliminar perfil ──────────────────────────────────────────────
    function deleteProfile(id) {
        let profiles = getProfiles();
        const wasDefault = profiles.find(p => p.id === id)?.isDefault;
        profiles = profiles.filter(p => p.id !== id);
        // Si era el default, promover el primero
        if (wasDefault && profiles.length > 0) {
            profiles[0].isDefault = true;
        }
        saveProfiles(profiles);
    }

    // ── Marcar como predeterminado ───────────────────────────────────
    function setDefault(id) {
        const profiles = getProfiles();
        profiles.forEach(p => p.isDefault = (p.id === id));
        saveProfiles(profiles);
    }

    // ── Obtener perfil default ───────────────────────────────────────
    function getDefaultProfile() {
        return getProfiles().find(p => p.isDefault) || null;
    }

    // ── Poblar dropdowns de perfiles ─────────────────────────────────
    function populateProfileDropdowns(selectedId) {
        const profiles = getProfiles();
        const selectors = [
            document.getElementById('profileSelector'),
            document.getElementById('quickProfileSelector')
        ];
        selectors.forEach(sel => {
            if (!sel) return;
            const isQuick = sel.id === 'quickProfileSelector';
            sel.innerHTML = isQuick
                ? '<option value="">📋 Perfil de salida</option>'
                : '<option value="">— Seleccionar perfil —</option>';
            profiles.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = (p.isDefault ? '⭐ ' : '') + p.name;
                sel.appendChild(opt);
            });
            if (selectedId) sel.value = selectedId;
        });

        // Mostrar/ocultar botones de gestión
        const btnDel  = document.getElementById('btnDeleteProfile');
        const btnStar = document.getElementById('btnSetDefaultProfile');
        const btnUpd  = document.getElementById('btnUpdateProfile');
        const hasSel  = selectedId && profiles.some(p => p.id === selectedId);
        if (btnDel)  btnDel.style.display  = hasSel ? 'inline-flex' : 'none';
        if (btnStar) btnStar.style.display = hasSel ? 'inline-flex' : 'none';
        if (btnUpd)  btnUpd.style.display  = hasSel ? 'inline-flex' : 'none';
    }

    // ── Cargar perfil por ID ─────────────────────────────────────────
    function loadProfile(id) {
        const profiles = getProfiles();
        const profile = profiles.find(p => p.id === id);
        if (!profile) return;

        // Actualizar lastUsed
        profile.lastUsed = Date.now();
        saveProfiles(profiles);

        applyProfileToUI(profile);
        populateProfileDropdowns(id);

        // También guardar inmediatamente en pdf_config
        setTimeout(() => {
            if (typeof savePdfConfiguration === 'function') {
                savePdfConfiguration();
            }
        }, 200);
    }

    // ── Cargar perfil default al inicio ──────────────────────────────
    function loadDefaultProfile() {
        const def = getDefaultProfile();
        if (def) {
            applyProfileToUI(def);
            populateProfileDropdowns(def.id);
        } else {
            populateProfileDropdowns(null);
        }
    }

    // ── Init: conectar eventos ───────────────────────────────────────
    function initOutputProfiles() {
        // Poblar al inicio
        loadDefaultProfile();

        // Selector en el modal
        const profileSel = document.getElementById('profileSelector');
        if (profileSel) {
            profileSel.addEventListener('change', (e) => {
                if (e.target.value) {
                    loadProfile(e.target.value);
                    if (typeof showToast === 'function') showToast('📋 Perfil cargado', 'success');
                }
            });
        }

        // Selector rápido en toolbar
        const quickSel = document.getElementById('quickProfileSelector');
        if (quickSel) {
            quickSel.addEventListener('change', (e) => {
                if (e.target.value) {
                    loadProfile(e.target.value);
                    if (typeof showToast === 'function') showToast('📋 Perfil cargado', 'success');
                }
            });
        }

        // Botón guardar como perfil
        document.getElementById('btnSaveAsProfile')?.addEventListener('click', async () => {
            const name = await window.showCustomPrompt('Nombre para este perfil de salida:', 'Ej: Eco-stress — Dr. Ruiz');
            if (!name) return;
            const profile = saveCurrentAsProfile(name);
            if (profile) {
                populateProfileDropdowns(profile.id);
                if (typeof showToast === 'function') showToast(`✅ Perfil "${profile.name}" guardado`, 'success');
            }
        });

        // Botón actualizar perfil
        document.getElementById('btnUpdateProfile')?.addEventListener('click', async () => {
            const id = document.getElementById('profileSelector')?.value;
            if (!id) return;
            const profiles = getProfiles();
            const profile = profiles.find(p => p.id === id);
            if (profile && await window.showCustomConfirm('Actualizar perfil', `¿Actualizar el perfil "${profile.name}" con la configuración actual?`)) {
                updateProfile(id);
                if (typeof showToast === 'function') showToast(`✅ Perfil actualizado`, 'success');
            }
        });

        // Botón eliminar perfil
        document.getElementById('btnDeleteProfile')?.addEventListener('click', async () => {
            const id = document.getElementById('profileSelector')?.value;
            if (!id) return;
            const profiles = getProfiles();
            const profile = profiles.find(p => p.id === id);
            if (profile && await window.showCustomConfirm('🗑️ Eliminar perfil', `¿Eliminar el perfil "${profile.name}"?`)) {
                deleteProfile(id);
                populateProfileDropdowns(null);
                if (typeof showToast === 'function') showToast(`🗑️ Perfil eliminado`, 'info');
            }
        });

        // Botón marcar como predeterminado
        document.getElementById('btnSetDefaultProfile')?.addEventListener('click', () => {
            const id = document.getElementById('profileSelector')?.value;
            if (!id) return;
            setDefault(id);
            populateProfileDropdowns(id);
            if (typeof showToast === 'function') showToast('⭐ Perfil marcado como predeterminado', 'success');
        });
    }

    // ── Exponer API global ───────────────────────────────────────────
    window.initOutputProfiles      = initOutputProfiles;
    window.getOutputProfiles       = getProfiles;
    window.loadOutputProfile       = loadProfile;
    window.populateProfileDropdowns = populateProfileDropdowns;

})();
