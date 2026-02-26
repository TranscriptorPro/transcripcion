# Google Sheet Setup - Transcriptor Médico Pro

## Instrucciones

1. Ir a [Google Sheets](https://sheets.google.com) y crear una nueva hoja de cálculo.
2. Nombrar la hoja **`Usuarios_Transcriptor`**.
3. En la primera fila, crear las siguientes columnas en orden:

## Pestañas Requeridas

### 1. `Usuarios` — Registro de médicos/usuarios

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `ID_Medico` | Texto | Identificador único | `DR001`, `DR002` |
| `Nombre` | Texto | Nombre completo | `Dr. Juan Pérez` |
| `Matricula` | Texto | Matrícula médica | `MN 12345` |
| `Email` | Texto | Email (único) | `juan@example.com` |
| `Especialidad` | Texto | Especialidad médica | `Cardiología` |
| `Plan` | Texto | Plan de suscripción | `trial`, `normal`, `pro`, `enterprise` |
| `Estado` | Texto | Estado de la cuenta | `active`, `trial`, `expired`, `banned`, `inactive` |
| `Fecha_Registro` | Fecha | Fecha de registro | `2026-02-20` |
| `Fecha_Vencimiento` | Fecha | Fecha de vencimiento | `2026-02-27` |
| `Devices_Max` | Número | Máximo de dispositivos permitidos | `2`, `5`, `999` |
| `Devices_Logged` | JSON Array (Texto) | IDs de dispositivos conectados | `["dev123", "dev456"]` |
| `Usage_Count` | Número | Total de transcripciones realizadas | `0`, `15`, `342` |
| `Allowed_Templates` | JSON Array (Texto) | Templates permitidos (vacío = todos) | `["eco_cardio","rx_torax"]` |
| `API_Key` | Texto | API Key de Groq asignada al usuario | `gsk_abc123...` |
| `Diagnostico_Pendiente` | Texto | Flag de diagnóstico remoto | `true`, `false` |
| `Telefono` | Texto | Teléfono del profesional | `+54 9 11 1234-5678` |
| `Registro_Datos` | JSON (Texto) | Datos completos del registro (workplace, firma, etc.) | `{"workplace":...}` |
| `Notas_Admin` | Texto | Notas del administrador | Campo opcional |

### 2. `Metricas_Uso` — Historial de uso

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `ID_Metrica` | Texto | ID único | `MET_1234567890` |
| `ID_Medico` | Texto | FK a Usuarios | `DR001` |
| `Fecha` | Texto | Fecha (YYYY-MM-DD) | `2026-02-20` |
| `Transcripciones_Realizadas` | Número | Cantidad en esa sesión | `1` |
| `Palabras_Transcritas` | Número | Total palabras | `150` |
| `Minutos_Audio` | Número | Duración audio | `2.5` |
| `Device_ID` | Texto | Dispositivo usado | `dev_abc123` |
| `Timestamp` | Texto | ISO timestamp | `2026-02-20T15:30:00Z` |

### 3. `Dispositivos` — Registro de dispositivos

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `ID_Device` | Texto | ID único del dispositivo/navegador |
| `ID_Medico` | Texto | FK a Usuarios |
| `Device_Name` | Texto | Nombre (opcional) |
| `Device_Type` | Texto | Tipo (PC, tablet, móvil) |
| `OS_Version` | Texto | Sistema operativo |
| `Fecha_Registro` | Texto | Primera conexión |
| `Ultima_Conexion` | Texto | Última actividad |
| `Estado` | Texto | `active`, `revoked` |

### 4. `Admin_Logs` — Log de acciones administrativas

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `ID_Log` | Texto | ID único | `LOG_1234567890` |
| `Admin_User` | Texto | Quién ejecutó la acción |
| `Accion` | Texto | Tipo de acción (create_user, edit_user, login_success, etc.) |
| `Usuario_Afectado` | Texto | ID del usuario afectado |
| `Detalles` | Texto | JSON/texto con detalles |
| `Timestamp` | Texto | ISO timestamp |

### 5. `Diagnosticos` — Diagnósticos remotos

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `ID_Diag` | Texto | ID único | `DIAG_1234567890` |
| `ID_Medico` | Texto | FK a Usuarios |
| `Device_ID` | Texto | Dispositivo que envió |
| `Timestamp` | Texto | Cuándo se envió |
| `Report_JSON` | Texto | JSON con el reporte completo |

### 6. `Admin_Users` — Usuarios del panel de administración (NUEVA)

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `Username` | Texto | Nombre de usuario admin | `admin` |
| `Password_Hash` | Texto | SHA-256 de la contraseña | (generado automáticamente) |
| `Nombre` | Texto | Nombre para mostrar | `Administrador` |
| `Nivel` | Texto | Nivel de acceso | `superadmin`, `editor`, `viewer` |
| `Estado` | Texto | Estado del admin | `active`, `inactive` |
| `Ultimo_Login` | Texto | Último inicio de sesión | ISO timestamp |

> **NOTA:** La hoja `Admin_Users` se crea automáticamente en el primer login si no existe, con un usuario admin por defecto (username: `admin`, password: `admin2026`). **Cambiar la contraseña inmediatamente después del primer deploy.**

### 7. `Registros_Pendientes` — Registros de auto-inscripción de profesionales (NUEVA)

| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| `ID_Registro` | Texto | ID único | `REG_1234567890` |
| `Nombre` | Texto | Nombre del profesional | `Dr. Juan Pérez` |
| `Matricula` | Texto | Matrícula | `MN 12345` |
| `Email` | Texto | Email del profesional | `juan@ejemplo.com` |
| `Telefono` | Texto | Teléfono | `+54 9 11 1234-5678` |
| `Especialidades` | Texto | Lista separada por comas | `Cardiología, Ecografía General` |
| `Estudios` | JSON Array | Estudios seleccionados | `[{"nombre":"ETT","especialidad":"Cardiología"}]` |
| `Workplace_Data` | JSON | Datos del lugar de trabajo | `{"name":"Clínica","address":"Av. X"}` |
| `Workplace_Logo` | Texto | Indicador de logo | `yes` o vacío |
| `Extra_Workplaces` | Texto | Lugares adicionales | `Hospital Central` |
| `Header_Color` | Texto | Color hex encabezado PDF | `#1a56a0` |
| `Footer_Text` | Texto | Pie de página del PDF | `Consultorio médico — Tel: ...` |
| `Firma` | Texto | Indicador de firma | `yes` o vacío |
| `Pro_Logo` | Texto | Indicador de logo profesional | `yes` o vacío |
| `Notas` | Texto | Notas del profesional | Texto libre |
| `Fecha_Registro` | Texto | ISO timestamp | `2026-02-24T15:30:00Z` |
| `Estado` | Texto | Estado del registro | `pendiente`, `aprobado`, `rechazado` |
| `Origen` | Texto | Origen del registro | `formulario_web` |
| `ID_Medico_Asignado` | Texto | ID asignado al aprobar | `MED_ABC123` |
| `Motivo_Rechazo` | Texto | Motivo si fue rechazado | Texto libre |

> **NOTA:** La hoja `Registros_Pendientes` se crea automáticamente cuando el primer profesional se registra desde el formulario público (`registro.html`).

## Configuración de Apps Script

1. En la hoja de cálculo, ir a **Extensiones → Apps Script**.
2. Eliminar el código existente y pegar el contenido de `google_apps_script.js`.
3. Cambiar la constante `SHEET_NAME` al nombre de tu hoja si es diferente a `Usuarios`.
4. Ir a **Implementar → Nueva implementación**.
5. Tipo: **Aplicación web**.
6. Ejecutar como: **Yo**.
7. Quién tiene acceso: **Cualquier persona, incluso anónima**.
8. Copiar la URL de la aplicación web generada.
9. Pegar esa URL en el campo `scriptUrl` de `admin_config.json`.

## Configuración de ADMIN_KEY (IMPORTANTE)

1. En el editor de Apps Script, ir a **Archivo → Propiedades del proyecto → Propiedades de script**.
2. Agregar una propiedad: `ADMIN_KEY` con un valor secreto aleatorio seguro.
3. Esta clave se ingresa en el navegador del admin en el primer inicio de sesión.
4. **NUNCA** guardar la clave real en el código fuente ni en el repositorio.
5. Después del login, se usa un token de sesión firmado (8h de validez) para todas las operaciones.

## Seguridad

- El `ADMIN_KEY` se lee de Script Properties (nunca hardcodeado en el código).
- El login genera un token de sesión firmado con SHA-256, válido por 8 horas.
- Todos los endpoints admin aceptan `sessionToken` o `adminKey` directo (legacy/scripts).
- El admin ingresa su clave una sola vez en el navegador (se guarda en localStorage).
- Las contraseñas de Admin_Users se almacenan como SHA-256 hash.

## Endpoints Disponibles

### Públicos (sin auth)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `?action=validate&id=X&deviceId=Y` | GET | Validar licencia de usuario |
| `action=save_diagnostic` | POST | Guardar diagnóstico remoto |
| `action=update_usage` | POST | Registrar uso (transcripciones) |
| `action=send_email` | POST | Enviar informe por email |
| `action=register_doctor` | POST | Auto-registro de profesional |

### Admin (requiere sessionToken o adminKey)
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `?action=admin_login` | GET | Autenticación de admin |
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
| `?action=admin_list_registrations` | GET | Listar registros pendientes |
| `?action=admin_approve_registration` | GET | Aprobar registro y crear usuario |
| `?action=admin_reject_registration` | GET | Rechazar un registro |

## Datos de Ejemplo

Ver el archivo `sample_users.json` para ejemplos de datos de usuarios.
