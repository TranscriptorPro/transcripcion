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
const SHEET_REGISTROS       = 'Registros_Pendientes';
const SHEET_PROFESIONALES   = 'Profesionales_Clinica';
const SHEET_SOPORTE         = 'Solicitudes_Soporte';
const SHEET_COMPRAS         = 'Compras_Pendientes';
const PROP_PLANS_CONFIG     = 'PLANS_CONFIG_JSON';
const PROP_ADDONS_CONFIG    = 'ADDONS_CONFIG_JSON';
const PROP_PAYMENT_CONFIG   = 'PAYMENT_CONFIG_JSON';
const ADMIN_CACHE_TTL_SEC   = 25;

// SECURITY: Read from Apps Script Script Properties (not hardcoded).
// In Apps Script editor: File > Project Properties > Script Properties > Add: ADMIN_KEY = <your-secret>
const ADMIN_KEY = (function() {
  try {
    return PropertiesService.getScriptProperties().getProperty('ADMIN_KEY') || 'CHANGE_ME_IN_PROPERTIES';
  } catch(e) {
    return 'CHANGE_ME_IN_PROPERTIES';
  }
})();

function _defaultPlansConfig() {
  return {
    trial: {
      key: 'trial',
      label: 'Trial',
      icon: '🧪',
      price: 'Gratis',
      period: '15 días',
      monthly: 0,
      annual: 0,
      features: ['Todo de Pro por 15 días'],
      type: 'TRIAL',
      hasProMode: true,
      hasDashboard: false,
      canGenerateApps: false,
      maxDevices: 3,
      durationDays: 15,
      historial: 30,
      workplaces: 2,
      outputProfiles: 3,
      maxProfessionals: 1,
      templateMode: 'manual',
      templateLimit: 3,
      packLimit: 0,
      specialtyExtraLimit: 0,
      pdfLogo: true,
      pdfColor: false
    },
    normal: {
      key: 'normal',
      label: 'Normal',
      icon: '📝',
      price: '$102.99',
      period: 'pago único + $10/mes',
      monthly: 10,
      annual: 100,
      features: ['Transcripción de audio'],
      type: 'NORMAL',
      hasProMode: false,
      hasDashboard: false,
      canGenerateApps: false,
      maxDevices: 1,
      durationDays: 30,
      historial: 10,
      workplaces: 1,
      outputProfiles: 1,
      maxProfessionals: 1,
      templateMode: 'manual',
      templateLimit: 3,
      packLimit: 0,
      specialtyExtraLimit: 0,
      pdfLogo: false,
      pdfColor: false
    },
    pro: {
      key: 'pro',
      label: 'Pro',
      icon: '⚡',
      price: '$152.99',
      period: 'pago único + $15/mes',
      monthly: 15,
      annual: 150,
      features: ['Estructuración automática con IA'],
      type: 'PRO',
      hasProMode: true,
      hasDashboard: true,
      canGenerateApps: false,
      maxDevices: 3,
      durationDays: 30,
      historial: 30,
      workplaces: 2,
      outputProfiles: 3,
      maxProfessionals: 1,
      templateMode: 'specialty',
      templateLimit: -1,
      packLimit: 0,
      specialtyExtraLimit: 10,
      pdfLogo: true,
      pdfColor: false
    },
    clinic: {
      key: 'clinic',
      label: 'Clínica',
      icon: '🏥',
      price: '$352.99',
      period: 'pago único + $30/mes',
      monthly: 30,
      annual: 300,
      features: ['Todo de Pro más:'],
      type: 'PRO',
      hasProMode: true,
      hasDashboard: true,
      canGenerateApps: true,
      maxDevices: 5,
      durationDays: 365,
      historial: -1,
      workplaces: 1,
      outputProfiles: -1,
      maxProfessionals: 5,
      templateMode: 'packs',
      templateLimit: -1,
      packLimit: 3,
      specialtyExtraLimit: 0,
      pdfLogo: true,
      pdfColor: true
    },
    gift: {
      key: 'gift',
      label: 'Gift',
      icon: '🎁',
      price: '$0',
      period: 'regalo',
      monthly: 0,
      annual: 0,
      features: ['Acceso total'],
      type: 'PRO',
      hasProMode: true,
      hasDashboard: true,
      canGenerateApps: false,
      maxDevices: 10,
      durationDays: 365,
      historial: -1,
      workplaces: 3,
      outputProfiles: -1,
      maxProfessionals: 1,
      templateMode: 'all',
      templateLimit: -1,
      packLimit: 0,
      specialtyExtraLimit: 0,
      pdfLogo: true,
      pdfColor: true
    },
    enterprise: {
      key: 'enterprise',
      label: 'Enterprise',
      icon: '🏢',
      price: '$999',
      period: 'mensual',
      monthly: 999,
      annual: 9999,
      features: ['Configuración corporativa'],
      type: 'PRO',
      hasProMode: true,
      hasDashboard: true,
      canGenerateApps: true,
      maxDevices: 999,
      durationDays: 365,
      historial: -1,
      workplaces: 999,
      outputProfiles: -1,
      maxProfessionals: 999,
      templateMode: 'all',
      templateLimit: -1,
      packLimit: 0,
      specialtyExtraLimit: 0,
      pdfLogo: true,
      pdfColor: true
    }
  };
}

function _defaultAddonsConfig() {
  return {
    device_extra:        { key: 'device_extra',        label: 'Dispositivo extra',           price: 8.99,  icon: '💻' },
    workplace_extra:     { key: 'workplace_extra',     label: 'Lugar de trabajo extra',      price: 12.99, icon: '🏥' },
    professional_extra:  { key: 'professional_extra',  label: 'Profesional extra',           price: 19.99, icon: '👨‍⚕️' },
    branding_normal:     { key: 'branding_normal',     label: 'Branding (plan Normal)',      price: 14.99, icon: '🎨' },
    branding_pro:        { key: 'branding_pro',        label: 'Branding (plan Pro)',         price: 9.99,  icon: '🎨' },
    template_individual: { key: 'template_individual', label: 'Plantilla individual',        price: 3,     icon: '📄' },
    pack_small:          { key: 'pack_small',          label: 'Pack pequeño (5 plantillas)', price: 7,     icon: '📦' },
    pack_large:          { key: 'pack_large',          label: 'Pack grande (todas)',         price: 12,    icon: '📦' }
  };
}

function _defaultPaymentConfig() {
  return {
    cbu: '3220001888028622160018',
    alias: 'plan.prima.despierto',
    titular: 'Aldo Jesus Wagner',
    banco: 'Banco Industrial (BIND)',
    arsAlias: 'aldo.jesus.wagner',
    arsCvu: '0000003100057706429095',
    arsNombre: 'Aldo Jesus Wagner',
    usdAlias: 'plan.prima.despierto',
    usdCbu: '3220001888028622160018',
    usdNombre: 'Aldo Jesus Wagner',
    destinationNote: 'Cuando transfieras, verás como destino al Banco Industrial (BIND).'
  };
}

function _mergeConfig(defaultObj, inputObj) {
  const out = JSON.parse(JSON.stringify(defaultObj));
  if (!inputObj || typeof inputObj !== 'object') return out;
  Object.keys(inputObj).forEach(function(key) {
    if (!out[key]) out[key] = {};
    if (typeof inputObj[key] === 'object' && inputObj[key] !== null && !Array.isArray(inputObj[key])) {
      out[key] = Object.assign({}, out[key], inputObj[key]);
    } else {
      out[key] = inputObj[key];
    }
  });
  return out;
}

function _readJsonProperty(propKey, fallbackObj) {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty(propKey);
    if (!raw) return JSON.parse(JSON.stringify(fallbackObj));
    return _mergeConfig(fallbackObj, JSON.parse(raw));
  } catch (e) {
    return JSON.parse(JSON.stringify(fallbackObj));
  }
}

function _writeJsonProperty(propKey, valueObj, fallbackObj) {
  const normalized = _mergeConfig(fallbackObj, valueObj || {});
  PropertiesService.getScriptProperties().setProperty(propKey, JSON.stringify(normalized));
  return normalized;
}

function _getPlansConfig() {
  return _readJsonProperty(PROP_PLANS_CONFIG, _defaultPlansConfig());
}

function _getAddonsConfig() {
  return _readJsonProperty(PROP_ADDONS_CONFIG, _defaultAddonsConfig());
}

function _getPaymentConfig() {
  return _readJsonProperty(PROP_PAYMENT_CONFIG, _defaultPaymentConfig());
}

