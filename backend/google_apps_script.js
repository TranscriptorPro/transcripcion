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
const SHEET_LOGS      = 'Admin_Logs';

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

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == id) {
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

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(userId)) {
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

  return createResponse({ error: 'Acción no válida' });
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const action = payload.action; // 'update_usage' o 'admin_update_user'

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // EXISTING: update usage count + escribe en Metricas_Uso
  if (action === 'update_usage') {
    const id = payload.id;
    const deviceId = payload.deviceId || '';
    const palabras = payload.palabras || 0;
    const minutos = payload.minutos || 0;
    const now = new Date().toISOString();

    // Incrementar Usage_Count en hoja Usuarios
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == id) {
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

  // NEW: admin endpoint - update a user's fields (e.g. Estado, Plan)
  if (action === 'admin_update_user') {
    const adminKey = payload.adminKey;
    if (adminKey !== ADMIN_KEY) {
      return createResponse({ error: 'Unauthorized' });
    }

    const userId = payload.userId;
    const updates = payload.updates; // { Estado: 'active', Plan: 'pro', ... }

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) { // Match ID_Medico
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
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
 * Maneja peticiones OPTIONS para CORS preflight
 * Requerido para que funcionen las peticiones POST desde otros dominios
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400'); // Cache preflight por 24 horas
}
