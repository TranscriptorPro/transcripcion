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
const SHEET_NAME      = 'Usuarios';
const SHEET_METRICAS  = 'Metricas_Uso';
const SHEET_DEVICES   = 'Dispositivos';
const SHEET_LOGS         = 'Admin_Logs';
const SHEET_DIAGNOSTICOS = 'Diagnosticos';

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

  // EXISTING: user validation (keep as-is)
  if (!action || action === 'validate') {
    const id = e.parameter.id;
    const deviceId = e.parameter.deviceId;

    if (!id) return createResponse({ error: 'Falta ID de Médico' });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('ID_Medico'); // buscar el índice real, no asumir columna 0

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(id)) {
        const doctor = {};
        headers.forEach((h, index) => doctor[h] = data[i][index]);

        // Actualizar Devices_Logged en hoja Usuarios
        let devices = [];
        try { devices = JSON.parse(doctor.Devices_Logged || '[]'); } catch(e) {}
        const isNewDevice = !devices.includes(deviceId);
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
              const devHeaders = devData[0]; // ID_Device, ID_Medico, Device_Name, Device_Type, OS_Version, Fecha_Registro, Ultima_Conexion, Estado
              const now = new Date().toISOString();
              let found = false;
              for (let d = 1; d < devData.length; d++) {
                if (String(devData[d][0]) === String(deviceId)) {
                  // Actualizar Ultima_Conexion
                  devSheet.getRange(d + 1, devHeaders.indexOf('Ultima_Conexion') + 1).setValue(now);
                  found = true;
                  break;
                }
              }
              if (!found) {
                // Nuevo dispositivo: crear fila
                const devRow = devHeaders.map(h => {
                  if (h === 'ID_Device') return deviceId;
                  if (h === 'ID_Medico') return id;
                  if (h === 'Fecha_Registro') return now;
                  if (h === 'Ultima_Conexion') return now;
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

        return createResponse(doctor);
      }
    }

    return createResponse({ error: 'Médico no encontrado' });
  }

  // NEW: admin endpoint - list all users
  if (action === 'admin_list_users') {
    const adminKey = e.parameter.adminKey;
    if (adminKey !== ADMIN_KEY) {
      return createResponse({ error: 'Unauthorized' });
    }

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
    const adminKey = e.parameter.adminKey;
    if (adminKey !== ADMIN_KEY) return createResponse({ error: 'Unauthorized' });

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
    const adminKey = e.parameter.adminKey;
    if (adminKey !== ADMIN_KEY) return createResponse({ error: 'Unauthorized' });

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
    const adminKey = e.parameter.adminKey;
    if (adminKey !== ADMIN_KEY) return createResponse({ error: 'Unauthorized' });

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
    const adminKey = e.parameter.adminKey;
    if (adminKey !== ADMIN_KEY) return createResponse({ error: 'Unauthorized' });

    const adminUser      = decodeURIComponent(e.parameter.adminUser  || 'unknown');
    const logAction      = decodeURIComponent(e.parameter.logAction  || 'view');
    const userId         = decodeURIComponent(e.parameter.userId     || '');
    const details        = decodeURIComponent(e.parameter.details    || '');

    appendAdminLog(adminUser, logAction, userId, details);
    return createResponse({ success: true });
  }

  // admin_get_metrics — métricas de un usuario específico desde Metricas_Uso
  if (action === 'admin_get_metrics') {
    const adminKey = e.parameter.adminKey;
    if (adminKey !== ADMIN_KEY) return createResponse({ error: 'Unauthorized' });

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
    const adminKey = e.parameter.adminKey;
    if (adminKey !== ADMIN_KEY) return createResponse({ error: 'Unauthorized' });

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
    const adminKey = e.parameter.adminKey;
    if (adminKey !== ADMIN_KEY) return createResponse({ error: 'Unauthorized' });

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

  // admin_get_diagnostic — retorna el último diagnóstico guardado de un usuario
  if (action === 'admin_get_diagnostic') {
    const adminKey = e.parameter.adminKey;
    if (adminKey !== ADMIN_KEY) return createResponse({ error: 'Unauthorized' });

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

  // send_email — Enviar informe por email al paciente con PDF adjunto
  if (action === 'send_email') {
    try {
      const to          = payload.to;         // email destinatario
      const subject     = payload.subject;    // asunto
      const htmlBody    = payload.htmlBody;    // cuerpo HTML
      const pdfB64      = payload.pdfBase64;  // PDF en base64
      const pdfFileName = payload.fileName || 'Informe_Medico.pdf';

      if (!to || !pdfB64) return createResponse({ error: 'Faltan campos obligatorios (to, pdfBase64)' });

      // Decodificar base64 a blob
      const pdfBlob = Utilities.newBlob(
        Utilities.base64Decode(pdfB64),
        'application/pdf',
        pdfFileName
      );

      GmailApp.sendEmail(to, subject || 'Informe Médico', '', {
        htmlBody: htmlBody || '<p>Adjunto su informe médico.</p>',
        attachments: [pdfBlob],
        name: payload.senderName || 'Transcriptor Médico Pro'
      });

      return createResponse({ success: true, message: 'Email enviado correctamente a ' + to });
    } catch(err) {
      return createResponse({ error: 'Error enviando email: ' + err.message });
    }
  }

  // NEW: admin endpoint - update a user's fields (e.g. Estado, Plan)
  if (action === 'admin_update_user') {
    const adminKey = payload.adminKey;
    if (adminKey !== ADMIN_KEY) {
      return createResponse({ error: 'Unauthorized' });
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
