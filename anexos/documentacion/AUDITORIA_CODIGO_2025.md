# 🔍 AUDITORÍA COMPLETA DEL CÓDIGO — Transcriptor Médico Pro

**Fecha:** Junio 2025  
**Versión auditada:** 2.0.0  
**Total de líneas:** ~20.485 (13.370 JS + 4.501 CSS + 2.221 HTML + 393 raíz)

---

## 📊 RESUMEN EJECUTIVO

| Métrica | Valor |
|---------|-------|
| Archivos JS | 28 |
| Archivos CSS | 5 |
| HTML principal | 1 (2.221 líneas) |
| LOC totales | ~20.485 |
| Framework | Ninguno (Vanilla JS) |
| Sistema de módulos | **Ninguno** — todo son globals en `window` |
| Build system | Concatenación + Terser |
| Backend | Google Apps Script |
| Persistencia | 100% localStorage |
| APIs externas | Groq (Whisper + LLaMA 3) |
| PDF engine | jsPDF + jsPDF-AutoTable (CDN) |
| PWA | Sí (manifest + service worker) |

### Veredicto general: ⚠️ App funcional y sorprendentemente rica en features, pero arquitectura frágil

La app es un **monolito client-side impresionante** con ~30 features implementadas que cubren transcripción de voz, estructurado con IA, generación de PDF profesional, registro de pacientes, historial de informes, sistema de licencias, onboarding, perfiles de salida, diccionario médico, tour interactivo, pricing/upgrade, envío de email, y más.

**El problema central:** todo está conectado por globals (`window.*`), sin sistema de módulos, sin types, sin tests unitarios. El acoplamiento implícito hace que cualquier cambio sea de alto riesgo.

---

## 📁 INVENTARIO ARCHIVO POR ARCHIVO

### 🔧 Config (3 archivos — 1.510 LOC)

#### `config.js` — 110 líneas
- **Qué hace:** Define `CLIENT_CONFIG` global con tipo de usuario (ADMIN/TRIAL/NORMAL/PRO), permisos, y plantillas permitidas. Carga config dinámica desde localStorage o URL `?id=`. Implementa escape hatch `?admin`. Incluye `apiUsageTracker` para conteo local.
- **Exports:** `window.CLIENT_CONFIG`, `window.apiUsageTracker`
- **Dependencias:** Ninguna
- **Estado:** ✅ Completo y funcional
- **Problemas:**
  - El placeholder `/* {{CONFIG_IDENTITY}} */` en línea 1 nunca se reemplaza en el build
  - `apiUsageTracker` debería estar en un archivo separado (principio de responsabilidad única)
  - `_PENDING_SETUP_ID` es un flag silencioso que otros archivos deben verificar — frágil

#### `templates.js` — 817 líneas
- **Qué hace:** Define `MEDICAL_TEMPLATES` (diccionario de ~30 plantillas con prompts de IA) y `TEMPLATE_CATEGORIES` (agrupación por especialidad).
- **Exports:** `window.MEDICAL_TEMPLATES`, `window.MEDICAL_SPECIALTIES`, `window.TEMPLATE_CATEGORIES`
- **Dependencias:** Ninguna
- **Estado:** ✅ Completo
- **Plantillas encontradas:** espirometría, test de marcha, pletismografía, oximetría nocturna, campimetría, OCT, topografía corneal, fondo de ojo, TAC, RMN, mamografía, densitometría, PET-CT, rx tórax, eco abdominal, gastroscopía, colonoscopía, broncoscopía, laringoscopía, SPECT, Holter, MAPA, cinecoronariografía, ECG, eco-stress, ecocardiograma (ETT), eco Doppler vascular, ergometría, ETE, PAP, genérico
- **Problemas:**
  - Los prompts son enormes strings en el archivo — dificultan la lectura
  - No hay versionado de prompts (si se cambia uno, no hay rollback)
  - Algunas plantillas del roadmap (nota de evolución, epicrisis) todavía no están implementadas

#### `studyTerminology.js` — 583 líneas
- **Qué hace:** Array de 54 estudios con keywords, abreviaturas, clasificaciones y unidades para mejorar el prompt de Whisper y la detección de plantilla.
- **Exports:** `window.STUDY_TERMINOLOGY`
- **Dependencias:** Ninguna
- **Estado:** ✅ Completo. Datos de alta calidad sourced de PubMed/NLM.
- **Problemas:**
  - Sin campo `whisperCorrections` que sí se menciona en el encabezado
  - No se usa directamente en `autoDetectTemplateKey()` — solo en `buildWhisperPrompt()`

