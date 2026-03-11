# ROADMAP — 8 de Marzo de 2026

> **Fecha de creación:** 7 de marzo de 2026  
> **Último commit:** `6436366` en `main`  
> **Estado de tests:** 634/634 pasando (`node tests/run_tests.js`)  
> **Repo:** `TranscriptorPro/transcripcion` — GitHub Pages  
> **URL producción:** `https://transcriptorpro.github.io/transcripcion/`

---

## REGLAS ABSOLUTAS PARA EL AGENTE

```
1. NO INVENTAR — Si no sabés algo, preguntale al usuario. NUNCA supongas.
2. NO MENTIR — Si algo no funciona, decilo. No digas "listo" sin verificar.
3. NO DAÑAR — Antes de modificar, leé el archivo. Entendé el contexto.
4. NO SUPONER — Si no encontrás una función, buscala. No asumas que existe o que no existe.
5. VERIFICAR — Después de cada cambio: correr tests (634/634), verificar que no rompiste nada.
6. NUNCA usar PowerShell Get-Content/Set-Content para editar archivos — CORROMPE UTF-8.
7. SIEMPRE commitear y pushear al terminar cada tarea.
8. Preguntar al usuario si hay duda sobre el comportamiento esperado.
```

---

## CONTEXTO DEL PROYECTO

### ¿Qué es?
**Transcriptor Médico Pro** — SPA/PWA para médicos que:
1. Graba/sube audio de dictado médico
2. Transcribe con **Whisper** (Groq API)
3. Estructura con **LLaMA 3.3 70B** (Groq API) usando 37+ plantillas médicas
4. Edita en editor WYSIWYG con undo/redo, campos editables, chips de autocompletado
5. Exporta como PDF/Word con encabezado profesional (logo, firma, QR)

### Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 + CSS3 + JavaScript vanilla (SIN frameworks) |
| Módulos | IIFEs concatenados por `build.js`, comunicación via `window.*` |
| Build | `node build.js` → terser minifica → `dist/` |
| Deploy | GitHub Actions → GitHub Pages |
| Backend | Google Apps Script (19 endpoints) + Google Sheets como DB |
| APIs externas | Groq — Whisper (transcripción) + LLaMA 3.3-70b (estructuración) |
| Almacenamiento | localStorage (~38 claves) + IndexedDB (via `db.js` wrapper) |
| PWA | manifest.json + Service Worker (cache-first para shell, network-first para APIs) |
| Tests | 634 tests estáticos en Node.js (`node tests/run_tests.js`) — parseo estático, NO E2E |
| PDF | jsPDF (CDN, cacheado en SW) |
| npm deps | `terser` (build), `playwright` (declarado, no usado activamente) |

### Archivos principales

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `index.html` | ~2,548 | App principal del cliente — 23 modales, toda la UI |
| `recursos/admin.html` | ~7,778 | Dashboard admin — gestión usuarios, registros, fábrica de clones, aprobación |
| `src/js/config/templates.js` | ~4,175 | 37+ plantillas médicas con prompts IA |
| `src/js/features/editor.js` | ~3,100 | Editor WYSIWYG, campos, snapshots, chips |
| `src/js/utils/ui.js` | ~1,455 | Tema, API status, onboarding, UI general |
| `src/js/config/studyTerminology.js` | ~950 | Metadatos de 54 estudios médicos |
| `src/js/features/business.js` | ~1,017 | Init principal, fábrica de clones, onboarding |
| `sw.js` | ~180 | Service Worker v60, cache-first para shell |
| `build.js` | ~120 | Concatena 30 JS + 5 CSS, minifica, genera dist/ |

### Orden de concatenación JS (build.js)
```
db.js → config.js → templates.js → studyTerminology.js → dom.js → toast.js →
ui.js → tabs.js → stateManager.js → state.js → audio.js → editor.js →
transcriptor.js → structurer.js → medDictionary.js → contact.js → diagnostic.js →
licenseManager.js → patientRegistry.js → formHandler.js → themeManager.js →
settingsPanel.js → pricingCart.js → business.js → sessionAssistant.js →
outputProfiles.js → pdfPreview.js → pdfMaker.js → reportHistory.js → userGuide.js
```

