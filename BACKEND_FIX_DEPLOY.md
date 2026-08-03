# Incidente histórico: invalidación de caché en `admin_approve_registration`

## 🐛 Problema Encontrado
La función `admin_approve_registration` (POST) crea usuarios correctamente pero **NO invalida el cache** de `admin_list_users`. 

**Síntoma:** El usuario se crea en la Sheet pero nunca aparece en la lista para el admin (timeout en E2E test).

## ✅ Fix Aplicado
Agregué una línea en `backend/google_apps_script.js` línea **2693**:

```javascript
_invalidateAdminReadCaches();
```

Esta línea debe ejecutarse **ANTES** de `return createResponse(...)` en la función `admin_approve_registration` POST.

## Estado

**Archivo:** `backend/google_apps_script.js`  
**Línea:** 2693  
**Cambio:** Agregada línea `_invalidateAdminReadCaches();` antes del return en admin_approve_registration

---

La corrección está presente en `backend/google_apps_script.js`. Según el estado confirmado del proyecto, también fue publicada en Google Apps Script.

No aplicar este documento como una instrucción de despliegue actual. Para sincronizar el repositorio, exportar el script productivo completo y reemplazar el archivo backend entero tras verificar su integridad.