---

### 🏗️ Core (2 archivos — 371 LOC)

#### `state.js` — 23 líneas
- **Qué hace:** Declara todas las variables globales de estado: `currentMode`, `appState`, `uploadedFiles`, `transcriptions`, `undoStack`, `redoStack`, `isRecording`, `GROQ_API_KEY`.
- **Estado:** ✅ Correcto
- **Problemas:**
  - **23 líneas para definir 14 globals** — el valor es mínimo, pero es el único lugar centralizado de estado
  - `GROQ_API_KEY` se inicializa desde localStorage aquí pero TAMBIÉN se lee ad-hoc en muchos archivos
  - No hay schema/type definitions — cualquier archivo puede mutar cualquier global sin validación

#### `audio.js` — 348 líneas
- **Qué hace:** Grabación de audio en vivo (MediaRecorder), drag & drop de archivos, lista visual de archivos, playback, procesamiento de audio (normalización, reducción de ruido con Web Audio API).
- **Exports:** `window.updateFileList`, `window.togglePlayAudio`, `window.removeFile`, `window.processAudio`
- **Dependencias:** `showToast`, `handleFiles` → `updateFileList`, `updateButtonsVisibility`
- **Estado:** ✅ Funcional
- **Problemas:**
  - Warning a 30 min y auto-stop a 45 min → solo funciona si la tab no se suspende (Chrome background throttling)
  - `processAudio` lee checkboxes del DOM directamente → acoplamiento UI/lógica
  - La reducción de ruido con OfflineAudioContext es rudimentaria (solo gain) — promete más de lo que da
  - `handleFiles` filtra por tamaño 25MB (límite de Groq), pero no lo comunica claramente al usuario
  - `updateFileList` usa `onclick="removeFile(${i})"` inline — XSS potencial si el nombre de archivo contiene comillas (mitigado porque solo se muestra `item.file.name`)

---

### 🛠️ Utils (5 archivos — 1.904 LOC)

#### `dom.js` — 136 líneas
- **Qué hace:** Helpers `$()`, `safeJSONParse()`, `fetchWithTimeout()` con AbortController, normalización de texto (`normalizeFieldText` con modo oración/nombre, preservando siglas médicas), auto-normalización de campos de formulario al blur.
- **Exports:** `window.safeJSONParse`, `window.fetchWithTimeout`, `window.normalizeFieldText`
- **Estado:** ✅ Sólido
- **Problemas:**
  - Set de 100+ siglas médicas hardcodeado — debería alimentarse también del `studyTerminology.js`
  - Auto-normalización al blur puede ser confusa si el usuario escribe algo intencionalmente en mayúsculas

#### `toast.js` — 72 líneas
- **Qué hace:** Notificaciones toast simples y con botón de acción. Diálogo inline para preguntar si unir audios.
- **Exports:** `showToast`, `window.showToastWithAction`, `window.askJoinAudiosPromise`
- **Estado:** ✅ Funcional
- **Problemas:**
  - `showToast` no es `window.showToast` explícitamente — funciona por hoisting pero es inconsistente
  - `askJoinAudiosPromise` está metido en toast.js — no es un toast, debería estar aparte
  - Solo 1 toast visible a la vez (el anterior desaparece) — los mensajes se pierden si llegan en ráfaga

#### `ui.js` — 1.304 líneas ⚠️ ARCHIVO MÁS GRANDE
- **Qué hace:** **Todo el cableado de UI**: focus trap para modales, theme toggle, API key management, inicialización de modales (help, workplace, PDF config, print preview, email), patient data modal, comparación original/estructurado, "grabar y agregar" inline, shortcuts, autosave, detección multi-tab.
- **Exports:** ~25 funciones en `window.*`
- **Dependencias:** Prácticamente todos los otros módulos
- **Estado:** ⚠️ Funcional pero es un **God Object**
- **Problemas SERIOS:**
  - **1.304 líneas haciendo de todo** — es el archivo más grande y más difícil de mantener
  - `initModals()` ya tiene ~500 líneas solo en sí misma
  - Mezcla lógica de negocio (patient data insertion, auto-re-structuring) con cableado de UI
  - La función `_insertPatientDataInEditor` modifica `window._lastStructuredHTML` directamente → efecto secundario oculto
  - La grabación inline "append audio" reimplementa Whisper call ahí mismo en vez de reutilizar `transcriptor.js`
  - Autosave, multi-tab detection, shortcuts, all crammed into one file
  - `saveApiKeyBtn` valida la key contra Groq — debería estar en config.js o un auth module
  - `disableButtons` definida TANTO en ui.js como en stateManager.js (sobrescritura silenciosa)