### Estructura de archivos JS

```
src/js/
├── config/
│   ├── config.js          — CLIENT_CONFIG, carga dinámica admin/cliente
│   ├── templates.js       — 37+ plantillas con prompts IA
│   └── studyTerminology.js — metadatos de 54 estudios
├── core/
│   ├── audio.js           — grabación, procesamiento, reparación
│   └── state.js           — estado global (IDLE→FILES_LOADED→TRANSCRIBED→STRUCTURED→PREVIEWED)
├── features/
│   ├── business.js        — init principal, fábrica de clones, onboarding
│   ├── contact.js         — modal de contacto
│   ├── diagnostic.js      — diagnóstico remoto
│   ├── editor.js          — editor WYSIWYG completo
│   ├── formHandler.js     — manejo PDF y datos paciente
│   ├── licenseManager.js  — validación licencia + métricas
│   ├── medDictionary.js   — diccionario médico (200+ correcciones ASR)
│   ├── outputProfiles.js  — CRUD perfiles de salida
│   ├── patientRegistry.js — registro pacientes (CRUD, export/import)
│   ├── pdfMaker.js        — generación PDF con jsPDF
│   ├── pdfPreview.js      — vista previa A4 multipágina
│   ├── pricingCart.js      — planes y carrito de upgrade
│   ├── reportHistory.js   — historial de informes
│   ├── sessionAssistant.js — asistente inicio de sesión
│   ├── settingsPanel.js   — mega panel config (11 secciones)
│   ├── structurer.js      — estructuración IA con retry
│   ├── themeManager.js    — skins CSS
│   ├── transcriptor.js    — transcripción Whisper con retry robusto
│   └── userGuide.js       — tour, ayuda, manual
└── utils/
    ├── db.js              — wrapper IndexedDB
    ├── dom.js             — utilidades DOM
    ├── stateManager.js    — gestión estado y autosave
    ├── tabs.js            — sistema de tabs
    ├── toast.js           — notificaciones toast
    └── ui.js              — tema, API status, onboarding, UI general
```

### Backend: 19 endpoints en Google Apps Script
URL unificada: `https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec`

Endpoints: `validate`, `admin_login`, `admin_list_users`, `admin_create_user`, `admin_update_user`, `admin_get_logs`, `admin_get_metrics`, `admin_get_global_stats`, `admin_request_diagnostic`, `admin_get_diagnostic`, `admin_generate_config`, `update_usage`, `save_diagnostic`, `send_email`, `admin_log_action`, `admin_list_registrations`, `admin_approve_registration`, `admin_reject_registration`, `register_doctor`

6 Hojas Google Sheets: Usuarios · Metricas_Uso · Dispositivos · Admin_Logs · Diagnosticos · Admin_Users

---

## ESTADO ACTUAL — TODO LO COMPLETADO

### Features F1 — 21/21 ✅
Todas las features de la Fase 1 están implementadas y funcionando:
- F1-A1+A2, F1-B1, F1-B2, F1-C1, F1-C2, F1-D1-D4, F1-E1, F1-G1, F1-G2
- F1-K1, F1-K2, F1-K3, F1-PWA1-PWA4

### Etapas completadas
- **Etapa 4** — Historial de informes por paciente (`reportHistory.js`)
- **Etapa 5** — Autocompletado de campos con valores frecuentes (chips en `editor.js`)
- **Etapa 6** — Mejoras visuales del PDF (logo, firma, QR, s/p en gris itálica)
- **Etapa 8** — Versionado del informe en el editor (30 snapshots, deduplicación hash)
- **Backend** — 19 endpoints, bugs B1-B7 resueltos

### Sesión actual (7 marzo 2026) — 4 bugs de admin.html corregidos + 1 pendiente

| Commit | Fix |
|--------|-----|
| `0908283` | Crop overlay: fondo sólido, borde visible, cursor crosshair |
| `8b7b8f8` | Preview PDF: muestra datos del workplace activo (no siempre el principal) |
| `ed33c10` | Firma: scaleToFit sin padding, race condition async, reset rw/rh |
| `6436366` | `_giftImagePreview`: movida declaración al bloque GIFT state (scope fix) |

