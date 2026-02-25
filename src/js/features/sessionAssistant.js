// ============ SESSION ASSISTANT — Asistente de sesión ============
// Se abre CADA VEZ que la app carga en clones (NO en admin).
// Diferencia entre:
//   • PRO Clínica  (múltiples profesionales) → elige profesional (estudio auto-detectado por IA)
//   • PRO Personal (1 doctor, N lugares)     → elige lugar (estudio auto-detectado por IA)
//   • Normal       (1 doctor, básico)        → elige lugar + plantilla/estudio (sin IA)
// Si omite el asistente → se muestra el selector de Perfil de salida como fallback.

window.initSessionAssistant = function () {
    const overlay = document.getElementById('sessionAssistantOverlay');
    if (!overlay) return;

    const greetingEl     = document.getElementById('saGreeting');
    const subtitleEl     = document.getElementById('saSubtitle');
    const wpGroup        = document.getElementById('saWpGroup');
    const wpSelect       = document.getElementById('saWorkplaceSelect');
    const profGroup      = document.getElementById('saProfGroup');
    const profSelect     = document.getElementById('saProfSelect');
    const templateGroup  = document.getElementById('saTemplateGroup');
    const templateSelect = document.getElementById('saTemplateSelect');
    const btnConfirm     = document.getElementById('saBtnConfirm');
    const btnSkip        = document.getElementById('saBtnSkip');
    const statusEl       = document.getElementById('saStatus');

    // ── Helpers: detectar tipo de usuario ────────────────────────────────────
    function isProUser() {
        if (typeof CLIENT_CONFIG === 'undefined') return true; // admin = pro
        return ['ADMIN', 'PRO', 'TRIAL'].includes(CLIENT_CONFIG.type);
    }

    function isClinicMode() {
        const profiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
        return profiles.some(p => (p.professionals?.length || 0) > 1);
    }

    // ── Saludo basado en hora ────────────────────────────────────────────────
    function getGreeting(nombre, clinic) {
        const h = new Date().getHours();
        let saludo;
        if (h >= 5 && h < 13)       saludo = 'Buenos días';
        else if (h >= 13 && h < 20) saludo = 'Buenas tardes';
        else                         saludo = 'Buenas noches';

        if (clinic) return `${saludo} 👋`;
        const nombreDisplay = nombre || 'Doctor/a';
        return `${saludo}, ${nombreDisplay} 👋`;
    }

    // ── Populate: lugares ────────────────────────────────────────────────────
    function populateWorkplaces() {
        const profiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
        if (!wpSelect) return profiles;

        wpSelect.innerHTML = '';
        if (profiles.length === 0) {
            wpSelect.innerHTML = '<option value="">Sin lugares configurados</option>';
            return profiles;
        }
        if (profiles.length > 1) {
            wpSelect.innerHTML = '<option value="">Seleccionar lugar de trabajo...</option>';
        }
        profiles.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = p.name || `Lugar ${i + 1}`;
            wpSelect.appendChild(opt);
        });
        return profiles;
    }

    // ── Populate: profesionales (solo clínica) ───────────────────────────────
    function populateProfessionals(wpIndex) {
        if (!profSelect || !profGroup) return;
        const profiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
        const wp = profiles[wpIndex];
        const profs = wp?.professionals || [];

        if (profs.length <= 1) {
            profGroup.style.display = 'none';
            profSelect.innerHTML = '';
            if (profs.length === 1) {
                profSelect.innerHTML = `<option value="0">${profs[0].nombre || 'Profesional'}</option>`;
                profSelect.value = '0';
            }
            return;
        }

        profGroup.style.display = '';
        profSelect.innerHTML = '<option value="">Seleccionar profesional...</option>';
        profs.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = p.nombre || `Profesional ${i + 1}`;
            profSelect.appendChild(opt);
        });
    }

    // ── Populate: plantillas (solo modo Normal) ──────────────────────────────
    function populateTemplates() {
        if (!templateSelect || !templateGroup) return;
        if (isProUser()) {
            // Pro: IA detecta automáticamente → no mostrar selector de plantilla
            templateGroup.style.display = 'none';
            return;
        }

        // Normal: necesita elegir plantilla manualmente
        templateGroup.style.display = '';
        templateSelect.innerHTML = '<option value="generico">📋 Plantilla General</option>';

        if (typeof MEDICAL_TEMPLATES === 'undefined' || typeof TEMPLATE_CATEGORIES === 'undefined') return;

        const _allowed = (typeof CLIENT_CONFIG !== 'undefined' &&
            Array.isArray(CLIENT_CONFIG.allowedTemplates) &&
            CLIENT_CONFIG.allowedTemplates.length)
            ? new Set(CLIENT_CONFIG.allowedTemplates)
            : null;

        const catIcons = {
            "Neumología": "🫁", "Oftalmología": "👁️", "Imágenes": "🖼️",
            "Endoscopía": "🔭", "Cardiología": "🫀", "Ginecología": "🌸",
            "Neurología": "🧠", "ORL": "👂", "Quirúrgico": "🔪", "General": "📄"
        };

        for (const [cat, keys] of Object.entries(TEMPLATE_CATEGORIES)) {
            const group = document.createElement('optgroup');
            group.label = `${catIcons[cat] || ''} ${cat}`;
            let added = false;
            keys.forEach(key => {
                if (key === 'generico') return;
                if (_allowed && !_allowed.has(key)) return;
                const t = MEDICAL_TEMPLATES[key];
                if (!t) return;
                const option = document.createElement('option');
                option.value = key;
                option.textContent = t.name;
                group.appendChild(option);
                added = true;
            });
            if (added) templateSelect.appendChild(group);
        }
    }

    // ── Abrir el asistente ───────────────────────────────────────────────────
    function open() {
        const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
        const cfg      = JSON.parse(localStorage.getItem('pdf_config') || '{}');
        const profiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
        const clinic   = isClinicMode();
        const pro      = isProUser();

        // Saludo
        if (greetingEl) greetingEl.textContent = getGreeting(profData.nombre, clinic);

        // Subtítulo según tipo
        if (subtitleEl) {
            if (profiles.length === 0) {
                subtitleEl.textContent = 'Configurá tu lugar de trabajo en ⚙️ Configurar Informe.';
            } else if (clinic) {
                subtitleEl.textContent = '¿Quién trabaja hoy y en qué lugar?';
            } else if (!pro) {
                subtitleEl.textContent = '¿Dónde trabajás hoy y qué estudio realizarás?';
            } else if (profiles.length === 1) {
                subtitleEl.textContent = '¿Todo listo para comenzar la sesión?';
            } else {
                subtitleEl.textContent = '¿En qué lugar trabajás hoy?';
            }
        }

        // Reset visibility
        if (wpGroup) wpGroup.style.display = '';
        if (profGroup) profGroup.style.display = 'none';
        if (templateGroup) templateGroup.style.display = 'none';

        // Popular lugares
        populateWorkplaces();

        // Plantillas (solo Normal)
        populateTemplates();

        // Pre-selección inteligente
        if (profiles.length === 1) {
            if (wpSelect) wpSelect.value = '0';
            if (clinic) {
                populateProfessionals(0);
            } else {
                const profs = profiles[0]?.professionals || [];
                if (profs.length === 1 && profSelect) {
                    profSelect.innerHTML = `<option value="0">${profs[0].nombre}</option>`;
                    profSelect.value = '0';
                }
                // Personal con 1 lugar: ocultar selector de lugar
                if (wpGroup) wpGroup.style.display = 'none';
            }
        } else if (profiles.length > 1 && cfg.activeWorkplaceIndex !== undefined) {
            if (wpSelect) wpSelect.value = String(cfg.activeWorkplaceIndex);
            if (clinic) {
                populateProfessionals(parseInt(cfg.activeWorkplaceIndex));
                if (cfg.activeProfessionalIndex !== undefined && profSelect) {
                    profSelect.value = String(cfg.activeProfessionalIndex);
                }
            } else {
                const wp = profiles[parseInt(cfg.activeWorkplaceIndex)];
                const profs = wp?.professionals || [];
                if (profs.length === 1 && profSelect) {
                    profSelect.innerHTML = `<option value="0">${profs[0].nombre}</option>`;
                    profSelect.value = '0';
                }
            }
        }

        // Botón confirmar
        if (profiles.length === 0) {
            if (btnConfirm) btnConfirm.style.display = 'none';
        } else {
            if (btnConfirm) {
                btnConfirm.style.display = '';
                if (profiles.length === 1 && !clinic && pro) {
                    btnConfirm.textContent = '¡Empezar! ▶';
                } else {
                    btnConfirm.textContent = 'Comenzar sesión ▶';
                }
            }
        }

        updateStatus();
        overlay.classList.add('active');
    }

    // ── Estado visual ────────────────────────────────────────────────────────
    function updateStatus() {
        if (!statusEl) return;
        const profiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
        const clinic   = isClinicMode();
        const pro      = isProUser();
        const wpIdx    = wpSelect?.value;
        const proIdx   = profSelect?.value;

        if (wpIdx === '' || wpIdx === undefined) {
            statusEl.innerHTML = '';
            return;
        }

        const wp = profiles[parseInt(wpIdx)];
        if (!wp) { statusEl.innerHTML = ''; return; }

        let parts = [`📍 ${wp.name}`];
        if (clinic && proIdx !== '' && proIdx !== undefined) {
            const profs = wp.professionals || [];
            const prof = profs[parseInt(proIdx)];
            if (prof) parts.push(`🩺 ${prof.nombre}`);
        }
        if (!pro && templateSelect?.value && templateSelect.value !== 'generico') {
            const selOpt = templateSelect.options[templateSelect.selectedIndex];
            if (selOpt) parts.push(`📋 ${selOpt.textContent}`);
        }
        if (pro && !clinic) {
            parts.push('🤖 Estudio: detección automática');
        }

        statusEl.innerHTML = `<span style="color:var(--primary);font-weight:600;font-size:0.85rem;">${parts.join(' — ')}</span>`;
    }

    // ── Confirmar selección ──────────────────────────────────────────────────
    function confirm() {
        const profiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
        const clinic   = isClinicMode();
        const pro      = isProUser();

        // Determinar lugar
        let wpIdx;
        if (profiles.length === 1 && !clinic) {
            wpIdx = 0;
        } else {
            wpIdx = parseInt(wpSelect?.value);
        }

        if (isNaN(wpIdx)) {
            if (typeof showToast === 'function') showToast('Seleccioná un lugar de trabajo', 'warning');
            return;
        }

        // Validar profesional en clínica
        if (clinic) {
            const proVal = profSelect?.value;
            if (proVal === '' || proVal === undefined) {
                if (typeof showToast === 'function') showToast('Seleccioná un profesional', 'warning');
                return;
            }
        }

        // Validar plantilla en Normal
        if (!pro && (!templateSelect?.value || templateSelect.value === '')) {
            if (typeof showToast === 'function') showToast('Seleccioná un tipo de estudio', 'warning');
            return;
        }

        // ── Aplicar selecciones a la app ─────────────────────────────
        // 1. Lugar
        const mainWpSelect = document.getElementById('pdfWorkplace');
        if (mainWpSelect) {
            mainWpSelect.value = String(wpIdx);
            mainWpSelect.dispatchEvent(new Event('change'));
        }

        // 2. Profesional
        let proIdx;
        if (clinic) {
            proIdx = parseInt(profSelect?.value);
        } else {
            const profs = profiles[wpIdx]?.professionals || [];
            proIdx = profs.length >= 1 ? 0 : NaN;
        }

        if (!isNaN(proIdx)) {
            setTimeout(() => {
                const mainProSelect = document.getElementById('pdfProfessional');
                if (mainProSelect) {
                    mainProSelect.value = String(proIdx);
                    mainProSelect.dispatchEvent(new Event('change'));
                }
            }, 100);
        }

        // 3. Plantilla (solo Normal)
        if (!pro && templateSelect?.value) {
            const mainTemplateSel = document.getElementById('templateSelect');
            if (mainTemplateSel) {
                mainTemplateSel.value = templateSelect.value;
                mainTemplateSel.dispatchEvent(new Event('change'));
            }
            window.selectedTemplate = templateSelect.value;
        }

        // ── Marcar sesión como configurada ───────────────────────────
        sessionStorage.setItem('session_configured', '1');

        overlay.classList.remove('active');

        // Toast de confirmación
        const wpName = profiles[wpIdx]?.name || 'Lugar';
        const profs = profiles[wpIdx]?.professionals || [];
        let msg = `✅ ${wpName}`;
        if (clinic && !isNaN(proIdx) && profs[proIdx]) {
            msg += ` — ${profs[proIdx].nombre}`;
        }
        if (!pro && templateSelect?.value && templateSelect.value !== 'generico') {
            const selOpt = templateSelect.options[templateSelect.selectedIndex];
            if (selOpt) msg += ` — ${selOpt.textContent}`;
        }
        if (typeof showToast === 'function') showToast(msg, 'success');
    }

    // ── Cerrar sin cambios (marca que NO configuró) ──────────────────────────
    function skip() {
        // No seteamos session_configured → el selector de perfil de salida aparecerá como fallback
        overlay.classList.remove('active');
    }

    // ── Events ───────────────────────────────────────────────────────────────
    wpSelect?.addEventListener('change', () => {
        const val = wpSelect.value;
        if (val !== '' && isClinicMode()) {
            populateProfessionals(parseInt(val));
        } else {
            if (profGroup) profGroup.style.display = 'none';
        }
        updateStatus();
    });

    profSelect?.addEventListener('change', updateStatus);
    templateSelect?.addEventListener('change', updateStatus);

    btnConfirm?.addEventListener('click', confirm);
    btnSkip?.addEventListener('click', skip);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) skip();
    });

    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') skip();
    });

    // Exponer globalmente
    window.openSessionAssistant = open;
};