#### `tabs.js` — 105 líneas
- **Qué hace:** Sistema de tabs para múltiples transcripciones. Crear, cambiar, cerrar pestañas.
- **Exports:** `window.createTabs`, `window.switchTab`, `window.closeTab`
- **Estado:** ✅ Funcional
- **Problemas:**
  - Cada `switchTab` reconstruye TODOS los tabs HTML → O(n) en cada clic
  - `closeTab` declara `const editor` dos veces en el mismo scope (variable shadowing)

#### `stateManager.js` — 287 líneas
- **Qué hace:** Máquina de estados visual (IDLE → FILES_LOADED → TRANSCRIBED → STRUCTURED → PREVIEWED), toggle Pro/Normal, inicialización de modo según `CLIENT_CONFIG`, reset de sesión.
- **Exports:** `window.updateButtonsVisibility`, `window.enableButtons`, `window.disableButtons`
- **Estado:** ✅ Central y necesario
- **Problemas:**
  - `disableButtons` doblemente definida (también en ui.js) — la de stateManager sobrescribe la de ui.js porque carga después. **Bug silencioso.**
  - `updateButtonsVisibility` tiene 100+ líneas de lógica de visibilidad de botones — cada nuevo botón requiere tocar esta función
  - `initializeMode` usa `CLIENT_CONFIG` global sin guardia — si se carga antes de config.js, crashea silenciosamente
  - El resetBtn handler tiene ~60 líneas con lógica compleja de undo temporal → debería ser su propia función

---

### ⚙️ Features (18 archivos — 9.585 LOC)

#### `editor.js` — 1.292 líneas
- **Qué hace:** Editor WYSIWYG: formato (negrita, cursiva, listas, tablas), find/replace, font size, undo/redo, version snapshots (auto cada 5 min, max 30), descargas multi-formato (PDF/RTF/TXT/HTML), plantilla modo Normal, modal de edición de campos `[No especificado]` con voz (Pro), diálogos customizados (confirm/prompt).
- **Exports:** ~20 funciones en `window.*`
- **Dependencias:** structurer.js, formHandler.js, pdfMaker.js, toast.js, state.js
- **Estado:** ⚠️ Funcional pero complejo
- **Problemas:**
  - Usa `document.execCommand` — **deprecado en todos los browsers**. Funcionará por ahora pero sin garantía a futuro
  - `openEditFieldModal` tiene ~200 líneas incluyendo una implementación completa de Whisper call inline — duplicación con transcriptor.js y ui.js (¡tres implementaciones de Whisper!)
  - `createRTF()` genera RTF a mano con string concatenation — frágil y difícil de depurar
  - `saveEditorSnapshot` y `restoreEditorSnapshot` serializan TODO el HTML del editor — no escala con contenido largo
  - `showCustomConfirm`/`showCustomPrompt` deberían estar en utils, no en editor
  - File System Access API (`saveToDisk`) no tiene fallback si el browser no la soporta
  - `downloadFile` llama a `formatText('removeFormat')` que usa `execCommand` — una función de "formato" usada para "descargar"

#### `transcriptor.js` — 761 líneas
- **Qué hace:** Transcripción de audio Groq Whisper: upload, multi-file batch, prompt contextual (4 prioridades), hallucination filter, medical term re-joining, retry con fallback de modelo, reparación de audio, detección de silencio.
- **Exports:** `window.buildWhisperPrompt`, `window.retryFailedFiles`
- **Dependencias:** config.js, studyTerminology.js, medDictionary.js, editor.js, structurer.js, audio.js
- **Estado:** ✅ Robusto y bien diseñado
- **Problemas:**
  - `cleanTranscriptionText` tiene reglas de rejoin hardcodeadas ("dis fagia" → "disfagia") — deberían estar en medDictionary.js
  - `repairAudioFile` re-encoda a WAV 16kHz con Web Audio API — puede perder calidad y tarda
  - `isAudioSilent` threshold de 0.002 es arbitrario — debería ser configurable
  - `classifyTranscriptionError` parsea mensajes de error de Groq en español + inglés via regex — se rompe si Groq cambia el formato
  - `askBatchDecision` definida aquí pero `askJoinAudiosPromise` en toast.js — decisión de batch split en dos archivos