**BUG PENDIENTE detectado DESPUÉS del último commit:**
- `_updatePdfSim is not defined` — La función está dentro de un IIFE (script tag L7635) y los inline handlers HTML (oninput/onfocus en workplace inputs L4123-4133) no pueden accederla. También `_giftActiveInstWp` es `let` (no global).
- **Fix necesario:** Exponer `_updatePdfSim` via `window._updatePdfSim` y cambiar `let _giftActiveInstWp` a `var _giftActiveInstWp` (o exponerla via `window`).

---

## BUGS CONOCIDOS PENDIENTES

### Severidad CRÍTICA (afectan funcionalidad)

| # | Bug | Archivo | Detalle |
|---|-----|---------|---------|
| **BUG-1** | `_updatePdfSim is not defined` | `recursos/admin.html` | Función dentro de IIFE (L7635), handlers inline HTML no pueden accederla. `_giftActiveInstWp` (let) tampoco es global. Los inputs de workplace (nombre, dirección, teléfono) en GIFT paso 2 fallan al escribir. |

### Severidad MEDIA (deuda técnica)

| # | Bug | Archivos | Detalle |
|---|-----|----------|---------|
| **DT-1** | 3 implementaciones de Whisper API | `transcriptor.js` (robusta), `ui.js`, `editor.js` | Las 2 secundarias ahora tienen retry 3x pero deberían unificarse en una sola función |
| **DT-2** | ~150 asignaciones a `window.*` | Todos los JS | Sobrescritura silenciosa posible |
| **DT-3** | Archivos demasiado grandes | `editor.js` (3100), `templates.js` (4175), `admin.html` (7778) | Dificultan mantenimiento |
| **DT-4** | Sin tests E2E reales | `tests/` | Solo tests estáticos de parseo; Playwright declarado pero no usado |
| **DT-5** | Backup sin cifrado | `stateManager.js` | API key + datos pacientes en JSON plano |
| **DT-6** | CSV sin BOM UTF-8 | `patientRegistry.js` | Acentos rotos en Excel |

---

## ROADMAP DE TRABAJO — PRÓXIMA SESIÓN

### BLOQUE 0 — Bug crítico (HACER PRIMERO)

**BUG-1: `_updatePdfSim is not defined` en GIFT paso 2**

Archivos a modificar: `recursos/admin.html`

Problema exacto:
- `_updatePdfSim()` definida en L8231, dentro del IIFE que empieza en L7635 `(function() { 'use strict'; ... })()`
- Los inline handlers `oninput` y `onfocus` en las líneas 4123, 4127, 4133 la llaman directamente
- Los handlers inline ejecutan en scope **global**, pero la función está en scope de **IIFE** → crash
- Mismo problema con `_giftActiveInstWp` — declarada con `let` en L3967, no es global

Fix verificado:
1. En L8356 (antes del cierre del IIFE), agregar: `window._updatePdfSim = _updatePdfSim;`
2. En L3967, cambiar `let _giftActiveInstWp = 0;` por `var _giftActiveInstWp = 0;` (hace global la variable)
3. Verificar que el preview se abre correctamente al editar logo WP en paso 2

Después del fix: `node tests/run_tests.js` → 634/634, commit + push.

---

### BLOQUE 1 — Mejoras del Admin Dashboard (recursos/admin.html)

Estas mejoras son para pulir la experiencia del admin en la fábrica de clones y aprobación.

#### 1.1 Verificar que GIFT preview es idéntico a Approve preview
- **¿Qué verificar?** Que al editar logo WP en paso 2, el preview lateral muestra el logo, nombre del lugar, dirección y teléfono del WP activo — NO siempre el principal.
- **Dónde mirar:** `_updatePdfSim()` (L8231) vs `_updateApprovePreview()` (L5290)
- **Criterio de éxito:** Ambos previews muestran la misma información cuando se edita el mismo tipo de datos.

#### 1.2 Verificar firma + logo profesional en paso 5 de GIFT
- **¿Qué verificar?** Que al subir/procesar firma y logo profesional, el preview lateral muestra ambos correctamente.
- **Dónde mirar:** `_imgprocInitStep5()` — buscar esta función, entender cómo inicializa los editores imgFirma e imgProf.

