/**
 * BACKEND API PARA TRANSCRIPTOR MÉDICO PRO
 * Instrucciones:
 * 1. Crear un Google Sheet con las hojas definidas en GOOGLE_SHEET_SETUP.md
 * 2. Ir a Extensiones -> Apps Script.
 * 3. Pegar este código y cambiar el nombre del proyecto.
 * 4. Implementar como "Aplicación Web" (Cualquier persona, incluso anónima).
 * 5. IMPORTANT: Set ADMIN_KEY in Script Properties: Archivo > Propiedades del proyecto > Propiedades de script > ADMIN_KEY = <tu-clave>
 */

// Nombres exactos de las pestañas del Sheet
const SHEET_NAME         = 'Usuarios';
const SHEET_METRICAS     = 'Metricas_Uso';
const SHEET_DEVICES      = 'Dispositivos';
const SHEET_LOGS         = 'Admin_Logs';
const SHEET_DIAGNOSTICOS = 'Diagnosticos';
const SHEET_ADMIN_USERS  = 'Admin_Users';
const SHEET_REGISTROS    = 'Registros_Pendientes';

// SECURITY: Read from Apps Script Script Properties (not hardcoded).
// In Apps Script editor: File > Project Properties > Script Properties > Add: ADMIN_KEY = <your-secret>
const ADMIN_KEY = (function() {
  try {
    return PropertiesService.getScriptProperties().getProperty('ADMIN_KEY') || 'CHANGE_ME_IN_PROPERTIES';
  } catch(e) {
    return 'CHANGE_ME_IN_PROPERTIES';
  }
})();

