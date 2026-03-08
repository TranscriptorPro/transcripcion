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
    _ensureUsuariosHeaders(sheet);
    const headers = sheet.getDataRange().getValues()[0];

    // Verificar que el ID no exista ya
    const existing = sheet.getDataRange().getValues();
    for (let i = 1; i < existing.length; i++) {
      if (String(existing[i][headers.indexOf('ID_Medico')]) === String(userData.ID_Medico)) {
        return createResponse({ error: 'ID_Medico ya existe: ' + userData.ID_Medico });
      }
    }

    // Construir fila siguiendo el orden de los headers
    const row = headers.map(h => (userData[h] !== undefined ? userData[h] : ''));
    sheet.appendRow(row);
    appendAdminLog('admin', 'create_user', userData.ID_Medico, userData.Nombre || '');
    return createResponse({ success: true, userId: userData.ID_Medico });
  }

  // setup_sheets — inicializa (o repara) las cabeceras de todas las hojas
  if (action === 'setup_sheets') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });
    const result = _setupAllSheets();
    return createResponse({ success: true, result: result });
  }

  // admin_delete_test_users — elimina filas cuyos ID_Medico coincidan con los IDs de prueba
  if (action === 'admin_delete_test_users') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('ID_Medico');
    const testPrefixes = ['GIFTDR_TEST', 'NORMDR_TEST', 'PRODR_TEST', 'CLINICDR_TEST', 'TRIALDR_TEST'];

    let deleted = 0;
    // Recorrer en reversa para no afectar índices al borrar
    for (let i = data.length - 1; i >= 1; i--) {
      const id = String(data[i][idCol] || '');
      if (!id || testPrefixes.some(p => id.startsWith(p))) {
        sheet.deleteRow(i + 1);
        deleted++;
      }
    }
    appendAdminLog(auth.username, 'delete_test_users', 'bulk', 'Deleted: ' + deleted);
    return createResponse({ success: true, deleted: deleted });
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
          'enterprise': { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: false },
          'gift':       { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: false },
          'clinic':     { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: true  }
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
    const apiKey   = decodeURIComponent(e.parameter.apiKey   || '');
    const apiKeyB1 = decodeURIComponent(e.parameter.apiKeyB1 || '');
    const apiKeyB2 = decodeURIComponent(e.parameter.apiKeyB2 || '');
    const maxDevices = Number(e.parameter.maxDevices) || 2;
    const allowedTemplates = decodeURIComponent(e.parameter.allowedTemplates || '');
    // Campos corregidos/editados por el admin en el modal de aprobación (anulan los del formulario)
    const editedNombre      = e.parameter.editedNombre      ? decodeURIComponent(e.parameter.editedNombre)          : null;
    const editedMatricula   = e.parameter.editedMatricula   ? decodeURIComponent(e.parameter.editedMatricula)       : null;
    const editedEmail       = e.parameter.editedEmail       ? decodeURIComponent(e.parameter.editedEmail)           : null;
    const editedTelefono    = e.parameter.editedTelefono    ? decodeURIComponent(e.parameter.editedTelefono)        : null;
    const editedEsp         = e.parameter.editedEspecialidades ? decodeURIComponent(e.parameter.editedEspecialidades) : null;
    const editedNotas       = e.parameter.editedNotas       ? decodeURIComponent(e.parameter.editedNotas)           : null;
    const editedHeaderColor = e.parameter.editedHeaderColor ? decodeURIComponent(e.parameter.editedHeaderColor)     : null;
    const editedFooterText  = e.parameter.editedFooterText  ? decodeURIComponent(e.parameter.editedFooterText)      : null;
    const editedWorkplace   = e.parameter.editedWorkplace   ? decodeURIComponent(e.parameter.editedWorkplace)       : null;

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

      // Leer imágenes reales desde Drive (si fueron guardadas en el registro)
      let driveImages = {};
      const firmaVal = String(regData.Firma || '');
      if (firmaVal.startsWith('drive:')) {
        const fileId = firmaVal.replace('drive:', '');
        driveImages = _getImagesFromDrive(fileId);
      }

      const userData = {
        ID_Medico: medicoId,
        Nombre:       (editedNombre     || regData.Nombre       || '').trim(),
        Email:        (editedEmail      || regData.Email        || '').trim().toLowerCase(),
        Telefono:     (editedTelefono   || regData.Telefono     || '').trim(),
        Matricula:    (editedMatricula  || regData.Matricula    || '').trim(),
        Especialidad: (editedEsp        || regData.Especialidades || 'ALL').trim(),
        Plan: plan,
        Estado: 'active',
        Fecha_Registro: now,
        API_Key: apiKey,
        API_Key_B1: apiKeyB1,
        API_Key_B2: apiKeyB2,
        Devices_Max: maxDevices,
        Allowed_Templates: allowedTemplates || '',
        Usage_Count: 0,
        Devices_Logged: '[]',
        Diagnostico_Pendiente: 'false',
        Registro_Datos: JSON.stringify({
          workplace:       editedWorkplace   || regData.Workplace_Data  || '',
          headerColor:     editedHeaderColor || regData.Header_Color    || '#1a56a0',
          footerText:      editedFooterText  || regData.Footer_Text     || '',
          extraWorkplaces: regData.Extra_Workplaces || '',
          proLogo:         driveImages.proLogo     || '',
          firma:           driveImages.firma       || '',
          logo:            regData.Workplace_Logo  ? 'yes' : '',
          notas:           editedNotas || regData.Notas || '',
          estudios:        regData.Estudios        || '',
          profesionales:   regData.Profesionales   || '',
          apiKeyB1:        apiKeyB1,
          apiKeyB2:        apiKeyB2
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

  // ── admin_get_registration_images — devuelve imágenes base64 desde Drive ──
  if (action === 'admin_get_registration_images') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const driveRef = e.parameter.driveRef || '';
    if (!driveRef.startsWith('drive:')) return createResponse({ error: 'driveRef inválido' });

    const fileId = driveRef.replace('drive:', '');
    const images = _getImagesFromDrive(fileId);
    return createResponse({ success: true, images: images });
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

  // ── admin_approve_registration via POST (soporta payloads grandes con imágenes base64) ──
  if (action === 'admin_approve_registration') {
    const auth = _verifyAdminAuth(payload);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const regId = payload.regId;
    const plan = payload.plan || 'NORMAL';
    const apiKey   = payload.apiKey   || '';
    const apiKeyB1 = payload.apiKeyB1 || '';
    const apiKeyB2 = payload.apiKeyB2 || '';
    const maxDevices = Number(payload.maxDevices) || 2;
    const allowedTemplates = payload.allowedTemplates || '';
    const editedNombre      = payload.editedNombre      || null;
    const editedMatricula   = payload.editedMatricula   || null;
    const editedEmail       = payload.editedEmail       || null;
    const editedTelefono    = payload.editedTelefono    || null;
    const editedEsp         = payload.editedEspecialidades || null;
    const editedNotas       = payload.editedNotas       || null;
    const editedHeaderColor = payload.editedHeaderColor || null;
    const editedFooterText  = payload.editedFooterText  || null;
    const editedWorkplace   = payload.editedWorkplace   || null;
    const editedExtraWps    = payload.editedExtraWorkplaces || null;
    const editedFirma       = payload.editedFirma       || null;
    const editedProLogo     = payload.editedProLogo     || null;

    if (!regId) return createResponse({ error: 'Falta regId' });

    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const regSheet = ss.getSheetByName(SHEET_REGISTROS);
      if (!regSheet) return createResponse({ error: 'Hoja de registros no encontrada' });

      const regData_ = regSheet.getDataRange().getValues();
      const regHeaders = regData_[0];
      const idCol = regHeaders.indexOf('ID_Registro');
      const estadoCol = regHeaders.indexOf('Estado');

      let regData = null;
      let regRow = -1;
      for (let i = 1; i < regData_.length; i++) {
        if (String(regData_[i][idCol]) === String(regId)) {
          regData = {};
          regHeaders.forEach((h, idx) => { regData[h] = regData_[i][idx]; });
          regRow = i + 1;
          break;
        }
      }
      if (!regData) return createResponse({ error: 'Registro no encontrado: ' + regId });
      if (String(regData.Estado).toLowerCase() === 'aprobado') {
        return createResponse({ error: 'Este registro ya fue aprobado' });
      }

      const medicoId = 'MED' + Date.now().toString(36).toUpperCase();

      const userSheet = ss.getSheetByName(SHEET_NAME);
      _ensureUsuariosHeaders(userSheet);
      const userHeaders = userSheet.getDataRange().getValues()[0];
      const now = new Date().toISOString();

      // Leer imágenes originales desde Drive
      let driveImages = {};
      const firmaVal = String(regData.Firma || '');
      if (firmaVal.startsWith('drive:')) {
        const fileId = firmaVal.replace('drive:', '');
        driveImages = _getImagesFromDrive(fileId);
      }

      // Si el admin editó imágenes, guardarlas en Drive (reemplaza las originales)
      const finalFirma   = editedFirma   || driveImages.firma   || '';
      const finalProLogo  = editedProLogo || driveImages.proLogo || '';

      const userData = {
        ID_Medico: medicoId,
        Nombre:       (editedNombre     || regData.Nombre       || '').trim(),
        Email:        (editedEmail      || regData.Email        || '').trim().toLowerCase(),
        Telefono:     (editedTelefono   || regData.Telefono     || '').trim(),
        Matricula:    (editedMatricula  || regData.Matricula    || '').trim(),
        Especialidad: (editedEsp        || regData.Especialidades || 'ALL').trim(),
        Plan: plan,
        Estado: 'active',
        Fecha_Registro: now,
        API_Key: apiKey,
        API_Key_B1: apiKeyB1,
        API_Key_B2: apiKeyB2,
        Devices_Max: maxDevices,
        Allowed_Templates: allowedTemplates || '',
        Usage_Count: 0,
        Devices_Logged: '[]',
        Diagnostico_Pendiente: 'false',
        Registro_Datos: JSON.stringify({
          workplace:       editedWorkplace   || regData.Workplace_Data  || '',
          headerColor:     editedHeaderColor || regData.Header_Color    || '#1a56a0',
          footerText:      editedFooterText  || regData.Footer_Text     || '',
          extraWorkplaces: editedExtraWps    || regData.Extra_Workplaces || '',
          proLogo:         finalProLogo,
          firma:           finalFirma,
          logo:            regData.Workplace_Logo ? 'yes' : '',
          notas:           editedNotas || regData.Notas || '',
          estudios:        regData.Estudios        || '',
          profesionales:   regData.Profesionales   || '',
          apiKeyB1:        apiKeyB1,
          apiKeyB2:        apiKeyB2
        })
      };

      const userRow = userHeaders.map(h => (userData[h] !== undefined ? userData[h] : ''));
      userSheet.appendRow(userRow);

      if (estadoCol !== -1) regSheet.getRange(regRow, estadoCol + 1).setValue('aprobado');
      const medicoIdCol = regHeaders.indexOf('ID_Medico_Asignado');
      if (medicoIdCol !== -1) regSheet.getRange(regRow, medicoIdCol + 1).setValue(medicoId);

      appendAdminLog(auth.username, 'approve_registration', regId, medicoId + ' / ' + plan);

      return createResponse({
        success: true, medicoId: medicoId,
        nombre: userData.Nombre, email: userData.Email,
        plan: plan, message: 'Registro aprobado y usuario creado'
      });
    } catch(err) {
      return createResponse({ error: 'Error aprobando registro: ' + err.message });
    }
  }

  // ── admin_create_user via POST (soporta payloads grandes con imágenes base64) ──
  if (action === 'admin_create_user') {
    // Auth check: sessionToken, sessionUser, sessionNivel, sessionExpiry from payload
    const authParam = {
      sessionToken:  payload.sessionToken  || '',
      sessionUser:   payload.sessionUser   || '',
      sessionNivel:  payload.sessionNivel  || '',
      sessionExpiry: payload.sessionExpiry || ''
    };
    const auth = _verifyAdminAuth(authParam);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const userData = payload.userData || {};
    if (!userData.ID_Medico) return createResponse({ error: 'Falta ID_Medico' });

    _ensureUsuariosHeaders(sheet);
    const freshHeaders = sheet.getDataRange().getValues()[0];

    // Verificar que el ID no exista ya
    const freshData = sheet.getDataRange().getValues();
    const idColPost = freshHeaders.indexOf('ID_Medico');
    for (let i = 1; i < freshData.length; i++) {
      if (String(freshData[i][idColPost]) === String(userData.ID_Medico)) {
        return createResponse({ error: 'ID_Medico ya existe: ' + userData.ID_Medico });
      }
    }

    // Construir fila siguiendo el orden de los headers
    const row = freshHeaders.map(h => (userData[h] !== undefined ? userData[h] : ''));
    sheet.appendRow(row);
    appendAdminLog(payload.sessionUser || 'admin', 'create_user', userData.ID_Medico, userData.Nombre || '');
    return createResponse({ success: true, userId: userData.ID_Medico });
  }

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
          'Notas', 'Fecha_Registro', 'Estado', 'Origen', 'ID_Medico_Asignado', 'Motivo_Rechazo',
          'Plan_Solicitado', 'Addons_Cart', 'Profesionales'
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

      // Agregar columnas Plan_Solicitado, Addons_Cart y Profesionales si no existen (sheets pre-existentes)
      const workingHeaders = existingHeaders.slice();
      ['Plan_Solicitado', 'Addons_Cart', 'Profesionales'].forEach(function(col) {
        if (!workingHeaders.includes(col)) {
          regSheet.getRange(1, workingHeaders.length + 1).setValue(col);
          workingHeaders.push(col);
        }
      });

      const regId = 'REG_' + Date.now();
      const especialidades = Array.isArray(payload.especialidades) ? payload.especialidades.join(', ') : '';
      const estudios = JSON.stringify(payload.estudios || []);

      // Imágenes: firma, logo profesional Y logos de workplaces se guardan en
      // Drive (el base64 es demasiado largo para una celda de Sheets — 50 K chars).
      const imagesToSave = {};
      if (payload.firma)   imagesToSave.firma   = payload.firma;
      if (payload.proLogo) imagesToSave.proLogo = payload.proLogo;

      // Extraer logo del workplace principal antes de serializar
      var wpClean = payload.workplace ? JSON.parse(JSON.stringify(payload.workplace)) : {};
      const wpLogo = wpClean.logo ? 'yes' : '';
      if (wpClean.logo && typeof wpClean.logo === 'string' && wpClean.logo.length > 100) {
        imagesToSave.instLogo = wpClean.logo;
        wpClean.logo = 'drive'; // flag: guardado en Drive
      }
      const workplaceData = JSON.stringify(wpClean);

      // Extraer logos de workplaces extra
      var extraWpsClean = payload.extraWorkplaces || '';
      if (extraWpsClean) {
        try {
          var extras = JSON.parse(extraWpsClean);
          if (Array.isArray(extras)) {
            extras.forEach(function(wp, i) {
              if (wp.logo && typeof wp.logo === 'string' && wp.logo.length > 100) {
                imagesToSave['extraLogo_' + i] = wp.logo;
                wp.logo = 'drive';
              }
            });
            extraWpsClean = JSON.stringify(extras);
          }
        } catch(_) { /* mantener original */ }
      }

      let firma   = '';
      let proLogo = '';
      var wpLogoRef = wpLogo; // 'yes' or ''

      if (Object.keys(imagesToSave).length > 0) {
        try {
          const driveFileId = _saveImagesToDrive(regId, imagesToSave);
          firma   = payload.firma   ? 'drive:' + driveFileId : '';
          proLogo = payload.proLogo ? 'drive:' + driveFileId : '';
          // Guardar referencia Drive en Workplace_Logo si se guardó instLogo
          if (imagesToSave.instLogo) wpLogoRef = 'drive:' + driveFileId;
        } catch(driveErr) {
          firma   = payload.firma   ? 'yes' : '';
          proLogo = payload.proLogo ? 'yes' : '';
          Logger.log('⚠️ Error guardando imágenes en Drive: ' + driveErr.message);
        }
      }

      // Construir fila mapeando por headers para compatibilidad con sheets existentes
      const rowData = {
        ID_Registro:        regId,
        Nombre:             payload.nombre || '',
        Matricula:          payload.matricula || '',
        Email:              email,
        Telefono:           payload.telefono || '',
        Especialidades:     especialidades,
        Estudios:           estudios,
        Workplace_Data:     workplaceData,
        Workplace_Logo:     wpLogoRef,
        Extra_Workplaces:   extraWpsClean,
        Header_Color:       payload.headerColor || '#1a56a0',
        Footer_Text:        payload.footerText || '',
        Firma:              firma,
        Pro_Logo:           proLogo,
        Notas:              payload.notas || '',
        Fecha_Registro:     payload.fechaRegistro || new Date().toISOString(),
        Estado:             'pendiente',
        Origen:             payload.origen || 'formulario_web',
        ID_Medico_Asignado: '',
        Motivo_Rechazo:     '',
        Plan_Solicitado:    payload.planSeleccionado || '',
        Addons_Cart:        payload.addons || '',
        Profesionales:      payload.profesionales || ''
      };
      const row = workingHeaders.map(function(h) { return rowData[h] !== undefined ? rowData[h] : ''; });

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

// ── Helpers de Google Drive ──────────────────────────────────────────────────

/**
 * Obtiene (o crea) la carpeta 'Datos_Transcriptor' en Mi Unidad de Drive.
 * @returns {Folder}
 */
function _getDataFolder() {
  const FOLDER_NAME = 'Datos_Transcriptor';
  const found = DriveApp.getFoldersByName(FOLDER_NAME);
  return found.hasNext() ? found.next() : DriveApp.createFolder(FOLDER_NAME);
}

/**
 * Guarda las imágenes de un registro como un único archivo JSON en Drive.
 * @param {string} regId  - ID del registro (nombre del archivo)
 * @param {object} images - { firma, proLogo } con valores base64
 * @returns {string} fileId de Drive
 */
function _saveImagesToDrive(regId, images) {
  const folder   = _getDataFolder();
  const filename = regId + '_images.json';
  // Si ya existe un archivo previo del mismo registro, moverlo a la papelera
  const existing = folder.getFilesByName(filename);
  while (existing.hasNext()) existing.next().setTrashed(true);
  const file = folder.createFile(filename, JSON.stringify(images), MimeType.PLAIN_TEXT);
  return file.getId();
}

/**
 * Lee el JSON de imágenes de un registro desde Drive.
 * @param {string} fileId - ID del archivo de Drive
 * @returns {object}     - { firma, proLogo, ... } o {} si no se puede leer
 */
function _getImagesFromDrive(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    return JSON.parse(file.getBlob().getDataAsString()) || {};
  } catch(e) {
    return {};
  }
}

/**
 * ════════════════════════════════════════════════════════════════════
 * FUNCIÓN DE CONFIGURACIÓN — ejecutar UNA sola vez desde el editor
 * ════════════════════════════════════════════════════════════════════
 * Crea la carpeta 'Datos_Transcriptor' en Mi Unidad y mueve el
 * Spreadsheet activo a esa carpeta (el ID del Sheet NO cambia, la URL
 * del script desplegado NO cambia — es una reorganización visual).
 *
 * Cómo usarla:
 *   1. Abrí el editor de Apps Script (Extensiones → Apps Script)
 *   2. En el desplegable de funciones, elegí 'setupDriveFolder'
 *   3. Hacé clic en ▶ Ejecutar
 *   4. Revisá el Log (Ver → Registros) para confirmar
 */
function setupDriveFolder() {
  const folder     = _getDataFolder();
  const folderId   = folder.getId();
  const folderUrl  = folder.getUrl();
  Logger.log('✅ Carpeta lista: ' + folderUrl);

  // Mover el Spreadsheet — operación segura: no cambia el ID ni la URL del script
  try {
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    const file = DriveApp.getFileById(ss.getId());
    file.moveTo(folder);
    Logger.log('✅ Spreadsheet movido a Datos_Transcriptor.');
    Logger.log('   URL del Sheet: ' + ss.getUrl());
  } catch(moveErr) {
    Logger.log('⚠️  No se pudo mover el Sheet (puede que ya esté en la carpeta): ' + moveErr.message);
  }

  Logger.log('ID carpeta: ' + folderId);
  return { success: true, folderId: folderId, folderUrl: folderUrl };
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

// ── Helpers de inicialización de hojas ──────────────────────────────────────

const USUARIOS_HEADERS = [
  'ID_Medico','Nombre','Matricula','Email','Telefono','Especialidad',
  'Plan','Estado','Fecha_Registro','Fecha_Vencimiento',
  'API_Key','API_Key_B1','API_Key_B2',
  'Devices_Max','Devices_Logged','Allowed_Templates',
  'Usage_Count','Diagnostico_Pendiente','Notas_Admin','Registro_Datos'
];

/**
 * Asegura que la hoja Usuarios tenga todos los headers requeridos.
 * Si la primera fila está vacía o incompleta, la inicializa o agrega las columnas faltantes.
 * @param {Sheet} sheet
 */
function _ensureUsuariosHeaders(sheet) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  const existing = values[0] || [];
  const firstCell = String(existing[0] || '').trim();

  if (!firstCell) {
    // Sheet completamente vacío — escribir headers
    sheet.clearContents();
    sheet.appendRow(USUARIOS_HEADERS);
    sheet.setFrozenRows(1);
    return;
  }

  // Agregar columnas faltantes al final
  USUARIOS_HEADERS.forEach(function(h) {
    if (!existing.includes(h)) {
      sheet.getRange(1, existing.length + 1).setValue(h);
      existing.push(h);
    }
  });
}

/**
 * Inicializa (o repara) los headers de todas las hojas del sistema.
 * Ejecutar una vez después de hacer cambios en la estructura.
 */
function _setupAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = [];

  // Usuarios
  const userSheet = ss.getSheetByName(SHEET_NAME);
  if (userSheet) {
    _ensureUsuariosHeaders(userSheet);
    result.push('Usuarios: OK');
  } else {
    result.push('Usuarios: no encontrada');
  }

  // Metricas_Uso
  const metSheet = ss.getSheetByName(SHEET_METRICAS);
  if (!metSheet) {
    const s = ss.insertSheet(SHEET_METRICAS);
    s.appendRow(['ID_Metrica','ID_Medico','Fecha','Transcripciones_Realizadas','Palabras_Transcritas','Minutos_Audio','Device_ID','Timestamp']);
    s.setFrozenRows(1);
    result.push('Metricas_Uso: creada');
  } else { result.push('Metricas_Uso: OK'); }

  // Dispositivos
  const devSheet = ss.getSheetByName(SHEET_DEVICES);
  if (!devSheet) {
    const s = ss.insertSheet(SHEET_DEVICES);
    s.appendRow(['ID_Device','ID_Medico','Device_Name','Device_Type','OS_Version','Fecha_Registro','Ultima_Conexion','Estado']);
    s.setFrozenRows(1);
    result.push('Dispositivos: creada');
  } else { result.push('Dispositivos: OK'); }

  // Admin_Logs
  const logSheet = ss.getSheetByName(SHEET_LOGS);
  if (!logSheet) {
    const s = ss.insertSheet(SHEET_LOGS);
    s.appendRow(['ID_Log','Admin_User','Accion','Usuario_Afectado','Detalles','Timestamp']);
    s.setFrozenRows(1);
    result.push('Admin_Logs: creada');
  } else { result.push('Admin_Logs: OK'); }

  // Registros_Pendientes
  const regSheet = ss.getSheetByName(SHEET_REGISTROS);
  if (!regSheet) {
    const s = ss.insertSheet(SHEET_REGISTROS);
    s.appendRow([
      'ID_Registro','Nombre','Matricula','Email','Telefono',
      'Especialidades','Estudios','Workplace_Data','Workplace_Logo',
      'Extra_Workplaces','Header_Color','Footer_Text','Firma','Pro_Logo',
      'Notas','Fecha_Registro','Estado','Origen','ID_Medico_Asignado','Motivo_Rechazo',
      'Plan_Solicitado','Addons_Cart'
    ]);
    s.setFrozenRows(1);
    result.push('Registros_Pendientes: creada');
  } else { result.push('Registros_Pendientes: OK'); }

  return result;
}