#### 1.3 Revisar todos los inline handlers en admin.html
- **Problema potencial:** Si hay OTROS handlers inline que llaman funciones de IIFEs, van a crashear igual.
- **Cómo buscar:** `grep` por `oninput=.*_` y `onclick=.*_` en admin.html, verificar que cada función referenciada sea accesible globalmente.

---

### BLOQUE 2 — Mejoras técnicas de la app principal (index.html + src/js/)

#### 2.1 Unificar implementaciones de Whisper (DT-1)
- `src/js/features/transcriptor.js` tiene la versión robusta con retry, fallback de modelos, detección de alucinaciones
- `src/js/utils/ui.js` y `src/js/features/editor.js` tienen versiones simplificadas (ya con retry 3x desde commit `f4a3122`)
- **Objetivo:** Que `ui.js` y `editor.js` llamen a la función de `transcriptor.js` en vez de tener su propia implementación
- **Riesgo:** Medio — hay que entender las diferencias de cada implementación antes de unificar

#### 2.2 BOM UTF-8 en exports CSV (DT-6)
- En `src/js/features/patientRegistry.js`, la función que exporta CSV no incluye BOM
- **Fix:** Agregar `\uFEFF` al inicio del string CSV antes de crear el Blob
- **Riesgo:** Bajo

#### 2.3 Cifrar backups (DT-5)
- En `src/js/utils/stateManager.js`, el backup exporta JSON plano con API key y datos de pacientes
- **Fix:** Agregar cifrado AES con password del usuario antes de exportar
- **Riesgo:** Medio — requiere elegir librería/implementación de crypto
- **Preguntar al usuario:** ¿Quiere usar Web Crypto API nativa o una librería?

---

### BLOQUE 3 — Features nuevas (si el usuario lo solicita)

Estas son ideas registradas en documentación previa. NO implementar sin confirmación del usuario.

#### 3.1 Etapa 7 — Internacionalización (diferida, baja prioridad)
- Idioma del informe (es/en/pt)
- Afecta templates.js (prompts en español)

#### 3.2 Tests E2E con Playwright (DT-4)
- Playwright ya está en `package.json`
- Crear tests que abran la app en navegador y simulen el flujo completo
- **Preguntar al usuario:** ¿Quiere E2E tests? ¿Para qué flujos?

#### 3.3 Migrar a ES Modules
- Reemplazar IIFEs por `import`/`export`
- **Riesgo:** Alto — cambio masivo, rompe todo si no se hace bien
- **Preguntar al usuario:** ¿Es prioridad? Probablemente no.

#### 3.4 Sincronización entre dispositivos
- Google Drive sync
- **Preguntar al usuario:** ¿Es prioridad?

---

## REFERENCIA RÁPIDA — COMANDOS

```bash
# Correr tests (SIEMPRE después de cada cambio)
node tests/run_tests.js

# Build para producción
node build.js

# Commit + push
git add -A && git commit -m "mensaje" && git push

# Ver últimos commits
git log --oneline -10

# Ver cambios no commiteados
git diff --stat

# Buscar función en admin.html
grep -n "nombre_funcion" recursos/admin.html
```

---

## ADVERTENCIAS CRÍTICAS PARA EL AGENTE

### Sobre el archivo admin.html (7,778 líneas)
- Tiene **múltiples `<script>` tags** — algunos con IIFE `(function() { ... })()`, otros sin wrapper
- Las funciones dentro de IIFEs **NO son globales** — los inline handlers HTML no pueden llamarlas
- Las variables `let`/`const` a nivel top de un `<script>` tag **NO son globales** (solo `var` y `function` lo son)
- Si necesitás que una función de un IIFE sea accesible desde inline handlers, exponela con `window.nombreFuncion = nombreFuncion;`
- Los bloques `<script>` están en este orden:
  - L12, L33, L54 — scripts de head (pequeños)
  - **L2387** — Script principal del dashboard (CONFIG, tablas, Gift wizard, Approve modal) — SIN IIFE
  - **L7541** — Pequeño script
  - **L7635** — IIFE del procesador de imágenes (`_makeImageSection`, `_updatePdfSim`, `scaleToFit`, etc.)
  - **L8368** — IIFE del procesador para modal Nuevo Usuario
  - **L8579** — Script de inicialización