#### `structurer.js` — 738 líneas
- **Qué hace:** Estructurado de texto médico con Groq LLaMA 3: auto-detección de plantilla, construcción de prompt, retry con fallback de 3 modelos, parsing de respuesta markdown→HTML, cola de pendientes offline, toast de confirmación de plantilla.
- **Exports:** `window.autoStructure`, `window.initStructurer`, `window.triggerPatientDataCheck`, `window.checkMedicalTerminology`, `window.GROQ_MODELS`
- **Dependencias:** config.js, templates.js, editor.js, formHandler.js, toast.js
- **Estado:** ✅ Funcional y bien diseñado
- **Problemas:**
  - El system prompt tiene 13 "reglas absolutas" de ~800 tokens — consume contexto de LLaMA sin garantía de compliance
  - `parseAIResponse` tiene ~100 líneas de regex para convertir markdown a HTML — debería usar una librería (marked.js)
  - `autoDetectTemplateKey` busca keywords en el texto — puede equivocarse si el texto menciona múltiples estudios
  - Cola pendiente almacena raw HTML en localStorage — puede comer quota rápidamente
  - `GROQ_MODELS` hardcodeado con 3 modelos — si Groq depreca alguno, hay que tocar código

#### `medDictionary.js` — 648 líneas
- **Qué hace:** Diccionario de correcciones médicas (base ~250 entradas + personalizado). Motor de búsqueda de coincidencias, corrección de nodos de texto, scan con IA, modal con tabs revisión/diccionario.
- **Exports:** `window.openMedDictModal`, `window.initMedDictModal`, `window.removeMedDictEntry`, y constantes MEDICAL_DICT_BASE, getMedCustomDict
- **Estado:** ✅ Completo y útil
- **Problemas:**
  - `MEDICAL_DICT_BASE` tiene entradas duplicadas/circulares ("taquicardia sinusal" → "taquicardia sinusal")
  - `applyDictCorrections` modifica DOM in-place con TreeWalker — puede romper estructura HTML si hay nodos anidados
  - `scanWithAI` llama a LLaMA 3 para sugerencias — gasta API calls sin confirmación del usuario (solo al presionar el botón)
  - La pestaña diccionario usa `onclick="removeMedDictEntry('...')"` inline — **inconsistente con la delegación de eventos del resto de la app**

#### `contact.js` — 135 líneas
- **Qué hace:** Modal de contacto con motivo + detalle. Envía via Google Apps Script. Fallback: guardar en localStorage como pending.
- **Exports:** `window.initContact`, `window.openContactModal`
- **Estado:** ✅ Completo
- **Problemas:**
  - El HTML del email se construye con template literals sin sanitización — posible XSS si el backend refleja el contenido
  - Los contactos pendientes en localStorage nunca se re-envían automáticamente (no se implementó el retry)

#### `diagnostic.js` — 135 líneas
- **Qué hace:** Reporte de diagnóstico remoto: recopila estado de API key, config, entorno, SW. Envía al Google Sheets del admin. Auto-trigger si el admin lo solicitó via flag en respuesta de validación.
- **Exports:** `window.buildDiagnosticReport`, `window.sendManualDiagnostic`, `window.checkDiagnosticPendingFlag`, `window.initDiagnostic`
- **Estado:** ✅ Completo
- **Problemas:**
  - URL del Google Apps Script hardcodeada (no usa `CLIENT_CONFIG.backendUrl`)
  - `api_key_present` se envía como booleano — lo cual está bien, pero `api_key_last_status` podría filtrar info sensible

#### `licenseManager.js` — 388 líneas
- **Qué hace:** Validación de licencia contra backend. Cache 4h. Bloqueo de UI si licencia expirada/baneada. Métricas de uso (envío cada 15 min + beforeunload). Anti-tamper (Object.defineProperty + guard interval).
- **Exports:** `window.validateLicense`, `window.isLicenseValid`, `window.getLicenseData`, `window.trackUsageMetric`, `window.initLicenseManager`
- **Estado:** ✅ Sofisticado
- **Problemas SERIOS:**
  - **Anti-tamper fácilmente bypasseable**: `_lmSealFunctions` usa `Object.defineProperty` con `writable: false`, pero se puede bypassear con `Object.defineProperty` de vuelta con `configurable: true` (que no se deshabilita)
  - El guard interval (8-12s) verifica type escalation — pero como es client-side, se puede parchear el timer
  - Las métricas se envían via `sendBeacon` al cerrar — pueden perderse si el browser no lo soporta
  - **4 horas de cache TTL** — un usuario puede usar la app 4h después de que le revoquen la licencia

