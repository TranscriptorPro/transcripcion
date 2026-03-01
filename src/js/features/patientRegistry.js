// ============ REGISTRO DE PACIENTES ============
// Almacena pacientes en localStorage bajo la clave 'patient_registry'.
// Cada entrada: { name, dni, age, sex, insurance, affiliateNum, lastSeen }
// Permite buscar por apellido (parcial) o DNI y autocompletar el modal de datos.

const REGISTRY_KEY = 'patient_registry';
const REGISTRY_MAX = 500; // máximo de pacientes almacenados

// ── Write-through cache (síncrono para callers, persiste via appDB) ───────────
let _registryCache = null;
if (typeof appDB !== 'undefined') {
    appDB.get(REGISTRY_KEY).then(function(v) { _registryCache = v || []; }).catch(function() {});
}

// ---- Leer / escribir ----
function getRegistry() {
    if (_registryCache !== null) return _registryCache;
    try { return JSON.parse(localStorage.getItem(REGISTRY_KEY) || '[]'); }
    catch (_) { return []; }
}

function setRegistry(arr) {
    _registryCache = arr;
    if (typeof appDB !== 'undefined') {
        appDB.set(REGISTRY_KEY, arr); // fire-and-forget
    } else {
        try { localStorage.setItem(REGISTRY_KEY, JSON.stringify(arr)); } catch(_) {}
    }
}

// ---- Guardar paciente ----
// Si ya existe un paciente con el mismo DNI → actualizar; si no → agregar.
window.savePatientToRegistry = function(patient) {
    if (!patient || !patient.name) return;
    const reg    = getRegistry();
    const normDni = (patient.dni || '').replace(/\D/g, '');
    let idx = -1;

    if (normDni) {
        idx = reg.findIndex(p => p.dni && p.dni.replace(/\D/g, '') === normDni);
    }
    if (idx === -1) {
        idx = reg.findIndex(p => _normStr(p.name) === _normStr(patient.name));
    }

    const entry = {
        name:         patient.name.trim(),
        dni:          patient.dni  || '',
        age:          patient.age  || '',
        sex:          patient.sex  || '',
        insurance:    patient.insurance    || '',
        affiliateNum: patient.affiliateNum || '',
        visits:       patient.visits || 1,
        lastSeen:     new Date().toISOString()
    };

    if (idx >= 0) {
        reg[idx] = { ...reg[idx], ...entry };
    } else {
        reg.unshift(entry);
        if (reg.length > REGISTRY_MAX) reg.pop();
    }

    setRegistry(reg);
};

// ---- Obtener todos los pacientes registrados ----
window.getAllPatients = function() {
    return getRegistry();
};

// ---- Buscar pacientes (nombre, apellido parcial o DNI parcial — insensible a acentos y case) ----
window.searchPatientRegistry = function(query) {
    if (!query || query.length < 2) return [];
    const normQ = _normStr(query);
    const dniQ  = query.replace(/\D/g, '');
    return getRegistry()
        .filter(p => {
            // Búsqueda por nombre/apellido normalizado (sin acentos, case-insensitive)
            if (p.name && _normStr(p.name).includes(normQ)) return true;
            // Búsqueda por DNI parcial
            if (dniQ && p.dni && p.dni.replace(/\D/g, '').includes(dniQ)) return true;
            // Búsqueda inversa: si el query contiene múltiples tokens, buscar cada uno
            const tokens = normQ.split(/\s+/).filter(t => t.length >= 2);
            if (tokens.length > 1 && p.name) {
                const pName = _normStr(p.name);
                return tokens.every(t => pName.includes(t));
            }
            return false;
        })
        .slice(0, 20);
};

// ---- Poblar datalist del modal ----
window.populatePatientDatalist = function() {
    const datalist = document.getElementById('reqPatientDatalist');
    if (!datalist) return;
    datalist.innerHTML = '';
    const reg = getRegistry().slice(0, 100); // top 100 recientes
    reg.forEach(p => {
        const opt  = document.createElement('option');
        const label = p.dni ? `${p.name} — DNI ${p.dni}` : p.name;
        opt.value  = label;
        datalist.appendChild(opt);
    });
};

