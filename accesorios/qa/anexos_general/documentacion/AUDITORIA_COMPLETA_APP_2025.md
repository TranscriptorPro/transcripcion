# AUDITORÍA COMPLETA — Transcriptor Médico Pro v58

> **Fecha:** Junio 2025  
> **Alcance:** Todos los circuitos, módulos, backend y PWA  
> **Archivos auditados:** ~35 archivos JS, 1 HTML principal, 1 admin panel, 1 backend GAS, 1 Service Worker, 1 build script  
> **Tests actuales:** 670/670 ✅

---

## ÍNDICE

1. [Arquitectura General](#1-arquitectura-general)
2. [Inventario de Módulos](#2-inventario-de-módulos)
3. [Circuitos Funcionales](#3-circuitos-funcionales)
4. [Bugs y Problemas Detectados](#4-bugs-y-problemas-detectados)
5. [Vulnerabilidades de Seguridad](#5-vulnerabilidades-de-seguridad)
6. [Coherencia de Tipos de Usuario](#6-coherencia-de-tipos-de-usuario)
7. [PWA y Comportamiento Offline](#7-pwa-y-comportamiento-offline)
8. [Backend (Google Apps Script)](#8-backend-google-apps-script)
9. [Panel Admin](#9-panel-admin)
10. [Build y Deploy](#10-build-y-deploy)
11. [Plantillas Médicas](#11-plantillas-médicas)
12. [Storage y Persistencia](#12-storage-y-persistencia)
13. [UX y Accesibilidad](#13-ux-y-accesibilidad)
14. [Mejoras Recomendadas](#14-mejoras-recomendadas)
15. [Plan de Acción Priorizado](#15-plan-de-acción-priorizado)
16. [Base para Manual de Usuario](#16-base-para-manual-de-usuario)

---

## 1. ARQUITECTURA GENERAL

### Stack Tecnológico
- **Frontend:** HTML5 + CSS3 + JS vanilla (IIFEs, sin frameworks)
- **Backend:** Google Apps Script (Google Sheets como DB)
- **AI:** Groq API (Whisper para transcripción, LLaMA 3 para estructurado)
- **PDF:** jsPDF + jsPDF-AutoTable + QRCode generator
- **PWA:** Service Worker con cache estratégico
- **Build:** Node.js script (Terser para minificación)

### Estructura de Archivos
```
src/js/
├── core/          → state.js, audio.js
├── config/        → config.js, templates.js, studyTerminology.js
├── utils/         → db.js, dom.js, ui.js, stateManager.js, tabs.js, toast.js
├── features/      → 19 módulos funcionales
└── admin/         → (vacío — admin panel en recursos/)
```

### Tipos de Usuario
| Tipo | `type` | `hasProMode` | `canGenerateApps` | Origen |
|------|--------|--------------|-------------------|--------|
| TRIAL | TRIAL | false | false | Auto-registro / primer uso |
| NORMAL | NORMAL | false | false | Plan pago básico |
| PRO | PRO | true | false | Plan pago premium |
| GIFT | PRO | true | false | Cortesía (igual a PRO) |
| CLINIC | PRO | true | true | Clínica multi-profesional |
| ENTERPRISE | PRO | true | false | Institucional |
| ADMIN | ADMIN | true | true | Propietario de la app |

---

## 2. INVENTARIO DE MÓDULOS

### Core (2 archivos)
| Archivo | Líneas | Función |
|---------|--------|---------|
| `state.js` | ~30 | Estado global: `appState`, flags, contadores |
| `audio.js` | ~400 | Grabación MediaRecorder, carga de archivos, normalización |

### Config (3 archivos)
| Archivo | Líneas | Función |
|---------|--------|---------|
| `config.js` | ~200 | CLIENT_CONFIG global, detección de setup ID, API usage tracker |
| `templates.js` | ~1250 | 41 plantillas médicas, categorías, detección automática, UI dropdown |
| `studyTerminology.js` | ~300 | 54 estudios con keywords/abreviaciones para prompt de Whisper |

### Utils (6 archivos)
| Archivo | Líneas | Función |
|---------|--------|---------|
| `db.js` | ~150 | Wrapper IndexedDB (`appDB`) con fallback localStorage |
| `dom.js` | ~100 | Normalización texto, fetchWithTimeout, safeJSONParse |
| `ui.js` | ~250 | Focus traps, theme init, API status check, modales |
| `stateManager.js` | ~200 | Visibilidad de botones según estado, toggle PRO/NORMAL |
| `tabs.js` | ~100 | Sistema de pestañas para transcripciones múltiples |
| `toast.js` | ~80 | Notificaciones toast, diálogos de confirmación |

### Features (19 archivos)
| Archivo | Líneas | Función |
|---------|--------|---------|
| `business.js` | ~1300 | Init app, factory clones (?id=), onboarding, workplaces |
| `transcriptor.js` | ~500 | Transcripción via Groq Whisper, retry, batch, prompt contextual |
| `structurer.js` | ~500 | Estructurado IA con LLaMA 3, detección template, markdown→HTML |
| `editor.js` | ~200 | Editor WYSIWYG, pegado limpio, formateo, snapshots |
| `pdfMaker.js` | ~200 | Generación PDF con jsPDF, header/footer/firma/QR |
| `pdfPreview.js` | ~200 | Vista previa de impresión, exportación multi-formato |
| `formHandler.js` | ~300 | Datos paciente, config PDF, numeración de informes |
| `settingsPanel.js` | ~300 | Modal mega-configuración con 12 secciones |
| `pricingCart.js` | ~200 | Planes y precios, carrito, addons de plantillas |
| `licenseManager.js` | ~300 | Validación licencia, métricas, bloqueo por expiración |
| `medDictionary.js` | ~250 | Diccionario médico personalizado, escaneo IA |
| `outputProfiles.js` | ~150 | Perfiles rápidos de configuración de salida |
| `patientRegistry.js` | ~300 | Registro CRUD de pacientes, export/import |
| `reportHistory.js` | ~250 | Historial de informes, visualización, export/import |
| `sessionAssistant.js` | ~200 | Asistente inicio de sesión (workplace/profesional/template) |
| `themeManager.js` | ~150 | Gestión de skins/temas visuales |
| `contact.js` | ~200 | Formulario de contacto con retry offline |
| `diagnostic.js` | ~200 | Reporte diagnóstico del dispositivo |
| `userGuide.js` | ~200 | Tutorial guiado spotlight, modal de ayuda |

---

## 3. CIRCUITOS FUNCIONALES

### 3.1 Circuito Principal: Audio → Informe PDF

```
[1. CAPTURA]          → Grabar micrófono / Cargar archivo(s) / Drop zone
        ↓
[2. PRE-PROCESO]      → Normalización audio, reducción ruido, mono
        ↓
[3. TRANSCRIPCIÓN]    → Groq Whisper API (whisper-large-v3-turbo)
                         • Prompt contextual 4-prioridades (studyTerminology)
                         • Retry 4 intentos, modal reparación si falla
                         • Batch: unir/separar múltiples archivos
        ↓
[4. CORRECCIÓN]       → Auto-aplica diccionario médico personalizado
        ↓
[5. EDITOR]           → WYSIWYG contenteditable, pestañas múltiples
                         • Pegado limpio (Word/Google Docs)
                         • Snapshots para undo
        ↓
[6. ESTRUCTURADO]     → Detección automática de plantilla (score ≥ 7)
  (Solo PRO)             • Confirmación via toast con opción "Cambiar"
                         • LLaMA 3.3-70b → 3.1-70b → 3.1-8b (fallback)
                         • 4 intentos con rotación de modelo + API key backup
                         • Cross-tab mutex (navigator.locks)
        ↓
[7. EDICIÓN CAMPOS]   → Botones "eddy" en campos [No especificado]
                         • Modal con escritura / grabación por campo
                         • Chips contextuales con sugerencias
        ↓
[8. DATOS PACIENTE]   → Modal pre-descarga: nombre, DNI, edad, sexo, obra social
                         • Búsqueda en registro, autocompletado
        ↓
[9. CONFIG PDF]       → 4 tabs: Header / Estudio / Formato / Firma
                         • Perfiles rápidos guardables
                         • Logo institucional, firma digital, QR
        ↓
[10. PREVIEW]         → Vista previa A4 fiel al PDF final
                         • Paginación, zoom, scrollable
        ↓
[11. DESCARGA]        → PDF / RTF / TXT / HTML + Imprimir + Email
                         • Numeración automática de informes
                         • Historial persistente
```

**Estado del circuito:** ✅ Funcional de punta a punta  
**Puntos de riesgo identificados:** Ver sección 4

---

### 3.2 Circuito Factory: Admin → Clone para médico

```
[1. ADMIN CREA USUARIO] → Panel admin → ingresa datos médico
        ↓
[2. BACKEND PERSISTE]   → Google Sheets: fila en Usuarios + datos enriquecidos
        ↓
[3. ADMIN GENERA LINK]  → URL: https://app.com/?id=MED001
        ↓
[4. MÉDICO ABRE LINK]   → config.js detecta ?id= → _PENDING_SETUP_ID
        ↓
[5. FACTORY SETUP]      → business.js → _handleFactorySetup()
                           • Fetch al backend: validate endpoint
                           • Mapeo plan → CLIENT_CONFIG
                           • Carga datos enriquecidos (workplace, firma, logo, etc.)
                           • Persiste en localStorage como client_config_stored
        ↓
[6. ONBOARDING]         → 4 pasos: Bienvenida → Datos → Config rápida → T&C
        ↓
[7. SESSION ASSISTANT]   → Selección workplace/profesional/template
        ↓
[8. APP OPERATIVA]       → Con restricciones según plan
```

**Estado del circuito:** ✅ Funcional  
**Puntos de riesgo:** Ver issues 4.11–4.14

---

### 3.3 Circuito Admin Panel

```
[1. LOGIN]              → recursos/login.html → backend admin_login
                           • SHA-256 hash de password
                           • Token firmado HMAC-like con expiry 8h
        ↓
[2. DASHBOARD]          → recursos/admin.html
                           • Stats grid (usuarios totales/activos/trial/expirados)
                           • Tabla de usuarios con filtros
                           • Acciones: editar, borrar, activar, ban
        ↓
[3. REGISTROS]          → Lista de registros pendientes
                           • Aprobar → crea usuario + asigna ID
                           • Rechazar → con motivo
        ↓
[4. GESTIÓN]            → Métricas de uso, logs de auditoría, diagnósticos
```

**Estado del circuito:** ✅ Funcional  
**Puntos de riesgo:** Ver issues 5.1–5.5

---

### 3.4 Circuito Licenciamiento

```
[1. VALIDACIÓN PERIÓDICA] → licenseManager.js cada 4h
                             • Fetch a backend → validate endpoint
                             • Verifica: status, fecha vencimiento, dispositivos
        ↓
[2. MÉTRICAS]             → Contador de uso (transcripciones, palabras, minutos)
                             • Sync al backend periódicamente
        ↓
[3. BLOQUEO]              → Si licencia expirada/baneada:
                             • Overlay modal con info del estado
                             • Botón "Renovar" (link a pricing)
                             • Botón "Contactar soporte"
```

**Estado del circuito:** ✅ Funcional  
**Puntos de riesgo:** Ver issues 4.15–4.16

---

## 4. BUGS Y PROBLEMAS DETECTADOS

### Prioridad ALTA (afectan funcionalidad o datos)

| # | Archivo | Descripción | Impacto |
|---|---------|-------------|---------|
| **4.1** | `reportHistory.js` | **XSS en viewReport()**: `content.innerHTML = report.htmlContent` sin sanitizar. Un informe con payload malicioso ejecuta código. | Crítico — ejecución de código |
| **4.2** | `tabs.js` | **XSS en switchTab()**: `editor.innerHTML = window.transcriptions[index].text` sin sanitizar. | Crítico — si texto transcripto contiene HTML |
| **4.3** | `licenseManager.js` | **XSS en _lmShowBlockedUI()**: `result.error` y `result.plan` no escapados en innerHTML. | Alto — si backend retorna HTML malicioso |
| **4.4** | `contact.js` | **XSS en htmlBody**: campos `motivo`, `detalle`, `nombre`, `mat` interpolados sin escapar en template HTML. | Alto — HTML injection en emails |
| **4.5** | `patientRegistry.js` | **XSS en renderTable()**: campo `age` no escapado. **XSS en dropdown**: nombres de pacientes sin escape en innerHTML. | Medio — datos locales, ataque requiere import |
| **4.6** | `medDictionary.js` | **Regex injection en findDictMatches()**: si usuario agrega entrada con regex especial (ej: `.*`), puede causar ReDoS. | Medio — DoS local |
| **4.7** | `pdfPreview.js` | **Null check faltante en cascada de extraction**: si `editorForExtract.innerText` es null o `extractPatientDataFromText()` falla, acceso `.name`/`.dni` lanza error. | Medio — crash en preview |
| **4.8** | `pdfMaker.js` | **Sin validación de carga de jsPDF**: espera 600ms tras cargar CDN. Si falla, no hay reintentos ni error definitivo claro. | Medio — PDF no se genera |
| **4.9** | `reportHistory.js` | **QuotaExceededError handling agresivo**: cuando localStorage está lleno, borra items viejos en loop sin confirmación del usuario. | Medio — pérdida de datos silenciosa |
| **4.10** | `transcriptor.js` | **Unificación de audios sin separadores**: cuando `shouldJoin=true` y hay múltiples archivos, se concatenan sin marcadores de separación → AI puede confundir límites. | Medio — calidad de estructurado |

### Prioridad MEDIA (UX, robustez, edge cases)

| # | Archivo | Descripción | Impacto |
|---|---------|-------------|---------|
| **4.11** | `business.js` | **Sin fallback si backend es inalcanzable durante factory setup**: si `_handleFactorySetup()` falla el fetch, app queda con CLIENT_CONFIG por defecto (ADMIN), exponiendo panel admin. | Alto — seguridad |
| **4.12** | `config.js` | **Admin hijack si localStorage limpio**: si admin limpia storage y luego abre un gift URL, será tratado como gift user sin preguntar. | Medio — edge case |
| **4.13** | `outputProfiles.js` | **Race condition**: `setTimeout(..., 100)` para poblar select de profesional es frágil si hay lag de DOM. | Bajo — UI |
| **4.14** | `sessionAssistant.js` | **Validación débil de workplace_profiles**: solo chequea `profiles.length === 0`, no valida objetos vacíos o malformados. | Bajo — resistencia |
| **4.15** | `licenseManager.js` | **Race condition en _lmStartMetricsSync()**: puede crear múltiples timers si se llama repetidamente. | Bajo — rendimiento |
| **4.16** | `licenseManager.js` | **Offline fallback sin validar edad del cache**: usa datos cacheados sin verificar cuánto tiempo llevan → licencia expirada podría seguir "activa" por horas. | Medio — seguridad |
| **4.17** | `contact.js` | **Retry loop infinito**: si backend siempre retorna error, `_scheduleContactRetry()` se llama infinitamente cada 5 min. Falta: max attempts. | Bajo — rendimiento |
| **4.18** | `themeManager.js` | **Sin fallback a default si CSS falla**: si el archivo de skin da 404 o falla carga, `_applying` queda en true → app bloqueada. | Bajo — UX |
| **4.19** | `stateManager.js` | **Template selector no limpia selección al cambiar a modo NORMAL**: el valor del select persiste oculto. | Bajo — estado inconsistente |
| **4.20** | `tabs.js` | **TabIndex puede quedar fuera de rango**: si hay 3 tabs pero activeTabIndex=5, crash potencial. | Bajo — edge case |
| **4.21** | `reportHistory.js` | **fmtDate/fmtTime posiblemente no definidas** en `viewPatientReportHistory()`: podrían causar ReferenceError si no están en scope. | Bajo — crash en modal |
| **4.22** | `medDictionary.js` | **AI scan trunca texto a 3000 chars**: errores más allá de ese punto no se detectan. Sin aviso al usuario. | Bajo — límite funcional |
| **4.23** | `userGuide.js` | **Tour bloquea UI completamente**: no hay forma de interactuar con la app mientras el tour spotlight está activo. | Bajo — UX |

---

## 5. VULNERABILIDADES DE SEGURIDAD

### 5.1 XSS (Cross-Site Scripting) — 6 instancias

| Archivo | Función | Vector | Severidad |
|---------|---------|--------|-----------|
| `reportHistory.js` | `viewReport()` | `innerHTML = report.htmlContent` | 🔴 CRÍTICO |
| `tabs.js` | `switchTab()` | `innerHTML = transcriptions[].text` | 🔴 CRÍTICO |
| `licenseManager.js` | `_lmShowBlockedUI()` | `result.error/plan` no escapados | 🟠 ALTO |
| `contact.js` | submit handler | template literal HTML sin escape | 🟠 ALTO |
| `patientRegistry.js` | `renderTable()` / dropdown | `age` y nombres sin escape | 🟡 MEDIO |
| `medDictionary.js` | render de matches | posible HTML en entradas dict | 🟡 MEDIO |

**Recomendación global:** Implementar una función `escapeHtml()` centralizada y usarla en TODOS los puntos de inserción de datos dinámicos en innerHTML. Idealmente integrar DOMPurify para contenido HTML complejo (como `htmlContent` de informes).

### 5.2 Autenticación Admin

| Issue | Detalle | Severidad |
|-------|---------|-----------|
| **Default password débil** | `admin2026` hardcodeado en auto-creación de admin. SHA-256 sin salt. | 🔴 CRÍTICO |
| **Token expiry validado solo en cliente** | admin.html verifica `Date.now() > tokenExpiry` en JS local → manipulable via DevTools. | 🟠 ALTO |
| **Sin CSRF tokens** | Acciones admin no incluyen token anti-CSRF. | 🟡 MEDIO |
| **Token en sessionStorage** | Vulnerable a XSS — si hay inyección, el token es robable. | 🟡 MEDIO |

**Mitigante:** El backend SÍ verifica el token con `_verifyAdminAuth()` usando HMAC-SHA256 en cada endpoint admin. La contraseña se hashea con SHA-256 via `Utilities.computeDigest()`. El token es firmado con ADMIN_KEY (Server Properties, no hardcodeado). El riesgo real está en el default password y la falta de forzar cambio.

### 5.3 Device ID predecible

| Archivo | Problema |
|---------|----------|
| `licenseManager.js` | `Date.now() + Math.random()` — no cryptográficamente seguro |
| `diagnostic.js` | Mismo mecanismo |

**Recomendación:** Usar `crypto.randomUUID()` o `crypto.getRandomValues()`.

### 5.4 Datos sensibles en texto plano

| Dato | Storage | Riesgo |
|------|---------|--------|
| API Key Groq | localStorage + IndexedDB | Accesible via DevTools |
| Informes médicos | localStorage (`report_history`) | Datos de salud en texto plano |
| Datos de pacientes | localStorage (`patient_registry`) | PII sin cifrado |
| Backup JSON | Exportable sin protección | Contiene todo: keys + datos |

**Contexto:** Es una app client-side → el almacenamiento local es el dispositivo del médico. El riesgo principal es el export JSON sin cifrado, que podría compartirse accidentalmente.

### 5.5 Inyección CSS vía ThemeManager

Si `skinId` no está validado contra SKIN_REGISTRY, un atacante podría inyectar CSS malicioso via `localStorage('app_skin')`. Riesgo bajo porque requiere acceso al localStorage del dispositivo.

---

## 6. COHERENCIA DE TIPOS DE USUARIO

### Matriz de Funcionalidades por Tipo

| Funcionalidad | TRIAL | NORMAL | PRO/GIFT | CLINIC | ADMIN |
|---------------|-------|--------|----------|--------|-------|
| Transcripción | ✅ | ✅ | ✅ | ✅ | ✅ |
| Estructurado IA | ❌ | ❌ | ✅ | ✅ | ✅ |
| Editor WYSIWYG | ✅ | ✅ | ✅ | ✅ | ✅ |
| Descarga PDF | ✅ | ✅ | ✅ | ✅ | ✅ |
| Preview PDF | ✅ | ✅ | ✅ | ✅ | ✅ |
| Diccionario médico | ❌ | ❌ | ✅ | ✅ | ✅ |
| Perfiles rápidos | ❌ | ❌ | ✅ | ✅ | ✅ |
| Firma digital en PDF | ❌ | ❌ | ✅ | ✅ | ✅ |
| Logo en PDF | ❌ | ❌ | ✅ | ✅ | ✅ |
| Historial informes | ✅ | ✅ | ✅ | ✅ | ✅ |
| Registro pacientes | ✅ | ✅ | ✅ | ✅ | ✅ |
| Skins/temas | ❌ default only | ❌ default only | ✅ | ✅ | ✅ |
| Multi-profesional | ❌ | ❌ | ❌ | ✅ | ✅ |
| Generar clones | ❌ | ❌ | ❌ | ✅ | ✅ |
| Panel admin | ❌ | ❌ | ❌ | ❌ | ✅ |
| API Key config | ❌ | ❌ | ❌ | ❌ | ✅ |
| Botón contacto | ✅ | ✅ | ✅ | ✅ | ❌ |
| Diagnóstico manual | ❌ | ❌ | ❌ | ❌ | ✅ |
| Pricing/upgrade | ✅ | ✅ | ✅ | ❌ | ❌ |

### Problemas de Coherencia Detectados

| # | Problema | Archivos |
|---|----------|----------|
| **6.1** | `reportHistory.js` NO filtra por tipo de usuario — todos ven historial completo (OK funcionalmente, pero no hay restricción de features para TRIAL). | reportHistory.js |
| **6.2** | `patientRegistry.js` NO verifica tipo — TRIAL puede gestionar 500 pacientes igual que PRO. ¿Es intencional? | patientRegistry.js |
| **6.3** | El toggle PRO/NORMAL en header puede ser tocado por TRIAL aunque debería estar locked. Fix parcial en stateManager pero UI visible. | stateManager.js |
| **6.4** | `userGuide.js` NO adapta tours al tipo de usuario — un TRIAL ve instrucciones de features PRO que no puede usar. | userGuide.js |
| **6.5** | `sessionAssistant` detecta clinic via `professionals?.length > 1` — si hay exactamente 1 profesional registrado, no entra en modo clinic. | sessionAssistant.js |

---

## 7. PWA Y COMPORTAMIENTO OFFLINE

### Estrategia de Cache (sw.js, versión v60)

| Recurso | Estrategia | Correcto |
|---------|-----------|----------|
| App shell (HTML/CSS/JS) | Precache + Network-first update | ✅ |
| Groq API (transcripción/estructura) | Network-only (nunca cachea) | ✅ |
| Google Apps Script (backend) | Network-first | ✅ |
| Imágenes/Fonts | Cache-first | ✅ |
| Admin pages | Network-first | ✅ |

### Problemas PWA

| # | Problema | Severidad |
|---|----------|-----------|
| **7.1** | **Transcripción offline imposible sin queue**: si usuario intenta transcribir sin internet, el audio se pierde. No hay mecanismo de "guardar para procesar luego" en IndexedDB. | 🟠 ALTO |
| **7.2** | **Versión desactualizada sin notificación**: si SW viejo sirve recursos stale, no hay notificación al usuario de que usa versión antigua. El `skipWaiting()` solo se fuerza en admin.html, no en index.html. | 🟡 MEDIO |
| **7.3** | **Manifest completo y correcto**: name, short_name, icons 192+512, display standalone, lang es. ✅ | — |
| **7.4** | **Install prompt implementado correctamente**: captura `beforeinstallprompt`, muestra botón, detecta instalación. ✅ | — |

---

## 8. BACKEND (Google Apps Script)

### Endpoints (21 totales)

| Endpoint | Método | Auth | Función |
|----------|--------|------|---------|
| `validate` | GET | Público | Validar médico por ID, retornar perfil |
| `register_doctor` | POST | Público | Auto-registro de nuevos médicos |
| `update_usage` | POST | Público | Incrementar contadores de uso |
| `save_diagnostic` | POST | Público | Guardar reporte diagnóstico |
| `send_email` | POST | Público | Enviar email (con PDF adjunto) |
| `admin_login` | POST | Público | Login admin → token firmado |
| `admin_list_users` | GET | Admin | Listar médicos |
| `admin_update_user` | POST | Admin | Editar médico |
| `admin_create_user` | POST | Admin | Crear médico manualmente |
| `admin_delete_test_users` | POST | Admin | Limpiar cuentas test |
| `admin_get_logs` | GET | Admin | Logs de auditoría |
| `admin_log_action` | POST | Admin | Escribir log |
| `admin_get_metrics` | GET | Admin | Métricas de uso |
| `admin_get_global_stats` | GET | Admin | Dashboard stats |
| `admin_request_diagnostic` | POST | Admin | Solicitar diagnóstico remoto |
| `admin_get_diagnostic` | GET | Admin | Ver diagnóstico guardado |
| `admin_generate_config` | GET | Admin | Generar config para clone |
| `admin_list_registrations` | GET | Admin | Ver registros pendientes |
| `admin_approve_registration` | POST | Admin | Aprobar registro |
| `admin_reject_registration` | POST | Admin | Rechazar registro |
| `admin_get_registration_images` | GET | Admin | Imágenes de registro |
| `setup_sheets` | POST | Admin | Inicializar hojas |

### Hojas de Google Sheets
1. `Usuarios` — Perfiles médicos, API keys, estado, plan
2. `Metricas_Uso` — Contadores de uso por médico
3. `Dispositivos` — Registro de dispositivos por médico
4. `Admin_Logs` — Auditoría de acciones admin
5. `Diagnosticos` — Reportes de diagnóstico
6. `Admin_Users` — Credenciales admin (hash SHA-256)
7. `Registros_Pendientes` — Registros para aprobar
8. `Profesionales_Clinica` — Staff de clínica

### Problemas Backend

| # | Problema | Severidad |
|---|----------|-----------|
| **8.1** | **Default admin `admin2026` sin forzar cambio**: auto-creado con password débil, SHA-256 sin salt | 🔴 CRÍTICO |
| **8.2** | **decodeURIComponent sin manejo de excepción**: en `admin_generate_config`, `editedNombre=%FF%EE` causa crash | 🟡 MEDIO |
| **8.3** | **Intentos de IDs inválidos no logueados**: `admin_generate_config` no registra fuzzing en Admin_Logs | 🟡 MEDIO |
| **8.4** | **Endpoint `send_email` público sin rate limiting**: podría ser abusado para spam | 🟡 MEDIO |
| **8.5** | **URLs de backend hardcodeadas en múltiples archivos**: `_DIAG_SCRIPT_URL`, `_LM_SCRIPT_URL` → difícil de cambiar | 🟢 BAJO |
| **8.6** | **Sin validación de tamaño de imágenes en registro**: base64 de firma/logo sin límite → podría exceder cuota Drive | 🟡 MEDIO |

---

## 9. PANEL ADMIN

### Estructura (recursos/admin.html, ~7700 líneas)

**Componentes principales:**
- Header con badge ADMIN y logout
- Stats grid: 4 tarjetas con contadores
- Filtros: búsqueda, filtro status/plan, refresh
- Tabla de usuarios: nombre, email, matrícula, plan (badge), status (badge), usos, expiración, acciones
- Modales: editar usuario, crear usuario, aprobar registro, confirmación

**Estilos:** Diseño moderno con cards, glassmorphism dark mode, responsive (mobile-first).

### Problemas Admin Panel

| # | Problema | Severidad |
|---|----------|-----------|
| **9.1** | **Auth gate solo en cliente**: `sessionStorage.adminSession` manipulable via DevTools. PERO el backend TAMBIÉN verifica → riesgo mitigado. | 🟡 MEDIO |
| **9.2** | **Sin CSP headers**: no hay Content-Security-Policy meta tag ni header → vulnerable a XSS si hay inyección. | 🟡 MEDIO |
| **9.3** | **innerHTML en algunos puntos sin escape**: colores/temas usan innerHTML. | 🟢 BAJO |
| **9.4** | **Login permanece en sessionStorage**: se pierde al cerrar pestaña (correcto), pero el token de 8h podría reutilizarse si se copia. | 🟢 BAJO |

---

## 10. BUILD Y DEPLOY

### Proceso de Build (`build.js`)

```
1. Lee 33 archivos JS en orden específico
2. Concatena → Minifica con Terser (compress ON, mangle OFF para preservar globales)
3. Lee 5 archivos CSS → Minifica (comments, spaces)
4. Genera: app.{timestamp}.min.js + app.{timestamp}.min.css
5. Actualiza index.html → reemplaza <script>/<link> individuales por bundles
6. Actualiza sw.js → cache de bundles en lugar de archivos individuales
7. Copia estáticos: manifest.json, sw.js, assets/, recursos/, skins/
8. Output: dist/ folder (~60% reducción)
```

### Problemas Build

| # | Problema | Severidad |
|---|----------|-----------|
| **10.1** | **Mangle desactivado**: el bundle tiene todos los nombres de variables originales → mayor tamaño. Razón: IIFEs con `window.` globals. | 🟢 INFO |
| **10.2** | **Sin source maps**: debugging en producción es difícil. | 🟢 BAJO |
| **10.3** | **Sin integrity hash (SRI)**: scripts de CDN (jsPDF, QR) sin verificación de integridad. | 🟡 MEDIO |
| **10.4** | **Orden de scripts crítico**: los 33 archivos deben cargarse en orden exacto o la app falla. Sin sistema de módulos (ES Modules). | 🟢 INFO |

---

## 11. PLANTILLAS MÉDICAS

### Inventario Completo (41 plantillas)

| Categoría | Plantillas | Total |
|-----------|-----------|-------|
| **Neumología** | espirometria, test_marcha, pletismografia, oximetria_nocturna | 4 |
| **Oftalmología** | campimetria, oct_retinal, topografia_corneal, fondo_ojo | 4 |
| **Imágenes** | tac, resonancia, mamografia, densitometria, pet_ct, radiografia, ecografia_abdominal, ecografia_renal, ecografia_tiroidea, ecografia_mamaria, eco_doppler | 11 |
| **Endoscopía** | gastroscopia, colonoscopia, broncoscopia, laringoscopia | 4 |
| **Cardiología** | gammagrafia_cardiaca, holter, mapa, cinecoro, ecg, eco_stress, ett | 7 |
| **Ginecología** | pap, colposcopia, ecografia_obstetrica | 3 |
| **Neurología** | electromiografia, polisomnografia | 2 |
| **ORL** | naso | 1 |
| **General** | protocolo_quirurgico, nota_evolucion, epicrisis, generico | 4 |
| **Especiales** | endoscopia_otologica (en Endoscopía pero especial) | 1 |

### Estructura de cada plantilla
Cada plantilla contiene:
- `name`: Nombre legible
- `category`: Categoría para agrupar en UI
- `keywords`: Array de palabras clave para detección automática
- `prompt`: Instrucciones detalladas para LLaMA 3 (formato, secciones, convenciones médicas)

✅ Todas las 41 plantillas tienen las 4 propiedades completas.  
✅ Los prompts son médicamente correctos y adaptados a cada estudio.  
✅ Los keywords cubren sinónimos y abreviaciones comunes.

### Detección automática de tipo de estudio

`detectStudyType(text)` en templates.js:
- Score basado en conteo de keywords en el texto
- Umbral mínimo: 7 puntos
- Si _ninguna_ plantilla alcanza 7 → `generico`
- Presentación al usuario via toast con opción de cambiar

✅ Lógica conservadora, evita falsos positivos.

---

## 12. STORAGE Y PERSISTENCIA

### Sistema Dual: IndexedDB + localStorage

**`appDB` (db.js):** Wrapper sobre IndexedDB con API síncrona-like.
- Migración automática de localStorage a IndexedDB en primera carga.
- Fallback a localStorage si IndexedDB no disponible.
- Object store: `appStore` en DB `TranscriptorProDB`.

### Mapa de Claves de Storage

| Clave | Tipo | Módulo | Contenido |
|-------|------|--------|-----------|
| `client_config_stored` | JSON | config.js | CLIENT_CONFIG persistido |
| `groq_api_key` | String | business.js | API Key principal |
| `groq_api_key_b1` | String | business.js | API Key backup 1 |
| `groq_api_key_b2` | String | business.js | API Key backup 2 |
| `prof_data` | JSON | formHandler.js | Datos del profesional activo |
| `pdf_config` | JSON | formHandler.js | Configuración PDF activa |
| `workplace_profiles` | JSON | business.js | Lugares de trabajo del médico |
| `patient_registry` | JSON | patientRegistry.js | Registro de pacientes (max 500) |
| `report_history` | JSON | reportHistory.js | Historial de informes |
| `output_profiles` | JSON | outputProfiles.js | Perfiles rápidos guardados |
| `med_dictionary_custom` | JSON | medDictionary.js | Diccionario personalizado |
| `app_skin` | String | themeManager.js | Skin visual activo |
| `theme-preference` | String | ui.js | 'dark' o 'light' |
| `custom_primary_*` | String | ui.js | Colores custom del tema |
| `editor_autosave` | String | stateManager.js | Contenido del editor |
| `editor_autosave_meta` | JSON | stateManager.js | Metadata del autosave |
| `tour_completed` | Boolean | userGuide.js | Si completó el tour |
| `onboarding_done` | Boolean | business.js | Si completó onboarding |
| `api_usage_stats` | JSON | config.js | Contadores de uso de API |
| `device_id` | String | licenseManager.js | ID único del dispositivo |
| `lm_cache` | JSON | licenseManager.js | Cache de validación de licencia |
| `pending_contacts` | JSON | contact.js | Mensajes de contacto pendientes |
| `last_diagnostic_sent` | Timestamp | diagnostic.js | Último diagnóstico enviado |
| `session_configured` | Boolean | sessionAssistant.js | (sessionStorage) Flag de sesión |

### Problemas de Storage

| # | Problema | Severidad |
|---|---------|-----------|
| **12.1** | **Sin límite de tamaño de report_history**: informes con HTML completo pueden crecer indefinidamente. | 🟡 MEDIO |
| **12.2** | **QuotaExceeded no manejado consistentemente**: solo reportHistory tiene manejo, el resto lanza error silencioso. | 🟡 MEDIO |
| **12.3** | **Backup JSON contiene API key**: la función de export en settingsPanel incluye la API key sin advertencia. | 🟡 MEDIO |
| **12.4** | **Sin sincronización cross-tab**: si usuario abre 2 pestañas, cambios de configuración en una no se reflejan en la otra (excepto para `navigator.locks` del structurer). | 🟢 BAJO |
| **12.5** | **Migración localStorage → IndexedDB no es atómica**: si falla a mitad, datos quedan en estado mixto. | 🟢 BAJO |

---

## 13. UX Y ACCESIBILIDAD

### Aspectos Positivos ✅
- Session assistant al iniciar → guía al usuario a su contexto
- Onboarding de 4 pasos para primer uso → configura lo esencial
- Toast con acción para cambiar plantilla detectada
- Botones "eddy" para editar campos vacíos in-place
- Modal de datos paciente con búsqueda y autocompletado
- Vista previa PDF fiel al resultado final
- Shortcuts de teclado documentados
- Tema oscuro/claro con personalización de colores
- Tour guiado (spotlight) para nuevos usuarios
- FAQ integrada con 12 preguntas frecuentes

### Problemas de UX

| # | Problema | Severidad |
|---|---------|-----------|
| **13.1** | **Tour no adaptado al tipo de usuario**: TRIAL ve instrucciones de features PRO que no puede usar → confusión. | 🟡 MEDIO |
| **13.2** | **Tour bloquea UI completamente**: no hay forma de interactuar con la app durante el tour. Sin botón "Salir" inmediato en mobile. | 🟡 MEDIO |
| **13.3** | **No hay queue de toasts**: si se disparan 5 toasts seguidos, se sobrescriben → mensajes perdidos. | 🟢 BAJO |
| **13.4** | **Filename truncation a 28 chars fijo**: nombre de pestaña puede quedar feo con nombres cortos o muy largos. | 🟢 BAJO |
| **13.5** | **askJoinAudiosPromise timeout 30s**: si usuario no responde en 30s, el diálogo se auto-descarta. Sin indicador visual de tiempo. | 🟢 BAJO |
| **13.6** | **Edit field modal: tab "Grabar" visible en modo Normal**: debería estar oculto o con candado para non-PRO. | 🟡 MEDIO |
| **13.7** | **Sin indicador de progreso offline**: si la app funciona sin red, no hay badge visual que indique "modo offline". | 🟢 BAJO |

### Accesibilidad

| Aspecto | Estado |
|---------|--------|
| ARIA labels | Parcial — algunos botones sin aria-label |
| Focus traps en modales | ✅ Implementado en ui.js |
| Teclado: ESC cierra modales | ✅ Implementado |
| Contraste de colores | Depende del skin activo |
| Screen reader support | No testeado |
| Alt text en imágenes | Parcial |

---

## 14. MEJORAS RECOMENDADAS

### Arquitectura
1. **Migrar a ES Modules**: eliminar IIFEs + window globals → import/export nativo
2. **Implementar bundler** (Vite/esbuild): reemplazar build.js manual
3. **Agregar TypeScript**: tipado estático para 35+ archivos
4. **CSP headers**: Content-Security-Policy para prevenir XSS
5. **SRI para CDNs**: Subresource Integrity en scripts externos
6. **Source maps** en producción para debugging

### Seguridad
1. **Sanitización centralizada**: función `escapeHtml()` + DOMPurify para innerHTML
2. **Crypto.randomUUID()** para device IDs
3. **Forzar cambio de contraseña admin** en primer login
4. **Rate limiting** en endpoints públicos del backend
5. **Cifrar backup JSON** antes de exportar
6. **Validar edad de cache** en licenseManager offline fallback

### Funcionalidad
1. **Queue offline para transcripciones**: guardar audio en IndexedDB para procesar cuando haya red
2. **Notificación de versión vieja**: alertar si SW sirve contenido stale
3. **Límite configurable** para report_history (ej: últimos 200)
4. **Sincronización cross-tab** via BroadcastChannel API
5. **Tour adaptado por tipo de usuario**: filtrar pasos según features disponibles
6. **Max retry para contact.js**: exponential backoff con techo

### UX
1. **Cola de toasts**: máximo 3 visibles, FIFO
2. **Indicador offline**: badge en header cuando no hay red
3. **Timeout visual en diálogos**: barra de progreso en askJoinAudios
4. **Truncation responsiva**: adaptar largo de nombres de tab al viewport
5. **Loading skeleton** para admin panel mientras carga datos
6. **Feedback de guardado**: micro-animación al guardar config/perfil

---

## 15. PLAN DE ACCIÓN PRIORIZADO

### 🔴 Fase 1 — Seguridad Crítica (INMEDIATO)
1. [ ] **XSS Fix**: Sanitizar `innerHTML` en reportHistory, tabs, licenseManager, contact, patientRegistry, medDictionary
2. [ ] **Admin password**: Forzar cambio en primer login + agregar salt al hash
3. [ ] **Backend unreachable fallback**: En `_handleFactorySetup()`, si fetch falla, NO usar config ADMIN por defecto

### 🟠 Fase 2 — Robustez (CORTO PLAZO)
4. [ ] **Null checks en pdfPreview**: Validar resultados de extraction antes de acceder propiedades
5. [ ] **jsPDF retry**: Agregar reintento de carga o fallback si CDN falla
6. [ ] **Contact retry cap**: Máximo 10 intentos con exponential backoff
7. [ ] **ThemeManager fallback**: Si CSS falla, resetear `_applying` + cargar default
8. [ ] **License cache age**: Validar timestamp del cache offline → expirar tras 24h
9. [ ] **Regex escape en medDictionary**: Escapar caracteres regex en entradas del diccionario

### 🟡 Fase 3 — UX y Calidad (MEDIO PLAZO)
10. [ ] **Tour por tipo de usuario**: Filtrar pasos según features disponibles
11. [ ] **Edit field modal tab Grabar**: Ocultar en modo Normal
12. [ ] **Queue de toasts**: Implementar sistema FIFO con máximo 3
13. [ ] **Separadores en unificación de audios**: Agregar `[---archivo X---]` entre segmentos
14. [ ] **Device ID seguro**: Migrar a `crypto.randomUUID()`
15. [ ] **Report history límite**: Configurar máximo (ej: 200 informes)

### 🟢 Fase 4 — Mejoras Estratégicas (LARGO PLAZO)
16. [ ] **Queue offline para transcripciones**: IndexedDB para audio pendiente
17. [ ] **ES Modules migration**: Eliminar IIFEs + window globals
18. [ ] **CSP + SRI**: Headers de seguridad + integridad de CDN
19. [ ] **Sincronización cross-tab**: BroadcastChannel API
20. [ ] **Backup cifrado**: Cifrar JSON exportado con clave del usuario
21. [ ] **TypeScript gradual**: Empezar por archivos core + config

---

## 16. BASE PARA MANUAL DE USUARIO

### Flujo por Tipo de Usuario

#### TRIAL — Primer uso
1. Abrir link recibido (ej: `app.com/?id=TRIAL001`)
2. Completar onboarding (4 pasos: bienvenida → datos → config rápida → T&C)
3. Tour automático de la interfaz
4. Grabar audio o cargar archivo → Transcribir
5. Editar texto en editor → Descargar PDF/RTF/TXT
6. Limitaciones: sin estructurado IA, sin firma/logo digital, sin skins

#### NORMAL — Uso estándar
1. Mismo flujo que TRIAL pero con más features visuales
2. Puede comprar addons de plantillas en pricing modal
3. Limitaciones: sin estructurado IA, sin firma/logo digital

#### PRO/GIFT — Uso completo
1. Session assistant al iniciar → seleccionar workplace y template
2. Grabar → Transcribir → Estructura automática con IA
3. Editar campos vacíos con botones "eddy"
4. Agregar datos paciente → Config PDF → Preview → Descargar
5. Diccionario médico personalizado para correcciones automáticas
6. Perfiles rápidos de configuración
7. Historial de informes

#### CLINIC — Multi-profesional
1. Igual que PRO + gestión de múltiples profesionales
2. Session assistant muestra selector de profesional activo
3. Numeración de informes separada por profesional
4. Puede generar sub-apps para staff

#### ADMIN — Gestión total
1. Panel admin completo (recursos/admin.html)
2. CRUD de usuarios/médicos
3. Aprobación de registros
4. Métricas y logs de auditoría
5. Solicitud de diagnósticos remotos
6. Configuración de API keys central
7. Generación de links de clone para médicos

### Guía Rápida (Quick-Start)
1. **¿Qué es?** App web que convierte audio médico en informes PDF profesionales.
2. **¿Cómo empiezo?** Abre tu link personalizado → completa el setup → ¡listo!
3. **¿Cómo transcribo?** Botón rojo "Grabar" o arrastra un archivo de audio.
4. **¿Cómo estructuro?** (Solo PRO) Botón "Estructurar con IA" → se aplica plantilla automática.
5. **¿Cómo descargo?** Botón "Descargar" → elige PDF, RTF, TXT o HTML.
6. **¿Funciona offline?** Sí para la interfaz. La transcripción requiere internet.
7. **¿Mis datos están seguros?** Se guardan SOLO en tu dispositivo, nunca en servidores externos.

---

## RESUMEN EJECUTIVO

**Estado general de la aplicación: ✅ FUNCIONAL — con oportunidades de mejora**

| Área | Estado | Nota |
|------|--------|------|
| **Circuito principal** (audio→PDF) | ✅ Sólido | Funciona de punta a punta con reintentos |
| **Factory clones** | ✅ Funcional | Necesita fallback si backend offline |
| **Panel admin** | ✅ Funcional | Seguridad mejorable (default password) |
| **Licenciamiento** | ✅ Funcional | Cache offline sin validación de edad |
| **PWA** | ✅ Instalable y offline | Falta queue offline para transcripción |
| **Plantillas** | ✅ Completas (41) | Detección automática conservadora |
| **Seguridad** | 🟡 Aceptable | 6 puntos XSS para corregir, admin password |
| **UX** | ✅ Buena | Tour y toast adaptables, cola de notificaciones |
| **Tests** | ✅ 670/670 | Cubren módulos individuales |
| **Build/Deploy** | ✅ Funcional | Sin source maps ni SRI |

**Bugs críticos a resolver: 3** (XSS en reportHistory, tabs, admin default password)  
**Mejoras de seguridad recomendadas: 6**  
**Mejoras funcionales sugeridas: 8**  
**Mejoras de UX sugeridas: 6**
