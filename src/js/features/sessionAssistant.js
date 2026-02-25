// ============ SESSION ASSISTANT — Asistente de sesión ============
// Se abre CADA VEZ que la app carga (no solo la primera vez).
// Diferencia entre:
//   • Usuario PERSONAL (1 doctor = él mismo) → solo elige lugar, sin preguntar profesional
//   • Usuario CLÍNICA  (múltiples profesionales) → elige lugar + profesional
// El usuario puede cerrar sin seleccionar nada (conserva la última config).

window.initSessionAssistant = function () {
    const overlay = document.getElementById('sessionAssistantOverlay');
    if (!overlay) return;

    const greetingEl   = document.getElementById('saGreeting');
    const subtitleEl   = document.getElementById('saSubtitle');
    const wpGroup      = document.getElementById('saWpGroup');
    const wpSelect     = document.getElementById('saWorkplaceSelect');
    const profGroup    = document.getElementById('saProfGroup');
    const profSelect   = document.getElementById('saProfSelect');
    const btnConfirm   = document.getElementById('saBtnConfirm');
    const btnSkip      = document.getElementById('saBtnSkip');
    const statusEl     = document.getElementById('saStatus');

    // ── Detectar modo: personal vs clínica ──────────────────────────────────
    // Personal: ningún lugar tiene >1 profesional (el usuario ES el doctor)
    // Clínica:  al menos un lugar tiene >1 profesional
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

        if (clinic) {
            // Clínica: saludo genérico o con nombre de institución
            return `${saludo} 👋`;
        }
        // Personal: saludo con nombre del doctor
        const nombreDisplay = nombre || 'Doctor/a';
        return `${saludo}, ${nombreDisplay} 👋`;
    }

    // ── Popular dropdowns ────────────────────────────────────────────────────
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

    function populateProfessionals(wpIndex) {
        if (!profSelect || !profGroup) return;
        const profiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
        const wp = profiles[wpIndex];
        const profs = wp?.professionals || [];

        if (profs.length <= 1) {
            // 0 o 1 profesional → no mostrar selector (modo personal o lugar con 1 solo)
            profGroup.style.display = 'none';
            profSelect.innerHTML = '';
            // Si hay exactamente 1, auto-seleccionar en background
            if (profs.length === 1) {
                profSelect.innerHTML = `<option value="0">${profs[0].nombre || 'Profesional'}</option>`;
                profSelect.value = '0';
            }
            return;
        }

        // Múltiples profesionales → mostrar selector
        profGroup.style.display = '';
        profSelect.innerHTML = '<option value="">Seleccionar profesional...</option>';
        profs.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = p.nombre || `Profesional ${i + 1}`;
            profSelect.appendChild(opt);
        });
    }

    // ── Abrir el asistente ───────────────────────────────────────────────────
    function open() {
        const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
        const cfg      = JSON.parse(localStorage.getItem('pdf_config') || '{}');
        const profiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
        const clinic   = isClinicMode();

        // Saludo
        if (greetingEl) greetingEl.textContent = getGreeting(profData.nombre, clinic);

        // Subtítulo según modo
        if (subtitleEl) {
            if (profiles.length === 0) {
                subtitleEl.textContent = 'Configurá tu lugar de trabajo en ⚙️ Configurar Informe.';
            } else if (profiles.length === 1 && !clinic) {
                // Personal con 1 solo lugar → casi no necesita elegir nada
                subtitleEl.textContent = '¿Todo listo para comenzar la sesión?';
            } else if (clinic) {
                subtitleEl.textContent = '¿Quién trabaja hoy y en qué lugar?';
            } else {
                subtitleEl.textContent = '¿En qué lugar trabajás hoy?';
            }
        }

        // Popular lugares
        populateWorkplaces();

        // Ocultar selector de profesionales por defecto (se muestra al elegir lugar si es clínica)
        if (profGroup) profGroup.style.display = 'none';

        // Pre-selección inteligente
        if (profiles.length === 1) {
            // Solo un lugar → seleccionar automáticamente
            if (wpSelect) wpSelect.value = '0';
            if (clinic) {
                populateProfessionals(0);
            } else {
                // Personal: auto-activar el único profesional si existe
                const profs = profiles[0]?.professionals || [];
                if (profs.length === 1 && profSelect) {
                    profSelect.innerHTML = `<option value="0">${profs[0].nombre}</option>`;
                    profSelect.value = '0';
                }
            }
            // Si solo hay 1 lugar, ocultar el selector de lugar (no hay nada que elegir)
            if (!clinic && wpGroup) wpGroup.style.display = 'none';
        } else if (profiles.length > 1 && cfg.activeWorkplaceIndex !== undefined) {
            // Restaurar selección previa
            if (wpSelect) wpSelect.value = String(cfg.activeWorkplaceIndex);
            if (clinic) {
                populateProfessionals(parseInt(cfg.activeWorkplaceIndex));
                if (cfg.activeProfessionalIndex !== undefined && profSelect) {
                    profSelect.value = String(cfg.activeProfessionalIndex);
                }
            } else {
                // Personal: auto-seleccionar el profesional del lugar sin mostrar selector
                const wp = profiles[parseInt(cfg.activeWorkplaceIndex)];
                const profs = wp?.professionals || [];
                if (profs.length === 1 && profSelect) {
                    profSelect.innerHTML = `<option value="0">${profs[0].nombre}</option>`;
                    profSelect.value = '0';
                }
            }
        }

        // Mostrar/ocultar grupo lugar (si hay >1 lugar o es clínica, siempre se muestra)
        if (wpGroup && profiles.length > 1) wpGroup.style.display = '';

        // Si no hay lugares configurados → ocultar botón confirmar
        if (profiles.length === 0) {
            if (btnConfirm) btnConfirm.style.display = 'none';
        } else {
            if (btnConfirm) {
                btnConfirm.style.display = '';
                // Texto del botón según contexto
                if (profiles.length === 1 && !clinic) {
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
        const wpIdx    = wpSelect?.value;
        const proIdx   = profSelect?.value;

        if (wpIdx === '' || wpIdx === undefined) {
            statusEl.innerHTML = '';
            return;
        }

        const wp = profiles[parseInt(wpIdx)];
        if (!wp) { statusEl.innerHTML = ''; return; }

        let text = `📍 ${wp.name}`;
        if (clinic) {
            const profs = wp.professionals || [];
            if (profs.length > 0 && proIdx !== '' && proIdx !== undefined) {
                const prof = profs[parseInt(proIdx)];
                if (prof) text += ` — 🩺 ${prof.nombre}`;
            }
        }
        statusEl.innerHTML = `<span style="color:var(--primary);font-weight:600;font-size:0.85rem;">${text}</span>`;
    }

    // ── Confirmar selección ──────────────────────────────────────────────────
    function confirm() {
        const profiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
        const clinic   = isClinicMode();

        // Si solo hay 1 lugar y es personal, auto-usar index 0
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

        // Activar el lugar en el dropdown de Configurar Informe
        const mainWpSelect = document.getElementById('pdfWorkplace');
        if (mainWpSelect) {
            mainWpSelect.value = String(wpIdx);
            mainWpSelect.dispatchEvent(new Event('change'));
        }

        // Determinar profesional a activar
        let proIdx;
        if (clinic) {
            proIdx = parseInt(profSelect?.value);
        } else {
            // Personal: si el lugar tiene 1 profesional, auto-seleccionar
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

        overlay.classList.remove('active');

        const wpName = profiles[wpIdx]?.name || 'Lugar';
        const profs = profiles[wpIdx]?.professionals || [];
        let proName = '';
        if (clinic && !isNaN(proIdx) && profs[proIdx]) {
            proName = ` — ${profs[proIdx].nombre}`;
        }
        if (typeof showToast === 'function') {
            showToast(`✅ Sesión: ${wpName}${proName}`, 'success');
        }
    }

    // ── Cerrar sin cambios ───────────────────────────────────────────────────
    function skip() {
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

    btnConfirm?.addEventListener('click', confirm);
    btnSkip?.addEventListener('click', skip);

    // Cerrar con clic fuera del card
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) skip();
    });

    // Cerrar con Escape
    overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') skip();
    });

    // Exponer globalmente
    window.openSessionAssistant = open;
};