// ---- Autocompletar campos al seleccionar — live search con dropdown personalizado ----
window.initPatientRegistrySearch = function() {
    const searchInput = document.getElementById('reqPatientSearch');
    if (!searchInput) return;

    // Desconectar el datalist nativo (no filtra en tiempo real)
    searchInput.removeAttribute('list');

    // Crear dropdown personalizado
    let dropdown = document.getElementById('patientLiveSearchDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'patientLiveSearchDropdown';
        Object.assign(dropdown.style, {
            position: 'absolute', zIndex: '9999',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            maxHeight: '220px', overflowY: 'auto',
            width: '100%', display: 'none', marginTop: '2px'
        });
        // El padre del input debe tener position:relative
        const wrap = searchInput.parentElement;
        if (wrap) { wrap.style.position = 'relative'; wrap.appendChild(dropdown); }
    }

    function hideDropdown() { dropdown.style.display = 'none'; }

    function showResults(results) {
        if (!results.length) { hideDropdown(); return; }
        dropdown.innerHTML = results.map((p, i) => {
            const label = p.name + (p.dni ? ` — DNI ${p.dni}` : '') + (p.age ? `, ${p.age}a` : '');
            return `<div data-idx="${i}" style="padding:0.5rem 0.85rem;cursor:pointer;font-size:0.82rem;border-bottom:1px solid var(--border);"
                onmouseenter="this.style.background='var(--bg-hover,#2a2a2a)'"
                onmouseleave="this.style.background=''">${label}</div>`;
        }).join('');
        dropdown.style.display = 'block';

        // Click en resultado
        dropdown.querySelectorAll('[data-idx]').forEach(el => {
            el.addEventListener('mousedown', (e) => {
                e.preventDefault(); // evita que el input pierda foco antes
                const p = results[parseInt(el.dataset.idx)];
                const setVal = (id, v) => { const el2 = document.getElementById(id); if (el2 && v != null) el2.value = v; };
                setVal('reqPatientSearch',      p.name + (p.dni ? ` — DNI ${p.dni}` : ''));
                setVal('reqPatientName',        p.name);
                setVal('reqPatientDni',         p.dni);
                setVal('reqPatientAge',         p.age);
                setVal('reqPatientInsurance',   p.insurance);
                setVal('reqPatientAffiliateNum',p.affiliateNum);
                const sexEl = document.getElementById('reqPatientSex');
                if (sexEl && p.sex) sexEl.value = p.sex;
                hideDropdown();
                if (typeof showToast === 'function') showToast(`✅ ${p.name}`, 'success');
            });
        });
    }

    // Buscar mientras escribe (debounce 120ms)
    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = searchInput.value.trim();
        if (query.length < 2) { hideDropdown(); return; }
        debounceTimer = setTimeout(() => {
            const results = searchPatientRegistry(query);
            showResults(results);
        }, 120);
    });

    // Cerrar dropdown al perder foco
    searchInput.addEventListener('blur', () => {
        setTimeout(hideDropdown, 200); // delay para permitir click en resultado
    });

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) hideDropdown();
    });
};

// Función auxiliar normalización (definida en structurer.js, redefinir por si carga antes)
if (typeof _normStr === 'undefined') {
    window._normStr = function(s) {
        return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    };
}

