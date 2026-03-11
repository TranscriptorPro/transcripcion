# CONTEXTO COMPLETO — Transcriptor Médico Pro
> Generado: sesión del 28 de febrero de 2026  
> Propósito: iniciar nueva conversación con **todo** el contexto necesario  
> Regla: NADA inventado — todo verificado contra el código fuente actual

---

## 1. QUÉ ES ESTE PROYECTO

**Transcriptor Médico Pro** es una **SPA (Single-Page Application) / PWA** que permite a médicos:

1. **Grabar o subir audio** de una consulta médica
2. **Transcribir** usando Whisper (vía Groq API)
3. **Estructurar** la transcripción en un informe médico formal usando LLaMA 3.3-70b (vía Groq API)
4. **Editar** el informe en un editor WYSIWYG con campos interactivos
5. **Exportar** como PDF profesional (con logo, firma, QR) o Word

La app corre 100% en el navegador (no hay servidor Node). El "backend" es un **Google Apps Script** que actúa como API REST para gestión de usuarios/licencias.

### Modelo de negocio
- El admin (tú) crea usuarios en el Panel de Administración (`recursos/admin.html`)
- Genera un **link de regalo/clon** que configura la app en el navegador del doctor
- El doctor abre el link → la app se autoconfigura → onboarding → listo para usar
- La API key de Groq puede ser inyectada por el admin o ingresada por el doctor

### Datos del repositorio
- **GitHub**: `TranscriptorPro/transcripcion` (organización, público)  
- **URL producción**: `https://transcriptorpro.github.io/transcripcion/`
- **Rama principal**: `main` (deploy automático vía GitHub Actions)
- **Total commits**: 450
- **Último commit**: `d3a4695` — "Sync tema oscuro/claro entre app y manual"

---

## 2. STACK TECNOLÓGICO

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + CSS + JavaScript vanilla (NO frameworks, NO TypeScript) |
| Módulos | **NO hay ES modules** — todo son IIFEs concatenados, comunicación vía `window.*` (~150 asignaciones globales) |
| Build | `node build.js` → terser minifica → copia estáticos a `dist/` |
| Deploy | GitHub Actions: push a `main` → build → deploy a GitHub Pages |
| Backend | Google Apps Script (19 endpoints REST) con Google Sheets como DB |
| APIs externas | **Groq** — Whisper (transcripción) + LLaMA 3.3-70b (estructuración) |
| Almacenamiento local | **localStorage exclusivamente** (~38 claves, límite del navegador 5-10 MB) |
| PWA | manifest.json + Service Worker (cache-first para app shell, network-first para API) |
| Tests | 287 tests en Node.js (`node tests/run_tests.js`) — parseo estático, no E2E real |
| PDF | jsPDF (cargado desde CDN, cacheado en SW) |
| Dependencias npm | `terser` (build), `playwright` (declarado pero no usado activamente) |

---

## 3. ESTRUCTURA DE ARCHIVOS