function doGet(e) {
  const action = e.parameter.action;

  // EXISTING: user validation — enhanced with trial/device enforcement
  if (!action || action === 'validate') {
    const id = e.parameter.id;
    const deviceId = e.parameter.deviceId;

    if (!id) return createResponse({ error: 'Falta ID de Médico' });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('ID_Medico');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(id)) {
        const doctor = {};
        headers.forEach((h, index) => doctor[h] = data[i][index]);

        // ── Verificar Estado de la cuenta ──────────────────────────────────
        const estado = String(doctor.Estado || '').toLowerCase();
        if (estado === 'banned') {
          return createResponse({ error: 'Cuenta suspendida', code: 'BANNED' });
        }
        if (estado === 'inactive') {
          return createResponse({ error: 'Cuenta desactivada', code: 'INACTIVE' });
        }

        // ── Verificar expiración del trial / plan ──────────────────────────
        const now = new Date();
        const fechaVenc = doctor.Fecha_Vencimiento ? new Date(doctor.Fecha_Vencimiento) : null;
        let trialExpired = false;
        let daysRemaining = null;

        if (fechaVenc) {
          const diffMs = fechaVenc.getTime() - now.getTime();
          daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          if (diffMs < 0) {
            trialExpired = true;
            // Auto-marcar como expired si aún no lo está
            if (estado !== 'expired') {
              const estadoCol = headers.indexOf('Estado');
              if (estadoCol !== -1) {
                sheet.getRange(i + 1, estadoCol + 1).setValue('expired');
              }
            }
          }
        }

        doctor.trial_expired = trialExpired;
        doctor.days_remaining = daysRemaining;

        if (trialExpired && estado !== 'active') {
          // Solo bloquear si el plan no es permanente (pro con Fecha_Vencimiento pasada se bloquea)
          return createResponse({
            error: 'Licencia expirada',
            code: 'EXPIRED',
            trial_expired: true,
            days_remaining: daysRemaining,
            plan: doctor.Plan
          });
        }

        // ── Verificar límite de dispositivos ───────────────────────────────
        let devices = [];
        try { devices = JSON.parse(doctor.Devices_Logged || '[]'); } catch(e) {}
        const maxDevices = Number(doctor.Devices_Max) || 999;
        const isNewDevice = deviceId && !devices.includes(deviceId);

        if (isNewDevice && devices.length >= maxDevices) {
          return createResponse({
            error: 'Límite de dispositivos alcanzado',
            code: 'DEVICE_LIMIT',
            devices_logged: devices.length,
            devices_max: maxDevices
          });
        }

        // Registrar dispositivo si es nuevo
        if (isNewDevice && deviceId) {
          devices.push(deviceId);
          sheet.getRange(i + 1, headers.indexOf('Devices_Logged') + 1).setValue(JSON.stringify(devices));
        }

        // Registrar en hoja Dispositivos (upsert por ID_Device)
        if (deviceId) {
          try {
            const devSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_DEVICES);
            if (devSheet) {
              const devData = devSheet.getDataRange().getValues();
              const devHeaders = devData[0];
              const nowStr = now.toISOString();
              let found = false;
              for (let d = 1; d < devData.length; d++) {
                if (String(devData[d][0]) === String(deviceId)) {
                  devSheet.getRange(d + 1, devHeaders.indexOf('Ultima_Conexion') + 1).setValue(nowStr);
                  found = true;
                  break;
                }
              }
              if (!found) {
                const devRow = devHeaders.map(h => {
                  if (h === 'ID_Device') return deviceId;
                  if (h === 'ID_Medico') return id;
                  if (h === 'Fecha_Registro') return nowStr;
                  if (h === 'Ultima_Conexion') return nowStr;
                  if (h === 'Estado') return 'active';
                  return '';
                });
                devSheet.appendRow(devRow);
              }
            }
          } catch(devErr) { /* no interrumpir si falla el registro de device */ }
        }

        // Diagnóstico remoto: si admin solicitó diagnóstico, set flag y resetear
        const diagPendCol = headers.indexOf('Diagnostico_Pendiente');
        if (diagPendCol !== -1) {
          const diagVal = String(data[i][diagPendCol] || '').toLowerCase();
          if (diagVal === 'true') {
            doctor.diagnostico_solicitado = true;
            sheet.getRange(i + 1, diagPendCol + 1).setValue('false');
          }
        }

        // Agregar metadata de validación
        doctor.validated = true;
        doctor.devices_count = devices.length;
        doctor.devices_max = maxDevices;

        return createResponse(doctor);
      }
    }

    return createResponse({ error: 'Médico no encontrado', code: 'NOT_FOUND' });
  }

  // NEW: admin endpoint - list all users
  if (action === 'admin_list_users') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const users = [];
    for (let i = 1; i < data.length; i++) {
      const user = {};
      headers.forEach((h, idx) => {
        user[h] = data[i][idx];
      });
      users.push(user);
    }

    return createResponse({ users: users, total: users.length });
  }

  // FIX B3: admin_update_user como GET (admin.html usa fetch GET con query params)
  if (action === 'admin_update_user') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const userId = e.parameter.userId;
    let updates = {};
    try { updates = JSON.parse(decodeURIComponent(e.parameter.updates || '{}')); } catch(ex) {}

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('ID_Medico');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(userId)) {
        Object.keys(updates).forEach(key => {
          const colIndex = headers.indexOf(key);
          if (colIndex !== -1) sheet.getRange(i + 1, colIndex + 1).setValue(updates[key]);
        });
        appendAdminLog('admin', 'edit_user', userId, JSON.stringify(updates));
        return createResponse({ success: true, message: 'User updated' });
      }
    }
    return createResponse({ error: 'User not found' });
  }

  // FIX B2: admin_create_user (nuevo endpoint — no existía)
  if (action === 'admin_create_user') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    let userData = {};
    try { userData = JSON.parse(decodeURIComponent(e.parameter.updates || '{}')); } catch(ex) {}

    if (!userData.ID_Medico) return createResponse({ error: 'Falta ID_Medico' });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const headers = sheet.getDataRange().getValues()[0];

    // Verificar que el ID no exista ya
    const existing = sheet.getDataRange().getValues();
    for (let i = 1; i < existing.length; i++) {
      if (String(existing[i][0]) === String(userData.ID_Medico)) {
        return createResponse({ error: 'ID_Medico ya existe: ' + userData.ID_Medico });
      }
    }

    // Construir fila siguiendo el orden de los headers
    const row = headers.map(h => (userData[h] !== undefined ? userData[h] : ''));
    sheet.appendRow(row);
    appendAdminLog('admin', 'create_user', userData.ID_Medico, userData.Nombre || '');
    return createResponse({ success: true, userId: userData.ID_Medico });
  }

  // admin_get_logs — lee la hoja Admin_Logs con filtros opcionales
  if (action === 'admin_get_logs') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    try {
      const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOGS);
      if (!logSheet) return createResponse({ logs: [], message: 'Hoja Admin_Logs no encontrada' });

      const data = logSheet.getDataRange().getValues();
      if (data.length <= 1) return createResponse({ logs: [] });

      const headers = data[0];
      const filterDate = e.parameter.date || '';
      const filterType = (e.parameter.type || '').toLowerCase();

      const logs = [];
      for (let i = data.length - 1; i >= 1; i--) { // más recientes primero
        const row = {};
        headers.forEach((h, idx) => { row[h] = data[i][idx]; });

        const ts = String(row['Timestamp'] || row['Fecha'] || '');
        const accion = String(row['Accion'] || '').toLowerCase();

        if (filterDate && !ts.startsWith(filterDate)) continue;
        if (filterType && filterType !== 'todos' && filterType !== 'all' && accion !== filterType) continue;

        logs.push({
          timestamp:        ts,
          admin:            row['Admin_User']        || '—',
          type:             row['Accion']            || '—',
          userId:           row['Usuario_Afectado']  || '—',
          details:          row['Detalles']          || '—'
        });

        if (logs.length >= 200) break; // límite de seguridad
      }

      return createResponse({ logs: logs, total: logs.length });
    } catch(err) {
      return createResponse({ error: 'Error leyendo logs: ' + err.message });
    }
  }

  // admin_log_action — escribe una acción de admin en Admin_Logs
  if (action === 'admin_log_action') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const adminUser      = decodeURIComponent(e.parameter.adminUser  || 'unknown');
    const logAction      = decodeURIComponent(e.parameter.logAction  || 'view');
    const userId         = decodeURIComponent(e.parameter.userId     || '');
    const details        = decodeURIComponent(e.parameter.details    || '');

    appendAdminLog(adminUser, logAction, userId, details);
    return createResponse({ success: true });
  }

  // admin_get_metrics — métricas de un usuario específico desde Metricas_Uso
  if (action === 'admin_get_metrics') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const userId = e.parameter.userId || '';

    try {
      const metSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_METRICAS);
      if (!metSheet) return createResponse({ metrics: [], message: 'Hoja Metricas_Uso no encontrada' });

      const data = metSheet.getDataRange().getValues();
      if (data.length <= 1) return createResponse({ metrics: [] });

      const headers = data[0];
      const idCol = headers.indexOf('ID_Medico');

      const metrics = [];
      for (let i = 1; i < data.length; i++) {
        if (userId && String(data[i][idCol]) !== String(userId)) continue;
        const row = {};
        headers.forEach((h, idx) => { row[h] = data[i][idx]; });
        metrics.push(row);
      }

      // Totales
      const totalTranscripciones = metrics.reduce((s, r) => s + (Number(r['Transcripciones_Realizadas']) || 0), 0);
      const totalPalabras         = metrics.reduce((s, r) => s + (Number(r['Palabras_Transcritas'])       || 0), 0);
      const totalMinutos          = metrics.reduce((s, r) => s + (Number(r['Minutos_Audio'])              || 0), 0);

      return createResponse({
        metrics: metrics.slice(-100), // últimas 100 filas
        totals: { transcripciones: totalTranscripciones, palabras: totalPalabras, minutos: totalMinutos }
      });
    } catch(err) {
      return createResponse({ error: 'Error leyendo métricas: ' + err.message });
    }
  }

  // admin_get_global_stats — estadísticas globales de todos los usuarios
  if (action === 'admin_get_global_stats') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    try {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return createResponse({ stats: {} });

      const headers = data[0];
      const estadoCol  = headers.indexOf('Estado');
      const planCol    = headers.indexOf('Plan');
      const usageCol   = headers.indexOf('Usage_Count');
      const fechaCol   = headers.indexOf('Fecha_Registro');

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      let totalUsers = 0, active = 0, inactive = 0, expired = 0, banned = 0, trial = 0, pro = 0, enterprise = 0;
      let totalUsage = 0, newThisWeek = 0;

      for (let i = 1; i < data.length; i++) {
        if (!data[i][0]) continue; // fila vacía
        totalUsers++;
        const estado = String(data[i][estadoCol] || '').toLowerCase();
        const plan   = String(data[i][planCol]   || '').toLowerCase();
        const usage  = Number(data[i][usageCol]  || 0);
        const fecha  = data[i][fechaCol] ? new Date(data[i][fechaCol]) : null;

        if (estado === 'active')   active++;
        else if (estado === 'inactive') inactive++;
        else if (estado === 'expired')  expired++;
        else if (estado === 'banned')   banned++;

        if (plan === 'trial')      trial++;
        else if (plan === 'pro')   pro++;
        else if (plan === 'enterprise') enterprise++;

        totalUsage += usage;
        if (fecha && fecha >= oneWeekAgo) newThisWeek++;
      }

      return createResponse({
        stats: {
          totalUsers, active, inactive, expired, banned,
          trial, pro, enterprise,
          totalTranscripciones: totalUsage,
          newThisWeek
        }
      });
    } catch(err) {
      return createResponse({ error: 'Error calculando estadísticas: ' + err.message });
    }
  }

  // admin_request_diagnostic — marca Diagnostico_Pendiente=true para un usuario
  if (action === 'admin_request_diagnostic') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const userId = e.parameter.userId || '';
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('ID_Medico');
    let diagPendCol = headers.indexOf('Diagnostico_Pendiente');

    // Si la columna no existe aún, crearla al final
    if (diagPendCol === -1) {
      const lastCol = headers.length;
      sheet.getRange(1, lastCol + 1).setValue('Diagnostico_Pendiente');
      diagPendCol = lastCol;
    }

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(userId)) {
        sheet.getRange(i + 1, diagPendCol + 1).setValue('true');
        appendAdminLog('admin', 'request_diagnostic', userId, 'Solicitud de diagnóstico remoto');
        return createResponse({ success: true, message: 'Diagnóstico solicitado para ' + userId });
      }
    }
    return createResponse({ error: 'Usuario no encontrado: ' + userId });
  }

  // ── admin_login — autenticación del panel de administración ───────────────
  if (action === 'admin_login') {
    const adminKey = e.parameter.adminKey;
    if (adminKey !== ADMIN_KEY) return createResponse({ error: 'Unauthorized' });

    const username = (e.parameter.username || '').trim();
    const password = (e.parameter.password || '').trim();

    if (!username || !password) {
      return createResponse({ error: 'Faltan credenciales' });
    }

    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let adminSheet = ss.getSheetByName(SHEET_ADMIN_USERS);

      // Auto-crear la hoja Admin_Users si no existe, con un admin por defecto
      if (!adminSheet) {
        adminSheet = ss.insertSheet(SHEET_ADMIN_USERS);
        adminSheet.appendRow(['Username', 'Password_Hash', 'Nombre', 'Nivel', 'Estado', 'Ultimo_Login']);
        adminSheet.setFrozenRows(1);
        // Admin por defecto — CAMBIAR la contraseña después del primer deploy
        const defaultHash = _simpleHash('admin2026');
        adminSheet.appendRow(['admin', defaultHash, 'Administrador', 'superadmin', 'active', '']);
      }

      const data = adminSheet.getDataRange().getValues();
      const headers = data[0];
      const userCol   = headers.indexOf('Username');
      const passCol   = headers.indexOf('Password_Hash');
      const nombreCol = headers.indexOf('Nombre');
      const nivelCol  = headers.indexOf('Nivel');
      const estadoCol = headers.indexOf('Estado');
      const loginCol  = headers.indexOf('Ultimo_Login');

      const inputHash = _simpleHash(password);

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][userCol]).toLowerCase() === username.toLowerCase()) {
          // Verificar estado
          if (String(data[i][estadoCol]).toLowerCase() !== 'active') {
            appendAdminLog(username, 'login_blocked', username, 'Cuenta inactiva');
            return createResponse({ error: 'Cuenta deshabilitada. Contacte al administrador.' });
          }

          // Verificar contraseña
          if (String(data[i][passCol]) !== inputHash) {
            appendAdminLog(username, 'login_failed', username, 'Contraseña incorrecta');
            return createResponse({ error: 'Usuario o contraseña incorrectos' });
          }

          // Login exitoso — actualizar Ultimo_Login
          if (loginCol !== -1) {
            adminSheet.getRange(i + 1, loginCol + 1).setValue(new Date().toISOString());
          }

          // Generar token de sesión firmado (válido 8 horas)
          const nivel = String(data[i][nivelCol]);
          const expiry = Date.now() + (8 * 60 * 60 * 1000); // 8 horas
          const sessionToken = _signSessionToken(username, nivel, expiry);

          appendAdminLog(username, 'login_success', username, '');

          return createResponse({
            success: true,
            user: {
              Username: data[i][userCol],
              Nombre:   data[i][nombreCol],
              Nivel:    nivel
            },
            sessionToken: sessionToken,
            tokenExpiry: expiry
          });
        }
      }

      appendAdminLog(username, 'login_failed', username, 'Usuario no existe');
      return createResponse({ error: 'Usuario o contraseña incorrectos' });
    } catch(err) {
      return createResponse({ error: 'Error en login: ' + err.message });
    }
  }

  // admin_get_diagnostic — retorna el último diagnóstico guardado de un usuario
  if (action === 'admin_get_diagnostic') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const userId = e.parameter.userId || '';
    try {
      const diagSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_DIAGNOSTICOS);
      if (!diagSheet) return createResponse({ diagnostic: null, message: 'Hoja Diagnosticos no existe aún' });

      const data = diagSheet.getDataRange().getValues();
      if (data.length <= 1) return createResponse({ diagnostic: null });

      const headers = data[0];
      const idCol = headers.indexOf('ID_Medico');

      // Recorrer en reversa para obtener el más reciente
      for (let i = data.length - 1; i >= 1; i--) {
        if (!userId || String(data[i][idCol]) === String(userId)) {
          const row = {};
          headers.forEach((h, idx) => { row[h] = data[i][idx]; });
          let report = {};
          try { report = JSON.parse(row['Report_JSON'] || '{}'); } catch(e) {}
          return createResponse({ diagnostic: { ...row, report } });
        }
      }
      return createResponse({ diagnostic: null });
    } catch(err) {
      return createResponse({ error: 'Error leyendo diagnósticos: ' + err.message });
    }
  }

  // ── admin_generate_config — genera config.js personalizado para un clon ──
  if (action === 'admin_generate_config') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const userId = e.parameter.userId || '';
    if (!userId) return createResponse({ error: 'Falta userId' });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('ID_Medico');

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(userId)) {
        const user = {};
        headers.forEach((h, idx) => { user[h] = data[i][idx]; });

        // Mapear Plan → tipo de config
        const plan = String(user.Plan || 'trial').toLowerCase();
        const planMap = {
          'trial':      { type: 'TRIAL',  hasProMode: false, hasDashboard: false, canGenerateApps: false },
          'normal':     { type: 'NORMAL', hasProMode: false, hasDashboard: false, canGenerateApps: false },
          'pro':        { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: false },
          'enterprise': { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: false }
        };
        const planConfig = planMap[plan] || planMap['trial'];

        // Parsear specialties y allowedTemplates
        let specialties = ['ALL'];
        try {
          const spec = String(user.Especialidad || 'ALL');
          specialties = spec === 'ALL' ? ['ALL'] : spec.split(',').map(s => s.trim());
        } catch(e) {}

        let allowedTemplates = [];
        try {
          const tpl = String(user.Allowed_Templates || '');
          if (tpl && tpl !== 'ALL' && tpl !== '') {
            allowedTemplates = JSON.parse(tpl);
          }
        } catch(e) {}

        const trialDays = plan === 'trial' ? (Number(user.Devices_Max) > 0 ? 7 : 0) : 0;

        const config = {
          medicoId: userId,
          type: planConfig.type,
          status: String(user.Estado || 'active'),
          specialties: specialties,
          maxDevices: Number(user.Devices_Max) || 2,
          trialDays: trialDays,
          hasProMode: planConfig.hasProMode,
          hasDashboard: planConfig.hasDashboard,
          canGenerateApps: planConfig.canGenerateApps,
          allowedTemplates: allowedTemplates,
          doctorName: user.Nombre || '',
          matricula: user.Matricula || '',
          email: user.Email || '',
          backendUrl: ScriptApp.getService().getUrl()
        };

        // Generar el código JavaScript
        const configJS = [
          '/* {{CONFIG_IDENTITY}} */',
          '/* Generado automáticamente — NO EDITAR */',
          '/* Usuario: ' + userId + ' — ' + (user.Nombre || '') + ' */',
          '/* Fecha: ' + new Date().toISOString() + ' */',
          '',
          'window.CLIENT_CONFIG = ' + JSON.stringify(config, null, 4) + ';',
          '',
          "const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';",
          '',
          '// ============ RB-6: CONTEO LOCAL DE USO DE API ============',
          'window.apiUsageTracker = {',
          "    _KEY: 'api_usage_stats',",
          '    _get() {',
          '        try { return JSON.parse(localStorage.getItem(this._KEY)) || this._default(); }',
          '        catch (_) { return this._default(); }',
          '    },',
          '    _default() {',
          "        return { transcriptions: 0, structurings: 0, lastReset: new Date().toISOString(), history: [] };",
          '    },',
          '    _save(data) { localStorage.setItem(this._KEY, JSON.stringify(data)); },',
          '    trackTranscription() {',
          '        const d = this._get();',
          '        d.transcriptions++;',
          "        d.history.push({ type: 'transcription', ts: new Date().toISOString() });",
          '        if (d.history.length > 200) d.history = d.history.slice(-200);',
          '        this._save(d);',
          '    },',
          '    trackStructuring() {',
          '        const d = this._get();',
          '        d.structurings++;',
          "        d.history.push({ type: 'structuring', ts: new Date().toISOString() });",
          '        if (d.history.length > 200) d.history = d.history.slice(-200);',
          '        this._save(d);',
          '    },',
          '    getStats() { return this._get(); },',
          '    reset() { this._save(this._default()); }',
          '};'
        ].join('\n');

        appendAdminLog(auth.username, 'generate_config', userId, 'Plan: ' + plan);

        return createResponse({
          success: true,
          config: config,
          configJS: configJS,
          userId: userId,
          plan: plan
        });
      }
    }
    return createResponse({ error: 'Usuario no encontrado: ' + userId });
  }

  // ── admin_list_registrations — lista registros pendientes de aprobación ──
  if (action === 'admin_list_registrations') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    try {
      const regSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_REGISTROS);
      if (!regSheet) return createResponse({ registrations: [], total: 0, message: 'Hoja ' + SHEET_REGISTROS + ' no existe aún' });

      const data = regSheet.getDataRange().getValues();
      if (data.length <= 1) return createResponse({ registrations: [], total: 0 });

      const headers = data[0];
      const registrations = [];
      for (let i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;
        const reg = {};
        headers.forEach((h, idx) => { reg[h] = data[i][idx]; });
        registrations.push(reg);
      }

      return createResponse({ registrations: registrations, total: registrations.length });
    } catch(err) {
      return createResponse({ error: 'Error leyendo registros: ' + err.message });
    }
  }

  // ── admin_approve_registration — aprueba un registro y crea el usuario ──
  if (action === 'admin_approve_registration') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const regId = e.parameter.regId;
    const plan = e.parameter.plan || 'NORMAL';
    const apiKey = decodeURIComponent(e.parameter.apiKey || '');
    const maxDevices = Number(e.parameter.maxDevices) || 2;
    const allowedTemplates = decodeURIComponent(e.parameter.allowedTemplates || '');

    if (!regId) return createResponse({ error: 'Falta regId' });

    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const regSheet = ss.getSheetByName(SHEET_REGISTROS);
      if (!regSheet) return createResponse({ error: 'Hoja de registros no encontrada' });

      const data = regSheet.getDataRange().getValues();
      const headers = data[0];
      const idCol = headers.indexOf('ID_Registro');
      const estadoCol = headers.indexOf('Estado');

      let regData = null;
      let regRow = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(regId)) {
          regData = {};
          headers.forEach((h, idx) => { regData[h] = data[i][idx]; });
          regRow = i + 1;
          break;
        }
      }
      if (!regData) return createResponse({ error: 'Registro no encontrado: ' + regId });
      if (String(regData.Estado).toLowerCase() === 'aprobado') {
        return createResponse({ error: 'Este registro ya fue aprobado' });
      }

      // Generar ID_Medico (MED + timestamp corto)
      const medicoId = 'MED' + Date.now().toString(36).toUpperCase();

      // Crear usuario en hoja Usuarios
      const userSheet = ss.getSheetByName(SHEET_NAME);
      const userHeaders = userSheet.getDataRange().getValues()[0];

      const now = new Date().toISOString();
      const userData = {
        ID_Medico: medicoId,
        Nombre: regData.Nombre || '',
        Email: regData.Email || '',
        Telefono: regData.Telefono || '',
        Matricula: regData.Matricula || '',
        Especialidad: regData.Especialidades || 'ALL',
        Plan: plan,
        Estado: 'active',
        Fecha_Registro: now,
        API_Key: apiKey,
        Devices_Max: maxDevices,
        Allowed_Templates: allowedTemplates || '',
        Usage_Count: 0,
        Devices_Logged: '[]',
        Diagnostico_Pendiente: 'false',
        Registro_Datos: JSON.stringify({
          workplace: regData.Workplace_Data || '',
          headerColor: regData.Header_Color || '#1a56a0',
          footerText: regData.Footer_Text || '',
          extraWorkplaces: regData.Extra_Workplaces || '',
          proLogo: regData.Pro_Logo ? 'yes' : '',
          firma: regData.Firma ? 'yes' : '',
          logo: regData.Workplace_Logo ? 'yes' : '',
          notas: regData.Notas || '',
          estudios: regData.Estudios || ''
        })
      };

      const userRow = userHeaders.map(h => (userData[h] !== undefined ? userData[h] : ''));
      userSheet.appendRow(userRow);

      // Marcar registro como aprobado
      if (estadoCol !== -1) {
        regSheet.getRange(regRow, estadoCol + 1).setValue('aprobado');
      }
      // Guardar el medicoId asignado
      const medicoIdCol = headers.indexOf('ID_Medico_Asignado');
      if (medicoIdCol !== -1) {
        regSheet.getRange(regRow, medicoIdCol + 1).setValue(medicoId);
      }

      appendAdminLog(auth.username, 'approve_registration', medicoId, 'Reg: ' + regId + ' Plan: ' + plan);

      return createResponse({
        success: true,
        medicoId: medicoId,
        nombre: regData.Nombre,
        email: regData.Email,
        plan: plan,
        message: 'Registro aprobado y usuario creado'
      });
    } catch(err) {
      return createResponse({ error: 'Error aprobando registro: ' + err.message });
    }
  }

  // ── admin_reject_registration — rechaza un registro pendiente ──
  if (action === 'admin_reject_registration') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const regId = e.parameter.regId;
    const motivo = decodeURIComponent(e.parameter.motivo || 'Rechazado por el administrador');
    if (!regId) return createResponse({ error: 'Falta regId' });

    try {
      const regSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_REGISTROS);
      if (!regSheet) return createResponse({ error: 'Hoja de registros no encontrada' });

      const data = regSheet.getDataRange().getValues();
      const headers = data[0];
      const idCol = headers.indexOf('ID_Registro');
      const estadoCol = headers.indexOf('Estado');

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(regId)) {
          if (estadoCol !== -1) regSheet.getRange(i + 1, estadoCol + 1).setValue('rechazado');
          const motivoCol = headers.indexOf('Motivo_Rechazo');
          if (motivoCol !== -1) regSheet.getRange(i + 1, motivoCol + 1).setValue(motivo);
          appendAdminLog(auth.username, 'reject_registration', regId, motivo);
          return createResponse({ success: true, message: 'Registro rechazado' });
        }
      }
      return createResponse({ error: 'Registro no encontrado: ' + regId });
    } catch(err) {
      return createResponse({ error: 'Error rechazando registro: ' + err.message });
    }
  }

  return createResponse({ error: 'Acción no válida' });
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const action = payload.action; // 'update_usage' o 'admin_update_user'

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // save_diagnostic — guarda el diagnóstico del cliente en la hoja Diagnosticos
  if (action === 'save_diagnostic') {
    const id = payload.id || 'unknown';
    const deviceId = payload.deviceId || '';
    const report = payload.report || {};
    const now = new Date().toISOString();

    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let diagSheet = ss.getSheetByName(SHEET_DIAGNOSTICOS);

      // Crear la hoja si no existe con headers
      if (!diagSheet) {
        diagSheet = ss.insertSheet(SHEET_DIAGNOSTICOS);
        diagSheet.appendRow(['ID_Diag', 'ID_Medico', 'Device_ID', 'Timestamp', 'Report_JSON']);
        diagSheet.setFrozenRows(1);
      }

      diagSheet.appendRow([
        'DIAG_' + Date.now(),
        id,
        deviceId,
        now,
        JSON.stringify(report)
      ]);

      return createResponse({ success: true });
    } catch(err) {
      return createResponse({ error: 'Error guardando diagnóstico: ' + err.message });
    }
  }

  // ── register_doctor — registro público de un nuevo profesional ──────────
  if (action === 'register_doctor') {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let regSheet = ss.getSheetByName(SHEET_REGISTROS);

      // Auto-crear la hoja si no existe
      if (!regSheet) {
        regSheet = ss.insertSheet(SHEET_REGISTROS);
        regSheet.appendRow([
          'ID_Registro', 'Nombre', 'Matricula', 'Email', 'Telefono',
          'Especialidades', 'Estudios', 'Workplace_Data', 'Workplace_Logo',
          'Extra_Workplaces', 'Header_Color', 'Footer_Text', 'Firma', 'Pro_Logo',
          'Notas', 'Fecha_Registro', 'Estado', 'Origen', 'ID_Medico_Asignado', 'Motivo_Rechazo'
        ]);
        regSheet.setFrozenRows(1);
      }

      // Verificar email duplicado
      const email = String(payload.email || '').trim().toLowerCase();
      if (!email || !email.includes('@')) {
        return createResponse({ error: 'Email inválido' });
      }

      const existingData = regSheet.getDataRange().getValues();
      const existingHeaders = existingData[0];
      const emailCol = existingHeaders.indexOf('Email');
      const estadoCol = existingHeaders.indexOf('Estado');
      for (let i = 1; i < existingData.length; i++) {
        if (String(existingData[i][emailCol]).toLowerCase() === email) {
          const estado = String(existingData[i][estadoCol]).toLowerCase();
          if (estado === 'pendiente') {
            return createResponse({ error: 'Ya existe un registro pendiente con este email. Te contactaremos pronto.' });
          }
        }
      }

      const regId = 'REG_' + Date.now();
      const workplaceData = JSON.stringify(payload.workplace || {});
      const especialidades = Array.isArray(payload.especialidades) ? payload.especialidades.join(', ') : '';
      const estudios = JSON.stringify(payload.estudios || []);

      // Imágenes: guardar indicador (el base64 completo es muy largo para Sheets)
      // Para logo/firma se guarda truncado o un flag "yes"
      const wpLogo = payload.workplace && payload.workplace.logo ? 'yes' : '';
      const firma = payload.firma ? 'yes' : '';
      const proLogo = payload.proLogo ? 'yes' : '';

      const row = [
        regId,
        payload.nombre || '',
        payload.matricula || '',
        email,
        payload.telefono || '',
        especialidades,
        estudios,
        workplaceData,
        wpLogo,
        payload.extraWorkplaces || '',
        payload.headerColor || '#1a56a0',
        payload.footerText || '',
        firma,
        proLogo,
        payload.notas || '',
        payload.fechaRegistro || new Date().toISOString(),
        'pendiente',
        payload.origen || 'formulario_web',
        '',  // ID_Medico_Asignado (se llena al aprobar)
        ''   // Motivo_Rechazo
      ];

      regSheet.appendRow(row);

      // Notificar al admin por email (opcional, no bloquea)
      try {
        const adminEmail = Session.getEffectiveUser().getEmail();
        if (adminEmail) {
          GmailApp.sendEmail(adminEmail,
            '📋 Nuevo registro: ' + (payload.nombre || 'Sin nombre'),
            'Nuevo profesional registrado:\n' +
            'Nombre: ' + (payload.nombre || '') + '\n' +
            'Email: ' + email + '\n' +
            'Matrícula: ' + (payload.matricula || '') + '\n' +
            'Especialidades: ' + especialidades + '\n\n' +
            'Revisá el panel de administración para aprobar o rechazar.'
          );
        }
      } catch(emailErr) { /* no bloquear si falla el email */ }

      return createResponse({ success: true, regId: regId, message: 'Registro recibido correctamente' });
    } catch(err) {
      return createResponse({ error: 'Error guardando registro: ' + err.message });
    }
  }

  // EXISTING: update usage count + escribe en Metricas_Uso
  if (action === 'update_usage') {
    const id = payload.id;
    const deviceId = payload.deviceId || '';
    const palabras = payload.palabras || 0;
    const minutos = payload.minutos || 0;
    const now = new Date().toISOString();

    // Incrementar Usage_Count en hoja Usuarios
    const idCol = headers.indexOf('ID_Medico');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(id)) {
        const usageIndex = headers.indexOf('Usage_Count') + 1;
        const currentUsage = data[i][headers.indexOf('Usage_Count')] || 0;
        sheet.getRange(i + 1, usageIndex).setValue(Number(currentUsage) + 1);
        break;
      }
    }

    // Escribir fila en Metricas_Uso
    try {
      const metSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_METRICAS);
      if (metSheet) {
        const metHeaders = metSheet.getDataRange().getValues()[0];
        // ID_Metrica, ID_Medico, Fecha, Transcripciones_Realizadas, Palabras_Transcritas, Minutos_Audio, Device_ID, Timestamp
        const metRow = metHeaders.map(h => {
          if (h === 'ID_Metrica') return 'MET_' + Date.now();
          if (h === 'ID_Medico') return id;
          if (h === 'Fecha') return now.split('T')[0];
          if (h === 'Transcripciones_Realizadas') return 1;
          if (h === 'Palabras_Transcritas') return palabras;
          if (h === 'Minutos_Audio') return minutos;
          if (h === 'Device_ID') return deviceId;
          if (h === 'Timestamp') return now;
          return '';
        });
        metSheet.appendRow(metRow);
      }
    } catch(metErr) { /* no interrumpir si falla el log de métricas */ }

    return createResponse({ success: true });
  }

  // send_email — Enviar email (con o sin PDF adjunto)
  if (action === 'send_email') {
    try {
      const to          = payload.to;         // email destinatario
      const subject     = payload.subject;    // asunto
      const htmlBody    = payload.htmlBody;    // cuerpo HTML
      const pdfB64      = payload.pdfBase64;  // PDF en base64 (opcional)
      const pdfFileName = payload.fileName || 'Informe_Medico.pdf';

      if (!to) return createResponse({ error: 'Falta campo obligatorio: to' });

      const emailOptions = {
        htmlBody: htmlBody || '<p>Mensaje de Transcriptor Médico Pro.</p>',
        name: payload.senderName || 'Transcriptor Médico Pro'
      };

      // Solo adjuntar PDF si se proporcionó
      if (pdfB64) {
        const pdfBlob = Utilities.newBlob(
          Utilities.base64Decode(pdfB64),
          'application/pdf',
          pdfFileName
        );
        emailOptions.attachments = [pdfBlob];
      }

      GmailApp.sendEmail(to, subject || 'Transcriptor Médico Pro', '', emailOptions);

      return createResponse({ success: true, message: 'Email enviado correctamente a ' + to });
    } catch(err) {
      return createResponse({ error: 'Error enviando email: ' + err.message });
    }
  }

  // NEW: admin endpoint - update a user's fields (e.g. Estado, Plan)
  if (action === 'admin_update_user') {
    const auth = _verifyAdminAuth(payload);
    if (!auth.authorized) {
      return createResponse({ error: auth.error });
    }

    const userId = payload.userId;
    const updates = payload.updates; // { Estado: 'active', Plan: 'pro', ... }

    const idColPost = headers.indexOf('ID_Medico');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idColPost]) === String(userId)) { // Match ID_Medico
        Object.keys(updates).forEach(key => {
          const colIndex = headers.indexOf(key);
          if (colIndex !== -1) {
            sheet.getRange(i + 1, colIndex + 1).setValue(updates[key]);
          }
        });
        return createResponse({ success: true, message: 'User updated' });
      }
    }

    return createResponse({ error: 'User not found' });
  }

  return createResponse({ error: 'Acción no válida' });
}

