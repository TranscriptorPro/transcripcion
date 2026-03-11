# Correcciones Iniciales — Transcriptor Pro

## Tu rol

Eres un ingeniero de software senior. Tu tarea es **corregir los bugs** documentados en el diagnóstico QA sin romper ninguna funcionalidad existente. No agregues features nuevos. Solo arreglá lo que está roto.

## Archivos que DEBES leer primero

1. **`DIAGNOSTICO_QA_COMPLETO.md`** (raíz del proyecto) — Contiene TODOS los hallazgos de QA de 34 circuitos. Lee especialmente la sección "Resumen final — Bugs a corregir" al final del archivo.
2. **`src/js/config/config.js`** — Líneas 177-203. Aquí está la lógica de `isOfficialAdminBase` que causa el bug C1-08-01.
3. **`src/js/utils/stateManager.js`** — Líneas 154-164 (toggle handler) y 192-223 (`initializeMode`). Aquí se debe aplicar el fix principal.

## Bugs a corregir (por prioridad)

### 1. ❌ BUG C1-08-01: Modo Normal no persiste en URL admin (MEDIA)

**Problema**: Cuando el usuario está en `transcriptorpro.github.io/transcripcion/` y cambia a modo Normal, al recargar vuelve a modo Pro.

**Causa raíz**: 
- La URL oficial activa `isOfficialAdminBase=true` en `config.js`
- Esto borra `client_config_stored` y fuerza `CLIENT_CONFIG.type = 'ADMIN'`
- `initializeMode()` en `stateManager.js` lee `CLIENT_CONFIG.type === 'ADMIN'` y fuerza modo Pro
- `last_profile_type` se guarda en IndexedDB (async) pero `initializeMode` lee de forma síncrona → el valor no está disponible a tiempo

**Fix sugerido**:
En `stateManager.js`, en el toggle handler (L154-164), ADEMÁS de guardar en IDB, guardar también en localStorage:
```javascript
localStorage.setItem('last_profile_type', mode);
```
En `initializeMode()` (L192-223), agregar localStorage como fallback síncrono:
```javascript
const savedMode = localStorage.getItem('last_profile_type') || _lastProfileTypeCache;
```

### 2. ⚠️ WARN C20: Modal PDF no automatizable (MEDIA)

**Problema**: El modal de configuración PDF y sus campos (`doctorName`, `specialty`, `logo`) no fueron encontrados por los tests automatizados.

**Acción**: Verificar los IDs reales del modal PDF en el código fuente. Buscar en archivos que contengan `jsPDF`, `generatePDF`, o `pdf` en `src/js/`. Si los IDs son diferentes a `pdfConfigModal`, `doctorName`, `doctorSpecialty`, documentarlos. Si no hay modal de config PDF, considerar si es necesario crearlo.

### 3. ⚠️ WARN C2-02: Botones de tema en settings

**Problema**: Los botones de tema no fueron detectados por selectores `[data-theme]`, `.theme-btn`, `.theme-option`.

**Acción**: Verificar en `src/js/features/settingsThemeSectionUtils.js` qué atributos usan los botones de tema generados por `populateThemeButtons()`. No es un bug de la app, pero si los botones no tienen atributos semánticos estándar, considerar agregarlos.

## Reglas

1. **No toques** archivos que no estén relacionados con los bugs listados
2. **No agregues** features nuevas
3. **Probá** cada fix recargando la app en `https://transcriptorpro.github.io/transcripcion/`
4. **Documentá** en un breve resumen qué cambiaste y por qué
5. Los archivos de test están en `tests/` — podés correrlos con `node tests/circuit-01-init-persistence.js` para verificar

## Estructura del proyecto

```
src/
  js/
    config/
      config.js          ← Bug C1-08 (CLIENT_CONFIG)
      templates.js       ← Templates de especialidades
    utils/
      stateManager.js    ← Bug C1-08 (initializeMode)
      tabs.js
      uiPatientDataUtils.js
      uiAutosaveUtils.js
    features/
      settingsThemeSectionUtils.js  ← Warn C2-02
      patientRegistry.js
      editorFormattingFindUtils.js
    db/
      db.js              ← IndexedDB wrapper
tests/
  circuit-01-init-persistence.js   ← Test C1
  circuit-02-10-local-base.js      ← Tests C2-C10
  circuit-11-20-audio-ia.js        ← Tests C11-C20
  circuit-21-34-advanced.js        ← Tests C21-C34
DIAGNOSTICO_QA_COMPLETO.md         ← Diagnóstico completo
```
