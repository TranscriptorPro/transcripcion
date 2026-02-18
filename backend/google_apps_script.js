/**
 * BACKEND API PARA TRANSCRIPTOR MÉDICO PRO
 * Instrucciones:
 * 1. Crear un Google Sheet con las columnas: 
 *    ID_Medico, Nombre, Matricula, Estado, Vencimiento, Plan, Devices_Max, Devices_Logged, Usage_Count
 * 2. Ir a Extensiones -> Apps Script.
 * 3. Pegar este código y cambiar el nombre del proyecto.
 * 4. Implementar como "Aplicación Web" (Cualquier persona, incluso anónima).
 */

const SHEET_NAME = 'Hoja 1';

function doGet(e) {
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

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const action = payload.action; // 'update_usage' o 'admin_update'
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
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

  // Aquí se pueden agregar más acciones para el Admin Dashboard
  return createResponse({ error: 'Acción no válida' });
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
