#!/usr/bin/env node
/**
 * test-approve-direct.js
 * Test directo de aprobación sin UI browser complicada
 * Simula: registro → pago → aprobación → verificación
 */

const base = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
const adminKey = 'ADMIN_SECRET_2026';

const log = (msg) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  return res.json();
}

async function testApprovalFlow() {
  const testId = Date.now();
  const email = `approved_${testId}@example.com`;
  const nombre = `Dr Aprobado ${testId}`;
  const matricula = `MAT${testId}`;
  
  log('═══════════════════════════════════════════════════════════');
  log('TEST: Flujo completo de aprobación (sin UI browser)');
  log('═══════════════════════════════════════════════════════════');
  
  // PASO 1: Crear un registro (simulando envío de formulario)
  log(`\n[PASO 1] Crear registro para: ${email}`);
  const regRes = await fetchJson(base, {
    method: 'POST',
    body: JSON.stringify({
      action: 'admin_register_doctor',
      nombre: nombre,
      matricula: matricula,
      email: email,
      telefono: '+54 9 11 1234-5678',
      especialidades: 'General',
      loginKey: `gsk_test_${testId}`,
      adminKey: adminKey
    })
  });
  
  if (!regRes.success) {
    log(`❌ Error registrando: ${regRes.error}`);
    return;
  }
  
  const regId = regRes.ID_Registro;
  log(`✅ Registro creado: ${regId}`);
  
  // PASO 2: Marcar como pagado
  log(`\n[PASO 2] Marcar registro como pagado`);
  const payRes = await fetchJson(`${base}?action=admin_mark_registration_paid&regId=${encodeURIComponent(regId)}&adminKey=${adminKey}`);
  
  if (payRes.error) {
    log(`❌ Error marcando pago: ${payRes.error}`);
    return;
  }
  
  log(`✅ Pago marcado`);
  
  // PASO 3: Aprobar (POST directo, como haría la UI)
  log(`\n[PASO 3] Aprobar registro y crear usuario}`);
  log(`         Enviando POST a admin_approve_registration...`);
  
  const approvePayload = {
    action: 'admin_approve_registration',
    regId: regId,
    plan: 'NORMAL',
    apiKey: `gsk_approve_${testId}`,
    maxDevices: 1,
    allowedTemplates: JSON.stringify(['generico']),
    editedNombre: nombre,
    editedMatricula: matricula,
    editedEmail: email,
    editedTelefono: '+54 9 11 1234-5678',
    editedEspecialidades: 'General',
    editedHeaderColor: '#1a56a0',
    editedFooterText: 'Transcriptor Pro',
    editedWorkplace: '{}',
    editedExtraWorkplaces: '[]',
    editedFirma: '',
    editedProLogo: '',
    editedHasProMode: false,
    editedHasDashboard: false,
    editedCanGenerateApps: false,
    editedSocialMedia: JSON.stringify({}),
    editedShowPhone: true,
    editedShowEmail: true,
    editedShowSocial: false,
    adminKey: adminKey
  };
  
  const approveRes = await fetchJson(base, {
    method: 'POST',
    body: JSON.stringify(approvePayload)
  });
  
  if (approveRes.error) {
    log(`❌ Error aprobando: ${approveRes.error}`);
    return;
  }
  
  if (!approveRes.success) {
    log(`❌ Aprobación no exitosa: ${JSON.stringify(approveRes)}`);
    return;
  }
  
  const medicoId = approveRes.medicoId;
  log(`✅ Aprobación exitosa!`);
  log(`   - Médico ID: ${medicoId}`);
  log(`   - Nombre: ${approveRes.nombre}`);
  log(`   - Email: ${approveRes.email}`);
  log(`   - Plan: ${approveRes.plan}`);
  
  // PASO 4: Verificar que el usuario aparece en admin_list_users
  log(`\n[PASO 4] Verificar que usuario aparece en admin_list_users`);
  log(`         Esperando 2 segundos...`);
  await new Promise(r => setTimeout(r, 2000));
  
  for (let attempt = 1; attempt <= 8; attempt++) {
    const listRes = await fetchJson(`${base}?action=admin_list_users&adminKey=${adminKey}`);
    const users = listRes.users || [];
    const found = users.find(u => u.Email === email);
    
    if (found) {
      log(`✅ Usuario ENCONTRADO en intento ${attempt}`);
      log(`   - ID: ${found.ID_Medico}`);
      log(`   - Email: ${found.Email}`);
      log(`   - Plan: ${found.Plan}`);
      log(`   - Devices_Max: ${found.Devices_Max}`);
      
      // PASO 5: Validar límites de dispositivo
      log(`\n[PASO 5] Validar límites de dispositivo (NORMAL = maxDevices=1)`);
      for (let devNum = 1; devNum <= 2; devNum++) {
        const valRes = await fetchJson(`${base}?action=validate&id=${medicoId}&deviceId=test_device_${devNum}`);
        
        if (valRes.error) {
          log(`   Device ${devNum}: ⚠️ ERROR - ${valRes.error} (code: ${valRes.errorCode})`);
        } else {
          log(`   Device ${devNum}: ✅ ACCEPTED`);
          log(`      Plan: ${valRes.plan}, maxDevices: ${valRes.maxDevices}, status: ${valRes.status}`);
        }
      }
      
      log(`\n═══════════════════════════════════════════════════════════`);
      log('✅ TEST COMPLETADO EXITOSAMENTE');
      log(`═══════════════════════════════════════════════════════════`);
      return true;
    }
    
    log(`   Intento ${attempt}: usuario no encontrado aún... aguardando 1.5s`);
    await new Promise(r => setTimeout(r, 1500));
  }
  
  log(`\n❌ TEST FALLÓ: Usuario nunca apareció en admin_list_users`);
  log(`   Total usuarios en lista: ${(await fetchJson(`${base}?action=admin_list_users&adminKey=${adminKey}`)).users.length}`);
  return false;
}

testApprovalFlow().catch(err => {
  console.error('\n❌ Error fatal:', err.message);
  process.exit(1);
});