#### `patientRegistry.js` — 364 líneas
- **Qué hace:** CRUD de pacientes en localStorage. Búsqueda con accent-insensitive. Live dropdown. Panel de gestión con editar/borrar. Import/export JSON y CSV.
- **Exports:** `window.savePatientToRegistry`, `window.searchPatientRegistry`, `window.populatePatientDatalist`, `window.initPatientRegistrySearch`, `window.initPatientRegistryPanel`
- **Estado:** ✅ Completo
- **Problemas:**
  - Límite de 500 pacientes — puede ser bajo para una clínica grande
  - La exportación CSV no escapa comas en los valores (bug de CSV malformado)
  - `deletedAt` se marca pero no se filtra en las búsquedas (soft-delete incompleto)

#### `formHandler.js` — 204 líneas
- **Qué hace:** Extracción de datos del paciente del texto (regex), generación de número de informe, upload de imágenes (logo, firma), guardar/cargar configuración PDF.
- **Exports:** `window.extractPatientDataFromText`, `window.generateReportNumber`, `window.handleImageUpload`, `window.savePdfConfiguration`, `window.loadPdfConfiguration`
- **Estado:** ✅ Funcional
- **Problemas:**
  - `extractPatientDataFromText` usa regex para detectar "Nombre:", "DNI:", etc. — **frágil**, se rompe si el texto usa otro formato
  - `handleImageUpload` no valida dimensiones ni tipo MIME — acepta cualquier cosa
  - Migración de `patient_history` a `patient_registry` se ejecuta en cada carga — debería marcarse como completada

#### `settingsPanel.js` — 780 líneas
- **Qué hace:** Mega modal de configuración con ~10 secciones accordion: cuenta, API key, workplace, perfiles rápidos, link a PDF config, editor prefs (autosave, undo, font), links a herramientas, tema (light/dark + color picker custom con paleta HSL), stats, backup/restore, info/soporte, upgrade.
- **Exports:** `window.initSettingsPanel`, `window.populateSettingsModal`, `window.restoreAutosaveDraft`, `window.incrementTranscriptionCount`
- **Estado:** ✅ Completo
- **Problemas:**
  - 780 líneas para un solo panel — debería dividirse en sub-módulos
  - `_watchForClose` usa MutationObserver para detectar cierre de sub-modales y re-abrir settings — patrón inusual que puede generar memory leaks si no se desconecta
  - `_exportBackup` y `_importBackup` no cifran los datos — datos médicos sensibles exportados en JSON plano
  - `clearData` preserva keys selectas pero hace `localStorage.clear()` → puede borrar datos de otras apps en el mismo dominio

#### `pricingCart.js` — 243 líneas
- **Qué hace:** Modal de pricing con 4 planes (Trial/Normal/Pro/Clínica), templates como addons, carrito, envío de solicitud de upgrade al backend.
- **Exports:** `window.openPricingCart`, `window.initPricingCart`
- **Estado:** ✅ Completo
- **Problemas:**
  - Precios hardcodeados en el frontend — deberían venir del backend
  - No hay validación server-side del upgrade — el admin tiene que aprobar manualmente
  - Datos sensibles: la solicitud incluye `deviceId` sin consentimiento explícito

#### `business.js` — 1.017 líneas
- **Qué hace:** Hub de inicialización. Factory clone setup (`?id=MED001`), admin vs client flow, gestión de lugares de trabajo (CRUD, multi-profesional), onboarding (T&C, API key), PWA install prompt, setup de test data.
- **Exports:** `window.initWorkplaceManagement`, `window.initBusinessSuite`, `window.populateWorkplaceDropdown`
- **Dependencias:** Prácticamente todos los módulos
- **Estado:** ⚠️ Funcional pero complejo
- **Problemas SERIOS:**
  - **1.017 líneas de inicialización** — es el segundo archivo más grande y hace demasiado
  - `_handleFactorySetup` hace ~20 escrituras secuenciales a localStorage — si alguna falla por quota, el estado queda inconsistente
  - `_loadAdminTestData()` es un no-op (datos removidos) — función muerta
  - La lógica de "clone vs admin" está distribuida entre config.js, business.js, licenseManager.js, y settingsPanel.js — no hay un solo punto de verdad
  - Setup de workplace con profesionales usa un sistema de "agregar profesional" que genera DOM dinámicamente con IDs concatenados → frágil