// ============ G1: PANEL DE GESTIÓN DEL REGISTRO ============
window.initPatientRegistryPanel = function () {
    const overlay  = document.getElementById('registryPanelOverlay');
    const openBtn  = document.getElementById('btnOpenRegistryPanel');
    const closeBtn = document.getElementById('btnCloseRegistryPanel');
    if (!overlay || !openBtn) return;

    function fmtDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return isNaN(d) ? '—' : d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
    }

    // ---- Render tabla ----
    function renderTable(filter) {
        const tbody = document.getElementById('registryTbody');
        if (!tbody) return;
        let reg = getRegistry();
        if (filter) {
            const q = _normStr(filter);
            reg = reg.filter(p =>
                (p.name && _normStr(p.name).includes(q)) ||
                (p.dni  && p.dni.includes(q))
            );
        }
        if (reg.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--text-secondary);">No hay pacientes registrados.</td></tr>';
            return;
        }
        tbody.innerHTML = reg.map((p, i) => {
            const safeName = (p.name || '—').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            const safeDni  = (p.dni  || '—').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            const safeAge  = p.age ? String(p.age).replace(/&/g,'&amp;').replace(/</g,'&lt;') + ' años' : '—';
            // Contar informes del paciente en el historial
            const reportCount = (typeof getPatientReports === 'function')
                ? getPatientReports(p.dni || p.name).length : 0;
            return `
            <tr data-idx="${i}">
                <td>${safeName}</td>
                <td>${safeDni}</td>
                <td>${safeAge}</td>
                <td>${fmtDate(p.lastSeen)}</td>
                <td>${(p.visits || 1)}</td>
                <td style="white-space:nowrap;">
                    <button class="btn btn-primary registry-reports-btn" style="padding:.25rem .5rem;font-size:.75rem;${reportCount === 0 ? 'opacity:.45;' : ''}"
                        data-idx="${i}" title="${reportCount} informe(s)">&#x1F4C4; ${reportCount}</button>
                    <button class="btn btn-secondary registry-edit-btn" style="padding:.25rem .5rem;font-size:.75rem;"
                        data-idx="${i}">&#9998;</button>
                    <button class="btn registry-delete-btn" style="padding:.25rem .5rem;font-size:.75rem;background:var(--error);"
                        data-idx="${i}">&#x1F5D1;</button>
                </td>
            </tr>`;
        }).join('');
        // Event delegation para botones edit/delete (evita XSS por onclick inline)
        // Se adjunta solo una vez
        if (!tbody._delegated) {
            tbody._delegated = true;
            tbody.addEventListener('click', (e) => {
                const editBtn    = e.target.closest('.registry-edit-btn');
                const delBtn     = e.target.closest('.registry-delete-btn');
                const reportsBtn = e.target.closest('.registry-reports-btn');
                if (editBtn) {
                    const idx = parseInt(editBtn.dataset.idx);
                    const currentReg = getRegistry();
                    if (currentReg[idx]) registryEditRow(idx, JSON.stringify(currentReg[idx]));
                }
                if (delBtn) {
                    const idx = parseInt(delBtn.dataset.idx);
                    const currentReg = getRegistry();
                    if (currentReg[idx]) registryDeleteRow(currentReg[idx].dni || '', currentReg[idx].name || '');
                }
                if (reportsBtn && typeof viewPatientReportHistory === 'function') {
                    const idx = parseInt(reportsBtn.dataset.idx);
                    const currentReg = getRegistry();
                    if (currentReg[idx]) {
                        viewPatientReportHistory(currentReg[idx].name, currentReg[idx].dni);
                    }
                }
            });
        }
    }

    // ---- Abrir / cerrar ----
    openBtn.addEventListener('click', () => {
        overlay.classList.add('active');
        renderTable();
        document.getElementById('registrySearch')?.focus();
    });
    function closePanel() { overlay.classList.remove('active'); }
    if (closeBtn) closeBtn.addEventListener('click', closePanel);
    overlay.addEventListener('click', e => { if (e.target === overlay) closePanel(); });

    // ---- Búsqueda en tiempo real ----
    document.getElementById('registrySearch')?.addEventListener('input', e => renderTable(e.target.value));

    // ---- Editar ----
    window.registryEditRow = function(idx, pJson) {
        const p = JSON.parse(pJson);
        const form = document.getElementById('registryEditForm');
        if (!form) return;
        form.style.display = 'block';
        form.dataset.idx   = idx;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        set('reName',  p.name);  set('reDni',  p.dni);
        set('reAge',   p.age);   set('reSex',   p.sex);
        set('reInsurance', p.insurance); set('reAffiliateNum', p.affiliateNum);
        document.getElementById('reName')?.focus();
    };

    document.getElementById('btnSaveRegistryEdit')?.addEventListener('click', () => {
        const form = document.getElementById('registryEditForm');
        const idx  = parseInt(form?.dataset.idx);
        if (isNaN(idx)) return;
        const reg  = getRegistry();
        if (!reg[idx]) return;
        const get = id => document.getElementById(id)?.value?.trim() || '';
        reg[idx] = {
            ...reg[idx],
            name:         get('reName'),
            dni:          get('reDni'),
            age:          get('reAge'),
            sex:          get('reSex'),
            insurance:    get('reInsurance'),
            affiliateNum: get('reAffiliateNum'),
        };
        setRegistry(reg);
        form.style.display = 'none';
        renderTable(document.getElementById('registrySearch')?.value);
        if (typeof showToast === 'function') showToast('Paciente actualizado ✓', 'success');
    });

    document.getElementById('btnCancelRegistryEdit')?.addEventListener('click', () => {
        const form = document.getElementById('registryEditForm');
        if (form) form.style.display = 'none';
    });

    // ---- Eliminar ----
    window.registryDeleteRow = async function(dni, name) {
        const ok = await window.showCustomConfirm('🗑️ Eliminar paciente', `¿Eliminar al paciente "${name}"? Esta acción no se puede deshacer.`);
        if (!ok) return;
        const reg = getRegistry().filter(p =>
            !(p.name === name && ((!dni && !p.dni) || (dni && p.dni === dni)))
        );
        setRegistry(reg);
        renderTable(document.getElementById('registrySearch')?.value);
        if (typeof showToast === 'function') showToast('Paciente eliminado', 'info');
    };

    // ---- Exportar JSON ----
    document.getElementById('btnExportRegistryJson')?.addEventListener('click', () => {
        const json = JSON.stringify(getRegistry(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `registro_pacientes_${Date.now()}.json`; a.click();
        URL.revokeObjectURL(url);
    });

    // ---- Exportar CSV ----
    document.getElementById('btnExportRegistryCsv')?.addEventListener('click', () => {
        const reg  = getRegistry();
        const cols = ['name','dni','age','sex','insurance','affiliateNum','lastSeen','visits'];
        const rows = [cols.join(','),
            ...reg.map(p => cols.map(c => `"${(p[c]||'').toString().replace(/"/g,'""')}"`).join(','))
        ];
        const bom  = '\uFEFF';
        const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = `registro_pacientes_${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
    });

    // ---- Importar JSON ----
    document.getElementById('inputImportRegistry')?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                if (!Array.isArray(data)) throw new Error('Formato inválido');
                const existing = getRegistry();
                let added = 0;
                data.forEach(p => {
                    if (!p.name) return;
                    const exists = existing.some(e =>
                        (p.dni && e.dni === p.dni) || _normStr(e.name) === _normStr(p.name)
                    );
                    if (!exists) { existing.unshift(p); added++; }
                });
                setRegistry(existing.slice(0, REGISTRY_MAX));
                renderTable();
                if (typeof showToast === 'function') showToast(`${added} pacientes importados ✓`, 'success');
            } catch (err) {
                if (typeof showToast === 'function') showToast('Error al importar: ' + err.message, 'error');
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    });
};

// ============ G2: Incrementar contador de visitas al guardar en registry ============
const _origSavePatient = window.savePatientToRegistry;
window.savePatientToRegistry = function(patient) {
    if (!patient) { if (_origSavePatient) _origSavePatient(patient); return; }
    // Incrementar contador de visitas si el paciente ya existe
    const reg    = getRegistry();
    const normDni = (patient?.dni || '').replace(/\D/g,'');
    const existing = normDni
        ? reg.find(p => p.dni && p.dni.replace(/\D/g,'') === normDni)
        : reg.find(p => _normStr(p.name) === _normStr(patient?.name || ''));
    if (existing) {
        // Pasar el conteo actualizado en el objeto patient para que _origSavePatient lo persista
        patient.visits = (existing.visits || 1) + 1;
    } else {
        patient.visits = patient.visits || 1;
    }
    if (_origSavePatient) _origSavePatient(patient);
};
