# 🔧 Fix Backend - Cache Invalidation en admin_approve_registration

## 🐛 Problema Encontrado
La función `admin_approve_registration` (POST) crea usuarios correctamente pero **NO invalida el cache** de `admin_list_users`. 

**Síntoma:** El usuario se crea en la Sheet pero nunca aparece en la lista para el admin (timeout en E2E test).

## ✅ Fix Aplicado
Agregué una línea en `backend/google_apps_script.js` línea **2693**:

```javascript
_invalidateAdminReadCaches();
```

Esta línea debe ejecutarse **ANTES** de `return createResponse(...)` en la función `admin_approve_registration` POST.

## 📋 Instrucciones de Despliegue Manual

### Opción A: Copiar y pegar directo en Google Apps Script

1. Ve a https://script.google.com
2. Abre tu proyecto de Transcriptor Pro
3. Busca la función `admin_approve_registration` (línea ~2557, es la versión POST)
4. Ubica esta sección (línea ~2685):
```javascript
appendAdminLog(auth.username, 'approve_registration', regId, medicoId + ' / ' + plan);

_sendWelcomeEmail(userData.Email, userData.Nombre, medicoId, plan);

return createResponse({
    success: true, medicoId: medicoId,
    nombre: userData.Nombre, email: userData.Email,
    plan: plan, message: 'Registro aprobado y usuario creado'
});
```

5. **Reemplaza** por esto:
```javascript
appendAdminLog(auth.username, 'approve_registration', regId, medicoId + ' / ' + plan);

_sendWelcomeEmail(userData.Email, userData.Nombre, medicoId, plan);

_invalidateAdminReadCaches();

return createResponse({
    success: true, medicoId: medicoId,
    nombre: userData.Nombre, email: userData.Email,
    plan: plan, message: 'Registro aprobado y usuario creado'
});
```

6. Haz clic en **Desplegar** (botón arriba a la derecha)
7. Selecciona **Nueva despliegue** → Tipo: **Web app**
8. Asigna a ejecutar como tu cuenta Google
9. Acceso: **Cualquiera** (incluso anónimo)
10. Copia el nuevo Deployment ID y actualiza `DEPLOYMENT_INFO.md` si cambió

### Opción B: Instalación de clasp (para futuros despliegues)

```bash
npm install -g @google/clasp

cd backend
clasp login
clasp push  # Sube los cambios
clasp deploy -d "versión a nuevas descripciones" # Despliegua versión nueva
```

## ✔️ Validación Post-Despliegue

Ejecuta el test para confirmar que funciona:

```bash
node tests/e2e-normal-real-circuit.js
```

Debería pasar sin el error "El usuario NORMAL no apareció en Usuarios".

## 📝 Cambio Realizado en archivo local

**Archivo:** `backend/google_apps_script.js`  
**Línea:** 2693  
**Cambio:** Agregada línea `_invalidateAdminReadCaches();` antes del return en admin_approve_registration

---

**Status:** ✅ Código actualizado localmente  
**Siguiente paso:** Deploy manual a Google Apps Script
