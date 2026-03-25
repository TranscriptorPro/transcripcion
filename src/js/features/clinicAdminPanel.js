// ============ CLINIC ADMIN PANEL — Gestión interna de profesionales ============
// Solo activo cuando plan === CLINIC.
// Credenciales de acceso: adminUser/adminPass en workplace_profiles[0]
// (defaults: usuario='admin', contraseña='clinica')
// Todo se guarda en localStorage.workplace_profiles — sin llamadas al backend.

(function () {
    'use strict';

    const OVERLAY_ID     = 'clinicAdminOverlay';
    const DEFAULT_USER   = 'admin';
    const DEFAULT_PASS   = 'clinica';

    // ── Helpers ───────────────────────────────────────────────────────────────

    function _getWP() {
        try { return JSON.parse(localStorage.getItem('workplace_profiles') || '[]'); }
        catch (_) { return []; }
    }

    function _saveWP(wp) {
        try {
            localStorage.setItem('workplace_profiles', JSON.stringify(wp));
            window._wpProfilesCache = null; // invalidar cache en memoria
        } catch (_) {}
    }

    function _esc(s) {
        return String(s || '').replace(/[&<>"']/g, function(c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function _normalizeDocId(value) {
        return String(value || '').replace(/\D+/g, '');
    }

    function _getClinicId() {
        try {
            if (window.CLIENT_CONFIG && window.CLIENT_CONFIG.medicoId) {
                return String(window.CLIENT_CONFIG.medicoId);
            }
        } catch (_) {}
        return String(localStorage.getItem('medico_id') || '').trim();
    }

    function _getBackendUrl() {
        try {
            if (typeof window.getResolvedBackendUrl === 'function') {
                var u = String(window.getResolvedBackendUrl() || '').trim();
                if (u) return u;
            }
        } catch (_) {}
        try {
            if (window.CLIENT_CONFIG && window.CLIENT_CONFIG.backendUrl) {
                return String(window.CLIENT_CONFIG.backendUrl || '').trim();
            }
        } catch (_) {}
        try {
            var stored = JSON.parse(localStorage.getItem('client_config_stored') || '{}');
            return String(stored.backendUrl || '').trim();
        } catch (_) { return ''; }
    }

    async function _backendGet(action, params) {
        var backendUrl = _getBackendUrl();
        if (!backendUrl) return null;
        var q = new URLSearchParams(Object.assign({ action: action }, params || {}));
        var res = await fetch(backendUrl + '?' + q.toString(), { method: 'GET' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
    }

    function _backendSyncEnabled() {
        return !!(_getBackendUrl() && _getClinicId());
    }

    async function _syncFromBackend() {
        if (!_backendSyncEnabled()) return;
        var clinicId = _getClinicId();
        var json = await _backendGet('clinic_get_staff', { clinicId: clinicId });
        if (!json || !json.success || !Array.isArray(json.staff)) return;

        var wp = _getWP();
        if (!wp[0]) wp[0] = {};
        var clinic = wp[0];
        var localProfs = Array.isArray(clinic.professionals) ? clinic.professionals : [];

        var admin = json.staff.find(function(s) {
            return String(s.Role || '').toLowerCase() === 'admin';
        });
        if (admin) {
            clinic.adminUser = clinic.adminUser || 'admin';
            clinic.adminDni = _normalizeDocId(admin.DNI || clinic.adminDni || '');
        }

        var merged = [];
        json.staff.forEach(function(s, idx) {
            var role = String(s.Role || '').toLowerCase();
            if (role !== 'professional') return;
            var staffId = String(s.Staff_ID || ('staff-' + idx));
            var existing = localProfs.find(function(p) { return p && String(p.id) === staffId; }) || {};
            var esp = String(s.Especialidades || '').split(',').map(function(x) { return x.trim(); }).filter(Boolean);
            merged.push(Object.assign({}, existing, {
                id: staffId,
                nombre: String(s.Nombre || existing.nombre || ''),
                dni: _normalizeDocId(s.DNI || existing.dni || ''),
                matricula: String(s.Matricula || existing.matricula || ''),
                especialidades: esp,
                activo: String(s.Activo || 'true').toLowerCase() !== 'false',
                primerUso: String(s.Primer_Uso || 'false').toLowerCase() === 'true'
            }));
        });

        if (merged.length) {
            clinic.professionals = merged;
            wp[0] = clinic;
            _saveWP(wp);
        }
    }

    function _syncAdminToBackend() {
        if (!_backendSyncEnabled()) return;
        var wp = _getWP();
        var clinic = wp[0] || {};
        _backendGet('clinic_upsert_staff', {
            clinicId: _getClinicId(),
            staffId: '__admin__',
            role: 'admin',
            nombre: 'Administrador',
            dni: clinic.adminDni || '',
            pass: clinic.adminPass || ''
        }).catch(function() {});
    }

    function _syncProfessionalToBackend(pro) {
        if (!_backendSyncEnabled() || !pro || !pro.id) return;
        _backendGet('clinic_upsert_staff', {
            clinicId: _getClinicId(),
            staffId: String(pro.id),
            role: 'professional',
            nombre: pro.nombre || '',
            dni: pro.dni || '',
            matricula: pro.matricula || '',
            especialidades: Array.isArray(pro.especialidades) ? pro.especialidades.join(', ') : '',
            pin: pro.pin || '',
            primerUso: pro.primerUso ? 'true' : 'false',
            activo: pro.activo === false ? 'false' : 'true'
        }).catch(function() {});
    }

    function _getEffectiveMaxProfs(clinic, profs) {
        var configured = Number((clinic || {}).maxProfesionales) || 3;
        var current = Array.isArray(profs) ? profs.length : 0;
        return Math.max(configured, current, 1);
    }

    function _getAdminCreds() {
        var wp = _getWP();
        var w  = wp[0] || {};
        return { user: w.adminUser || DEFAULT_USER, pass: w.adminPass || DEFAULT_PASS };
    }

    // ── API pública ───────────────────────────────────────────────────────────

    function setup() {
        var btn = document.getElementById('btnClinicAdmin');
        if (!btn) return;
        btn.style.display = '';
        btn.addEventListener('click', open);
    }

    function open() {
        _buildOverlay();
        document.getElementById(OVERLAY_ID).style.display = 'flex';
        _syncFromBackend().catch(function() {}).finally(function() {
            _showLoginScreen();
        });
    }

    function close_() {
        var ov = document.getElementById(OVERLAY_ID);
        if (ov) ov.style.display = 'none';
    }
    // ── Fase 3: apertura autenticada (desde modal PIN) — omite pantalla de login ─
    function openAuthenticated() {
        _buildOverlay();
        document.getElementById(OVERLAY_ID).style.display = 'flex';
        _syncFromBackend().catch(function() {}).finally(function() {
            var wp        = _getWP();
            var isDefault = !((wp[0] || {}).adminPass);
            if (isDefault) {
                _showForceChangePassModal();
            } else {
                _showPanel();
            }
        });
    }

    // Pantalla de cambio obligatorio de contraseña (primer uso del admin)
    function _showForceChangePassModal() {
        var inner = document.getElementById('clinicAdminInner');
        if (!inner) return;
        inner.innerHTML = [
            '<div class="caa-title">🔒 Establecé tu contraseña de administrador</div>',
            '<div class="caa-sub" style="color:#b45309;font-weight:600;">',
            'Tu clínica usa la contraseña predeterminada. Cambiála antes de continuar.',
            '</div>',
            '<label class="caa-label">Nueva contraseña</label>',
            '<input id="caaForcePas1" class="caa-input" type="password" autocomplete="off" placeholder="Mínimo 4 caracteres">',
            '<label class="caa-label">Confirmar contraseña</label>',
            '<input id="caaForcePas2" class="caa-input" type="password" autocomplete="off" placeholder="Repetir la contraseña">',
            '<label class="caa-label">DNI de recuperación (obligatorio)</label>',
            '<input id="caaForceDni" class="caa-input" type="text" autocomplete="off" inputmode="numeric" placeholder="Solo números">',
            '<div id="caaForceErr" class="caa-err"></div>',
            '<div class="caa-row" style="justify-content:flex-end;">',
            '  <button class="caa-btn caa-primary" id="caaForceConfirm">✅ Confirmar y continuar →</button>',
            '</div>',
        ].join('');

        document.getElementById('caaForceConfirm').addEventListener('click', function() {
            var p1    = ((document.getElementById('caaForcePas1') || {}).value || '');
            var p2    = ((document.getElementById('caaForcePas2') || {}).value || '');
            var dni   = _normalizeDocId(((document.getElementById('caaForceDni') || {}).value || ''));
            var errEl = document.getElementById('caaForceErr');
            if (p1.length < 4) { if (errEl) errEl.textContent = 'Mínimo 4 caracteres.'; return; }
            if (p1 !== p2)     { if (errEl) errEl.textContent = 'Las contraseñas no coinciden.'; return; }
            if (!dni)          { if (errEl) errEl.textContent = 'Ingresá un DNI válido.'; return; }
            var wp = _getWP();
            if (!wp[0]) wp[0] = {};
            wp[0].adminPass = p1;
            wp[0].adminDni  = dni;
            _saveWP(wp);
            _syncAdminToBackend();
            if (typeof showToast === 'function') showToast('✅ Contraseña de administrador guardada.', 'success');
            _showPanel();
        });

        setTimeout(function() {
            var f = document.getElementById('caaForcePas1');
            if (f) f.focus();
        }, 60);
    }
    // ── Overlay (se construye una sola vez) ───────────────────────────────────

    function _buildOverlay() {
        if (document.getElementById(OVERLAY_ID)) return;

        var style = document.createElement('style');
        style.id  = 'clinicAdminStyle';
        style.textContent = [
            '#clinicAdminOverlay{position:fixed;inset:0;background:rgba(2,6,23,.82);z-index:9100;',
            'display:none;align-items:center;justify-content:center;padding:20px;}',
            '#clinicAdminBox{background:var(--bg-card,#fff);border-radius:18px;',
            'box-shadow:0 20px 60px rgba(0,0,0,.5);padding:24px 24px 18px;',
            'width:100%;max-width:500px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;}',
            '#clinicAdminInner{display:flex;flex-direction:column;flex:1;min-height:0;}',
            '.caa-title{font-size:1.05rem;font-weight:900;color:var(--text-primary,#0f172a);margin-bottom:3px;}',
            '.caa-sub{font-size:.8rem;color:var(--text-secondary,#64748b);margin-bottom:16px;}',
            '.caa-label{display:block;font-size:.77rem;font-weight:700;color:var(--text-secondary,#475569);margin-bottom:3px;}',
            '.caa-input{width:100%;padding:10px 12px;border:1.5px solid #cbd5e1;border-radius:10px;',
            'font-size:.9rem;background:var(--bg-card,#fff);color:var(--text-primary,#0f172a);',
            'box-sizing:border-box;margin-bottom:10px;}',
            '.caa-input:focus{border-color:#0ea5e9;outline:none;}',
            '.caa-err{font-size:.78rem;color:#b91c1c;min-height:16px;margin-bottom:6px;font-weight:700;}',
            '.caa-row{display:flex;gap:8px;justify-content:flex-end;}',
            '.caa-btn{padding:9px 18px;border:none;border-radius:10px;font-size:.85rem;font-weight:800;cursor:pointer;transition:background .15s;}',
            '.caa-primary{background:#0ea5e9;color:#fff;}.caa-primary:hover{background:#0284c7;}',
            '.caa-ghost{background:transparent;color:var(--text-secondary,#64748b);border:1.5px solid #e2e8f0;}',
            '.caa-ghost:hover{background:#f1f5f9;}',
            '.caa-danger{background:#fee2e2;color:#b91c1c;}.caa-danger:hover{background:#fecaca;}',
            '.caa-warn{background:#fef3c7;color:#92400e;}.caa-warn:hover{background:#fde68a;}',
            '.caa-success{background:#dcfce7;color:#166534;}.caa-success:hover{background:#bbf7d0;}',
            '.caa-info{background:#e0f2fe;color:#0369a1;}.caa-info:hover{background:#bae6fd;}',
            '#clinicAdminContent{flex:1;min-height:0;overflow-y:auto;margin:-4px -4px 0;padding:4px 4px 0;}',
            '.caa-pro-card{background:var(--bg-surface,#f8fafc);border:1.5px solid #e2e8f0;',
            'border-radius:12px;padding:14px;margin-bottom:10px;}',
            '.caa-pro-card.inactive{opacity:.55;border-color:#cbd5e1;}',
            '.caa-pro-name{font-size:.9rem;font-weight:800;color:var(--text-primary,#0f172a);margin-bottom:2px;}',
            '.caa-pro-meta{font-size:.75rem;color:var(--text-secondary,#64748b);margin-bottom:8px;line-height:1.5;}',
            '.caa-pro-actions{display:flex;gap:6px;flex-wrap:wrap;}',
            '.caa-pro-actions .caa-btn{font-size:.76rem;padding:6px 10px;}',
            '.caa-head-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:6px;}',
            '.caa-head-actions{display:flex;align-items:center;gap:8px;flex-shrink:0;}',
            '.caa-icon-close{width:38px;height:38px;border-radius:999px;border:1.5px solid #e2e8f0;background:#fff;color:#475569;font-size:1.1rem;font-weight:900;cursor:pointer;}',
            '.caa-icon-close:hover{background:#f8fafc;color:#0f172a;}',
            '.caa-add-btn{width:100%;margin:8px 0 4px;border:2px dashed #94a3b8;background:none;',
            'padding:12px;border-radius:10px;color:#64748b;font-size:.86rem;cursor:pointer;',
            'transition:all .15s;}',
            '.caa-add-btn:hover:not([disabled]){border-color:#0ea5e9;color:#0ea5e9;}',
            '.caa-add-btn[disabled]{opacity:.4;cursor:not-allowed;}',
            '.caa-edit-zone{margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;}',
            '.caa-form-2col{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}',
            '.caa-form-1col{margin-bottom:10px;}',
            '.caa-section-sep{font-size:.75rem;font-weight:700;color:#94a3b8;text-transform:uppercase;',
            'letter-spacing:.06em;border-bottom:1px solid #f1f5f9;padding-bottom:3px;margin:14px 0 10px;}',
            '.caa-close-row{display:flex;justify-content:space-between;align-items:center;',
            'margin-top:14px;padding-top:10px;border-top:1px solid #f1f5f9;}',
            '.caa-limit-badge{font-size:.72rem;padding:3px 10px;background:#f1f5f9;',
            'border-radius:999px;color:#64748b;font-weight:700;}',
        ].join('');
        document.head.appendChild(style);

        var ov = document.createElement('div');
        ov.id  = OVERLAY_ID;
        ov.innerHTML = '<div id="clinicAdminBox"><div id="clinicAdminInner"></div></div>';
        document.body.appendChild(ov);

        // Cerrar al hacer click fuera
        ov.addEventListener('click', function(e) { if (e.target === ov) close_(); });
    }

    // ── Pantalla de login ─────────────────────────────────────────────────────

    function _showLoginScreen() {
        var inner = document.getElementById('clinicAdminInner');
        if (!inner) return;
        inner.innerHTML = [
            '<div class="caa-title">🔒 Administración de la Clínica</div>',
            '<div class="caa-sub">Ingresá con las credenciales de administrador</div>',
            '<label class="caa-label" for="caaUser">Usuario</label>',
            '<input id="caaUser" class="caa-input" type="text" autocomplete="off" value="admin">',
            '<label class="caa-label" for="caaPass">Contraseña</label>',
            '<input id="caaPass" class="caa-input" type="password" autocomplete="off" placeholder="Contraseña de administrador">',
            '<div id="caaLoginErr" class="caa-err"></div>',
            '<div class="caa-row">',
            '  <button class="caa-btn caa-ghost" id="caaCancel">Cancelar</button>',
            '  <button class="caa-btn caa-ghost" id="caaRecoverAdmin">¿Olvidaste tu clave?</button>',
            '  <button class="caa-btn caa-primary" id="caaLoginBtn">Ingresar →</button>',
            '</div>',
        ].join('');

        document.getElementById('caaCancel').addEventListener('click', close_);
        document.getElementById('caaRecoverAdmin').addEventListener('click', _recoverAdminByDni);
        document.getElementById('caaLoginBtn').addEventListener('click', _tryLogin);
        document.getElementById('caaPass').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') _tryLogin();
        });
        setTimeout(function() {
            var f = document.getElementById('caaPass');
            if (f) f.focus();
        }, 60);
    }

    function _tryLogin() {
        var user  = (document.getElementById('caaUser')  || {}).value || '';
        var pass  = (document.getElementById('caaPass')  || {}).value || '';
        var errEl = document.getElementById('caaLoginErr');
        var creds = _getAdminCreds();

        if (user.trim() === creds.user && pass === creds.pass) {
            _showPanel();
        } else {
            if (errEl) errEl.textContent = 'Usuario o contraseña incorrectos.';
            var pEl = document.getElementById('caaPass');
            if (pEl) { pEl.value = ''; pEl.focus(); }
        }
    }

    function _recoverAdminByDni() {
        var wp = _getWP();
        var clinic = wp[0] || {};
        var expected = _normalizeDocId(clinic.adminDni);
        if (!expected) {
            if (typeof showToast === 'function') {
                showToast('No hay DNI de admin configurado. Definilo en "Cambiar clave admin".', 'warning');
            }
            return;
        }
        var entered = _normalizeDocId(prompt('Ingresá el DNI del administrador para recuperar la clave:') || '');
        if (!entered) return;
        if (entered !== expected) {
            var errEl = document.getElementById('caaLoginErr');
            if (errEl) errEl.textContent = 'DNI incorrecto.';
            return;
        }
        clinic.adminPass = DEFAULT_PASS;
        wp[0] = clinic;
        _saveWP(wp);
        _syncAdminToBackend();
        if (typeof showToast === 'function') {
            showToast('🔑 Clave admin restablecida a "clinica".', 'success');
        }
    }

    // ── Panel de gestión ──────────────────────────────────────────────────────

    function _showPanel() {
        var inner = document.getElementById('clinicAdminInner');
        if (!inner) return;

        var wp        = _getWP();
        var clinic    = wp[0] || {};
        var profs     = Array.isArray(clinic.professionals) ? clinic.professionals : [];
        var maxProfs  = _getEffectiveMaxProfs(clinic, profs);
        var clinicName = clinic.name || 'Clínica';
        var syncMode = _backendSyncEnabled() ? 'Backend activo' : 'Solo local';

        inner.innerHTML = [
            '<div class="caa-head-row">',
            '  <div>',
            '    <div class="caa-title">⚕️ Gestión de Profesionales</div>',
            '    <div class="caa-sub">' + _esc(clinicName) + ' · ' + _esc(syncMode) + '</div>',
            '  </div>',
            '  <div class="caa-head-actions">',
            '    <button class="caa-icon-close" id="caaPanelCloseTop" aria-label="Cerrar panel">✕</button>',
            '  </div>',
            '</div>',
            '<div id="clinicAdminContent"><div id="caaProList"></div></div>',
            '<div class="caa-close-row">',
            '  <span class="caa-limit-badge" id="caaProfCount">' + profs.length + ' / ' + maxProfs + ' profesionales</span>',
            '  <div style="display:flex;gap:8px;">',
            '    <button class="caa-btn caa-ghost" id="caaPanelCreds" style="font-size:.76rem;">🔑 Cambiar clave admin</button>',
            '    <button class="caa-btn caa-ghost" id="caaPanelClose">Cerrar</button>',
            '  </div>',
            '</div>',
        ].join('');

    document.getElementById('caaPanelCloseTop').addEventListener('click', close_);
        document.getElementById('caaPanelClose').addEventListener('click', close_);
        document.getElementById('caaPanelCreds').addEventListener('click', _showChangeCredsSection);

        // Event delegation en la lista
        var list = document.getElementById('caaProList');
        list.addEventListener('click', _handleListAction);

        _renderProList(profs, maxProfs);
    }

    function _refreshPanel() {
        var wp       = _getWP();
        var clinic   = wp[0] || {};
        var profs    = Array.isArray(clinic.professionals) ? clinic.professionals : [];
        var maxProfs = _getEffectiveMaxProfs(clinic, profs);

        var badge = document.getElementById('caaProfCount');
        if (badge) badge.textContent = profs.length + ' / ' + maxProfs + ' profesionales';

        _renderProList(profs, maxProfs);
    }

    function _renderProList(profs, maxProfs) {
        var list = document.getElementById('caaProList');
        if (!list) return;

        var html = '';
        profs.forEach(function(p, i) {
            var esp = Array.isArray(p.especialidades) ? p.especialidades.join(', ') : (p.especialidad || '—');
            var inactive = p.activo === false;
            html += '<div class="caa-pro-card' + (inactive ? ' inactive' : '') + '" id="caaCard_' + i + '">';
            html += '  <div class="caa-pro-name">' + _esc(p.nombre || '—');
            if (inactive) html += ' <span style="font-size:.68rem;font-weight:600;color:#94a3b8;">[INACTIVO]</span>';
            html += '</div>';
            html += '  <div class="caa-pro-meta">';
            html += '    👤 ' + _esc(p.usuario || '—') + ' &nbsp;·&nbsp; ';
            html += '    🏥 ' + _esc(p.matricula || '—') + ' &nbsp;·&nbsp; 🪪 ' + _esc(p.dni || '—') + '<br>';
            html += '    🔬 ' + _esc(esp || '—');
            html += '  </div>';
            html += '  <div class="caa-pro-actions">';
            html += '    <button class="caa-btn caa-primary" data-action="edit" data-idx="' + i + '">✏️ Editar</button>';
            html += '    <button class="caa-btn caa-warn" data-action="reset-pin" data-idx="' + i + '">🔄 Reset PIN</button>';
            if (inactive) {
                html += '  <button class="caa-btn caa-success" data-action="toggle" data-idx="' + i + '">✅ Activar</button>';
            } else {
                html += '  <button class="caa-btn caa-info" data-action="toggle" data-idx="' + i + '">⛔ Desactivar</button>';
            }
            html += '    <button class="caa-btn caa-danger" data-action="delete" data-idx="' + i + '">🗑️ Eliminar</button>';
            html += '  </div>';
            html += '  <div id="caaEdit_' + i + '"></div>';
            html += '</div>';
        });

        var canAdd = profs.length < maxProfs;
        html += '<button class="caa-add-btn" data-action="add" ' + (canAdd ? '' : 'disabled') + '>';
        html += '  ➕ Agregar profesional' + (canAdd ? '' : ' (límite alcanzado: ' + maxProfs + ')');
        html += '</button>';

        list.innerHTML = html;
    }

    // ── Delegación de eventos ─────────────────────────────────────────────────

    function _handleListAction(e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var action = btn.dataset.action;
        var idx    = parseInt(btn.dataset.idx, 10);
        switch (action) {
            case 'edit':       _editPro(idx);       break;
            case 'reset-pin':  _resetPin(idx);      break;
            case 'toggle':     _toggleActive(idx);  break;
            case 'delete':     _deletePro(idx);     break;
            case 'add':        _addPro();           break;
            case 'save':       _savePro(idx);       break;
            case 'cancel-edit':
                var z = document.getElementById('caaEdit_' + idx);
                if (z) z.innerHTML = '';
                break;
        }
    }

    // ── Acciones CRUD ─────────────────────────────────────────────────────────

    function _editPro(idx) {
        var wp    = _getWP();
        var profs = (wp[0] && wp[0].professionals) || [];
        var p     = profs[idx];
        if (!p) return;

        var zone = document.getElementById('caaEdit_' + idx);
        if (!zone) return;
        // Toggle: si ya muestra el formulario, lo colapsa
        if (zone.innerHTML.trim()) { zone.innerHTML = ''; return; }

        var espStr = Array.isArray(p.especialidades)
            ? p.especialidades.join(', ')
            : (p.especialidad || '');

        zone.innerHTML = [
            '<div class="caa-edit-zone">',
            '  <div class="caa-section-sep">Datos del profesional</div>',
            '  <div class="caa-form-2col">',
            '    <div>',
            '      <label class="caa-label">Nombre completo</label>',
            '      <input class="caa-input" id="ce_nombre_' + idx + '" value="' + _esc(p.nombre || '') + '">',
            '    </div>',
            '    <div>',
            '      <label class="caa-label">Matrícula</label>',
            '      <input class="caa-input" id="ce_mat_' + idx + '" value="' + _esc(p.matricula || '') + '">',
            '    </div>',
            '    <div>',
            '      <label class="caa-label">DNI (para recuperación)</label>',
            '      <input class="caa-input" id="ce_dni_' + idx + '" value="' + _esc(p.dni || '') + '" inputmode="numeric">',
            '    </div>',
            '  </div>',
            '  <div class="caa-form-2col">',
            '    <div>',
            '      <label class="caa-label">Usuario de acceso</label>',
            '      <input class="caa-input" id="ce_usr_' + idx + '" value="' + _esc(p.usuario || '') + '">',
            '    </div>',
            '    <div>',
            '      <label class="caa-label">PIN (4 dígitos)</label>',
            '      <input class="caa-input" id="ce_pin_' + idx + '" type="text" maxlength="4" inputmode="numeric" value="' + _esc(p.pin || '1234') + '">',
            '    </div>',
            '  </div>',
            '  <div class="caa-form-1col">',
            '    <label class="caa-label">Especialidades (separar con coma)</label>',
            '    <input class="caa-input" id="ce_esp_' + idx + '" value="' + _esc(espStr) + '" placeholder="Ej: Cardiología, Clínica Médica">',
            '  </div>',
            '  <div class="caa-form-1col">',
            '    <label style="display:flex;align-items:center;gap:8px;font-size:.83rem;cursor:pointer;">',
            '      <input type="checkbox" id="ce_activo_' + idx + '"' + (p.activo !== false ? ' checked' : '') + '> Profesional activo',
            '    </label>',
            '  </div>',
            '  <div class="caa-row">',
            '    <button class="caa-btn caa-ghost" data-action="cancel-edit" data-idx="' + idx + '">Cancelar</button>',
            '    <button class="caa-btn caa-primary" data-action="save" data-idx="' + idx + '">💾 Guardar cambios</button>',
            '  </div>',
            '</div>',
        ].join('');
    }

    function _savePro(idx) {
        var wp    = _getWP();
        var profs = (wp[0] && wp[0].professionals) || [];
        if (!profs[idx]) return;

        var nombre    = ((document.getElementById('ce_nombre_' + idx) || {}).value || '').trim();
        var matricula = ((document.getElementById('ce_mat_' + idx)    || {}).value || '').trim();
        var dni       = _normalizeDocId((document.getElementById('ce_dni_' + idx) || {}).value || '');
        var usuario   = ((document.getElementById('ce_usr_' + idx)    || {}).value || '').trim();
        var pin       = ((document.getElementById('ce_pin_' + idx)    || {}).value || '').trim() || '1234';
        var espRaw    = ((document.getElementById('ce_esp_' + idx)    || {}).value || '');
        var activo    = !!((document.getElementById('ce_activo_' + idx) || {}).checked);

        if (!nombre) {
            if (typeof showToast === 'function') showToast('El nombre del profesional es obligatorio.', 'error');
            return;
        }

        profs[idx] = Object.assign({}, profs[idx], {
            nombre:         nombre,
            matricula:      matricula,
            dni:            dni,
            usuario:        usuario,
            pin:            pin,
            especialidades: espRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean),
            activo:         activo
        });

        wp[0].professionals = profs;
        _saveWP(wp);
        _syncProfessionalToBackend(profs[idx]);
        if (typeof showToast === 'function') showToast('✅ Profesional actualizado.', 'success');
        _refreshPanel();
    }

    function _resetPin(idx) {
        if (!confirm('¿Resetear el PIN a 1234?')) return;
        var wp    = _getWP();
        var profs = (wp[0] && wp[0].professionals) || [];
        if (!profs[idx]) return;
        profs[idx].pin = '1234';
        profs[idx].primerUso = true; // forzar cambio en el próximo acceso
        wp[0].professionals = profs;
        _saveWP(wp);
        _syncProfessionalToBackend(profs[idx]);
        if (typeof showToast === 'function') showToast('🔄 PIN reseteado. El profesional deberá cambiarlo en su próximo acceso.', 'success');
        _refreshPanel();
    }

    function _toggleActive(idx) {
        var wp    = _getWP();
        var profs = (wp[0] && wp[0].professionals) || [];
        if (!profs[idx]) return;
        profs[idx].activo   = profs[idx].activo === false;
        wp[0].professionals = profs;
        _saveWP(wp);
        if (_backendSyncEnabled()) {
            _backendGet('clinic_set_staff_active', {
                clinicId: _getClinicId(),
                staffId: String(profs[idx].id || ''),
                active: profs[idx].activo ? 'true' : 'false'
            }).catch(function() {});
        }
        if (typeof showToast === 'function') {
            var msg = profs[idx].activo ? '✅ Profesional activado.' : '⛔ Profesional desactivado.';
            showToast(msg, 'info');
        }
        _refreshPanel();
    }

    function _deletePro(idx) {
        var wp    = _getWP();
        var profs = (wp[0] && wp[0].professionals) || [];
        if (!profs[idx]) return;
        var nombre = profs[idx].nombre || 'sin nombre';
        var staffId = String(profs[idx].id || '');
        if (!confirm('¿Eliminar a "' + nombre + '"? Esta acción no se puede deshacer.')) return;
        profs.splice(idx, 1);
        wp[0].professionals = profs;
        _saveWP(wp);
        if (_backendSyncEnabled() && staffId) {
            _backendGet('clinic_delete_staff', {
                clinicId: _getClinicId(),
                staffId: staffId
            }).catch(function() {});
        }
        if (typeof showToast === 'function') showToast('🗑️ Profesional eliminado.', 'warning');
        _refreshPanel();
    }

    function _addPro() {
        var wp       = _getWP();
        var profs    = (wp[0] && wp[0].professionals) || [];
        var maxProfs = _getEffectiveMaxProfs((wp[0] || {}), profs);
        if (profs.length >= maxProfs) return;

        var newPro = {
            id:            'new-' + Date.now(),
            nombre:        '',
            matricula:     '',
            dni:           '',
            especialidades:[],
            usuario:       '',
            pin:           '1234',
            email:         '',
            telefono:      '',
            firma:         null,
            logo:          null,
            redesSociales: {},
            showPhone:     true,
            showEmail:     true,
            showSocial:    false,
            primerUso:     true,
            activo:        true
        };

        profs.push(newPro);
        wp[0].professionals = profs;
        _saveWP(wp);
        _syncProfessionalToBackend(newPro);
        _refreshPanel();

        // Abrir el formulario del nuevo profesional automáticamente
        var newIdx = profs.length - 1;
        setTimeout(function() { _editPro(newIdx); }, 40);
    }

    // ── Cambio de credenciales de admin ───────────────────────────────────────

    function _showChangeCredsSection() {
        var inner = document.getElementById('clinicAdminInner');
        if (!inner) return;
        var wpCurrent = _getWP();
        var currentAdminDni = (wpCurrent[0] && wpCurrent[0].adminDni) || '';
        inner.innerHTML = [
            '<div class="caa-title">🔑 Cambiar credenciales de administrador</div>',
            '<div class="caa-sub">Solo el administrador de la clínica puede hacer esto.</div>',
            '<div class="caa-section-sep">Credenciales nuevas</div>',
            '<label class="caa-label">Nuevo usuario</label>',
            '<input id="caaNewUser" class="caa-input" type="text" autocomplete="off" placeholder="Nuevo usuario">',
            '<label class="caa-label">Nueva contraseña</label>',
            '<input id="caaNewPass" class="caa-input" type="password" autocomplete="off" placeholder="Nueva contraseña">',
            '<label class="caa-label">Confirmar contraseña</label>',
            '<input id="caaNewPass2" class="caa-input" type="password" autocomplete="off" placeholder="Repetir contraseña">',
            '<label class="caa-label">DNI de recuperación</label>',
            '<input id="caaNewAdminDni" class="caa-input" type="text" autocomplete="off" inputmode="numeric" value="' + _esc(currentAdminDni) + '" placeholder="Solo números">',
            '<div id="caaCredsErr" class="caa-err"></div>',
            '<div class="caa-row">',
            '  <button class="caa-btn caa-ghost" id="caaCredsBack">← Volver</button>',
            '  <button class="caa-btn caa-primary" id="caaCredsSave">💾 Guardar</button>',
            '</div>',
        ].join('');

        document.getElementById('caaCredsBack').addEventListener('click', _showPanel);
        document.getElementById('caaCredsSave').addEventListener('click', function() {
            var newUser  = ((document.getElementById('caaNewUser')  || {}).value || '').trim();
            var newPass  = ((document.getElementById('caaNewPass')  || {}).value || '');
            var newPass2 = ((document.getElementById('caaNewPass2') || {}).value || '');
            var adminDni = _normalizeDocId(((document.getElementById('caaNewAdminDni') || {}).value || ''));
            var errEl    = document.getElementById('caaCredsErr');

            if (!newUser) { if (errEl) errEl.textContent = 'El usuario no puede estar vacío.'; return; }
            if (!newPass) { if (errEl) errEl.textContent = 'La contraseña no puede estar vacía.'; return; }
            if (newPass !== newPass2) { if (errEl) errEl.textContent = 'Las contraseñas no coinciden.'; return; }
            if (!adminDni) { if (errEl) errEl.textContent = 'Ingresá un DNI válido para recuperación.'; return; }

            var wp = _getWP();
            if (!wp[0]) wp[0] = {};
            wp[0].adminUser = newUser;
            wp[0].adminPass = newPass;
            wp[0].adminDni  = adminDni;
            _saveWP(wp);
            _syncAdminToBackend();
            if (typeof showToast === 'function') showToast('✅ Credenciales de administrador actualizadas.', 'success');
            _showPanel();
        });
    }

    // ── Exportar ──────────────────────────────────────────────────────────────
    window.ClinicAdminPanel = {
        open:              open,
        openAuthenticated: openAuthenticated,
        setup:             setup,
        close:             close_
    };

})();
