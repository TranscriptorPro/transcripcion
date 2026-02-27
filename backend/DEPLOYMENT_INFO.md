# Apps Script Deployment Information

## Current Deployment
- **Deployment ID:** `AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ`
- **Web App URL:** `https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec`
- **Last Updated:** 2026-02-26
- **Version:** 5 (Backend Phase: auth, license validation, metrics, config generation)

## Configuration
- **Sheet Name:** `Usuarios`
- **Admin Key:** Stored in Script Properties (`ADMIN_KEY`). Entered once in browser on first login. Never hardcoded.
- **Admin Login:** `admin` / `admin2026` (change after first login)
- **Access Level:** Anyone, even anonymous (required for web app)

## CORS Configuration
✅ Google Apps Script handles CORS automatically for anonymous web apps
✅ Supports `OPTIONS` preflight via `doOptions()`
✅ Compatible with GitHub Pages

## Sheets (6)
1. `Usuarios` — Registro de médicos/usuarios
2. `Metricas_Uso` — Historial de uso
3. `Dispositivos` — Registro de dispositivos
4. `Admin_Logs` — Log de acciones administrativas
5. `Diagnosticos` — Diagnósticos remotos
6. `Admin_Users` — Usuarios del panel admin (se auto-crea en primer login)

## Endpoints

### Públicos (sin auth)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `?action=validate&id=X&deviceId=Y` | GET | Validar licencia (trial/device/status) |
| `action=save_diagnostic` | POST | Guardar diagnóstico remoto |
| `action=update_usage` | POST | Registrar uso (transcripciones) |
| `action=send_email` | POST | Enviar informe por email con PDF |

### Admin (requiere sessionToken o adminKey)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `?action=admin_login` | GET | Autenticación con token firmado |
| `?action=admin_list_users` | GET | Listar todos los usuarios |
| `?action=admin_update_user` | GET/POST | Actualizar usuario |
| `?action=admin_create_user` | GET | Crear nuevo usuario |
| `?action=admin_get_logs` | GET | Obtener logs de admin |
| `?action=admin_log_action` | GET | Registrar acción de admin |
| `?action=admin_get_metrics` | GET | Métricas de un usuario |
| `?action=admin_get_global_stats` | GET | Estadísticas globales |
| `?action=admin_request_diagnostic` | GET | Solicitar diagnóstico remoto |
| `?action=admin_get_diagnostic` | GET | Ver último diagnóstico |
| `?action=admin_generate_config` | GET | Generar config.js para clon |

## Notes
- URL changes with each new deployment version
- After updating the script, create a new version in "Gestionar implementaciones"
- Copy the new URL and update: `login.html`, `admin.html`, `diagnostic.js`, `licenseManager.js`, `admin_config.json`, this file