const COMPRAS_HEADERS = [
  'ID_Compra', 'ID_Medico', 'Email', 'Nombre',
  'Plan_Actual', 'Plan_Solicitado', 'Templates_Solicitados',
  'Addons_Cart', 'Moneda', 'Importe_Estimado',
  'Estado', 'Fecha_Solicitud', 'Fecha_Pago', 'Fecha_Aprobacion',
  'Notas_Admin', 'Applied_At', 'Applied_Message_Sent'
];

const REGISTROS_HEADERS = [
  'ID_Registro', 'Nombre', 'Matricula', 'Email', 'Telefono',
  'Especialidades', 'Estudios', 'Workplace_Data', 'Workplace_Logo',
  'Extra_Workplaces', 'Header_Color', 'Footer_Text', 'Firma', 'Pro_Logo',
  'Social_Media', 'Show_Phone', 'Show_Email', 'Show_Social',
  'Billing_Cycle', 'License_Amount', 'Subscription_Amount', 'Total_Hoy',
  'Notas', 'Fecha_Registro', 'Estado', 'Origen', 'ID_Medico_Asignado', 'Motivo_Rechazo',
  'Plan_Solicitado', 'Addons_Cart', 'Profesionales',
  'Payment_Link', 'Payment_History', 'Last_Receipt_Ref', 'Last_Receipt_At'
];

function _ensureSheetHeaders(sheet, requiredHeaders) {
  const values = sheet.getDataRange().getValues();
  const existing = values[0] || [];
  const firstCell = String(existing[0] || '').trim();

  if (!firstCell) {
    sheet.clearContents();
    sheet.appendRow(requiredHeaders);
    sheet.setFrozenRows(1);
    return requiredHeaders.slice();
  }

  requiredHeaders.forEach(function(h) {
    if (!existing.includes(h)) {
      sheet.getRange(1, existing.length + 1).setValue(h);
      existing.push(h);
    }
  });

  return existing;
}

function _getOrCreateSheetWithHeaders(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  } else {
    _ensureSheetHeaders(sheet, headers);
  }
  return sheet;
}

