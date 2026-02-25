// ============ SESSION ASSISTANT — Asistente de sesión ============
// Se abre CADA VEZ que la app carga (no solo la primera vez).
// Ofrece saludo contextual + selección rápida de lugar y profesional.
// El usuario puede cerrar sin seleccionar nada (conserva la última config).

window.initSessionAssistant = function () {
    const overlay = document.getElementById('sessionAssistantOverlay');
    if (!overlay) return;

    const greetingEl   = document.getElementById('saGreeting');
    const subtitleEl   = document.getElementById('saSubtitle');
    const wpSelect     = document.getElementById('saWorkplaceSelect');
    const profGroup    = document.getElementById('saProfGroup');
    const profSelect   = document.getElementById('saProfSelect');
    const btnConfirm   = document.getElementById('saBtnConfirm');
    const btnSkip      = document.getElementById('saBtnSkip');
    const statusEl     = document.getElementById('saStatus');

    // ── Saludo basado en hora ────────────────────────────────────────────────
    function getGreeting(nombre) {
        const h = new Date().getHours();
        let saludo;
        if (h >= 5 && h < 13)       saludo = 'Buenos días';
        else if (h >= 13 && h < 20) saludo = 'Buenas tardes';
        else                         saludo = 'Buenas noches';

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

        if (profs.length === 0) {
            profGroup.style.display = 'none';
            profSelect.innerHTML = '';
            return;
        }

        profGroup.style.display = '';
        profSelect.innerHTML = '';
        if (profs.length > 1) {
            profSelect.innerHTML = '<option value="">Seleccionar profesional...</option>';
        }
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

        // Saludo
        if (greetingEl)  greetingEl.textContent  = getGreeting(profData.nombre);
        if (subtitleEl)  subtitleEl.textContent   = '¿En qué lugar trabajás hoy?';

        // Popular lugares
        const profiles = populateWorkplaces();

        // Pre-seleccionar el último lugar activo
        if (profiles.length === 1) {
            // Solo un lugar → seleccionar automáticamente
            if (wpSelect) wpSelect.value = '0';
            populateProfessionals(0);
            // Si solo hay 1 prof → auto-seleccionar
            const profs = profiles[0]?.professionals || [];
            if (profs.length === 1 && profSelect) profSelect.value = '0';
        } else if (cfg.activeWorkplaceIndex !== undefined) {
            if (wpSelect) wpSelect.value = String(cfg.activeWorkplaceIndex);
            populateProfessionals(parseInt(cfg.activeWorkplaceIndex));
            if (cfg.activeProfessionalIndex !== undefined && profSelect) {
                profSelect.value = String(cfg.activeProfessionalIndex);
            }
        } else {
            if (profGroup) profGroup.style.display = 'none';
        }

        // Si no hay lugares configurados, cambiar texto
        if (profiles.length === 0) {
            if (subtitleEl) subtitleEl.textContent = 'Configurá tu lugar de trabajo en ⚙️ Configurar Informe.';
            if (btnConfirm) btnConfirm.style.display = 'none';
        } else {
            if (btnConfirm) btnConfirm.style.display = '';
        }

        updateStatus();
        overlay.classList.add('active');
    }

    // ── Estado visual ────────────────────────────────────────────────────────
    function updateStatus() {
        if (!statusEl) return;
        const profiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
        const wpIdx = wpSelect?.value;
        const proIdx = profSelect?.value;

        if (wpIdx === '' || wpIdx === undefined) {
            statusEl.innerHTML = '';
            return;
        }

        const wp = profiles[parseInt(wpIdx)];
        if (!wp) { statusEl.innerHTML = ''; return; }

        let text = `📍 ${wp.name}`;
        const profs = wp.professionals || [];
        if (profs.length > 0 && proIdx !== '' && proIdx !== undefined) {
            const prof = profs[parseInt(proIdx)];
            if (prof) text += ` — 🩺 ${prof.nombre}`;
        }
        statusEl.innerHTML = `<span style="color:var(--primary);font-weight:600;font-size:0.85rem;">${text}</span>`;
    }

    // ── Confirmar selección ──────────────────────────────────────────────────
    function confirm() {
        const wpIdx = parseInt(wpSelect?.value);
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

        // Si hay profesional seleccionado, activarlo también
        const proIdx = parseInt(profSelect?.value);
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

        const profiles = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
        const wpName = profiles[wpIdx]?.name || 'Lugar';
        const profs = profiles[wpIdx]?.professionals || [];
        const proName = (!isNaN(proIdx) && profs[proIdx]) ? ` — ${profs[proIdx].nombre}` : '';
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
        if (val !== '') {
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