#### `sessionAssistant.js` — 338 líneas
- **Qué hace:** Modal que se abre al cargar la app en clones. Selección de lugar de trabajo / profesional / plantilla según tipo de usuario.
- **Exports:** `window.initSessionAssistant`, `window.openSessionAssistant`
- **Estado:** ✅ Bien diseñado
- **Problemas:**
  - `confirm()` sobrescribe la función global `window.confirm` — **bug potencial** aunque está dentro de un closure
  - Pre-selección inteligente lee `pdf_config.activeWorkplaceIndex` — si ese índice ya no existe, falla silenciosamente

#### `outputProfiles.js` — 255 líneas
- **Qué hace:** CRUD de perfiles de salida (lugar + profesional + formato PDF), guardados en localStorage. Selector rápido en toolbar.
- **Exports:** `window.initOutputProfiles`, `window.getOutputProfiles`, `window.loadOutputProfile`, `window.populateProfileDropdowns`
- **Estado:** ✅ Limpio y bien encapsulado (IIFE)
- **Problemas:**
  - `loadProfile` guarda `lastUsed` y luego llama `savePdfConfiguration` con timeout de 200ms — race condition posible si el usuario cambia algo en esos 200ms

#### `pdfPreview.js` — 932 líneas
- **Qué hace:** Vista previa de impresión tipo PDF (HTML), QR code, navegación multi-página, envío por email con PDF adjunto (via backend), modal de email, print via iframe con thead/tfoot, semáforo de completitud de configuración.
- **Exports:** `window.generateQRCode`, `window.openPdfConfigModal`, `window.openPrintPreview`, `window.emailFromPreview`, `window.generatePDFBase64`, `window.initEmailSendModal`, `window.printFromPreview`, `window.evaluateConfigCompleteness`, `window.updateConfigTrafficLight`, `window.validateBeforeDownload`
- **Dependencias:** config.js, formHandler.js, business.js, templates.js, pdfMaker.js
- **Estado:** ⚠️ Feature-rich pero monolítico
- **Problemas SERIOS:**
  - **932 líneas que hacen 6 cosas diferentes**: preview, email, QR, print, config validation, workplace dropdown
  - `generatePDFBase64` temporariamente **sobrescribe `window.saveToDisk`** para interceptar el blob → hack extremadamente frágil que se rompe si hay llamadas concurrentes
  - `printFromPreview` inyecta un iframe, copia TODOS los estilos CSS del documento, y los filtra con regex → se rompe si hay stylesheets cross-origin
  - `workplaceProfiles` se asigna como global FUERA de cualquier init → se ejecuta al parsear el script, potencialmente antes de que los datos estén listos
  - `updateConfigTrafficLight` está **deshabilitado** (función vacía) — queda como stub

#### `pdfMaker.js` — 613 líneas
- **Qué hace:** Generación de PDF con jsPDF. Renderiza header, bloque de paciente, info de estudio, contenido HTML (headings, tablas, listas, párrafos con inline bold/italic/underline), firma, QR, footer con número de página.
- **Exports:** `window.downloadPDFWrapper`
- **Dependencias:** jsPDF + jsPDF-AutoTable (CDN), formHandler.js, business.js, reportHistory.js, editor.js
- **Estado:** ⚠️ Funcional pero frágil
- **Problemas:**
  - `renderInlineParagraph` camina segmentos de DOM para detectar bold/italic — se rompe con HTML complejo (nested spans, etc.)
  - No soporta imágenes inline (solo logo/firma en posiciones fijas)
  - Manejo de paginación manual (Y position tracking) — propenso a overflow
  - `drawWorkplaceBanner` no está definida en pdfMaker.js — debe estar definida en otro archivo o es un bug
  - Si jsPDF no carga del CDN, toda la funcionalidad de PDF falla sin fallback

#### `reportHistory.js` — 434 líneas
- **Qué hace:** Historial de informes (CRUD localStorage). Viewer read-only. Re-exportar PDF. Listado por paciente. Import/export JSON.
- **Exports:** `window.saveReportToHistory`, `window.getAllReports`, `window.getPatientReports`, y ~10 más
- **Estado:** ✅ Completo
- **Problemas:**
  - `saveReportToHistory` guarda HTML completo del informe → localStorage se llena rápido
  - Manejo de `QuotaExceededError` recorta los informes más viejos — **pérdida de datos silenciosa**
  - Re-export modifica temporariamente `pdf_config` y lo restaura con `setTimeout(400ms)` — race condition
  - `_skipReportSave` flag global para evitar doble guardado — patrón frágil

