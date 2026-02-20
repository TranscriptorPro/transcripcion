/**
 * BACKEND API PARA TRANSCRIPTOR MÉDICO PRO
 * Instrucciones:
 * 1. Crear un Google Sheet con las columnas definidas en GOOGLE_SHEET_SETUP.md
 * 2. Ir a Extensiones -> Apps Script.
 * 3. Pegar este código y cambiar el nombre del proyecto.
 * 4. Implementar como "Aplicación Web" (Cualquier persona, incluso anónima).
 */

const SHEET_NAME = 'Usuarios_Transcriptor';
const CONFIG_SHEET_NAME = 'Medicos_Configuracion';

// TODO: Move admin key to Apps Script Properties for better security:
// PropertiesService.getScriptProperties().getProperty('ADMIN_KEY')
const ADMIN_KEY = 'ADMIN_SECRET_2026';

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
        // Encontramos al médico
        const doctor = {};
        headers.forEach((h, index) => doctor[h] = data[i][index]);

        // Lógica de registro de dispositivos (Punto 29 del task)
        let devices = [];
        try { devices = JSON.parse(doctor.Devices_Logged || '[]'); } catch(e) {}

        if (!devices.includes(deviceId)) {
          devices.push(deviceId);
          sheet.getRange(i + 1, headers.indexOf('Devices_Logged') + 1).setValue(JSON.stringify(devices));
        }

        return createResponse(doctor);
      }
    }

    return createResponse({ error: 'Médico no encontrado' });
  }

  // NEW: admin endpoint - list all users
  if (action === 'admin_list_users') {
    const adminKey = e.parameter.adminKey;
    // TODO: Replace hardcoded key with PropertiesService lookup for production
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

  // GET ?action=get_medico_config&userId=DR001&adminKey=XXX
  if (action === 'get_medico_config') {
    const adminKey = e.parameter.adminKey;
    const userId = e.parameter.userId;

    if (adminKey !== ADMIN_KEY) {
      return createResponse({ error: 'Unauthorized' });
    }

    if (!userId) {
      return createResponse({ error: 'userId is required' });
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET_NAME);
    if (!sheet) {
      return createResponse({ error: 'Configuration sheet not found' });
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        const config = {};
        headers.forEach((header, index) => {
          config[header] = data[i][index];
        });

        try {
          if (config.Especialidades) config.Especialidades = JSON.parse(config.Especialidades);
          if (config.Estudios) config.Estudios = JSON.parse(config.Estudios);
          if (config.Logos_Instituciones) config.Logos_Instituciones = JSON.parse(config.Logos_Instituciones);
          if (config.Config_PDF) config.Config_PDF = JSON.parse(config.Config_PDF);
        } catch (parseError) {
          // Si hay error al parsear, dejar como string
        }

        return createResponse({ success: true, config: config });
      }
    }

    return createResponse({ error: 'Configuration not found for this user' });
  }

  // GET ?action=save_medico_config&userId=DR001&configData=...&adminKey=XXX
  if (action === 'save_medico_config') {
    const adminKey = e.parameter.adminKey;
    const userId = e.parameter.userId;
    const configDataJson = e.parameter.configData;

    if (adminKey !== ADMIN_KEY) {
      return createResponse({ error: 'Unauthorized' });
    }

    if (!userId || !configDataJson) {
      return createResponse({ error: 'userId and configData are required' });
    }

    let configData;
    try {
      configData = JSON.parse(decodeURIComponent(configDataJson));
    } catch (parseErr) {
      return createResponse({ error: 'Invalid JSON in configData' });
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET_NAME);
    if (!sheet) {
      return createResponse({ error: 'Configuration sheet not found' });
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        rowIndex = i;
        break;
      }
    }

    const now = new Date();
    const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');

    if (rowIndex !== -1) {
      headers.forEach((header, index) => {
        if (configData[header] !== undefined) {
          let value = configData[header];
          if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
          }
          sheet.getRange(rowIndex + 1, index + 1).setValue(value);
        }
      });

      const updateColIndex = headers.indexOf('Fecha_Actualizacion');
      if (updateColIndex !== -1) {
        sheet.getRange(rowIndex + 1, updateColIndex + 1).setValue(timestamp);
      }

      return createResponse({ success: true, message: 'Configuration updated' });
    } else {
      const newRow = headers.map(header => {
        if (header === 'ID_Medico') return userId;
        if (header === 'Fecha_Creacion') return Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        if (header === 'Fecha_Actualizacion') return timestamp;

        let value = configData[header] || '';
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        return value;
      });

      sheet.appendRow(newRow);
      return createResponse({ success: true, message: 'Configuration created' });
    }
  }

  // GET ?action=delete_medico_config&userId=DR001&adminKey=XXX
  if (action === 'delete_medico_config') {
    const adminKey = e.parameter.adminKey;
    const userId = e.parameter.userId;

    if (adminKey !== ADMIN_KEY) {
      return createResponse({ error: 'Unauthorized' });
    }

    if (!userId) {
      return createResponse({ error: 'userId is required' });
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG_SHEET_NAME);
    if (!sheet) {
      return createResponse({ error: 'Configuration sheet not found' });
    }

    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        sheet.deleteRow(i + 1);
        return createResponse({ success: true, message: 'Configuration deleted' });
      }
    }

    return createResponse({ error: 'Configuration not found' });
  }

  return createResponse({ error: 'Acción no válida' });
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const action = payload.action; // 'update_usage' o 'admin_update_user'

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // EXISTING: update usage count
  if (action === 'update_usage') {
    const id = payload.id;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == id) {
        const usageIndex = headers.indexOf('Usage_Count') + 1;
        const currentUsage = data[i][headers.indexOf('Usage_Count')] || 0;
        sheet.getRange(i + 1, usageIndex).setValue(Number(currentUsage) + 1);
        return createResponse({ success: true });
      }
    }
  }

  // NEW: admin endpoint - update a user's fields (e.g. Estado, Plan)
  if (action === 'admin_update_user') {
    const adminKey = payload.adminKey;
    // TODO: Replace hardcoded key with PropertiesService lookup for production
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
