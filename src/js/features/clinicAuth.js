// ============ CLINIC AUTH — Login por profesional con PIN ============
// Solo activo cuando plan === CLINIC y el workplace tiene profesionales configurados.
// El profesional activo se guarda en memoria de sesión (window._clinicActiveProfessional)
// NO en localStorage — se borra automáticamente al cerrar la pestaña.

(function() {
    'use strict';

    // ── Estado de sesión (no persistente) ─────────────────────────────────────
    let _activeProfessional = null;
    let _onLoginSuccess     = null;
    let _professionals      = [];
    let _failedAttempts     = {}; // { [proId]: count }
    const MAX_ATTEMPTS      = 3;

    // ── API pública ───────────────────────────────────────────────────────────

    function init(professionals, onLoginSuccess) {
        _professionals  = resolveProfessionals(professionals);
        _onLoginSuccess = onLoginSuccess || function() {};

        if (!_professionals.length) {
            // Sin profesionales configurados → saltar autenticación
            _onLoginSuccess(null);
            return;
        }

        _buildModal();
        if (isVisible()) {
            _refreshBlockState();
            return;
        }
        _showModal();
    }

    function getActiveProfessional() {
        return _activeProfessional;
    }

    function isVisible() {
        var overlay = document.getElementById('clinicAuthOverlay');
        return !!(overlay && getComputedStyle(overlay).display !== 'none');
    }

    // Vuelve a mostrar el modal (botón "cambiar profesional")
    function switchProfessional() {
        _activeProfessional = null;
        // Recargar lista en caso de que el admin haya actualizado los datos
        try {
            const wp = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
            _professionals = resolveProfessionals((wp[0] && wp[0].professionals) || []);
        } catch (_) {
            _professionals = resolveProfessionals([]);
        }
        if (_professionals.length) {
            _showModal();
        }
    }

    function forceSelectProfessional() {
        switchProfessional();
        if (!isVisible() && _professionals.length) {
            _showModal();
        }
    }

    // Llama a addEventListener en el botón #btnCambiarProfesional del header
    function setupChangeProfButton() {
        const btn = document.getElementById('btnCambiarProfesional');
        if (!btn) return;
        btn.addEventListener('click', function() {
            switchProfessional();
        });
    }

    // ── Contraseña del administrador de clínica ────────────────────────────────

    function _getAdminPass() {
        try {
            var wp = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
            var w  = wp[0] || {};
            return String(w.adminPass || 'clinica');
        } catch (_) { return 'clinica'; }
    }

    // ── Normalización de lista ─────────────────────────────────────────────────
    // Acepta tanto el formato antiguo (de registro antes de C4) como el nuevo (C4+)

    function normalizeList(list) {
        if (!Array.isArray(list)) return [];
        return list
            .filter(function(p) { return p && p.nombre; })
            .filter(function(p) { return p.activo !== false; })
            .map(function(p, i) {
                // especialidades: array siempre
                // Compatibilidad con formato antiguo: "especialidad" string.
                var esp = p.especialidades;
                if ((esp == null || esp === '') && typeof p.especialidad === 'string') {
                    esp = p.especialidad;
                }
                if (typeof esp === 'string') esp = esp ? [esp] : [];
                if (!Array.isArray(esp))     esp = [];
                // redesSociales: nuevo nombre; socialMedia: fallback antiguo
                var rs = p.redesSociales || p.socialMedia || {};
                return {
                    id:             p.id || ('auto-' + i + '-' + Date.now()),
                    nombre:         p.nombre        || '',
                    dni:            p.dni           || '',
                    matricula:      p.matricula     || '',
                    especialidades: esp,
                    usuario:        p.usuario       || '',
                    pin:            String(p.pin    || '1234'),
                    email:          p.email         || '',
                    telefono:       p.telefono      || '',
                    firma:          p.firma         || null,
                    logo:           p.logo          || null,
                    redesSociales:  rs,
                    showPhone:      p.showPhone     !== false,
                    showEmail:      p.showEmail     !== false,
                    showSocial:     !!p.showSocial,
                    primerUso:      p.primerUso     === true,
                    activo:         true
                };
            });
    }

    // Devuelve una lista utilizable para auth incluso cuando workplace_profiles
    // aun no esta inicializado por completo.
    // FASE 2: El Administrador siempre aparece primero en la lista.
    function resolveProfessionals(list) {
        var adminEntry = { id: '__admin__', nombre: 'Administrador', tipo: 'admin', pin: null };
        const normalized = normalizeList(list);
        if (normalized.length) return [adminEntry].concat(normalized);

        const fallback = _buildFallbackProfessional();
        if (!fallback) return [adminEntry];
        return [adminEntry, fallback];
    }

    function _buildFallbackProfessional() {
        try {
            const profData = JSON.parse(localStorage.getItem('prof_data') || '{}');
            const name = String(profData.nombre || '').trim();
            if (!name) return null;
            return {
                id:             'fallback-' + Date.now(),
                nombre:         name,
                dni:            '',
                matricula:      String(profData.matricula || ''),
                especialidades: Array.isArray(profData.specialties) ? profData.specialties : [],
                usuario:        '',
                pin:            String(profData.pin || '1234'),
                email:          '',
                telefono:       '',
                firma:          null,
                logo:           null,
                redesSociales:  {},
                showPhone:      true,
                showEmail:      true,
                showSocial:     false,
                activo:         true
            };
        } catch (_) {
            return null;
        }
    }

    // ── Construcción del modal (una sola vez) ─────────────────────────────────

    function _buildModal() {
        if (document.getElementById('clinicAuthOverlay')) return;

        var style = document.createElement('style');
        style.id  = 'clinicAuthStyle';
        style.textContent = [
            '#clinicAuthOverlay{position:fixed;inset:0;background:rgba(2,6,23,.78);z-index:12000;',
            'display:none;align-items:center;justify-content:center;padding:20px;}',
            '#clinicAuthBox{background:var(--bg-card,#fff);border-radius:18px;',
            'box-shadow:0 20px 60px rgba(0,0,0,.45);padding:28px 28px 22px;',
            'width:100%;max-width:400px;text-align:center;}',
            '#clinicAuthClinicLogo{width:64px;height:64px;object-fit:contain;border-radius:10px;margin-bottom:10px;display:none;}',
            '#clinicAuthTitle{font-size:1.1rem;font-weight:900;color:var(--text-primary,#0f172a);margin-bottom:4px;}',
            '#clinicAuthSub{font-size:.83rem;color:var(--text-secondary,#64748b);margin-bottom:20px;}',
            '.ca-label{display:block;font-size:.77rem;font-weight:700;color:var(--text-secondary,#475569);',
            'text-align:left;margin-bottom:4px;}',
            '#clinicAuthSelect{width:100%;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:10px;',
            'font-size:.9rem;background:var(--bg-card,#fff);color:var(--text-primary,#0f172a);',
            'margin-bottom:14px;cursor:pointer;}',
            '#clinicAuthPin{width:100%;padding:12px;border:1.5px solid #cbd5e1;border-radius:10px;',
            'font-size:1.4rem;text-align:center;letter-spacing:.4em;background:var(--bg-card,#fff);',
            'color:var(--text-primary,#0f172a);margin-bottom:6px;box-sizing:border-box;}',
            '#clinicAuthPin:focus{border-color:#0ea5e9;outline:none;}',
            '#clinicAuthError{font-size:.78rem;color:#b91c1c;min-height:18px;margin-bottom:10px;font-weight:700;}',
            '#clinicAuthEnterBtn{width:100%;padding:12px;background:#0ea5e9;color:#fff;border:none;',
            'border-radius:10px;font-size:.95rem;font-weight:800;cursor:pointer;transition:background .15s;}',
            '#clinicAuthEnterBtn:hover{background:#0284c7;}',
            '#clinicAuthEnterBtn:disabled{background:#94a3b8;cursor:not-allowed;}',
            '#clinicAuthAttempts{font-size:.72rem;color:#94a3b8;margin-top:6px;min-height:16px;}',
            '#clinicAuthRecoverBtn{margin-top:10px;background:none;border:none;color:#0369a1;font-size:.78rem;font-weight:700;cursor:pointer;}',
            '#clinicAuthRecoverBtn:hover{text-decoration:underline;}',
            '.ca-blocked-note{font-size:.74rem;color:#b91c1c;margin-top:6px;}',
            '.ca-pin-fu-input{width:100%;padding:12px;border:1.5px solid #cbd5e1;border-radius:10px;',
            'font-size:1.4rem;text-align:center;letter-spacing:.4em;background:var(--bg-card,#fff);',
            'color:var(--text-primary,#0f172a);margin-bottom:14px;box-sizing:border-box;}',
            '.ca-pin-fu-input:focus{border-color:#0ea5e9;outline:none;}'
        ].join('');
        document.head.appendChild(style);

        var overlay = document.createElement('div');
        overlay.id  = 'clinicAuthOverlay';
        overlay.innerHTML = [
            '<div id="clinicAuthBox">',
            '  <img id="clinicAuthClinicLogo" src="" alt="Logo clínica">',
            '  <div id="clinicAuthTitle">👨‍⚕️ Seleccioná tu perfil</div>',
            '  <div id="clinicAuthSub">Identificate para continuar</div>',
            '  <label class="ca-label" for="clinicAuthSelect">Profesional</label>',
            '  <select id="clinicAuthSelect"></select>',
            '  <label id="clinicAuthPinLabel" class="ca-label" for="clinicAuthPin">PIN de acceso</label>',
            '  <input id="clinicAuthPin" type="password" maxlength="4" placeholder="• • • •" autocomplete="off" inputmode="numeric">',
            '  <div id="clinicAuthError"></div>',
            '  <button id="clinicAuthEnterBtn">Ingresar →</button>',
            '  <div id="clinicAuthAttempts"></div>',
            '  <button id="clinicAuthRecoverBtn" type="button">¿Olvidaste tu clave?</button>',
            '</div>'
        ].join('');
        document.body.appendChild(overlay);

        // Enter key en input PIN
        document.getElementById('clinicAuthPin').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') _attemptLogin();
        });

        // Click en botón
        document.getElementById('clinicAuthEnterBtn').addEventListener('click', _attemptLogin);
        document.getElementById('clinicAuthRecoverBtn').addEventListener('click', _recoverSelectedIdentity);

        // Al cambiar profesional: actualizar UI y estado del botón según intentos
        document.getElementById('clinicAuthSelect').addEventListener('change', function() {
            _updateForSelection(Number(this.value));
            _refreshBlockState();
        });
    }

    // Actualiza label e input de PIN/contraseña según el ítem del selector
    function _updateForSelection(idx) {
        var pro      = _professionals[idx];
        var pinInput = document.getElementById('clinicAuthPin');
        var pinLabel = document.getElementById('clinicAuthPinLabel');
        if (!pinInput) return;
        if (pro && pro.id === '__admin__') {
            if (pinLabel) pinLabel.textContent = 'Contraseña de administrador';
            pinInput.maxLength           = 50;
            pinInput.inputMode           = 'text';
            pinInput.style.letterSpacing = 'normal';
            pinInput.style.fontSize      = '1rem';
            pinInput.placeholder         = 'Contraseña';
        } else {
            if (pinLabel) pinLabel.textContent = 'PIN de acceso';
            pinInput.maxLength           = 4;
            pinInput.inputMode           = 'numeric';
            pinInput.style.letterSpacing = '.4em';
            pinInput.style.fontSize      = '1.4rem';
            pinInput.placeholder         = '\u2022 \u2022 \u2022 \u2022';
        }
        pinInput.value = '';
    }

    function _showModal() {
        var overlay = document.getElementById('clinicAuthOverlay');
        if (!overlay) return;

        // Si el asistente de sesión quedó abierto, ocultarlo para forzar PIN.
        var saOverlay = document.getElementById('sessionAssistantOverlay');
        if (saOverlay) saOverlay.classList.remove('active');

        // Poblar dropdown
        var select = document.getElementById('clinicAuthSelect');
        select.innerHTML = _professionals.map(function(p, i) {
            var label;
            if (p.id === '__admin__') {
                label = '\uD83D\uDEE1\uFE0F Administrador';
            } else {
                label = p.usuario
                    ? (_esc(p.usuario) + (p.nombre ? ' \u2014 ' + _esc(p.nombre) : ''))
                    : _esc(p.nombre || ('Profesional ' + (i + 1)));
            }
            return '<option value="' + i + '">' + label + '</option>';
        }).join('');
        _updateForSelection(0);

        // Nombre de la clínica como subtítulo
        try {
            var pd = JSON.parse(localStorage.getItem('prof_data') || '{}');
            var clinicName = pd.workplace || pd.nombre || '';
            var subEl = document.getElementById('clinicAuthSub');
            if (subEl && clinicName) subEl.textContent = clinicName;
        } catch (_) {}

        // Logo de la clínica (si está guardado en prof_data o pdf_logo sería del profesional, no de la clínica)
        try {
            var wpString = localStorage.getItem('workplace_profiles') || '[]';
            var wpArr = JSON.parse(wpString);
            var clinicLogo = wpArr[0] && wpArr[0].logo;
            var clinicLogoEl = document.getElementById('clinicAuthClinicLogo');
            if (clinicLogo && clinicLogoEl) {
                clinicLogoEl.src = clinicLogo;
                clinicLogoEl.style.display = '';
            }
        } catch (_) {}

        // Limpiar estado
        document.getElementById('clinicAuthPin').value   = '';
        document.getElementById('clinicAuthError').textContent   = '';
        document.getElementById('clinicAuthAttempts').textContent = '';
        _refreshBlockState();

        overlay.style.display = 'flex';
        setTimeout(function() {
            var pin = document.getElementById('clinicAuthPin');
            if (pin) pin.focus();
        }, 150);
    }

    function _refreshBlockState() {
        var select   = document.getElementById('clinicAuthSelect');
        var enterBtn = document.getElementById('clinicAuthEnterBtn');
        var attEl    = document.getElementById('clinicAuthAttempts');
        var errEl    = document.getElementById('clinicAuthError');
        if (!select || !enterBtn) return;

        var idx    = Number(select.value);
        var pro    = _professionals[idx];
        if (!pro) return;

        // El administrador no puede bloquearse por intentos fallidos de PIN
        if (pro.id === '__admin__') {
            enterBtn.disabled = false;
            if (errEl) errEl.textContent = '';
            if (attEl) attEl.textContent = '';
            return;
        }

        var proId   = pro.id;
        var blocked = (_failedAttempts[proId] || 0) >= MAX_ATTEMPTS;

        enterBtn.disabled = blocked;
        if (blocked) {
            if (errEl) errEl.textContent = 'Este profesional está bloqueado por esta sesión.';
            if (attEl) attEl.textContent = 'Contactá al administrador de la clínica para resetear el PIN.';
        } else {
            if (errEl) errEl.textContent = '';
            var rem = MAX_ATTEMPTS - (_failedAttempts[proId] || 0);
            if (attEl) attEl.textContent = rem < MAX_ATTEMPTS
                ? (rem + ' intento' + (rem === 1 ? '' : 's') + ' restante' + (rem === 1 ? '' : 's') + '.')
                : '';
        }
    }

    // ── Fase 4: primer acceso del profesional — forzar cambio de PIN ─────────────
    function _showFirstUsePinChange(pro) {
        var box = document.getElementById('clinicAuthBox');
        if (!box) return;

        box.innerHTML = [
            '<div id="clinicAuthTitle">🔐 Primer acceso — cambiá tu PIN</div>',
            '<div id="clinicAuthSub">Por seguridad, elegí un PIN nuevo antes de continuar.</div>',
            '<label class="ca-label" for="caFuPin1">Nuevo PIN (4 dígitos)</label>',
            '<input id="caFuPin1" class="ca-pin-fu-input" type="password" maxlength="4"',
            ' placeholder="\u2022 \u2022 \u2022 \u2022" autocomplete="off" inputmode="numeric">',
            '<label class="ca-label" for="caFuPin2">Confirmar PIN</label>',
            '<input id="caFuPin2" class="ca-pin-fu-input" type="password" maxlength="4"',
            ' placeholder="\u2022 \u2022 \u2022 \u2022" autocomplete="off" inputmode="numeric">',
            '<div id="caFuErr" style="font-size:.78rem;color:#b91c1c;min-height:18px;',
            'margin-bottom:10px;font-weight:700;"></div>',
            '<button id="caFuConfirm" style="width:100%;padding:12px;background:#0ea5e9;color:#fff;',
            'border:none;border-radius:10px;font-size:.95rem;font-weight:800;cursor:pointer;">',
            'Confirmar y acceder \u2192</button>',
        ].join('');

        document.getElementById('caFuConfirm').addEventListener('click', function() {
            var p1    = (document.getElementById('caFuPin1').value || '').trim();
            var p2    = (document.getElementById('caFuPin2').value || '').trim();
            var errEl = document.getElementById('caFuErr');
            if (!p1 || p1.length < 4) { errEl.textContent = 'El PIN debe tener 4 dígitos.'; return; }
            if (!/^\d{4}$/.test(p1))  { errEl.textContent = 'Solo números, 4 dígitos.';   return; }
            if (p1 !== p2)            { errEl.textContent = 'Los PINs no coinciden.';        return; }

            // Actualizar PIN y borrar primerUso en workplace_profiles
            try {
                var wp    = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
                var profs = (wp[0] && wp[0].professionals) || [];
                var proIdx = profs.findIndex(function(p) { return p && p.id === pro.id; });
                if (proIdx >= 0) {
                    profs[proIdx].pin       = p1;
                    profs[proIdx].primerUso = false;
                    wp[0].professionals     = profs;
                    localStorage.setItem('workplace_profiles', JSON.stringify(wp));
                    window._wpProfilesCache = null;
                }
            } catch (_) {}

            pro.pin       = p1;
            pro.primerUso = false;

            _activeProfessional = Object.assign({}, pro);
            _syncPdfConfig(pro, 0);

            var overlay = document.getElementById('clinicAuthOverlay');
            if (overlay) overlay.style.display = 'none';
            var btnCambiar = document.getElementById('btnCambiarProfesional');
            if (btnCambiar) btnCambiar.style.display = '';
            if (typeof showToast === 'function') {
                showToast('\uD83D\uDD11 PIN actualizado. \u00a1Bienvenido/a, ' + (pro.nombre || pro.usuario || 'Profesional') + '!', 'success');
            }
            if (typeof _onLoginSuccess === 'function') {
                _onLoginSuccess(_activeProfessional);
            }
        });

        setTimeout(function() {
            var f = document.getElementById('caFuPin1');
            if (f) f.focus();
        }, 60);
    }

    function _normalizeDocId(value) {
        return String(value || '').replace(/\D+/g, '');
    }

    // Fase 5: recuperación local de credenciales
    function _recoverSelectedIdentity() {
        var select = document.getElementById('clinicAuthSelect');
        var errorEl = document.getElementById('clinicAuthError');
        if (!select) return;
        var idx = Number(select.value);
        var selected = _professionals[idx];
        if (!selected) return;

        var wp;
        try { wp = JSON.parse(localStorage.getItem('workplace_profiles') || '[]'); }
        catch (_) { wp = []; }
        var clinic = wp[0] || {};

        if (selected.id === '__admin__') {
            var enteredAdminDni = _normalizeDocId(prompt('Recuperar admin: ingresá DNI del administrador') || '');
            var expectedAdminDni = _normalizeDocId(clinic.adminDni || '');
            if (!enteredAdminDni) return;
            if (!expectedAdminDni || enteredAdminDni !== expectedAdminDni) {
                if (errorEl) errorEl.textContent = 'DNI de administrador incorrecto.';
                return;
            }
            clinic.adminPass = 'clinica';
            wp[0] = clinic;
            try {
                localStorage.setItem('workplace_profiles', JSON.stringify(wp));
                window._wpProfilesCache = null;
            } catch (_) {}
            if (typeof showToast === 'function') {
                showToast('🔑 Contraseña admin restablecida a "clinica".', 'success');
            }
            if (errorEl) errorEl.textContent = '';
            return;
        }

        var enteredDni = _normalizeDocId(prompt('Recuperar PIN: ingresá DNI del profesional') || '');
        if (!enteredDni) return;
        var enteredMat = String(prompt('Ingresá matrícula del profesional') || '').trim().toLowerCase();
        if (!enteredMat) return;

        var profs = Array.isArray(clinic.professionals) ? clinic.professionals : [];
        var proIdx = profs.findIndex(function(p) {
            return p && p.id === selected.id &&
                _normalizeDocId(p.dni) === enteredDni &&
                String(p.matricula || '').trim().toLowerCase() === enteredMat;
        });
        if (proIdx < 0) {
            if (errorEl) errorEl.textContent = 'DNI y/o matrícula no coinciden para este profesional.';
            return;
        }

        profs[proIdx].pin = '1234';
        profs[proIdx].primerUso = true;
        clinic.professionals = profs;
        wp[0] = clinic;
        try {
            localStorage.setItem('workplace_profiles', JSON.stringify(wp));
            window._wpProfilesCache = null;
        } catch (_) {}
        _professionals = resolveProfessionals(profs);
        _failedAttempts[selected.id] = 0;
        if (typeof showToast === 'function') {
            showToast('🔄 PIN restablecido a 1234. Se pedirá cambio en el próximo acceso.', 'success');
        }
        if (errorEl) errorEl.textContent = '';
        _showModal();
    }

    function _attemptLogin() {
        var select   = document.getElementById('clinicAuthSelect');
        var pinInput = document.getElementById('clinicAuthPin');
        var errorEl  = document.getElementById('clinicAuthError');
        var attEl    = document.getElementById('clinicAuthAttempts');
        var enterBtn = document.getElementById('clinicAuthEnterBtn');
        if (!select || !pinInput) return;

        var idx     = Number(select.value);
        var pro     = _professionals[idx];
        if (!pro) return;

        var entered = String(pinInput.value || '').trim();

        // ── LOGIN ADMINISTRADOR ──────────────────────────────────────────────────
        if (pro.id === '__admin__') {
            if (!entered) {
                errorEl.textContent = 'Ingresá la contraseña de administrador.';
                pinInput.focus();
                return;
            }
            if (entered === _getAdminPass()) {
                errorEl.textContent = '';
                // Marcar al administrador como profesional activo para que el
                // watchdog no vuelva a mostrar el modal de PIN.
                _activeProfessional = Object.assign({}, pro);
                var adminOverlay = document.getElementById('clinicAuthOverlay');
                if (adminOverlay) adminOverlay.style.display = 'none';
                if (typeof showToast === 'function') {
                    showToast('🛡️ Acceso de administrador', 'info');
                }
                if (window.ClinicAdminPanel) {
                    var openFn = window.ClinicAdminPanel.openAuthenticated || window.ClinicAdminPanel.open;
                    if (typeof openFn === 'function') openFn();
                }
                // Llamar al callback para que el flujo de la app continúe
                // (sin esto el watchdog detecta _activeProfessional === null y
                //  vuelve a abrir el modal en loop).
                if (typeof _onLoginSuccess === 'function') {
                    _onLoginSuccess(_activeProfessional);
                }
            } else {
                errorEl.textContent = 'Contraseña de administrador incorrecta.';
                pinInput.value = '';
                pinInput.focus();
            }
            return;
        }

        // ── LOGIN PROFESIONAL ────────────────────────────────────────────────────
        var proId   = pro.id;
        if (!entered) {
            errorEl.textContent = 'Ingresá tu PIN de acceso.';
            pinInput.focus();
            return;
        }

        // Verificar bloqueo
        if ((_failedAttempts[proId] || 0) >= MAX_ATTEMPTS) {
            errorEl.textContent = 'Profesional bloqueado. Cambiá de selección o contactá al administrador.';
            enterBtn.disabled = true;
            return;
        }

        var correctPin = String(pro.pin || '1234');

        if (entered === correctPin) {
            // ── LOGIN EXITOSO ──────────────────────────────────────────────
            _failedAttempts[proId] = 0;
            errorEl.textContent    = '';
            attEl.textContent      = '';

            // Fase 4: primer acceso — forzar cambio de PIN antes de continuar
            if (pro.primerUso) {
                _showFirstUsePinChange(pro);
                return;
            }

            _activeProfessional = Object.assign({}, pro);

            // Actualizar pdf_config con el profesional activo
            _syncPdfConfig(pro, idx);

            // Ocultar modal
            var overlay = document.getElementById('clinicAuthOverlay');
            if (overlay) overlay.style.display = 'none';

            // Mostrar botón "cambiar profesional" en el header
            var btnCambiar = document.getElementById('btnCambiarProfesional');
            if (btnCambiar) btnCambiar.style.display = '';

            // Toast de bienvenida
            if (typeof showToast === 'function') {
                showToast('👋 Bienvenido/a, ' + (pro.nombre || pro.usuario || 'Profesional'), 'success');
            }

            if (typeof _onLoginSuccess === 'function') {
                _onLoginSuccess(_activeProfessional);
            }
        } else {
            // ── FALLO ─────────────────────────────────────────────────────
            _failedAttempts[proId] = (_failedAttempts[proId] || 0) + 1;
            pinInput.value = '';
            pinInput.focus();

            var remaining = MAX_ATTEMPTS - _failedAttempts[proId];
            if (remaining <= 0) {
                errorEl.textContent = 'PIN incorrecto. Profesional bloqueado por esta sesión.';
                enterBtn.disabled   = true;
                attEl.textContent   = 'Contactá al administrador de la clínica para resetear el PIN.';
            } else {
                errorEl.textContent = 'PIN incorrecto.';
                attEl.textContent   = remaining + ' intento' + (remaining === 1 ? '' : 's') + ' restante' + (remaining === 1 ? '' : 's') + '.';
            }
        }
    }

    // Sincroniza el profesional seleccionado con pdf_config
    function _syncPdfConfig(pro, dropdownIdx) {
        try {
            var wp      = JSON.parse(localStorage.getItem('workplace_profiles') || '[]');
            var allPros = (wp[0] && wp[0].professionals) || [];
            var realIdx = allPros.findIndex(function(p) {
                return p && p.id && p.id === pro.id;
            });
            if (realIdx < 0) realIdx = dropdownIdx;

            var cfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
            cfg.activeProfessional      = pro;
            cfg.activeProfessionalIndex = String(realIdx);
            cfg.pdfProfessional         = String(realIdx);
            localStorage.setItem('pdf_config', JSON.stringify(cfg));
            window._pdfConfigCache = cfg;
            // También escribir en IndexedDB (para que pdfMaker lo lea correctamente)
            if (typeof window.appDB !== 'undefined' && typeof window.appDB.set === 'function') {
                window.appDB.set('pdf_config', cfg).catch(function() {});
            }
        } catch (_) {}
    }

    function _esc(str) {
        return String(str || '').replace(/[&<>"']/g, function(ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
    }

    // ── Exportar API ──────────────────────────────────────────────────────────
    window.ClinicAuth = {
        init:                  init,
        getActiveProfessional: getActiveProfessional,
        isVisible:             isVisible,
        switchProfessional:    switchProfessional,
        forceSelectProfessional: forceSelectProfessional,
        setupChangeProfButton: setupChangeProfButton,
        resolveProfessionals:  resolveProfessionals,
        _normalizeList:        normalizeList  // expuesto para tests
    };
})();