```
Transcriptor-pro/
├── index.html              # 2,312 líneas — app principal con 23 modales
├── manifest.json           # PWA manifest con shortcuts
├── sw.js                   # Service Worker v39
├── build.js                # Script de build (terser + concatenación)
├── package.json            # v2.0.0
│
├── src/
│   ├── css/                # 5 archivos CSS (variables, base, components, layout, animations)
│   └── js/
│       ├── config/
│       │   ├── config.js           # 115 líneas — CLIENT_CONFIG, carga dinámica admin/cliente
│       │   ├── templates.js        # ~4,175 líneas — 37+ plantillas médicas con prompts IA
│       │   └── studyTerminology.js # ~950 líneas — metadatos de 54 estudios médicos
│       ├── core/
│       │   ├── audio.js            # ~430 líneas — grabación, procesamiento, reparación de audio
│       │   └── state.js            # ~180 líneas — estado global de la app
│       ├── features/
│       │   ├── business.js         # ~1,017 líneas — init principal, fábrica de clones, onboarding
│       │   ├── contact.js          # ~130 líneas — modal de contacto
│       │   ├── diagnostic.js       # ~220 líneas — diagnóstico remoto
│       │   ├── editor.js           # ~3,100 líneas — editor WYSIWYG, campos, snapshots, chips
│       │   ├── formHandler.js      # ~222 líneas — manejo de PDF y datos de paciente
│       │   ├── licenseManager.js   # ~210 líneas — validación de licencia + métricas de uso
│       │   ├── medDictionary.js    # ~300 líneas — diccionario médico (200+ correcciones ASR)
│       │   ├── outputProfiles.js   # ~280 líneas — CRUD perfiles de salida
│       │   ├── patientRegistry.js  # ~430 líneas — registro de pacientes (CRUD, export/import)
│       │   ├── pdfMaker.js         # ~650 líneas — generación de PDF con jsPDF
│       │   ├── pdfPreview.js       # ~520 líneas — vista previa A4 multipágina
│       │   ├── pricingCart.js       # ~310 líneas — planes y carrito de upgrade
│       │   ├── reportHistory.js    # ~491 líneas — historial de informes por paciente
│       │   ├── sessionAssistant.js # ~250 líneas — asistente de inicio de sesión
│       │   ├── settingsPanel.js    # ~650 líneas — mega panel de config (11 secciones)
│       │   ├── structurer.js       # ~570 líneas — estructuración IA con retry inteligente
│       │   ├── transcriptor.js     # ~750 líneas — transcripción Whisper con retry robusto
│       │   └── userGuide.js        # ~350 líneas — tour, ayuda, manual (iframe overlay)
│       └── utils/
│           ├── dom.js              # ~120 líneas — utilidades DOM
│           ├── stateManager.js     # ~290 líneas — gestión de estado y autosave
│           ├── tabs.js             # ~100 líneas — sistema de tabs
│           ├── toast.js            # ~80 líneas — notificaciones toast
│           └── ui.js               # ~1,455 líneas — tema, API status, onboarding, UI general
│
├── recursos/
│   ├── admin.html          # 5,751 líneas — dashboard de administración completo
│   ├── login.html          # página de login
│   ├── registro.html       # auto-registro de doctores
│   └── manual.html         # ~855 líneas — manual completo (43 secciones, TOC, dark mode)
│
├── assets/                 # Íconos PWA (192x192 y 512x512)
│
├── backend/                # Google Apps Script + setup docs (5 archivos)
│
├── tests/                  # 20+ archivos de test HTML + runner Node.js
│
├── anexos/
│   ├── documentacion/      # ~15 archivos de documentación interna
│   ├── prompts/            # Prompts de gestión
│   └── scripts/            # Scripts auxiliares
│
└── dist/                   # Salida del build (generado, no commitear)
```

**Total código JS**: ~20,485 líneas en 28 archivos.

---

## 4. ARQUITECTURA — CÓMO FUNCIONA

### Patrón de comunicación
NO hay sistema de módulos. Cada archivo JS es un **IIFE** `(function(){ ... })()` que registra funciones en `window.*`. El build.js los concatena con `;\n` entre ellos. El resultado es un único bundle minificado.

```
Ejemplo: structurer.js define window.structureTranscription = function(...)
         editor.js llama a window.structureTranscription(...)
```

### Flujo principal del usuario
```
1. Abrir app → business.js detecta si es admin o cliente (config.js)
   - Admin: muestra todo
   - Cliente (clon): onboarding → configura datos → modo restringido
2. Grabar audio (audio.js) o subir archivo
3. Transcribir (transcriptor.js) → Whisper API vía Groq
4. Estructurar (structurer.js) → auto-detecta plantilla → LLaMA 3.3-70b
5. Editor WYSIWYG (editor.js) → campos editables [clic], chips, snapshots
6. Exportar PDF (pdfMaker.js) / Word / vista previa (pdfPreview.js) / email
```

### Backend (Google Apps Script)
- **URL única** desplegada, 19 endpoints
- Google Sheets como base de datos (6 hojas)
- Sesiones con hash SHA-256 y expiración 8h
- El admin accede desde `recursos/admin.html`

### Service Worker (sw.js v39)
- **Cache-First**: index.html, CSS, JS, jsPDF, manual.html, assets
- **Network-First**: llamadas a Groq API
- **Never-Cache**: admin.html, login.html, registro.html, tests
- Actualización: cambiar `CACHE_VERSION` fuerza purge + recache

