# CHECKLIST QA 30MIN - CIRCUITOS PENDIENTES (SOLO REMOTO)

Objetivo: validar SOLO lo que falta para salir a produccion, sin repetir lo que ya esta estable.

Base remota (verificada 200):
- `https://transcriptorpro.github.io/transcripcion/`
- `https://transcriptorpro.github.io/transcripcion/recursos/login.html`
- `https://transcriptorpro.github.io/transcripcion/recursos/admin.html`
- `https://transcriptorpro.github.io/transcripcion/recursos/registro.html`

Regla:
- GO: todos los bloques A/B/C/D en PASS.
- NO-GO: cualquier FAIL en A/B/C (bloqueantes).

---

## NO PROBAR (ya cubierto)

No gastar tiempo en esto salvo regresion visible:
1. Carga base de app.
2. Flujo base general ya cubierto por auditoria full.
3. Smoke postdeploy basico.

---

## 0) Preparacion (2 min)

1. Abrir terminal en raiz del repo.
2. Configurar URL remota para scripts:

```powershell
$env:APP_URL='https://transcriptorpro.github.io/transcripcion/'
```

3. Validar backend API publica/seguridad:

```powershell
node tests/test-backend-api.js
```

Marcar:
- [ ] PASS
- [ ] FAIL
Primera linea roja (si hay):

---

## A) Creacion y verificacion de clones (10 min) - BLOQUEANTE

### A1 - Crear usuarios demo en backend real

```powershell
node tests/test-create-demo-users.js
```

Valida:
1. Login admin backend.
2. Creacion/limpieza de usuarios test.
3. Validacion `action=validate` por cada clon.
4. Emision de links remotos `?id=...`.

Marcar:
- [ ] PASS
- [ ] FAIL
IDs o link con error:

### A2 - Probar los links de clon generados

Abrir al menos 3 links emitidos por el script:
1. 1 NORMAL
2. 1 GIFT
3. 1 CLINIC

Valida por cada uno:
1. Carga sin error fatal.
2. Plan/permisos visibles coherentes.
3. API key y config aplicadas.

Marcar:
- [ ] PASS
- [ ] FAIL
Clon exacto que falla:

---

## B) Permisos por tipo de plan (8 min) - BLOQUEANTE

Ejecutar:

```powershell
node tests/e2e-factory-clone.js
```

Valida:
1. Mapeo TRIAL/NORMAL/PRO/GIFT/CLINIC.
2. `canGenerateApps` segun plan.
3. Formatos permitidos por plan.
4. Limites de `maxDevices`.

Marcar:
- [ ] PASS
- [ ] FAIL
Primer FAIL:

---

## C) Circuito GIFT y limite de dispositivos (6 min) - BLOQUEANTE

Ejecutar:

```powershell
node tests/e2e-gift-clone-comprehensive.js
```

Valida:
1. Provisioning GIFT completo.
2. Workplace/branding/firma/logo.
3. Restriccion por `maxDevices`.
4. UI sin errores severos.

Marcar:
- [ ] PASS
- [ ] FAIL
Primer FAIL:

---

## D) Compra/upgrade/comercial en remoto (4 min) - ALTO

Abrir:
- `https://transcriptorpro.github.io/transcripcion/recursos/registro.html`

Valida manual express:
1. Paso Plan -> Carrito -> Resumen.
2. Cambios mensual/anual.
3. Addons y totales coherentes.
4. Envio final de solicitud (si aplica en ambiente).

Marcar:
- [ ] PASS
- [ ] FAIL
Paso exacto del fallo:

---

## E) Nuevas plantillas y control admin (4 min) - ALTO

Abrir:
- `https://transcriptorpro.github.io/transcripcion/recursos/login.html`
- `https://transcriptorpro.github.io/transcripcion/recursos/admin.html`

Valida:
1. Tab/gestion de plantillas carga sin "cargando" infinito.
2. Se pueden editar plantillas runtime.
3. Cambio persiste y se refleja en app.
4. Config de planes/usuarios visible y utilizable.

Marcar:
- [ ] PASS
- [ ] FAIL
Pantalla exacta del fallo:

---

## Cierre (<= 2 min)

Resultado final:
- [ ] GO PRODUCCION
- [ ] NO-GO

Resumen:
- A Clones: PASS / FAIL
- B Permisos por plan: PASS / FAIL
- C Gift + devices: PASS / FAIL
- D Comercial registro: PASS / FAIL
- E Plantillas/admin: PASS / FAIL

Si hay FAIL, enviarme SOLO esto:
1. Bloque y paso (ej: C/3)
2. Comando o URL exacta
3. Primera linea roja
4. Captura de consola si existe