#### `userGuide.js` — 308 líneas
- **Qué hace:** Tour interactivo de spotlight de 6 pasos, help modal con tabs, link al manual profesional (iframe), auto-show del tour en primera visita.
- **Exports:** `window.startGuideTour`
- **Estado:** ✅ Polished
- **Problemas:**
  - Se ejecuta inmediatamente como IIFE al cargar → `document.querySelectorAll` puede fallar si el DOM no está listo
  - `positionTooltip` no maneja el caso donde el target está offscreen (solo clamps)
  - Auto-show con delay de 2000ms puede solaparse con onboarding o session assistant

---

### 🏠 Archivos Raíz

#### `build.js` — 185 líneas
- **Qué hace:** Script Node.js que concatena 28 JS + 5 CSS, minifica con Terser, genera `dist/` con bundle único, actualiza SW.
- **Estado:** ✅ Funcional
- **Problemas:**
  - No genera sourcemaps (debug en producción imposible)
  - Minificación CSS es rudimentaria (regex) — debería usar PostCSS o similar
  - No hay hash de integridad en los archivos generados

#### `sw.js` — 145 líneas
- **Qué hace:** Service worker con Cache-First para assets estáticos, Network-First para Groq API y Google Apps Script, pre-cache del app shell.
- **Estado:** ✅ Correcto
- **Problemas:**
  - `CACHE_NAME = 'transcriptor-pro-v39'` — versión manual, debería auto-incrementar o usar hash
  - Pre-cachea ~40 archivos individuales en desarrollo (el build los remplaza por el bundle)
  - Network-first para HTML/JS/CSS → bueno para updates pero más lento en offline
  - No implementa background sync (los contactos pendientes nunca se re-envían)

#### `manifest.json` — 47 líneas
- **Qué hace:** PWA manifest con name, icons, shortcuts, theme color.
- **Estado:** ✅ Correcto
- **Problemas:**
  - `screenshots: []` vacío — los stores de PWA pueden mostrar un placeholder
  - Solo 2 tamaños de icono (192, 512) — falta 72, 96, 128, 144, 384 para compatibilidad completa

#### `package.json` — 16 líneas
- **Qué hace:** Metadata del proyecto, scripts build/test.
- **Estado:** ✅ Mínimo
- **Problemas:**
  - `playwright` está en `dependencies` en vez de `devDependencies` — se instala en producción innecesariamente

---

## 🐛 BUGS Y PROBLEMAS CRÍTICOS

### 🔴 Críticos

| # | Archivo | Problema |
|---|---------|----------|
| 1 | `ui.js` + `stateManager.js` | `disableButtons` definida en AMBOS archivos — la de stateManager sobrescribe silenciosamente |
| 2 | `pdfPreview.js` | `generatePDFBase64` sobrescribe `window.saveToDisk` temporariamente — crash si se llama concurrentemente |
| 3 | `editor.js` | Usa `document.execCommand` deprecado — sin plan de migración |
| 4 | Toda la app | 100% localStorage — un `clear` borra TODO: pacientes, historial, config, licencia |
| 5 | `reportHistory.js` | Pérdida silenciosa de informes viejos cuando localStorage se llena |
| 6 | `pdfPreview.js` | `window.workplaceProfiles` se asigna fuera de cualquier init — ejecuta al parsear, antes de que los datos estén listos |

### 🟡 Importantes

| # | Archivo | Problema |
|---|---------|----------|
| 7 | `ui.js` | Grabación inline de "append audio" reimplementa Whisper call — debería reutilizar transcriptor.js |
| 8 | `editor.js` | `openEditFieldModal` tiene OTRA implementación de Whisper — 3 implementaciones en total |
| 9 | `licenseManager.js` | Anti-tamper bypasseable con `Object.defineProperty(window, 'isLicenseValid', {writable: true, configurable: true, value: ()=>true})` |
| 10 | `settingsPanel.js` | `_exportBackup` exporta datos médicos en JSON plano sin cifrar |
| 11 | `contact.js` | Contactos pendientes en localStorage nunca se re-envían |
| 12 | `patientRegistry.js` | Exportación CSV no escapa comas — CSV malformado |
| 13 | `formHandler.js` | Migración patient_history → patient_registry se ejecuta en CADA carga |
| 14 | Toda la app | No hay manejo centralizado de errores — los `catch` solo logean a console |

### 🟢 Menores