---

## 5. FEATURES COMPLETADAS (VERIFICADO)

Todas las features planificadas del roadmap **F1** están implementadas (21/21):

| ID | Feature | Archivo principal |
|----|---------|-------------------|
| F1-A1+A2 | Formato por órgano s/p + conclusión solo positivos | structurer.js, pdfMaker.js |
| F1-B1/B2 | Tab Grabar oculta/candado en Modo Normal | editor.js |
| F1-C1 | Nombre del campo en modal de edición | editor.js |
| F1-C2 | Botones "Dejar en blanco" / "Eliminar campo" | editor.js |
| F1-D1-D4 | 4 plantillas nuevas (ETT, Eco Doppler, Nota evolución, Epicrisis) | templates.js |
| F1-E1 | Toast plantilla detectada con "Cambiar" (auto-confirma 5s) | structurer.js |
| F1-G1 | Panel registro de pacientes (tabla, editar, borrar, export/import) | patientRegistry.js |
| F1-G2 | Unificación patientHistory → patientRegistry (bridge + migración) | patientRegistry.js, formHandler.js |
| F1-K1 | Flujo primer uso (bienvenida + T&C + datos precargados) | business.js |
| F1-K2 | UI separada admin vs cliente (API key oculta) | business.js, config.js |
| F1-K3 | Botón Contacto (modal + envío vía backend) | contact.js |
| F1-PWA1-4 | PWA completa (manifest, SW, botón instalar, íconos) | sw.js, manifest.json |

**Etapas completadas**: 4, 5, 6, 8 (historial informes, autocomplete chips, PDF mejorado, versionado snapshots)

**Etapa diferida**: 7 (internacionalización) — baja prioridad, no necesaria para lanzamiento

**Backend**: 19 endpoints funcionales, 7 bugs históricos (B1-B7) resueltos

---

## 6. BUGS CONOCIDOS — VERIFICADOS EN CÓDIGO

### Severidad ALTA

| # | Bug | Detalle | Archivos |
|---|-----|---------|----------|
| 1 | **`disableButtons` definida en 2 archivos** | `ui.js` define una versión que deshabilita ciertos botones. `stateManager.js` define OTRA versión que deshabilita otros botones. La segunda sobrescribe la primera en `window.disableButtons`. **Resultado: un conjunto de botones nunca se deshabilita correctamente.** | ui.js, stateManager.js |
| 2 | **3 implementaciones de Whisper API** | `transcriptor.js` tiene la implementación robusta (4 reintentos, timeout, detección de alucinaciones, reparación de audio). `ui.js` y `editor.js` tienen implementaciones simplificadas SIN retry, SIN timeout, SIN detección de alucinaciones. Si se llaman desde esas rutas, la calidad baja drásticamente. | transcriptor.js, ui.js, editor.js |

### Severidad MEDIA