### Sobre el build (index.html + src/js/)
- `node build.js` concatena 30 archivos JS en orden específico
- El orden importa — si un archivo referencia `window.X`, el archivo que define `window.X` debe estar ANTES
- Cambiar el orden puede romper la app silenciosamente
- **NO** modificar el orden sin entender las dependencias

### Sobre los tests
- Son tests de **parseo estático** — evalúan el código JS como texto, no ejecutan la app
- 634 tests en `tests/run_tests.js`
- Mock de `localStorage`, `appDB`, `document`, `window`
- **NO** prueban UI, NO prueban interacción, NO prueban la app corriendo en el navegador
- Si los tests pasan pero la app crashea en el browser, los tests NO lo van a detectar
- Para verificar bugs de UI (como el de `_updatePdfSim`), hay que abrir `admin.html` en el browser

### Sobre git y deploy
- Branch `main` = producción (GitHub Pages)
- **Cada push a main despliega automáticamente**
- Commitear solo cuando los tests pasen Y estés seguro de que funciona
- NUNCA hacer `git push --force` ni `git reset --hard` sin confirmación del usuario

---

## HISTORIAL DE COMMITS RECIENTES (últimos 25)

```
6436366 fix: move _giftImagePreview declaration to GIFT state block + enable preview in step 2
ed33c10 fix: firma se distorsiona al editar brillo/contraste/escala
8b7b8f8 fix: preview PDF muestra datos del workplace activo
0908283 fix: crop overlay con fondo sólido, selector visible y cursor crosshair
8031e90 refactor: mover editor de logo institucional a secciones de workplace
02314bb fix: fondo negro en redimensionado + preview lateral derecho
f9adbcf fix: logo institucional se guarda en Drive
eb0c271 feat: scale slider + PDF preview en approve modal
b30e337 feat: redimensionado custom (WxH) + compresión en editor de imágenes
e6f5ee4 fix: cargar imágenes del usuario en panel de aprobación
f4a3122 fix(phase-a): 4 bugs críticos corregidos (Whisper retry, pending_contacts, generatePDFBase64, disableButtons)
7f16c0c feat(admin): editor completo de imágenes en modal de aprobación
c92b728 feat: modal Aprobar — workplaces múltiples, imágenes firma/logo, footer por lugar
ad4d56a fix: planSolicitado TDZ, unificar Whisper model, saveToDisk race condition
db23d59 revert: restaurar app funcional pre-fragmentación
8894ce7 fix: extraer scripts inline a init.js y pwa.js
8cb41c1 refactor: split index.html — extraer init.js + pwa.js
03b3b2b refactor: split components.css 4703 líneas → 5 archivos temáticos
45a6f97 refactor: split admin.html 7700→1654 lines — CSS + JS a archivos externos
fe1e155 UX: Modal de aprobación con campos editables completos
1645bb9 UX: Mejorar editor de imágenes Gift Factory (Paso 5)
91bdee4 Fix: auto-init headers Usuarios + cleanup test users
c2680f4 Fix: _parsePlanFromNotas + auto-seleccionar plantillas NORMAL
5ced61b UX: Plan badge auto-detectado + keys colapsadas + pre-fill plantillas
5dbbae9 feat: tab Mis Keys en panel admin
```

---

## RESUMEN EJECUTIVO PARA EL AGENTE

**Situación:** App médica funcional, 21 features F1 completas, 634 tests pasando, 19 endpoints backend. El admin dashboard (`recursos/admin.html`) tiene un bug de scope JS que impide que el preview PDF funcione cuando se editan los datos de workplaces en el wizard GIFT. Es el único bug bloqueante.

**Prioridad absoluta:** Fixear BUG-1 (`_updatePdfSim is not defined`). Fix técnico documentado arriba.

**Después:** Verificar todo el flujo GIFT (pasos 1-5) y Approve, asegurarse de que el preview funcione idéntico en ambos modales. Luego evaluar con el usuario qué mejoras quiere implementar del Bloque 2 y 3.

**Principio rector:** Si no estás seguro de algo, **preguntá al usuario**. No improvises.