/**
 * Genera un token de sesión firmado (HMAC-like usando SHA-256).
 * El token es verificable sin lookup a la base de datos.
 */
function _signSessionToken(username, nivel, expiry) {
  const payload = username.toLowerCase() + '|' + nivel + '|' + String(expiry) + '|' + ADMIN_KEY;
  return _simpleHash(payload);
}

/**
 * Verifica la autorización de un request admin.
 * Acepta DOS métodos (backward compatible):
 *   1. adminKey directo (legacy) — ?adminKey=XXX
 *   2. Token de sesión firmado — ?sessionToken=XXX&sessionUser=YYY&sessionNivel=ZZZ&sessionExpiry=NNN
 * @returns {{ authorized: boolean, error: string|null, username: string }}
 */
function _verifyAdminAuth(params) {
  // Método 1: adminKey directo (legacy — para scripts y tests)
  const adminKey = params.adminKey;
  if (adminKey && adminKey === ADMIN_KEY) {
    return { authorized: true, error: null, username: params.sessionUser || 'admin-key' };
  }

  // Método 2: token de sesión firmado
  const token   = params.sessionToken;
  const user    = (params.sessionUser   || '').toLowerCase();
  const nivel   = params.sessionNivel   || '';
  const expiry  = Number(params.sessionExpiry || 0);

  if (!token || !user || !expiry) {
    return { authorized: false, error: 'Unauthorized — no credentials', username: '' };
  }

  // Verificar expiración
  if (Date.now() > expiry) {
    return { authorized: false, error: 'Session expired', username: user };
  }

  // Verificar firma
  const expected = _signSessionToken(user, nivel, expiry);
  if (token !== expected) {
    return { authorized: false, error: 'Invalid session token', username: user };
  }

  return { authorized: true, error: null, username: user };
}