| # | Bug | Detalle | Archivos |
|---|-----|---------|----------|
| 3 | **`generatePDFBase64` hackea `window.saveToDisk`** | Para generar un PDF en base64 (para email), temporalmente reemplaza `window.saveToDisk` con un interceptor, llama a `downloadPDF()`, y luego restaura el original. Si algo falla entre medio, `saveToDisk` queda roto. Race condition posible. | pdfMaker.js |
| 4 | **Contactos fallidos nunca se reenvían** | Si el envío de un mensaje de contacto falla, se guarda en `pending_contacts` de localStorage. Pero **nunca se vuelve a intentar el envío**. Los mensajes se pierden silenciosamente. | contact.js |
| 5 | **~150 asignaciones a `window.*`** | No hay sistema de módulos. Toda la comunicación entre archivos es vía el objeto global `window`. Cualquier nombre duplicado causa sobrescritura silenciosa (ver bug #1). No hay tipado ni contrato. | todos los archivos |

### Severidad BAJA

| # | Bug | Detalle | Archivos |
|---|-----|---------|----------|
| 6 | **Backup sin cifrado** | El export de backup es JSON plano sin ningún cifrado. Contiene la API key de Groq, datos de pacientes, y toda la configuración. | settingsPanel.js |
| 7 | **CSV sin BOM UTF-8** | El export de pacientes a CSV no incluye BOM, lo que causa que Excel muestre acentos incorrectamente. | patientRegistry.js |
| 8 | **`patient_history` vs `patient_registry` duplicados** | Aunque hay un bridge de migración (F1-G2), la clave `patient_history` de formHandler.js sigue existiendo en paralelo con `patient_registry`. Doble escritura. | formHandler.js, patientRegistry.js |

---

## 7. DEUDA TÉCNICA — EVALUACIÓN HONESTA

### Crítica
1. **Sin módulos ES**: Todo son IIFEs + `window.*`. Imposible hacer tree-shaking, análisis estático, o refactoring seguro. Migrar a ESM sería un esfuerzo enorme (~150 asignaciones globales que redirigir).
2. **localStorage como única DB**: ~38 claves, límite del navegador 5-10 MB. No hay IndexedDB, no hay sincronización entre dispositivos. Si el usuario borra datos del navegador, pierde todo.
3. **Sin tipado**: JavaScript puro sin JSDoc tipado, sin TypeScript. Los contratos entre módulos son implícitos.

### Importante
4. **Archivos demasiado grandes**: `ui.js` (1,455 líneas), `business.js` (1,017 líneas), `editor.js` (~3,100 líneas), `templates.js` (~4,175 líneas). Difíciles de mantener.
5. **Sin tests E2E reales**: Los 287 tests son **análisis estático** (parsean el código buscando patrones). No hay Playwright/Cypress corriendo la app real. No se detectan bugs de runtime.
6. **23 modales en un solo HTML**: `index.html` tiene 2,312 líneas con 23 modales inline. Difícil de navegar y mantener.

### Menor
7. **Documentación desactualizada**: HOJA_DE_RUTA.md dice "SW v37" pero es v39. Algunos documentos refieren flujos anteriores.
8. **Nomenclatura inconsistente**: Mezcla de camelCase (`groq_api_key`), snake_case (`patient_registry`), y kebab-case en IDs HTML.

---

## 8. COSAS QUE FUNCIONAN BIEN (MÉRITO)

1. **Retry inteligente en transcripción**: 4 intentos con estrategia progresiva (cambio de idioma → reparación de audio). Detección de alucinaciones de Whisper. Cola de pendientes en structurer si todo falla.
2. **Retry inteligente en estructuración**: 3 modelos en cascada (LLaMA 70b → 70b v2 → 8b), 4 intentos con temperatura incremental.
3. **Fábrica de clones**: Sistema ingenioso donde el admin genera un link que pre-configura la app del doctor automáticamente.
4. **250+ correcciones ASR**: Diccionario médico que corrige errores comunes de Whisper en terminología médica.
5. **37+ plantillas médicas**: Cada una con prompt IA específico, formato de salida definido, y reglas de estructuración.
6. **PWA funcional**: Se instala, funciona offline (para la interfaz), cache inteligente.
7. **PDF profesional**: Logo, firma, QR, color de acento, márgenes configurables, perfiles de salida.
8. **Autocompletado con aprendizaje**: Chips que sugieren valores basados en uso previo + diccionario fijo de ~35 campos.
9. **Versionado en editor**: 30 snapshots automáticos con deduplicación por hash, restauración con un click.
10. **Manual completo**: 43 secciones, sidebar con TOC, scroll spy, dark mode sincronizado con la app.

---

## 9. CLAVES DE LOCALSTORAGE (38 claves verificadas)

| Clave | Propósito | Archivo(s) |
|-------|-----------|------------|
| `theme` | Tema claro/oscuro | ui.js, settingsPanel.js |
| `groq_api_key` | API key de Groq | múltiples (6+ archivos) |
| `prof_data` | Datos del profesional (nombre, matrícula, etc.) | múltiples |
| `pdf_config` | Configuración del PDF (fuente, márgenes, etc.) | múltiples |
| `workplace_profiles` | Perfiles de lugar de trabajo | múltiples |
| `client_config_stored` | Config del clon (plan, tipo, medico_id, etc.) | config.js, pricingCart.js |
| `patient_registry` | Registro de pacientes (hasta 500) | patientRegistry.js |
| `patient_history` | Historial de pacientes legacy (últimos 50) | formHandler.js |
| `report_history` | Historial de informes generados | reportHistory.js |
| `med_dictionary` | Términos custom del diccionario médico | medDictionary.js |
| `output_profiles` | Perfiles de salida guardados | transcriptor.js, settingsPanel.js |
| `device_id` | UUID del dispositivo | múltiples |
| `medico_id` | ID del médico (para clones) | licenseManager.js |
| `pending_contacts` | Mensajes de contacto fallidos (nunca reenviados) | contact.js |
| `struct_pending_queue` | Cola de estructuraciones fallidas | structurer.js |
| `pdf_logo` | Logo en base64 | formHandler.js, pdfMaker.js |
| `pdf_signature` | Firma en base64 | formHandler.js, pdfMaker.js |
| `tour_completed` | Tour interactivo completado | userGuide.js |
| `onboarding_done` | Onboarding completado | userGuide.js |
| `onboarding_accepted` | T&C aceptados | business.js |
| `settings_prefs` | Preferencias del panel de settings | settingsPanel.js |
| `quick_profiles` | Perfiles rápidos (lugar+profesional) | settingsPanel.js |
| `editor_autosave` | Borrador del editor (HTML) | stateManager.js |
| `editor_autosave_meta` | Metadata del autosave (timestamp) | stateManager.js |
| Otras 14 claves | Varias (estadísticas, preferencias, diagnóstico, etc.) | distribuidas |

---

## 10. BACKEND — GOOGLE APPS SCRIPT

### Endpoints (19 total)
```
GET:  validate, admin_login, admin_list_users, admin_create_user,
      admin_get_logs, admin_get_metrics, admin_get_global_stats,
      admin_request_diagnostic, admin_get_diagnostic, admin_generate_config,
      admin_log_action, admin_list_registrations, admin_approve_registration,
      admin_reject_registration
POST: admin_update_user, update_usage, save_diagnostic, send_email,
      register_doctor
```

### Hojas en Google Sheets (6)
`Usuarios` · `Metricas_Uso` · `Dispositivos` · `Admin_Logs` · `Diagnosticos` · `Admin_Users`

### URL del backend
Configurada en `backend_url` de localStorage. Se establece durante el factory setup o manualmente. La URL actual está en `DEPLOYMENT_INFO.md`.

---

## 11. BUILD Y DEPLOY

### Build local
```bash
npm install          # instala terser
node build.js        # genera dist/
```

El build.js:
1. Lee todos los JS en orden definido (config → core → utils → features)
2. Los concatena con `;\n` entre cada archivo (solución al bug IIFE)
3. Minifica con terser
4. Hace lo mismo con CSS
5. Copia index.html, sw.js, manifest.json, assets/, recursos/, anexos/

### Deploy
- Push a `main` → GitHub Action (`.github/workflows/deploy.yml`) ejecuta build y despliega a GitHub Pages
- Manual: `node build.js` → subir carpeta `dist/` a cualquier hosting estático

### Tests
```bash
npm test             # ejecuta node tests/run_tests.js
```
- 287 tests que pasan
- Son tests de **análisis estático** (regex sobre el código fuente)
- NO ejecutan la app en un navegador real
- NO prueban flujos de usuario reales

---

## 12. COMMITS RECIENTES (últimos 15)

```
d3a4695 Sync tema oscuro/claro entre app y manual (bidireccional)
51948a7 Manual: abrir dentro de la app (iframe overlay)
ae2a8d8 Manual: toggle modo oscuro/claro + quitar version y fecha
d7569cb Fix: proteger sesion admin de links gift + escape hatch ?admin
1205918 Fix: URL de gift links apuntaba a repo viejo (aldowagner78-cmd)
c91ba6e Fix: Manual abre pagina completa en nueva pestaña
9dbb626 Fix: Manual se abre en modal propio
dd4efb4 Fix: quitar Notification.requestPermission() automático
db45d31 Fix: IIFE concatenation bug + botones Manual y Guía en header + SW v38
d5683d9 Docs: Guía Rápida + Manual Profesional v2.0 completo
d384a94 CI: GitHub Action para deploy ofuscado a Pages
fbff0a3 Fix: test SW register pattern (287/287 pass)
056a7d4 Seguridad: build ofuscado + tamper detection + backup reminder
d973629 feat: Etapa 5 (autocomplete chips) + Etapa 8 (versionado snapshots)
03354d5 feat(K1): flujo primer uso — API Key en onboarding
```

---

## 13. ROADMAP NUEVO — TAREAS PENDIENTES PRIORIZADAS

### 🔴 PRIORIDAD 1 — Bugs que afectan funcionalidad

| # | Tarea | Esfuerzo | Impacto |
|---|-------|----------|---------|
| R1 | **Eliminar `disableButtons` duplicada**: Fusionar las dos definiciones (ui.js y stateManager.js) en una sola que deshabilite TODOS los botones necesarios. | 30 min | Botones que no se deshabilitan durante operaciones |
| R2 | **Unificar llamadas a Whisper**: Las implementaciones en ui.js y editor.js deben delegar a `transcriptor.js` (que tiene retry, timeout, y detección de alucinaciones). No duplicar lógica. | 1-2 horas | Transcripciones sin retry ni protección contra alucinaciones |
| R3 | **Reenviar contactos pendientes**: Agregar en `contact.js` un mecanismo que lea `pending_contacts` al iniciar la app y reintente el envío. | 30 min | Mensajes de soporte perdidos |
| R4 | **Refactorizar `generatePDFBase64`**: Eliminar el hack de `window.saveToDisk`. Usar jsPDF directamente para generar el base64 sin interceptar la descarga. | 1-2 horas | Race condition, saveToDisk puede quedar roto |

### 🟠 PRIORIDAD 2 — Calidad y robustez

| # | Tarea | Esfuerzo | Impacto |
|---|-------|----------|---------|
| R5 | **Agregar BOM UTF-8 al CSV export** | 5 min | Acentos rotos en Excel |
| R6 | **Cifrar o proteger el backup JSON** | 1-2 horas | API key + datos de pacientes en texto plano |
| R7 | **Eliminar `patient_history` legacy**: Si el bridge ya migra datos, eliminar las escrituras a `patient_history` en formHandler.js. Solo usar `patient_registry`. | 30 min | Doble escritura, confusión |
| R8 | **Dividir ui.js (1,455 líneas)**: Separar en al menos: `themeManager.js`, `apiStatus.js`, `onboardingUI.js`, y dejar ui.js solo como utilidades DOM. | 2-3 horas | Mantenibilidad |
| R9 | **Dividir editor.js (3,100 líneas)**: Separar en: `editorCore.js`, `editorFields.js`, `editorSnapshots.js`, `editorChips.js`. | 3-4 horas | Mantenibilidad |

### 🟡 PRIORIDAD 3 — Mejoras de UX pendientes

| # | Tarea | Esfuerzo | Impacto |
|---|-------|----------|---------|
| R10 | **Tests E2E reales con Playwright**: Los 287 tests actuales son estáticos. Crear al menos 10 tests que abran la app en un navegador, graben/transcriban/estructuren, y verifiquen el resultado. | 1-2 días | Confianza real en que la app funciona |
| R11 | **Migrar a IndexedDB**: localStorage tiene límite de 5-10 MB. Con muchos pacientes/informes/logos, se pueden perder datos. IndexedDB permite GB. | 1-2 días | Escalabilidad de datos |
| R12 | **Sincronización entre dispositivos**: Actualmente si el doctor cambia de computadora pierde todo. Opciones: backup automático al backend, o sync via Google Drive API. | 2-3 días | Retención de usuarios |

### 🔵 PRIORIDAD 4 — Futuro (diferido)

| # | Tarea | Esfuerzo | Impacto |
|---|-------|----------|---------|
| R13 | **Etapa 7 — Internacionalización**: Toda la UI está en español. Agregar selector de idioma para la UI y para el prompt de estructuración. | 2-3 días | Expansión a otros mercados |
| R14 | **Migrar a ES Modules**: Eliminar los ~150 `window.*` y usar `import/export`. Requiere reescribir el build y el patrón de comunicación entre archivos. | 3-5 días | Mantenibilidad a largo plazo |
| R15 | **TypeScript**: Agregar tipado progresivo (empezar con JSDoc + `@ts-check`). | Incrementalmente | Seguridad en refactoring |

---

## 14. NOTAS PARA LA PRÓXIMA SESIÓN

### Lo que NO debes asumir
- **NO hay framework**: No React, no Vue, no Svelte. Es JavaScript vanilla con IIFEs.
- **NO hay ES modules**: No puedes usar `import` / `export`. Todo pasa por `window.*`.
- **NO hay TypeScript**: Todo es `.js` sin tipos.
- **NO hay base de datos real**: Solo localStorage (38 claves) y Google Sheets (backend remoto).
- **NO hay tests E2E**: Los 287 tests son pattern matching sobre el código fuente, no corren la app.

### Lo que SÍ funciona bien
- La app está **funcionalmente completa** para su caso de uso. Un médico puede grabar, transcribir, estructurar, editar, y exportar informes.
- El sistema de retry en transcripción y estructuración es **robusto** (4 intentos cada uno con estrategias progresivas).
- La PWA se instala y funciona offline (para la interfaz).
- El sistema de fábrica de clones y onboarding es ingenioso y funcional.

### Cómo probar la app
1. `npm install` (una sola vez)
2. `node build.js` para generar `dist/`
3. Servir `dist/` con cualquier servidor HTTP estático (o abrir directo desde GitHub Pages)
4. La app necesita una **API key de Groq** para funcionar (transcripción + estructuración)

### Cómo correr los tests
```bash
npm test          # 287/287 deberían pasar (ejecuta node tests/run_tests.js)
```

### Cómo deployar
```bash
git add . && git commit -m "mensaje" && git push origin main
# GitHub Actions se encarga del build + deploy automático
```

### Reglas del usuario (RESPETAR SIEMPRE)
> "No dañes nada, no inventes, no mientas, no supongas"
- Verificar antes de cambiar
- Si no estás seguro, pregunta
- No tocar lo que funciona sin razón
- Cambios incrementales, commits frecuentes
- Bumper el SW version en CADA cambio que modifique archivos cacheados

---

## 15. MAPA DE DEPENDENCIAS ENTRE ARCHIVOS

```
config.js ──────────────── Leído por casi todos (CLIENT_CONFIG)
state.js ───────────────── Leído por audio.js, stateManager.js
audio.js ───────────────── Usado por transcriptor.js
transcriptor.js ────────── Llamado desde ui.js, editor.js
structurer.js ──────────── Llamado desde transcriptor.js (post-transcripción)
templates.js ───────────── Leído por structurer.js, editor.js, sessionAssistant.js
studyTerminology.js ────── Leído por structurer.js, medDictionary.js
editor.js ──────────────── Recibe output de structurer.js, llama a formHandler.js
formHandler.js ─────────── Maneja datos de paciente para pdfMaker.js
pdfMaker.js ────────────── Genera PDF, llamado desde editor.js
pdfPreview.js ──────────── Vista previa, llamada desde editor.js
reportHistory.js ───────── Llamado por pdfMaker.js al descargar
patientRegistry.js ─────── Llamado desde formHandler.js (bridge), editor.js
medDictionary.js ───────── Llamado desde transcriptor.js (post-transcripción)
outputProfiles.js ──────── Leído/escrito por settingsPanel.js, pdfMaker.js
settingsPanel.js ───────── Mega panel, toca casi todo
business.js ────────────── Punto de entrada principal (init), toca casi todo
licenseManager.js ──────── Validación en init, métricas periódicas
contact.js ─────────────── Standalone (modal + envío)
diagnostic.js ──────────── Standalone (envío de diagnóstico)
sessionAssistant.js ────── Inicio de sesión (elige profesional/lugar/plantilla)
userGuide.js ───────────── Tour + ayuda + manual
ui.js ──────────────────── Utilidades generales, tema, API status
stateManager.js ────────── Autosave, estado del editor
dom.js ─────────────────── Utilidades DOM básicas
tabs.js ────────────────── Sistema de tabs genérico
toast.js ───────────────── Sistema de notificaciones
pricingCart.js ─────────── Planes y upgrade (standalone)
```

---

*Fin del documento de contexto. Todo lo aquí documentado fue verificado contra el código fuente en su estado al commit `d3a4695`.*