function _safeNumber(n, fallback) {
  const parsed = Number(n);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function _formatMoney(amount) {
  const n = _safeNumber(amount, 0);
  return n.toFixed(2);
}

function _sendTransferEmail(toEmail, personName, subjectPrefix, amount, currency, referenceId, portalUrl) {
  try {
    if (!toEmail) return;
    const pay = _getPaymentConfig();
    const subject = 'Transcriptor Pro | ' + subjectPrefix + ' #' + referenceId;
    const body = [
      'Hola ' + (personName || 'profesional') + ',',
      '',
      'Recibimos tu solicitud en Transcriptor Pro.',
      'Para continuar, realizá la transferencia y luego enviá comprobante para validación manual.',
      '',
      'Referencia: ' + referenceId,
      'Importe: ' + _formatMoney(amount) + ' ' + (currency || 'USD'),
      '',
      'Datos de transferencia:',
      '',
      'Para pagos en pesos argentinos:',
      'Alias: ' + (pay.arsAlias || pay.alias || ''),
      'CVU: ' + (pay.arsCvu || ''),
      'Nombre: ' + (pay.arsNombre || pay.titular || ''),
      '',
      'Para pagos en dolares:',
      'Alias: ' + (pay.usdAlias || pay.alias || ''),
      'CBU: ' + (pay.usdCbu || pay.cbu || ''),
      'Nombre: ' + (pay.usdNombre || pay.titular || ''),
      'Banco: ' + (pay.banco || ''),
      pay.destinationNote ? 'ℹ️ ' + pay.destinationNote : '',
      portalUrl ? '' : '',
      portalUrl ? 'Portal de pagos para adjuntar comprobante:' : '',
      portalUrl ? portalUrl : '',
      '',
      'Importante: la activación de la app/compra se realiza solo cuando se confirme el pago.',
      '',
      'Equipo Transcriptor Pro'
    ].join('\n');

    GmailApp.sendEmail(toEmail, subject, body);
  } catch (e) {
    Logger.log('⚠️ Error enviando mail de transferencia: ' + e.message);
  }
}

function _sendWelcomeEmail(toEmail, personName, medicoId, planCode) {
  try {
    if (!toEmail) return;
    const subject = 'Transcriptor Pro | Cuenta activada';
    const body = [
      'Hola ' + (personName || 'profesional') + ',',
      '',
      'Tu cuenta ya fue activada en Transcriptor Pro.',
      'ID de acceso: ' + (medicoId || '—'),
      'Plan: ' + String(planCode || '').toUpperCase(),
      '',
      'Si recibiste un link del clon, ya podés ingresar y comenzar a usar la app.',
      'Si necesitás ayuda, respondé este correo.',
      '',
      'Equipo Transcriptor Pro'
    ].join('\n');

    GmailApp.sendEmail(toEmail, subject, body);
  } catch (e) {
    Logger.log('⚠️ Error enviando welcome email: ' + e.message);
  }
}

function _resolvePlanConfig(planCode) {
  const plans = _getPlansConfig();
  const key = String(planCode || 'trial').toLowerCase();
  return plans[key] || plans.trial || _defaultPlansConfig().trial;
}

function _adminReadCacheKeys() {
  return [
    'admin_list_users:all',
    'admin_get_global_stats:all',
    'admin_list_registrations:all'
  ];
}

function _adminCacheGet(key) {
  try {
    const raw = CacheService.getScriptCache().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function _adminCachePut(key, value, ttlSec) {
  try {
    CacheService.getScriptCache().put(key, JSON.stringify(value), ttlSec || ADMIN_CACHE_TTL_SEC);
  } catch (_) {}
}

function _adminCacheRemoveByPrefix(prefix) {
  try {
    const cache = CacheService.getScriptCache();
    const candidates = [
      prefix + ':all',
      prefix + ':none:none',
      prefix + '::',
      prefix + ':pendiente',
      prefix + ':aprobado',
      prefix + ':rechazado',
      prefix + ':todos'
    ];
    cache.removeAll(candidates);
  } catch (_) {}
}

function _invalidateAdminReadCaches() {
  try {
    const cache = CacheService.getScriptCache();
    cache.removeAll(_adminReadCacheKeys());
    _adminCacheRemoveByPrefix('admin_get_logs');
  } catch (_) {}
}

function doGet(e) {
  const action = e.parameter.action;

  if (action === 'public_get_plans_config') {
    return createResponse({
      success: true,
      plans: _getPlansConfig(),
      addons: _getAddonsConfig()
    });
  }

  if (action === 'public_get_payment_portal') {
    const id = String(e.parameter.id || '').trim();
    if (!id) return createResponse({ error: 'Falta id' });

    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const pay = _getPaymentConfig();

      if (id.toUpperCase().startsWith('REG_')) {
        const regSheet = _getOrCreateSheetWithHeaders(SHEET_REGISTROS, REGISTROS_HEADERS);
        const data = regSheet.getDataRange().getValues();
        const headers = data[0];
        const idCol = headers.indexOf('ID_Registro');

        for (let i = 1; i < data.length; i++) {
          if (String(data[i][idCol]) !== id) continue;
          const row = {};
          headers.forEach(function(h, idx) { row[h] = data[i][idx]; });
          let history = [];
          try { history = JSON.parse(String(row.Payment_History || '[]')); } catch (_) {}

          return createResponse({
            success: true,
            kind: 'registro',
            id: id,
            nombre: row.Nombre || '',
            email: row.Email || '',
            plan: row.Plan_Solicitado || '',
            estado: row.Estado || 'pendiente_pago',
            totalHoy: row.Total_Hoy || '',
            moneda: 'USD',
            fechaRegistro: row.Fecha_Registro || '',
            medicoIdAsignado: row.ID_Medico_Asignado || '',
            paymentLink: row.Payment_Link || '',
            paymentData: {
              arsAlias: pay.arsAlias || pay.alias || '',
              arsCvu: pay.arsCvu || '',
              arsNombre: pay.arsNombre || pay.titular || '',
              usdAlias: pay.usdAlias || pay.alias || '',
              usdCbu: pay.usdCbu || pay.cbu || '',
              usdNombre: pay.usdNombre || pay.titular || '',
              bank: pay.banco || '',
              destinationNote: pay.destinationNote || ''
            },
            lastReceiptAt: row.Last_Receipt_At || '',
            history: Array.isArray(history) ? history : []
          });
        }

        return createResponse({ error: 'Registro no encontrado' });
      }

      const userSheet = ss.getSheetByName(SHEET_NAME);
      if (!userSheet) return createResponse({ error: 'Hoja usuarios no encontrada' });
      _ensureUsuariosHeaders(userSheet);
      const usersData = userSheet.getDataRange().getValues();
      const uh = usersData[0];
      const uidCol = uh.indexOf('ID_Medico');

      for (let i = 1; i < usersData.length; i++) {
        if (String(usersData[i][uidCol]) !== id) continue;
        const row = {};
        uh.forEach(function(h, idx) { row[h] = usersData[i][idx]; });
        let history = [];
        try { history = JSON.parse(String(row.Payment_History || '[]')); } catch (_) {}
        let daysRemaining = null;
        try {
          if (row.Fecha_Vencimiento) {
            const now = new Date();
            const fv = new Date(row.Fecha_Vencimiento);
            if (!isNaN(fv.getTime())) {
              daysRemaining = Math.ceil((fv.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            }
          }
        } catch (_) {}

        const planCfg = _resolvePlanConfig(String(row.Plan || 'normal').toLowerCase());
        return createResponse({
          success: true,
          kind: 'medico',
          id: id,
          nombre: row.Nombre || '',
          email: row.Email || '',
          plan: row.Plan || '',
          estado: row.Estado || 'active',
          fechaVencimiento: row.Fecha_Vencimiento || '',
          daysRemaining: daysRemaining,
          monthlyAmount: Number(planCfg.monthly || 0),
          paymentLink: (function() {
            try {
              const rd = JSON.parse(String(row.Registro_Datos || '{}'));
              return rd.paymentPortalUrl || '';
            } catch (_) { return ''; }
          })(),
          paymentData: {
            arsAlias: pay.arsAlias || pay.alias || '',
            arsCvu: pay.arsCvu || '',
            arsNombre: pay.arsNombre || pay.titular || '',
            usdAlias: pay.usdAlias || pay.alias || '',
            usdCbu: pay.usdCbu || pay.cbu || '',
            usdNombre: pay.usdNombre || pay.titular || '',
            bank: pay.banco || '',
            destinationNote: pay.destinationNote || ''
          },
          lastReceiptAt: row.Last_Receipt_At || '',
          history: Array.isArray(history) ? history : []
        });
      }

      return createResponse({ error: 'Usuario no encontrado' });
    } catch (err) {
      return createResponse({ error: 'Error consultando portal de pagos: ' + err.message });
    }
  }

  // EXISTING: user validation — enhanced with trial/device enforcement
  if (!action || action === 'validate') {
    const id = e.parameter.id;
    const deviceId = e.parameter.deviceId;

    if (!id) return createResponse({ error: 'Falta ID de Médico' });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    _ensureUsuariosHeaders(sheet);
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
        doctor.purchase_message = doctor.Purchase_Message || '';

        return createResponse(doctor);
      }
    }

    return createResponse({ error: 'Médico no encontrado', code: 'NOT_FOUND' });
  }

  // NEW: admin endpoint - list all users
  if (action === 'admin_list_users') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const cached = _adminCacheGet('admin_list_users:all');
    if (cached) return createResponse(cached);

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

    const payload = { users: users, total: users.length };
    _adminCachePut('admin_list_users:all', payload);
    return createResponse(payload);
  }

  // FIX B3: admin_update_user como GET (admin.html usa fetch GET con query params)
  if (action === 'admin_update_user') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });
    _invalidateAdminReadCaches();

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
    _invalidateAdminReadCaches();

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

  // admin_delete_user — elimina un usuario específico por ID_Medico
  if (action === 'admin_delete_user') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });
    _invalidateAdminReadCaches();

    const userId = e.parameter.userId;
    if (!userId) return createResponse({ error: 'userId requerido' });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('ID_Medico');

    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][idCol]) === String(userId)) {
        sheet.deleteRow(i + 1);
        appendAdminLog(auth.username, 'delete_user', userId, 'Eliminado permanentemente');
        return createResponse({ success: true, deleted: userId });
      }
    }
    return createResponse({ error: 'Usuario no encontrado' });
  }

  // admin_delete_test_users — elimina filas cuyos ID_Medico coincidan con los IDs de prueba
  if (action === 'admin_delete_test_users') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });
    _invalidateAdminReadCaches();

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
      const filterDate = String(e.parameter.date || '').trim();
      const filterType = String(e.parameter.type || '').toLowerCase().trim();
      const cacheKey = 'admin_get_logs:' + (filterDate || 'none') + ':' + (filterType || 'none');
      const cached = _adminCacheGet(cacheKey);
      if (cached) return createResponse(cached);

      const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_LOGS);
      if (!logSheet) return createResponse({ logs: [], message: 'Hoja Admin_Logs no encontrada' });

      const data = logSheet.getDataRange().getValues();
      if (data.length <= 1) return createResponse({ logs: [] });

      const headers = data[0];

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

      const payload = { logs: logs, total: logs.length };
      _adminCachePut(cacheKey, payload);
      return createResponse(payload);
    } catch(err) {
      return createResponse({ error: 'Error leyendo logs: ' + err.message });
    }
  }

  // admin_clear_logs — vacía logs (conserva cabecera)
  if (action === 'admin_clear_logs') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });
    _invalidateAdminReadCaches();

    try {
      const deleted = _clearAdminLogsKeepHeader();
      appendAdminLog(auth.username, 'clear_logs', 'system', 'Registros eliminados: ' + deleted);
      return createResponse({ success: true, deleted: deleted });
    } catch (err) {
      return createResponse({ error: 'Error vaciando logs: ' + err.message });
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

  // admin_list_support — listar solicitudes de soporte para el panel admin
  if (action === 'admin_list_support') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });
    try {
      const sSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SOPORTE);
      if (!sSheet) return createResponse({ requests: [], message: 'Hoja Solicitudes_Soporte no encontrada. Ejecute setup_sheets.' });
      const data = sSheet.getDataRange().getValues();
      if (data.length <= 1) return createResponse({ requests: [] });
      const headers = data[0];
      const filterStatus = (e.parameter.status || '').toLowerCase();
      const requests = [];
      for (let i = data.length - 1; i >= 1; i--) {
        const row = {};
        headers.forEach((h, idx) => { row[h] = data[i][idx]; });
        const estado = String(row['Estado'] || 'pendiente').toLowerCase();
        if (filterStatus && filterStatus !== 'todos' && estado !== filterStatus) continue;
        requests.push({
          id: row['ID_Solicitud'] || '',
          medicoId: row['ID_Medico'] || '',
          nombre: row['Nombre'] || '',
          motivo: row['Motivo'] || '',
          detalle: row['Detalle'] || '',
          deviceId: row['Device_ID'] || '',
          fecha: row['Fecha'] || '',
          estado: row['Estado'] || 'pendiente',
          rowIndex: i + 1
        });
        if (requests.length >= 100) break;
      }
      return createResponse({ requests: requests });
    } catch(err) {
      return createResponse({ error: 'Error leyendo soporte: ' + err.message });
    }
  }

  // admin_resolve_support — marcar solicitud de soporte como resuelta
  if (action === 'admin_resolve_support') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });
    _invalidateAdminReadCaches();
    try {
      const sSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SOPORTE);
      if (!sSheet) return createResponse({ error: 'Hoja no encontrada' });
      const reqId = e.parameter.requestId;
      const nota = decodeURIComponent(e.parameter.nota || '');
      const data = sSheet.getDataRange().getValues();
      const headers = data[0];
      const idCol = headers.indexOf('ID_Solicitud');
      const estadoCol = headers.indexOf('Estado');
      const notaCol = headers.indexOf('Nota_Admin');
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) === String(reqId)) {
          if (estadoCol !== -1) sSheet.getRange(i + 1, estadoCol + 1).setValue('resuelto');
          if (notaCol !== -1 && nota) sSheet.getRange(i + 1, notaCol + 1).setValue(nota);
          appendAdminLog(auth.username, 'resolve_support', reqId, nota || 'Resuelto');
          return createResponse({ success: true });
        }
      }
      return createResponse({ error: 'Solicitud no encontrada' });
    } catch(err) {
      return createResponse({ error: err.message });
    }
  }

  // admin_release_devices — liberar todos los dispositivos de un usuario
  if (action === 'admin_release_devices') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });
    _invalidateAdminReadCaches();
    const userId = e.parameter.userId;
    if (!userId) return createResponse({ error: 'Falta userId' });
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('ID_Medico');
    const devCol = headers.indexOf('Devices_Logged');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(userId)) {
        if (devCol !== -1) sheet.getRange(i + 1, devCol + 1).setValue('[]');
        appendAdminLog(auth.username, 'release_devices', userId, 'Dispositivos liberados');
        return createResponse({ success: true, message: 'Dispositivos liberados para ' + userId });
      }
    }
    return createResponse({ error: 'Usuario no encontrado' });
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

    const cached = _adminCacheGet('admin_get_global_stats:all');
    if (cached) return createResponse(cached);

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

      const payload = {
        stats: {
          totalUsers, active, inactive, expired, banned,
          trial, pro, enterprise,
          totalTranscripciones: totalUsage,
          newThisWeek
        }
      };
      _adminCachePut('admin_get_global_stats:all', payload);
      return createResponse(payload);
    } catch(err) {
      return createResponse({ error: 'Error calculando estadísticas: ' + err.message });
    }
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

          _invalidateAdminReadCaches();
          const deletedLogs = _clearAdminLogsKeepHeader();
          appendAdminLog(username, 'login_success', username, 'Nueva sesión. Logs previos eliminados: ' + deletedLogs);

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

        const plan = String(user.Plan || 'trial').toLowerCase();
        let regDatos = {};
        try { regDatos = JSON.parse(user.Registro_Datos || '{}'); } catch(_) {}
        const planConfig = _resolvePlanConfig(plan);

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
        const resolvedType = String(planConfig.type || '').trim() || (planConfig.hasProMode ? 'PRO' : (plan === 'normal' ? 'NORMAL' : 'TRIAL'));

        const config = {
          medicoId: userId,
          type: resolvedType,
          status: String(user.Estado || 'active'),
          specialties: specialties,
          maxDevices: Number(user.Devices_Max) || Number(planConfig.maxDevices) || 2,
          trialDays: trialDays,
          hasProMode: regDatos.hasProMode !== undefined ? !!regDatos.hasProMode : !!planConfig.hasProMode,
          hasDashboard: regDatos.hasDashboard !== undefined ? !!regDatos.hasDashboard : !!planConfig.hasDashboard,
          canGenerateApps: regDatos.canGenerateApps !== undefined ? !!regDatos.canGenerateApps : !!planConfig.canGenerateApps,
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

    const cached = _adminCacheGet('admin_list_registrations:all');
    if (cached) return createResponse(cached);

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

      const payload = { registrations: registrations, total: registrations.length };
      _adminCachePut('admin_list_registrations:all', payload);
      return createResponse(payload);
    } catch(err) {
      return createResponse({ error: 'Error leyendo registros: ' + err.message });
    }
  }

  if (action === 'admin_list_purchases') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    try {
      const sheet = _getOrCreateSheetWithHeaders(SHEET_COMPRAS, COMPRAS_HEADERS);
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return createResponse({ purchases: [], total: 0 });

      const headers = data[0];
      const purchases = [];
      for (let i = 1; i < data.length; i++) {
        if (!data[i][0]) continue;
        const row = {};
        headers.forEach(function(h, idx) { row[h] = data[i][idx]; });
        purchases.push(row);
      }
      return createResponse({ purchases: purchases, total: purchases.length });
    } catch (err) {
      return createResponse({ error: 'Error leyendo compras: ' + err.message });
    }
  }

  if (action === 'admin_mark_registration_paid') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });
    _invalidateAdminReadCaches();

    const regId = String(e.parameter.regId || '').trim();
    if (!regId) return createResponse({ error: 'Falta regId' });

    try {
      const regSheet = _getOrCreateSheetWithHeaders(SHEET_REGISTROS, [
        'ID_Registro', 'Nombre', 'Matricula', 'Email', 'Telefono',
        'Especialidades', 'Estudios', 'Workplace_Data', 'Workplace_Logo',
        'Extra_Workplaces', 'Header_Color', 'Footer_Text', 'Firma', 'Pro_Logo',
        'Social_Media', 'Show_Phone', 'Show_Email', 'Show_Social',
        'Billing_Cycle', 'License_Amount', 'Subscription_Amount', 'Total_Hoy',
        'Notas', 'Fecha_Registro', 'Estado', 'Origen', 'ID_Medico_Asignado', 'Motivo_Rechazo',
        'Plan_Solicitado', 'Addons_Cart', 'Profesionales'
      ]);
      const data = regSheet.getDataRange().getValues();
      const headers = data[0];
      const idCol = headers.indexOf('ID_Registro');
      const estadoCol = headers.indexOf('Estado');
      const notasCol = headers.indexOf('Notas');

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) !== regId) continue;
        regSheet.getRange(i + 1, estadoCol + 1).setValue('pago_confirmado');
        if (notasCol !== -1) {
          const prev = String(data[i][notasCol] || '');
          const extra = '\n[PAGO CONFIRMADO ' + new Date().toISOString() + ']';
          regSheet.getRange(i + 1, notasCol + 1).setValue((prev + extra).trim());
        }
        appendAdminLog(auth.username, 'mark_registration_paid', regId, 'Pago confirmado');
        return createResponse({ success: true, regId: regId, status: 'pago_confirmado' });
      }

      return createResponse({ error: 'Registro no encontrado: ' + regId });
    } catch (err) {
      return createResponse({ error: 'Error marcando pago: ' + err.message });
    }
  }

  // ── admin_approve_registration — aprueba un registro y crea el usuario ──
  if (action === 'admin_approve_registration') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });
    _invalidateAdminReadCaches();

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
    const editedHasProMode = e.parameter.editedHasProMode !== undefined
      ? String(e.parameter.editedHasProMode).toLowerCase() === 'true'
      : null;
    const editedHasDashboard = e.parameter.editedHasDashboard !== undefined
      ? String(e.parameter.editedHasDashboard).toLowerCase() === 'true'
      : null;
    const editedCanGenerateApps = e.parameter.editedCanGenerateApps !== undefined
      ? String(e.parameter.editedCanGenerateApps).toLowerCase() === 'true'
      : null;

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
      if (String(regData.Estado || '').toLowerCase() !== 'pago_confirmado') {
        return createResponse({ error: 'Registro no pagado. Confirmá transferencia antes de aprobar.' });
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
        Purchase_Message: '✅ Pago verificado. Tu app está activa. Bienvenido/a.',
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
          hasProMode:      editedHasProMode,
          hasDashboard:    editedHasDashboard,
          canGenerateApps: editedCanGenerateApps,
          paymentPortalUrl: String(regData.Payment_Link || '').split('?id=')[0] || '',
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

      // Actualizar profesionales de clínica (si aplica)
      try { _approveProfesionalesClinica(regId, medicoId, regData.Profesionales || ''); }
      catch(profErr) { Logger.log('⚠️ Error actualizando profesionales: ' + profErr.message); }

      appendAdminLog(auth.username, 'approve_registration', medicoId, 'Reg: ' + regId + ' Plan: ' + plan);

      _sendWelcomeEmail(userData.Email, userData.Nombre, medicoId, plan);

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

  if (action === 'admin_get_payment_receipt') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const driveRef = String(e.parameter.driveRef || '');
    if (!driveRef.startsWith('drive:')) return createResponse({ error: 'driveRef inválido' });

    try {
      const fileId = driveRef.replace('drive:', '');
      const file = DriveApp.getFileById(fileId);
      const blob = file.getBlob();
      const mimeType = blob.getContentType() || 'application/octet-stream';
      const base64 = Utilities.base64Encode(blob.getBytes());
      const dataUrl = 'data:' + mimeType + ';base64,' + base64;
      return createResponse({
        success: true,
        mimeType: mimeType,
        name: file.getName(),
        dataUrl: dataUrl
      });
    } catch (err) {
      return createResponse({ error: 'No se pudo leer comprobante: ' + err.message });
    }
  }

  // ── admin_reject_registration — rechaza un registro pendiente ──
  if (action === 'admin_reject_registration') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });
    _invalidateAdminReadCaches();

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

  // ── admin_get_clinic_professionals — lista profesionales de una clínica ──
  if (action === 'admin_get_clinic_professionals') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const medicoId = e.parameter.medicoId || '';
    const regId    = e.parameter.regId    || '';
    if (!medicoId && !regId) return createResponse({ error: 'Falta medicoId o regId' });

    try {
      const profSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PROFESIONALES);
      if (!profSheet) return createResponse({ success: true, profesionales: [] });

      const data = profSheet.getDataRange().getValues();
      const headers = data[0];
      var result = [];

      for (var i = 1; i < data.length; i++) {
        var row = {};
        headers.forEach(function(h, idx) { row[h] = data[i][idx]; });
        if (medicoId && String(row.ID_Medico) === String(medicoId)) result.push(row);
        else if (regId && String(row.ID_Registro) === String(regId)) result.push(row);
      }

      return createResponse({ success: true, profesionales: result });
    } catch(err) {
      return createResponse({ error: 'Error consultando profesionales: ' + err.message });
    }
  }

  if (action === 'admin_get_plans_config') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });
    return createResponse({ success: true, plans: _getPlansConfig() });
  }

  if (action === 'admin_get_addons_config') {
    const auth = _verifyAdminAuth(e.parameter);
    if (!auth.authorized) return createResponse({ error: auth.error });
    return createResponse({ success: true, addons: _getAddonsConfig() });
  }

  return createResponse({ error: 'Acción no válida' });
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const action = payload.action; // 'update_usage' o 'admin_update_user'

  const invalidateCacheActions = {
    public_upload_payment_receipt: true,
    update_usage: true,
    register_doctor: true,
    admin_update_user: true,
    admin_create_user: true,
    admin_mark_purchase_paid: true,
    admin_approve_purchase: true,
    admin_approve_registration: true,
    admin_resolve_support: true,
    admin_release_devices: true,
    admin_mark_registration_paid: true,
    admin_reject_registration: true,
    admin_clear_logs: true
  };
  if (invalidateCacheActions[action]) {
    _invalidateAdminReadCaches();
  }

  if (action === 'create_pdf_replica_link') {
    try {
      const htmlContent = String(payload.htmlContent || '');
      const requestedName = String(payload.fileName || 'informe').trim();
      if (!htmlContent) return createResponse({ error: 'Falta htmlContent' });
      if (htmlContent.length > 1800000) return createResponse({ error: 'HTML demasiado grande' });

      const safeName = requestedName
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, '_')
        .slice(0, 120) || ('informe_' + Date.now());

      const folder = _getDataFolder();
      const file = folder.createFile(safeName, htmlContent, MimeType.HTML);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      const fileId = file.getId();
      return createResponse({
        success: true,
        fileId: fileId,
        viewUrl: 'https://drive.google.com/file/d/' + fileId + '/view?usp=sharing',
        downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileId
      });
    } catch (err) {
      return createResponse({ error: 'Error creando réplica: ' + err.message });
    }
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  _ensureUsuariosHeaders(sheet);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  if (action === 'public_upload_payment_receipt') {
    const id = String(payload.id || '').trim();
    const receiptDataUrl = String(payload.receiptDataUrl || '').trim();
    const amount = _safeNumber(payload.amount, 0);
    const currency = String(payload.currency || 'USD').toUpperCase();
    const note = String(payload.note || '').trim();
    if (!id) return createResponse({ error: 'Falta id' });
    if (!receiptDataUrl || receiptDataUrl.indexOf('data:') !== 0) return createResponse({ error: 'Falta comprobante válido' });

    try {
      const now = new Date().toISOString();
      const receiptRef = _saveDataUrlToDrive(id + '_receipt', receiptDataUrl);
      const receiptTag = 'drive:' + receiptRef;

      if (id.toUpperCase().startsWith('REG_')) {
        const regSheet = _getOrCreateSheetWithHeaders(SHEET_REGISTROS, REGISTROS_HEADERS);
        const rData = regSheet.getDataRange().getValues();
        const rh = rData[0];
        const idCol = rh.indexOf('ID_Registro');
        const estadoCol = rh.indexOf('Estado');
        const histCol = rh.indexOf('Payment_History');
        const refCol = rh.indexOf('Last_Receipt_Ref');
        const atCol = rh.indexOf('Last_Receipt_At');
        const notasCol = rh.indexOf('Notas');
        const nombreCol = rh.indexOf('Nombre');
        const emailCol = rh.indexOf('Email');

        for (let i = 1; i < rData.length; i++) {
          if (String(rData[i][idCol]) !== id) continue;
          let history = [];
          try { history = JSON.parse(String(rData[i][histCol] || '[]')); } catch (_) {}
          history.push({
            id: 'PAY_' + Date.now(),
            kind: 'registro',
            amount: amount,
            currency: currency,
            note: note,
            receiptRef: receiptTag,
            createdAt: now,
            status: 'en_revision'
          });
          if (histCol !== -1) regSheet.getRange(i + 1, histCol + 1).setValue(JSON.stringify(history));
          if (refCol !== -1) regSheet.getRange(i + 1, refCol + 1).setValue(receiptTag);
          if (atCol !== -1) regSheet.getRange(i + 1, atCol + 1).setValue(now);
          if (estadoCol !== -1) regSheet.getRange(i + 1, estadoCol + 1).setValue('comprobante_recibido');
          if (notasCol !== -1) {
            const prev = String(rData[i][notasCol] || '');
            const extra = '\n[COMPROBANTE CLIENTE ' + now + ']';
            regSheet.getRange(i + 1, notasCol + 1).setValue((prev + extra).trim());
          }

          try {
            const adminEmail = Session.getEffectiveUser().getEmail();
            if (adminEmail) {
              GmailApp.sendEmail(
                adminEmail,
                'Comprobante recibido: ' + (String(rData[i][nombreCol] || '') || id),
                'Se subió un nuevo comprobante de pago.\n\nID: ' + id + '\nNombre: ' + String(rData[i][nombreCol] || '') + '\nEmail: ' + String(rData[i][emailCol] || '') + '\nFecha: ' + now + '\n\nRevisá el panel de administración.'
              );
            }
          } catch (_) {}

          return createResponse({
            success: true,
            id: id,
            status: 'comprobante_recibido',
            receiptRef: receiptTag,
            uploadedAt: now
          });
        }
        return createResponse({ error: 'Registro no encontrado: ' + id });
      }

      _ensureUsuariosHeaders(sheet);
      const userData = sheet.getDataRange().getValues();
      const uh = userData[0];
      const uidCol = uh.indexOf('ID_Medico');
      const histCol = uh.indexOf('Payment_History');
      const refCol = uh.indexOf('Last_Receipt_Ref');
      const atCol = uh.indexOf('Last_Receipt_At');
      const notesCol = uh.indexOf('Notas_Admin');

      for (let i = 1; i < userData.length; i++) {
        if (String(userData[i][uidCol]) !== id) continue;
        let history = [];
        try { history = JSON.parse(String(userData[i][histCol] || '[]')); } catch (_) {}
        history.push({
          id: 'PAY_' + Date.now(),
          kind: 'renovacion',
          amount: amount,
          currency: currency,
          note: note,
          receiptRef: receiptTag,
          createdAt: now,
          status: 'subido_cliente'
        });
        if (histCol !== -1) sheet.getRange(i + 1, histCol + 1).setValue(JSON.stringify(history));
        if (refCol !== -1) sheet.getRange(i + 1, refCol + 1).setValue(receiptTag);
        if (atCol !== -1) sheet.getRange(i + 1, atCol + 1).setValue(now);
        if (notesCol !== -1) {
          const prev = String(userData[i][notesCol] || '');
          const extra = '\n[PAGO SUBIDO CLIENTE ' + now + ']';
          sheet.getRange(i + 1, notesCol + 1).setValue((prev + extra).trim());
        }
        return createResponse({ success: true, id: id, status: 'receipt_uploaded', receiptRef: receiptTag, uploadedAt: now });
      }

      return createResponse({ error: 'Usuario no encontrado: ' + id });
    } catch (err) {
      return createResponse({ error: 'Error subiendo comprobante: ' + err.message });
    }
  }

  if (action === 'admin_save_plans_config') {
    const auth = _verifyAdminAuth(payload);
    if (!auth.authorized) return createResponse({ error: auth.error });
    const saved = _writeJsonProperty(PROP_PLANS_CONFIG, payload.plans || {}, _defaultPlansConfig());
    return createResponse({ success: true, plans: saved });
  }

  if (action === 'admin_save_addons_config') {
    const auth = _verifyAdminAuth(payload);
    if (!auth.authorized) return createResponse({ error: auth.error });
    const saved = _writeJsonProperty(PROP_ADDONS_CONFIG, payload.addons || {}, _defaultAddonsConfig());
    return createResponse({ success: true, addons: saved });
  }

  if (action === 'admin_save_payment_config') {
    const auth = _verifyAdminAuth(payload);
    if (!auth.authorized) return createResponse({ error: auth.error });
    const saved = _writeJsonProperty(PROP_PAYMENT_CONFIG, payload.payment || {}, _defaultPaymentConfig());
    return createResponse({ success: true, payment: saved });
  }

  if (action === 'upgrade_request') {
    try {
      const comprasSheet = _getOrCreateSheetWithHeaders(SHEET_COMPRAS, COMPRAS_HEADERS);
      const headers = comprasSheet.getDataRange().getValues()[0];

      const compraId = 'CMP_' + Date.now();
      const medicoId = String(payload.medicoId || '').trim();
      const requestedPlan = String(payload.requestedPlan || payload.currentPlan || '').toLowerCase();
      const currentPlan = String(payload.currentPlan || '').toLowerCase();
      const templates = Array.isArray(payload.requestedTemplates) ? payload.requestedTemplates : [];
      const addonsCart = payload.requestedAddons || { templates: templates };
      const estimatedAmount = _safeNumber(payload.estimatedAmount, 0);
      const currency = String(payload.currency || 'USD').toUpperCase();

      let userEmail = String(payload.email || '').trim();
      let userName = String(payload.nombre || '').trim();

      // Intentar completar email/nombre desde Usuarios por medicoId
      if (medicoId) {
        try {
          const usersData = sheet.getDataRange().getValues();
          const userHeaders = usersData[0];
          const idCol = userHeaders.indexOf('ID_Medico');
          const emailCol = userHeaders.indexOf('Email');
          const nameCol = userHeaders.indexOf('Nombre');
          for (let i = 1; i < usersData.length; i++) {
            if (String(usersData[i][idCol]) !== medicoId) continue;
            if (!userEmail && emailCol !== -1) userEmail = String(usersData[i][emailCol] || '').trim();
            if (!userName && nameCol !== -1) userName = String(usersData[i][nameCol] || '').trim();
            break;
          }
        } catch (_) {}
      }

      const rowData = {
        ID_Compra: compraId,
        ID_Medico: medicoId,
        Email: userEmail,
        Nombre: userName,
        Plan_Actual: currentPlan,
        Plan_Solicitado: requestedPlan,
        Templates_Solicitados: JSON.stringify(templates),
        Addons_Cart: JSON.stringify(addonsCart || {}),
        Moneda: currency,
        Importe_Estimado: _formatMoney(estimatedAmount),
        Estado: 'pendiente_pago',
        Fecha_Solicitud: new Date().toISOString(),
        Fecha_Pago: '',
        Fecha_Aprobacion: '',
        Notas_Admin: 'Solicitud desde clon',
        Applied_At: '',
        Applied_Message_Sent: 'false'
      };

      const row = headers.map(function(h) { return rowData[h] !== undefined ? rowData[h] : ''; });
      comprasSheet.appendRow(row);

      _sendTransferEmail(
        userEmail,
        userName,
        'Solicitud de compra recibida',
        estimatedAmount,
        currency,
        compraId
      );

      return createResponse({
        ok: true,
        success: true,
        purchaseId: compraId,
        status: 'pendiente_pago'
      });
    } catch (err) {
      return createResponse({ error: 'Error creando solicitud de compra: ' + err.message });
    }
  }

  if (action === 'admin_mark_purchase_paid') {
    const auth = _verifyAdminAuth(payload);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const purchaseId = String(payload.purchaseId || '').trim();
    if (!purchaseId) return createResponse({ error: 'Falta purchaseId' });

    try {
      const comprasSheet = _getOrCreateSheetWithHeaders(SHEET_COMPRAS, COMPRAS_HEADERS);
      const data = comprasSheet.getDataRange().getValues();
      const headers = data[0];
      const idCol = headers.indexOf('ID_Compra');
      const estadoCol = headers.indexOf('Estado');
      const fechaPagoCol = headers.indexOf('Fecha_Pago');
      const notasCol = headers.indexOf('Notas_Admin');

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idCol]) !== purchaseId) continue;
        comprasSheet.getRange(i + 1, estadoCol + 1).setValue('pago_confirmado');
        if (fechaPagoCol !== -1) comprasSheet.getRange(i + 1, fechaPagoCol + 1).setValue(new Date().toISOString());
        if (notasCol !== -1) {
          const prev = String(data[i][notasCol] || '');
          const next = (prev + '\n[PAGO CONFIRMADO ' + auth.username + ']').trim();
          comprasSheet.getRange(i + 1, notasCol + 1).setValue(next);
        }
        appendAdminLog(auth.username, 'mark_purchase_paid', purchaseId, 'Pago confirmado');
        return createResponse({ success: true, purchaseId: purchaseId, status: 'pago_confirmado' });
      }

      return createResponse({ error: 'Compra no encontrada: ' + purchaseId });
    } catch (err) {
      return createResponse({ error: 'Error marcando compra como pagada: ' + err.message });
    }
  }

  if (action === 'admin_approve_purchase') {
    const auth = _verifyAdminAuth(payload);
    if (!auth.authorized) return createResponse({ error: auth.error });

    const purchaseId = String(payload.purchaseId || '').trim();
    if (!purchaseId) return createResponse({ error: 'Falta purchaseId' });

    try {
      const comprasSheet = _getOrCreateSheetWithHeaders(SHEET_COMPRAS, COMPRAS_HEADERS);
      const comprasData = comprasSheet.getDataRange().getValues();
      const ch = comprasData[0];
      const idCol = ch.indexOf('ID_Compra');
      const estadoCol = ch.indexOf('Estado');
      const medicoCol = ch.indexOf('ID_Medico');
      const planCol = ch.indexOf('Plan_Solicitado');
      const tplCol = ch.indexOf('Templates_Solicitados');
      const notesCol = ch.indexOf('Notas_Admin');
      const fechaAprobCol = ch.indexOf('Fecha_Aprobacion');
      const appliedAtCol = ch.indexOf('Applied_At');
      const msgSentCol = ch.indexOf('Applied_Message_Sent');
      const emailCol = ch.indexOf('Email');
      const nameCol = ch.indexOf('Nombre');

      let purchase = null;
      let purchaseRow = -1;
      for (let i = 1; i < comprasData.length; i++) {
        if (String(comprasData[i][idCol]) !== purchaseId) continue;
        purchase = {};
        ch.forEach(function(h, idx) { purchase[h] = comprasData[i][idx]; });
        purchaseRow = i + 1;
        break;
      }

      if (!purchase) return createResponse({ error: 'Compra no encontrada: ' + purchaseId });
      if (String(purchase.Estado || '').toLowerCase() !== 'pago_confirmado') {
        return createResponse({ error: 'La compra debe estar en estado pago_confirmado para aprobarse' });
      }

      const medicoId = String(purchase.ID_Medico || '').trim();
      if (!medicoId) return createResponse({ error: 'Compra sin ID_Medico' });

      const usersData = sheet.getDataRange().getValues();
      const uh = usersData[0];
      const uidCol = uh.indexOf('ID_Medico');
      const uPlanCol = uh.indexOf('Plan');
      const uEstadoCol = uh.indexOf('Estado');
      const uFechaVencCol = uh.indexOf('Fecha_Vencimiento');
      const uTplCol = uh.indexOf('Allowed_Templates');
      const uNotasCol = uh.indexOf('Notas_Admin');
      const uRegDatosCol = uh.indexOf('Registro_Datos');
      const uPurchaseMsgCol = uh.indexOf('Purchase_Message');

      let userRow = -1;
      for (let i = 1; i < usersData.length; i++) {
        if (String(usersData[i][uidCol]) === medicoId) {
          userRow = i + 1;
          break;
        }
      }
      if (userRow === -1) return createResponse({ error: 'Usuario no encontrado para compra: ' + medicoId });

      const targetPlan = String(purchase.Plan_Solicitado || '').toLowerCase();
      const planCfg = _resolvePlanConfig(targetPlan || 'normal');
      if (targetPlan && uPlanCol !== -1) {
        sheet.getRange(userRow, uPlanCol + 1).setValue(targetPlan);
      }
      if (uEstadoCol !== -1) {
        sheet.getRange(userRow, uEstadoCol + 1).setValue('active');
      }
      if (uFechaVencCol !== -1) {
        const cur = String(sheet.getRange(userRow, uFechaVencCol + 1).getValue() || '').trim();
        if (!cur) {
          const exp = new Date();
          exp.setDate(exp.getDate() + (Number(planCfg.durationDays) || 365));
          sheet.getRange(userRow, uFechaVencCol + 1).setValue(exp.toISOString().split('T')[0]);
        }
      }

      // Merge de templates compradas
      if (uTplCol !== -1) {
        let existing = [];
        try {
          const raw = String(sheet.getRange(userRow, uTplCol + 1).getValue() || '');
          if (raw && raw !== 'ALL') existing = JSON.parse(raw);
        } catch (_) {}
        let requested = [];
        try { requested = JSON.parse(String(purchase.Templates_Solicitados || '[]')); } catch (_) {}
        const merged = Array.from(new Set([].concat(existing || [], requested || [])));
        sheet.getRange(userRow, uTplCol + 1).setValue(merged.length ? JSON.stringify(merged) : '');
      }

      // Override de flags en Registro_Datos según plan
      if (uRegDatosCol !== -1) {
        let rd = {};
        try { rd = JSON.parse(String(sheet.getRange(userRow, uRegDatosCol + 1).getValue() || '{}')); } catch (_) {}
        rd.hasProMode = !!planCfg.hasProMode;
        rd.hasDashboard = !!planCfg.hasDashboard;
        rd.canGenerateApps = !!planCfg.canGenerateApps;
        sheet.getRange(userRow, uRegDatosCol + 1).setValue(JSON.stringify(rd));
      }

      const purchaseMessage = '✅ Tu compra fue aprobada y aplicada. Plan: ' + String(targetPlan || purchase.Plan_Actual || 'actual').toUpperCase();
      if (uPurchaseMsgCol !== -1) {
        sheet.getRange(userRow, uPurchaseMsgCol + 1).setValue(purchaseMessage);
      }
      if (uNotasCol !== -1) {
        const prevNotes = String(sheet.getRange(userRow, uNotasCol + 1).getValue() || '');
        const nextNotes = (prevNotes + '\n[COMPRA APLICADA ' + purchaseId + ']').trim();
        sheet.getRange(userRow, uNotasCol + 1).setValue(nextNotes);
      }

      // Actualizar estado de compra
      comprasSheet.getRange(purchaseRow, estadoCol + 1).setValue('aplicado');
      if (fechaAprobCol !== -1) comprasSheet.getRange(purchaseRow, fechaAprobCol + 1).setValue(new Date().toISOString());
      if (appliedAtCol !== -1) comprasSheet.getRange(purchaseRow, appliedAtCol + 1).setValue(new Date().toISOString());
      if (msgSentCol !== -1) comprasSheet.getRange(purchaseRow, msgSentCol + 1).setValue('true');
      if (notesCol !== -1) {
        const pn = String(purchase.Notas_Admin || '');
        const nn = (pn + '\n[APROBADA ' + auth.username + ']').trim();
        comprasSheet.getRange(purchaseRow, notesCol + 1).setValue(nn);
      }

      _sendTransferEmail(
        emailCol !== -1 ? String(purchase.Email || '') : '',
        nameCol !== -1 ? String(purchase.Nombre || '') : '',
        'Compra aprobada y aplicada',
        _safeNumber(purchase.Importe_Estimado, 0),
        String(purchase.Moneda || 'USD'),
        purchaseId
      );

      appendAdminLog(auth.username, 'approve_purchase', medicoId, 'Compra ' + purchaseId + ' aplicada');
      return createResponse({ success: true, purchaseId: purchaseId, status: 'aplicado', userId: medicoId });
    } catch (err) {
      return createResponse({ error: 'Error aprobando compra: ' + err.message });
    }
  }

  if (action === 'purchase_ack_message') {
    try {
      const medicoId = String(payload.medicoId || '').trim();
      if (!medicoId) return createResponse({ error: 'Falta medicoId' });
      const dataUsers = sheet.getDataRange().getValues();
      const uh = dataUsers[0];
      const uidCol = uh.indexOf('ID_Medico');
      const msgCol = uh.indexOf('Purchase_Message');
      if (uidCol === -1 || msgCol === -1) return createResponse({ ok: true, skipped: true });

      for (let i = 1; i < dataUsers.length; i++) {
        if (String(dataUsers[i][uidCol]) !== medicoId) continue;
        sheet.getRange(i + 1, msgCol + 1).setValue('');
        return createResponse({ ok: true, success: true });
      }

      return createResponse({ ok: true, success: true, notFound: true });
    } catch (err) {
      return createResponse({ error: 'Error confirmando mensaje de compra: ' + err.message });
    }
  }

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
    const editedHasProMode = payload.editedHasProMode !== undefined ? !!payload.editedHasProMode : null;
    const editedHasDashboard = payload.editedHasDashboard !== undefined ? !!payload.editedHasDashboard : null;
    const editedCanGenerateApps = payload.editedCanGenerateApps !== undefined ? !!payload.editedCanGenerateApps : null;

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
      if (String(regData.Estado || '').toLowerCase() !== 'pago_confirmado') {
        return createResponse({ error: 'Registro no pagado. Confirmá transferencia antes de aprobar.' });
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
        Purchase_Message: '✅ Pago verificado. Tu app está activa. Bienvenido/a.',
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
          hasProMode:      editedHasProMode,
          hasDashboard:    editedHasDashboard,
          canGenerateApps: editedCanGenerateApps,
          paymentPortalUrl: String(regData.Payment_Link || '').split('?id=')[0] || '',
          apiKeyB1:        apiKeyB1,
          apiKeyB2:        apiKeyB2
        })
      };

      const userRow = userHeaders.map(h => (userData[h] !== undefined ? userData[h] : ''));
      userSheet.appendRow(userRow);

      if (estadoCol !== -1) regSheet.getRange(regRow, estadoCol + 1).setValue('aprobado');
      const medicoIdCol = regHeaders.indexOf('ID_Medico_Asignado');
      if (medicoIdCol !== -1) regSheet.getRange(regRow, medicoIdCol + 1).setValue(medicoId);

      // Actualizar profesionales de clínica (si aplica)
      try { _approveProfesionalesClinica(regId, medicoId, regData.Profesionales || ''); }
      catch(profErr) { Logger.log('⚠️ Error actualizando profesionales: ' + profErr.message); }

      appendAdminLog(auth.username, 'approve_registration', regId, medicoId + ' / ' + plan);

      _sendWelcomeEmail(userData.Email, userData.Nombre, medicoId, plan);

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
      adminKey:      payload.adminKey      || '',
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
        regSheet.appendRow(REGISTROS_HEADERS);
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

      // Agregar columnas nuevas si no existen (sheets pre-existentes)
      const workingHeaders = existingHeaders.slice();
      ['Social_Media','Show_Phone','Show_Email','Show_Social','Billing_Cycle','License_Amount','Subscription_Amount','Total_Hoy','Plan_Solicitado','Addons_Cart','Profesionales','Payment_Link','Payment_History','Last_Receipt_Ref','Last_Receipt_At'].forEach(function(col) {
        if (!workingHeaders.includes(col)) {
          regSheet.getRange(1, workingHeaders.length + 1).setValue(col);
          workingHeaders.push(col);
        }
      });

      const regId = 'REG_' + Date.now();
      const paymentPortalUrl = String(payload.paymentPortalUrl || '').trim();
      const paymentLink = paymentPortalUrl ? (paymentPortalUrl + '?id=' + encodeURIComponent(regId)) : '';
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
        Footer_Text:        payload.footerText || wpClean.footer || '',
        Firma:              firma,
        Pro_Logo:           proLogo,
        Social_Media:       JSON.stringify(payload.socialMedia || {}),
        Show_Phone:         payload.showPhone === true || payload.showPhone === 'true' ? 'true' : 'false',
        Show_Email:         payload.showEmail === true || payload.showEmail === 'true' ? 'true' : 'false',
        Show_Social:        payload.showSocial === true || payload.showSocial === 'true' ? 'true' : 'false',
        Billing_Cycle:      payload.billingCycle || '',
        License_Amount:     payload.licenseAmount || '',
        Subscription_Amount: payload.subscriptionAmount || '',
        Total_Hoy:          payload.totalHoy || '',
        Notas:              payload.notas || '',
        Fecha_Registro:     payload.fechaRegistro || new Date().toISOString(),
        Estado:             'pendiente_pago',
        Origen:             payload.origen || 'formulario_web',
        ID_Medico_Asignado: '',
        Motivo_Rechazo:     '',
        Plan_Solicitado:    payload.planSeleccionado || '',
        Addons_Cart:        payload.addons || '',
        Profesionales:      payload.profesionales || '',
        Payment_Link:       paymentLink,
        Payment_History:    '[]',
        Last_Receipt_Ref:   '',
        Last_Receipt_At:    ''
      };
      const row = workingHeaders.map(function(h) { return rowData[h] !== undefined ? rowData[h] : ''; });

      regSheet.appendRow(row);

      _sendTransferEmail(
        email,
        payload.nombre || '',
        'Registro recibido',
        _safeNumber(payload.totalHoy, 0),
        'USD',
        regId,
        paymentLink
      );

      // Si es plan CLINIC con profesionales, guardarlos en hoja separada
      if (payload.profesionales) {
        try { _saveProfesionalesClinica(regId, payload.profesionales, ''); }
        catch(profErr) { Logger.log('⚠️ Error guardando profesionales: ' + profErr.message); }
      }

      // Notificar al admin por email (opcional, no bloquea)
      try {
        const adminEmail = Session.getEffectiveUser().getEmail();
        if (adminEmail) {
          GmailApp.sendEmail(adminEmail,
            'Nuevo registro: ' + (payload.nombre || 'Sin nombre'),
            'Nuevo profesional registrado:\n' +
            'Nombre: ' + (payload.nombre || '') + '\n' +
            'Email: ' + email + '\n' +
            'Matrícula: ' + (payload.matricula || '') + '\n' +
            'Especialidades: ' + especialidades + '\n\n' +
            'Revisá el panel de administración para aprobar o rechazar.'
          );
        }
      } catch(emailErr) { /* no bloquear si falla el email */ }

      return createResponse({ success: true, regId: regId, paymentLink: paymentLink, message: 'Registro recibido correctamente' });
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

  // log_support_request — registrar solicitud de soporte en la hoja (sin auth, lo llama el usuario)
  if (action === 'log_support_request') {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sSheet = ss.getSheetByName(SHEET_SOPORTE);
      if (!sSheet) {
        sSheet = ss.insertSheet(SHEET_SOPORTE);
        sSheet.appendRow(['ID_Solicitud','ID_Medico','Nombre','Motivo','Detalle','Device_ID','Fecha','Estado','Nota_Admin']);
        sSheet.setFrozenRows(1);
      }
      const reqId = 'SUP_' + Date.now();
      sSheet.appendRow([
        reqId,
        payload.medicoId || '',
        payload.nombre || '',
        payload.motivo || '',
        payload.detalle || '',
        payload.deviceId || '',
        new Date().toISOString(),
        'pendiente',
        ''
      ]);
      return createResponse({ success: true, requestId: reqId });
    } catch(err) {
      return createResponse({ error: 'Error registrando solicitud: ' + err.message });
    }
  }

  // send_email / send_direct_email — Enviar email directamente desde la app (con o sin PDF adjunto)
  if (action === 'send_email' || action === 'send_direct_email') {
    try {
      const to          = payload.to;         // email destinatario
      const subject     = payload.subject;    // asunto
      const htmlBody    = payload.htmlBody;    // cuerpo HTML
      const pdfB64      = payload.pdfBase64;  // PDF en base64 (opcional)
      const pdfFileName = payload.fileName || 'Informe_Medico.pdf';

      if (!to) return createResponse({ error: 'Falta campo obligatorio: to' });

      const requestedName = String(payload.senderName || '').trim();
      const safeSenderName = requestedName
        ? requestedName.replace(/[\r\n<>]/g, '').slice(0, 80)
        : 'Equipo Transcriptor Pro';
      const requestedReplyTo = String(payload.replyTo || '').trim();
      const safeReplyTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedReplyTo)
        ? requestedReplyTo.replace(/[\r\n<>]/g, '').slice(0, 120)
        : '';

      const emailOptions = {
        htmlBody: htmlBody || '<p>Mensaje de Transcriptor Médico Pro.</p>',
        name: safeSenderName
      };

      if (safeReplyTo) {
        emailOptions.replyTo = safeReplyTo;
      }

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

function _clearAdminLogsKeepHeader() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName(SHEET_LOGS);

  if (!logSheet) {
    logSheet = ss.insertSheet(SHEET_LOGS);
    logSheet.appendRow(['ID_Log','Admin_User','Accion','Usuario_Afectado','Detalles','Timestamp']);
    logSheet.setFrozenRows(1);
    return 0;
  }

  const lastRow = logSheet.getLastRow();
  if (lastRow <= 1) return 0;

  const toDelete = lastRow - 1;
  logSheet.deleteRows(2, toDelete);
  return toDelete;
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
 * Guarda los profesionales de una clínica en la hoja Profesionales_Clinica.
 * @param {string} regId         - ID del registro de clínica
 * @param {string} profesionales - JSON array string con los profesionales
 * @param {string} medicoId      - (opcional) ID_Medico asignado al aprobar
 */
function _saveProfesionalesClinica(regId, profesionales, medicoId) {
  if (!profesionales) return;
  var profs;
  try { profs = JSON.parse(profesionales); } catch(_) { return; }
  if (!Array.isArray(profs) || profs.length === 0) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var profSheet = ss.getSheetByName(SHEET_PROFESIONALES);

  // Auto-crear la hoja si no existe
  if (!profSheet) {
    profSheet = ss.insertSheet(SHEET_PROFESIONALES);
    profSheet.appendRow([
      'ID_Prof', 'ID_Registro', 'ID_Medico', 'Nombre', 'Matricula',
      'Especialidad', 'Email', 'Firma', 'Activo', 'Fecha_Alta', 'Estado'
    ]);
    profSheet.setFrozenRows(1);
  }

  var now = new Date().toISOString();
  profs.forEach(function(p, i) {
    profSheet.appendRow([
      regId + '_P' + (i + 1),                   // ID_Prof
      regId,                                      // ID_Registro
      medicoId || '',                             // ID_Medico (vacío hasta aprobar)
      p.nombre    || '',                          // Nombre
      p.matricula || '',                          // Matricula
      p.especialidad || '',                       // Especialidad
      p.email     || '',                          // Email
      p.firma     ? 'yes' : '',                   // Firma (indicador)
      p.activo !== false ? 'si' : 'no',           // Activo
      now,                                        // Fecha_Alta
      medicoId ? 'activo' : 'pendiente'           // Estado
    ]);
  });
}

/**
 * Al aprobar una clínica, actualiza ID_Medico y Estado en las filas de Profesionales_Clinica
 * que correspondan al registro aprobado.
 * @param {string} regId    - ID del registro
 * @param {string} medicoId - ID_Medico asignado
 * @param {string} profesionales - JSON string (fallback: escribe filas si no existían)
 */
function _approveProfesionalesClinica(regId, medicoId, profesionales) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var profSheet = ss.getSheetByName(SHEET_PROFESIONALES);

  // Si la hoja no existe y hay profesionales, crearla con los datos
  if (!profSheet) {
    if (profesionales) _saveProfesionalesClinica(regId, profesionales, medicoId);
    return;
  }

  var data = profSheet.getDataRange().getValues();
  var headers = data[0];
  var regCol = headers.indexOf('ID_Registro');
  var medCol = headers.indexOf('ID_Medico');
  var estCol = headers.indexOf('Estado');
  var updated = false;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][regCol]) === String(regId)) {
      if (medCol !== -1) profSheet.getRange(i + 1, medCol + 1).setValue(medicoId);
      if (estCol !== -1) profSheet.getRange(i + 1, estCol + 1).setValue('activo');
      updated = true;
    }
  }

  // Si no había filas (registro antiguo), crearlas ahora
  if (!updated && profesionales) {
    _saveProfesionalesClinica(regId, profesionales, medicoId);
  }
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

