#!/usr/bin/env node
/**
 * test-comprehensive-plans-clean.js
 * Test diagnóstico comprensivo: múltiples planes con validación de límites
 */

const BASE = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';
const ADMIN_KEY = 'ADMIN_SECRET_2026';

const log = msg => console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  return res.json();
}

async function testPlan(plan, maxDevices, deviceTests) {
  log(`\n${'─'.repeat(70)}`);
  log(`PLAN: ${plan} (maxDevices=${maxDevices})`);
  log(`${'─'.repeat(70)}`);

  const testId = Date.now();
  const medicoId = `T${plan[0]}_${testId.toString(36).toUpperCase()}`;
  const email = `t${plan.toLowerCase()}_${testId}@demo`;

  // 1. Crear usuario
  const createRes = await fetchJson(BASE, {
    method: 'POST',
    body: JSON.stringify({
      action: 'admin_create_user',
      adminKey: ADMIN_KEY,
      userData: {
        ID_Medico: medicoId,
        Nombre: `Dr. ${plan}`,
        Email: email,
        Plan: plan,
        Devices_Max: maxDevices,
        Allowed_Templates: JSON.stringify(['generico']),
        API_Key: `gsk_t_${testId}`
      }
    })
  });

  if (!createRes.success) {
    log(`✅ Error crear: ${createRes.error}`);
    return 0;
  }
  log(`✅ [1] Usuario creado: ${medicoId}`);

  // 2. Verificar en lista
  await new Promise(r => setTimeout(r, 800));
  const listRes = await fetchJson(BASE + '?action=admin_list_users&adminKey=' + ADMIN_KEY);
  const found = (listRes.users || []).find(u => u.Email === email);

  if (!found) {
    log(`❌ [2] Usuario no encontrado`);
    return 1;
  }
  log(`✅ [2] Usuario en lista (${found.Plan}, maxDevices=${found.Devices_Max})`);

  // 3. Validar dispositivos
  let passed = 2;
  for (const { num, shouldAllow } of deviceTests) {
    await new Promise(r => setTimeout(r, 700));
      const valRes = await fetchJson(`${BASE}?action=validate&id=${medicoId}&deviceId=test_${plan}_d_${num}`);
    
    const isBlocked = !!(valRes.error && valRes.code === 'DEVICE_LIMIT');
    const correct = isBlocked === !shouldAllow;

    if (correct) {
      const msg = shouldAllow ? 'OK' : 'BLOQUEADO';
      log(`✅ Device ${num}: ${msg}`);
      passed++;
    } else {
      const expected = shouldAllow ? 'OK' : 'BLOQUEADO';
      const actual = isBlocked ? 'BLOQUEADO' : 'OK';
      log(`❌ Device ${num}: Exp=${expected}, Got=${actual}`);
    }
  }

  return passed;
}

async function main() {
  log(''.repeat(70));
  log('DIAGNÓSTICO COMPRENSIVO — Múltiples Planes');
  log('═'.repeat(70));

  const plans = [
    { plan: 'NORMAL',     maxDevices: 1,   devices: [{ num: 1, shouldAllow: true }, { num: 2, shouldAllow: false }] },
    { plan: 'PRO',        maxDevices: 3,   devices: [{ num: 1, shouldAllow: true }, { num: 2, shouldAllow: true }, { num: 3, shouldAllow: true }, { num: 4, shouldAllow: false }] },
    { plan: 'ENTERPRISE', maxDevices: 999, devices: [{ num: 1, shouldAllow: true }, { num: 2, shouldAllow: true }, { num: 100, shouldAllow: true }] }
  ];

  let totalPassed = 0;
  let totalExpected = 0;

  for (const { plan, maxDevices, devices } of plans) {
    totalPassed += await testPlan(plan, maxDevices, devices);
    totalExpected += 2 + devices.length; // create + list + devices
  }

  log(`\n${'═'.repeat(70)}`);
  log(`RESUMEN FINAL: ${totalPassed}/${totalExpected} tests pasados`);
  if (totalPassed === totalExpected) {
    log('✅ TODOS LOS TESTS PASARON');
  } else {
    log(`❌ FALLOS: ${totalExpected - totalPassed} tests fallaron`);
  }
  log('═'.repeat(70));

  process.exit(totalPassed === totalExpected ? 0 : 1);
}

main().catch(err => {
  log(`❌ Error: ${err.message}`);
  process.exit(1);
});