| # | Archivo | Problema |
|---|---------|----------|
| 15 | `tabs.js` | Variable `editor` declarada dos veces en `closeTab` (shadowing) |
| 16 | `config.js` | Placeholder `{{CONFIG_IDENTITY}}` nunca se reemplaza |
| 17 | `business.js` | `_loadAdminTestData()` es un no-op — código muerto |
| 18 | `structurer.js` | GROQ_MODELS hardcodeado — manual update si Groq depreca modelos |
| 19 | `medDictionary.js` | Entradas circulares en MEDICAL_DICT_BASE (ej: "taquicardia sinusal" → "taquicardia sinusal") |
| 20 | `toast.js` | `askJoinAudiosPromise` no es un toast pero está en toast.js |

---

## 🏗️ DEUDA TÉCNICA

### Arquitectura
1. **Sin módulos** — todo son globals en `window.*`. Si dos archivos definen la misma función, la segunda gana silenciosamente (ya pasa con `disableButtons`).
2. **Sin types** — ni JSDoc completo ni TypeScript. Imposible saber qué forma tiene un objeto sin leer el código.
3. **Sin tests unitarios** — solo tests e2e manuales en HTML. Hay `run_tests.js` con Playwright pero el coverage es desconocido.
4. **Build = concatenación** — funciona, pero impide tree-shaking, code-splitting, lazy loading.
5. **localStorage como DB** — límite de ~5-10MB según browser. Un combo de informes con HTML + imágenes base64 + historial lo llena rápido.

### Duplicación de código
- **3 implementaciones de Whisper API call**: transcriptor.js, editor.js (openEditFieldModal), ui.js (append recording)
- **2 definiciones de `disableButtons`**: ui.js y stateManager.js
- **Múltiples lecturas de `workplace_profiles`**: al menos 8 archivos leen este key independientemente

### Acoplamiento
- `business.js` importa todo. `ui.js` importa todo. Si alguno falla al cargar, la app se rompe en cascada.
- `pdfPreview.js` y `pdfMaker.js` tienen responsabilidades solapadas (ambas leen pdf_config, ambas generan output).

---

## 📈 LO QUE ESTÁ BIEN HECHO

1. **Feature completeness** — La app cubre un flujo médico end-to-end impresionante para ser vanilla JS.
2. **Retry strategies** — Transcripción y estructurado tienen 4 intentos con fallback de modelos. Bien hecho.
3. **Hallucination filter** — Detección de texto fantasma de Whisper ("gracias por ver el video") es un plus real.
4. **Medical dictionary** — 250+ correcciones ASR médicas en español. Valor enorme.
5. **PWA** — Service worker + manifest bien implementados. La app funciona offline (excepto IA).
6. **Factory clone system** — El concepto de generar apps clonadas con `?id=` es ingenioso para distribución.
7. **Session assistant** — UX inteligente que diferencia clínica/personal/normal.
8. **Print preview** — Fiel al PDF, con paginación y QR. Muy profesional.
9. **Autosave + snapshots** — Recovery de sesión bien pensado.
10. **Normalización de texto** — Siglas médicas preservadas, modo oración, accent-insensitive search.

---

## 🎯 RECOMENDACIONES PRIORITARIAS

### Inmediatas (bugs)
1. Eliminar la definición duplicada de `disableButtons` en `ui.js`
2. Refactorizar `generatePDFBase64` para que NO sobrescriba `window.saveToDisk`
3. Mover la asignación de `window.workplaceProfiles` en pdfPreview.js dentro de un init
4. Unificar las 3 implementaciones de Whisper API call en una sola función reutilizable

### Corto plazo (deuda técnica)
5. Dividir `ui.js` en al menos 5 archivos: modals.js, apiManager.js, patientDataUI.js, comparison.js, shortcuts.js
6. Dividir `business.js` en: init.js, factorySetup.js, workplaceManager.js
7. Agregar JSDoc tipos a todas las funciones exported
8. Implementar un event bus simple en vez de globals para comunicación entre módulos

### Largo plazo (arquitectura)
9. Migrar a ES modules (import/export) con bundler (Vite, esbuild)
10. Agregar IndexedDB para datos voluminosos (informes, imágenes) y dejar localStorage solo para config
11. Agregar tests unitarios al menos para las funciones puras (parseAIResponse, normalizeFieldText, extractPatientDataFromText)
12. Considerar TypeScript al menos para los tipos de datos compartidos

---

*Este informe refleja el estado del código al momento de la auditoría. Los conteos de líneas se obtuvieron directamente del filesystem.*
