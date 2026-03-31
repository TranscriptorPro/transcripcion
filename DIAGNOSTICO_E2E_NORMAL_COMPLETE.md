# 📊 Diagnóstico Completo: E2E NORMAL Plan Test Failure

## 🔍 Investigación Ejecutada

### 1. Git Status Check
- **Hallazgo:** 224 "cambios pendientes" eran archivos no rastreados en `.github/prompts/` (library de prompts)
- **Conclusión:** No código del producto modificado

### 2. Primera Ejecución del Test E2E
```bash
node tests/e2e-normal-real-circuit.js
```
- ✅ Registro creado: `REG_1774998862608`
- ✅ Formulario completado
- ✅ Pago marcado
- ❌ **TIMEOUT esperando usuario en lista de admin**
  - Ubicación: [tests/e2e-normal-real-circuit.js:257-258](tests/e2e-normal-real-circuit.js#L257)
  - Error: "El usuario NORMAL no apareció en Usuarios"

### 3. Validación Backend Directo
Hicimos una prueba posterior aprobando manualmente via API POST:

```javascript
const resp = await fetch(base + '?action=admin_approve_registration', {
  method: 'POST',
  body: JSON.stringify({...})
});
// ✅ SUCCESS: Usuario MEDMNF8TSU2 creado
```

- ✅ Usuario creado exitosamente
- ✅ Validación device 1: NORMAL plan, maxDevices=1 → **PERMITIDO**
- ✅ Validación device 2: → **DEVICE_LIMIT (correcto)**

### 4. Diagnóstico de Latencia
Creamos un registro de prueba y medimos cuánto tarda en aparecer en `admin_list_users`:

```
Intento 1 (14.90s): usuario no encontrado
Intento 2 (20.38s): usuario no encontrado
...
Intento 15 (112.89s): usuario no encontrado
```

- ❌ El usuario **NUNCA aparecía** en `admin_list_users`, aunque la creación era exitosa

---

## 🎯 Root Cause Identificado

### 📌 El Bug
En `backend/google_apps_script.js`, la función `admin_approve_registration` **POST** (línea 2557):

1. ✅ **CREA** el usuario exitosamente en la Sheet `Usuarios`
2. ✅ **Retorna** respuesta success con medicoId
3. ❌ **NO invalida el cache** de `admin_list_users`

**Comparación:**
- Función GET (línea 1541): ✅ Llama a `_invalidateAdminReadCaches()`
- Función POST (línea 2557): ❌ NO llama a `_invalidateAdminReadCaches()`

### 🔗 Flujo del Cache
```
1. Admin UI llama: await confirmApproval()
2. Backend recibe POST admin_approve_registration
3. Backend crea usuario en Sheet ✅
4. Backend retorna success ✅
5. Frontend intenta: await _openCloneFactoryWhenReady(userId)
6. Frontend llama: admin_list_users (GET)
7. Backend carga cache en memoria (STALE, sin el nuevo usuario) ← 🐛 BUG
8. Frontend espera 8 intentos × 700ms = 5.6s MAX
9. Usuario nunca aparece → TIMEOUT ❌
```

---

## ✅ Fix Implementado

**Archivo:** `backend/google_apps_script.js`  
**Línea:** 2693  
**Cambio:** Agregada 1 línea

```diff
  appendAdminLog(auth.username, 'approve_registration', regId, medicoId + ' / ' + plan);

  _sendWelcomeEmail(userData.Email, userData.Nombre, medicoId, plan);

+ _invalidateAdminReadCaches();

  return createResponse({
    success: true, medicoId: medicoId,
    nombre: userData.Nombre, email: userData.Email,
    plan: plan, message: 'Registro aprobado y usuario creado'
  });
```

**Efecto:** Ahora cuando el frontend consulte `admin_list_users`, el backend vacía el cache y refresca desde la Sheet, encontrando el usuario recién creado.

---

## 🧪 Validación Post-Fix

### Pendiente: Despliegue a Google Apps Script
El cambio está listo en el código local, pero necesita ser desplegado a Google Apps Script.

**Ver:** [BACKEND_FIX_DEPLOY.md](BACKEND_FIX_DEPLOY.md) para instrucciones de despliegue manual.

### Test Esperado Post-Despliegue
```bash
node tests/e2e-normal-real-circuit.js
```

Debería:
1. ✅ Crear registro NORMAL
2. ✅ Marcar pago
3. ✅ Aprobar (backend invalida cache)
4. ✅ Usuario aparece en lista (frontend lo encuentra)
5. ✅ Abrir Clone Factory
6. ✅ Validar acceso y límites

---

## 📋 Análisis NORMAL Plan Correcto

Hasta donde llegamos en validación:

| Aspecto | Status | Evidencia |
|---------|--------|-----------|
| **Creación usuario** | ✅ Funciona | Usuario MEDMNF8TSU2 creado vía API |
| **Plan asignado** | ✅ NORMAL | `Plan: "NORMAL"` en response |
| **Devices_Max** | ✅ 1 | `maxDevices=1` configurado |
| **Device 1** | ✅ PERMITIDO | Validación device 1: OK |
| **Device 2** | ✅ BLOQUEADO | Validación device 2: DEVICE_LIMIT error |
| **Cache invalidation** | ❌ BUG ENCONTRADO | No se invalida en POST (ARREGLADO) |
| **E2E workflow** | ⏳ Pendiente | Espera despliegue del fix |

---

## 🚀 Próximos Pasos

1. **Despliegue POST INMEDIATO:** Ejecutar instrucciones en [BACKEND_FIX_DEPLOY.md](BACKEND_FIX_DEPLOY.md)
2. **Validación:** Correr test E2E nuevamente
3. **Producción:** Si pasa → ready to deploy

---

## 💾 Cambios Guardados

✅ Cambio aplicado en: `backend/google_apps_script.js:2693`  
✅ Commit realizado: `🐛 Fix: Invalidar cache admin_list_users en admin_approve_registration POST`  
✅ Push a `main`: ✅ Completado

---

**Generado:** 31 de marzo de 2026  
**Investigador:** Copilot Agent  
**Estado:** ✅ Fix listo, aguarda despliegue manual a Google Apps Script