function _saveDataUrlToDrive(prefix, dataUrl) {
  const folder = _getDataFolder();
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Formato de comprobante inválido');

  const mimeType = match[1];
  const base64 = match[2];
  const bytes = Utilities.base64Decode(base64);
  const extMap = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'application/pdf': 'pdf'
  };
  const ext = extMap[mimeType] || 'bin';
  const safePrefix = String(prefix || 'receipt').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = safePrefix + '_' + Date.now() + '.' + ext;
  const blob = Utilities.newBlob(bytes, mimeType, filename);
  const file = folder.createFile(blob);
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
  'Usage_Count','Diagnostico_Pendiente','Notas_Admin','Purchase_Message','Registro_Datos',
  'Payment_History','Last_Receipt_Ref','Last_Receipt_At'
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
    s.appendRow(REGISTROS_HEADERS);
    s.setFrozenRows(1);
    result.push('Registros_Pendientes: creada');
  } else {
    _ensureSheetHeaders(regSheet, REGISTROS_HEADERS);
    result.push('Registros_Pendientes: OK');
  }

  // Solicitudes_Soporte
  const supSheet = ss.getSheetByName(SHEET_SOPORTE);
  if (!supSheet) {
    const s = ss.insertSheet(SHEET_SOPORTE);
    s.appendRow(['ID_Solicitud','ID_Medico','Nombre','Motivo','Detalle','Device_ID','Fecha','Estado','Nota_Admin']);
    s.setFrozenRows(1);
    result.push('Solicitudes_Soporte: creada');
  } else { result.push('Solicitudes_Soporte: OK'); }

  // Compras_Pendientes
  const buySheet = ss.getSheetByName(SHEET_COMPRAS);
  if (!buySheet) {
    const s = ss.insertSheet(SHEET_COMPRAS);
    s.appendRow(COMPRAS_HEADERS);
    s.setFrozenRows(1);
    result.push('Compras_Pendientes: creada');
  } else {
    _ensureSheetHeaders(buySheet, COMPRAS_HEADERS);
    result.push('Compras_Pendientes: OK');
  }

  return result;
}
