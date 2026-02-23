# Apps Script Deployment Information

## Current Deployment
- **Deployment ID:** `AKfycby2VEaj2Qy4TGrjL7ZG_YjfEO4ttI6fynnWLgAMafU8VMWoYoWgqJX48D5okxKOrgQiaw`
- **Web App URL:** `https://script.google.com/macros/s/AKfycby2VEaj2Qy4TGrjL7ZG_YjfEO4ttI6fynnWLgAMafU8VMWoYoWgqJX48D5okxKOrgQiaw/exec`
- **Last Updated:** 2026-02-23
- **Library URL:** `https://script.google.com/macros/library/d/1Oj1P1a443VcU7uuHkVYASOi26_zMUmcCz_PZfJq9_i-NthvAlcD07JOS/6`
- **Version:** 4 (SHEET_NAME corregido a 'Usuarios'; Metricas_Uso, Dispositivos y Admin_Logs conectados)

## Configuration
- **Sheet Name:** `Usuarios_Transcriptor`
- **Admin Key:** Hardcodeado en `admin.html` / `login.html` como `ADMIN_SECRET_2026`. Cambiar en Script Properties en producción.
- **Access Level:** Anyone, even anonymous (required for web app)

## CORS Configuration
✅ Incluye `Access-Control-Allow-Origin: *`
✅ Soporta `OPTIONS` preflight via `doOptions()`
✅ Compatible con GitHub Pages

## Endpoints (activos)
1. **GET** `?action=validate&id=USER_ID&deviceId=DEVICE_ID` — Valida usuario (app principal)
2. **GET** `?action=admin_list_users&adminKey=XXX` — Lista todos los usuarios
3. **GET** `?action=admin_update_user&userId=ID&updates=JSON&adminKey=XXX` — Edita campos de un usuario
4. **GET** `?action=admin_create_user&updates=JSON&adminKey=XXX` — Crea nuevo usuario en el Sheet
5. **POST** `action=update_usage` — Incrementa contador de uso
6. **POST** `action=admin_update_user` — Edita usuario (método POST alternativo)

## Notas
- La URL cambia con cada nuevo despliegue. Actualizar en `admin.html`, `admin_config.json` y este archivo.
- Después de cambiar el script: crear nueva versión en "Gestionar implementaciones" y copiar la nueva URL.

## Configuration
- **Sheet Name:** `Usuarios_Transcriptor`
- **Admin Key:** Set via `adminKey` in `admin_config.json` (⚠️ Change to a secure random string in production; ideally use Apps Script Properties Service)
- **Access Level:** Anyone, even anonymous (required for web app)

## CORS Configuration
✅ Includes `Access-Control-Allow-Origin: *` headers
✅ Supports `OPTIONS` preflight requests via `doOptions()` function
✅ Compatible with GitHub Pages deployment

## Endpoints
1. **GET** `?action=admin_list_users&adminKey=XXX` - List all users
2. **POST** `action=admin_update_user` - Update user fields
3. **GET** `?id=USER_ID&deviceId=DEVICE_ID` - Validate user (for main app)
4. **POST** `action=update_usage` - Increment usage counter

## Notes
- URL changes with each new deployment version
- After updating the script, create a new version in "Gestionar implementaciones"
- Copy the new URL and update `admin.html` and `admin_config.json`
