/**
 * BACKEND API PARA TRANSCRIPTOR MÉDICO PRO
 * Instrucciones:
 * 1. Crear un Google Sheet con las columnas definidas en GOOGLE_SHEET_SETUP.md
 * 2. Ir a Extensiones -> Apps Script.
 * 3. Pegar este código y cambiar el nombre del proyecto.
 * 4. Implementar como "Aplicación Web" (Cualquier persona, incluso anónima).
 */

const SHEET_NAME = 'Usuarios_Transcriptor';

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
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