/**
 * Hash simple para contraseñas de admin (SHA-256 via Apps Script Utilities).
 * NO usar para contraseñas de usuarios finales en producción — usar bcrypt.
 * Para el panel admin con pocos usuarios es suficiente.
 */
function _simpleHash(input) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input);
  return raw.map(function(b) {
    return ('0' + ((b < 0 ? b + 256 : b)).toString(16)).slice(-2);
  }).join('');
}

function createResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Escribe una fila en Admin_Logs.
 * ID_Log, Admin_User, Accion, Usuario_Afectado, Detalles, Timestamp
 */
function appendAdminLog(adminUser, accion, usuarioAfectado, detalles) {
  try {
    const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOGS);
    if (!logSheet) return;
    const headers = logSheet.getDataRange().getValues()[0];
    const now = new Date().toISOString();
    const row = headers.map(h => {
      if (h === 'ID_Log') return 'LOG_' + Date.now();
      if (h === 'Admin_User') return adminUser;
      if (h === 'Accion') return accion;
      if (h === 'Usuario_Afectado') return usuarioAfectado;
      if (h === 'Detalles') return detalles;
      if (h === 'Timestamp') return now;
      return '';
    });
    logSheet.appendRow(row);
  } catch(e) { /* no interrumpir flujo principal si falla el log */ }
}

/**
 * doOptions no es necesario — Google Apps Script maneja CORS automáticamente
 * cuando el script está desplegado con acceso "Cualquier persona".
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}
