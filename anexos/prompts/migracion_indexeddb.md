# Prompt para migración localStorage → IndexedDB

> Copiar TODO este contenido y pegarlo como primer mensaje en una nueva ventana de chat.

---

## CONTEXTO DEL PROYECTO

Transcriptor Médico Pro es una SPA/PWA médica en `c:\Users\kengy\Desktop\Transcriptor-pro`. Permite grabar audio, transcribir con Whisper (Groq API), estructurar con LLaMA 3.3-70b, editar en un editor WYSIWYG, y exportar PDF profesional.

**Stack**: HTML + CSS + JavaScript vanilla (NO frameworks, NO TypeScript, NO React). Sin módulos ES — todo son IIFEs que se comunican vía `window.*`. Build con `node build.js` (terser). Tests con `npm test` (287 tests estáticos).

**Reglas inquebrantables**:
- NO dañar funcionalidad existente
- NO inventar, NO suponer — verificar antes de cambiar
- Cambios incrementales con tests entre cada fase
- Bumper `CACHE_NAME` en `sw.js` al final (actualmente `transcriptor-pro-v40`)
- Commit después de cada fase exitosa
- Si algo se rompe, revertir inmediatamente

---

## TAREA: Migrar localStorage → IndexedDB

### ¿Por qué?
localStorage tiene límite de 5-10 MB. La app guarda logos y firmas en base64 (~200-400 KB cada uno), historiales de informes, registros de pacientes, diccionarios médicos, y 38+ claves. Con uso intensivo se puede llenar. IndexedDB no tiene límite práctico (cientos de MB).

### Estrategia: Wrapper transparente

Crear un archivo `src/js/utils/db.js` que exponga una API simple sobre IndexedDB:

```javascript
// API del wrapper (todas async, retornan Promises)
window.appDB = {
    get(key)           → Promise<any>       // equivale a JSON.parse(localStorage.getItem(key))
    set(key, value)    → Promise<void>      // equivale a localStorage.setItem(key, JSON.stringify(value))
    remove(key)        → Promise<void>      // equivale a localStorage.removeItem(key)
    clear()            → Promise<void>      // equivale a localStorage.clear()
    keys()             → Promise<string[]>  // equivale a Object.keys(localStorage)
    getAll()           → Promise<Object>    // retorna {key: value, ...} de todo
    sizeInBytes()      → Promise<number>    // tamaño total estimado
};
```

**Debe incluir**:
1. Migración automática: al abrir `db.js` por primera vez, copiar TODO lo que haya en localStorage a IndexedDB, y luego limpiar localStorage (excepto `theme` que CSS necesita sync).
2. Fallback: si IndexedDB no está disponible (modo privado en algunos browsers), usar localStorage como fallback transparente.
3. La clave `theme` es especial: se debe mantener TAMBIÉN en localStorage porque CSS la lee con `:root[data-theme]` antes de que JS cargue.

### Orden de carga en el build

El archivo `db.js` debe cargarse PRIMERO, antes que todos los demás. Verificar en `build.js` el array `JS_FILES` y agregar `'src/js/utils/db.js'` como primer elemento. También agregar el `<script>` en `index.html` antes de los demás.

---

## INVENTARIO COMPLETO DE localStorage (215 llamadas en 22 archivos)

### Archivos ordenados por cantidad de llamadas:

| # | Archivo | Total llamadas | get | set | remove | clear |
|---|---------|---------------|-----|-----|--------|-------|
| 1 | settingsPanel.js | 31 | 16 | 11 | 1 | 1 |
| 2 | business.js | 34 | 14 | 18 | 2 | 0 |
| 3 | ui.js | 26 | 14 | 8 | 4 | 0 |
| 4 | pdfPreview.js | 19 | 19 | 0 | 0 | 0 |
| 5 | diagnostic.js | 13 | 11 | 2 | 0 | 0 |
| 6 | formHandler.js | 9 | 5 | 3 | 1 | 0 |
| 7 | licenseManager.js | 10 | 6 | 2 | 2 | 0 |
| 8 | editor.js | 9 | 5 | 3 | 1 | 0 |
| 9 | contact.js | 8 | 5 | 2 | 1 | 0 |
| 10 | sessionAssistant.js | 8 | 7 | 1 | 0 | 0 |
| 11 | structurer.js | 7 | 3 | 4 | 0 | 0 |
| 12 | reportHistory.js | 8 | 5 | 3 | 0 | 0 |
| 13 | pricingCart.js | 6 | 5 | 1 | 0 | 0 |
| 14 | pdfMaker.js | 5 | 5 | 0 | 0 | 0 |
| 15 | medDictionary.js | 4 | 3 | 1 | 0 | 0 |
| 16 | stateManager.js | 6 | 3 | 3 | 0 | 0 |
| 17 | userGuide.js | 3 | 2 | 1 | 0 | 0 |
| 18 | config.js | 3 | 1 | 1 | 1 | 0 |
| 19 | outputProfiles.js | 2 | 1 | 1 | 0 | 0 |
| 20 | patientRegistry.js | 2 | 1 | 1 | 0 | 0 |
| 21 | dom.js | 1 | 1 | 0 | 0 | 0 |
| 22 | state.js | 1 | 1 | 0 | 0 | 0 |

**6 archivos SIN localStorage** (no tocar): audio.js, tabs.js, toast.js, studyTerminology.js, templates.js.

### 46 claves únicas de localStorage:

Las más usadas (dispersas en muchos archivos):
- `pdf_config` — 11 archivos, 26 accesos
- `groq_api_key` — 8 archivos, 15 accesos
- `prof_data` — 8 archivos, 18 accesos
- `workplace_profiles` — 6 archivos, 12 accesos
- `device_id` — 6 archivos, 8 accesos

### Bugs conocidos a corregir durante la migración:

1. **`workplaces` vs `workplace_profiles`**: En `pdfPreview.js` línea ~996, se lee la clave `workplaces` pero ningún archivo la escribe. Debería ser `workplace_profiles`.
2. **`med_dictionary` vs `custom_med_dict`**: En `settingsPanel.js` línea ~679, se lee `med_dictionary` para estadísticas, pero `medDictionary.js` usa `custom_med_dict`. Las stats siempre dan 0.

---

## FASES DE EJECUCIÓN

### FASE 0: Crear `src/js/utils/db.js`

Crear el wrapper IndexedDB. Debe:
- Crear/abrir una base de datos `TranscriptorProDB` con un objectStore `appData`
- Exponer `window.appDB` con los métodos listados arriba
- Incluir migración automática desde localStorage al primer uso
- Mantener `theme` sincronizada a localStorage (es la única clave que CSS lee directamente)
- Incluir fallback a localStorage si IndexedDB falla

Agregar `'src/js/utils/db.js'` como PRIMER elemento en:
- `build.js` → array `JS_FILES`
- `index.html` → antes de todos los otros `<script>`

**Test**: `npm test` debe seguir dando 287/287.

### FASE 1: Archivos solo-lectura (5 archivos)

Archivos que solo hacen `localStorage.getItem()` — solo agregar `await` y hacer la función `async`:

- `pdfMaker.js` (5 gets)
- `pdfPreview.js` (19 gets) — **corregir bug `workplaces` → `workplace_profiles`**
- `dom.js` (1 get — función `safeJSONParse`)
- `state.js` (1 get — top-level, necesita patrón especial de init)
- `transcriptor.js` (3 gets)

⚠️ **Cuidado con `state.js`**: Lee `groq_api_key` en top-level del IIFE. No puede ser async en top-level. Convertirlo en una función init que se llame desde `business.js` al arrancar.

⚠️ **Cuidado con `dom.js`**: `safeJSONParse(key)` es un helper genérico que MUCHOS archivos usan. Al hacerlo async, TODOS los que lo llaman necesitan await.

**Test**: `npm test` debe seguir pasando.

### FASE 2: Archivos simples (5 archivos)

Archivos con pocas llamadas get+set:

- `userGuide.js` (3 llamadas)
- `outputProfiles.js` (2 llamadas — `_load()` y `_save()`)
- `patientRegistry.js` (2 llamadas — `getRegistry()` y `_saveRegistry()`)
- `medDictionary.js` (4 llamadas)
- `config.js` (3 llamadas)

⚠️ **`patientRegistry.js`**: `getRegistry()` es sync y se llama desde muchos lugares. Al hacerla async, verificar todos los callers.
⚠️ **`config.js`**: `loadClientConfig()` ya es async, cambio fácil. Pero `PersistentConfig._load()` es sync.

**Test**: `npm test` debe seguir pasando.

### FASE 3: Archivos medios (10 archivos)

- `editor.js` (9 llamadas — snapshots, field history, pdf_config)
- `formHandler.js` (9 llamadas — patient_history migration, report_counter, pdf_config)
- `stateManager.js` (6 llamadas — autosave, profile switching)
- `contact.js` (8 llamadas — pending_contacts retry)
- `structurer.js` (7 llamadas — API key, pending queue, patient data)
- `reportHistory.js` (8 llamadas — load/save history, re-export)
- `sessionAssistant.js` (8 llamadas — workplace_profiles repetido 6 veces)
- `licenseManager.js` (10 llamadas — device_id, cache, metrics)
- `diagnostic.js` (13 llamadas — muchos gets para buildDiagnosticReport)
- `pricingCart.js` (6 llamadas)

**Test**: `npm test` debe seguir pasando.

### FASE 4: Archivos pesados (3 archivos)

- `ui.js` (26 llamadas — theme, API key, prof_data, pdf_config, autosave)
- `settingsPanel.js` (31 llamadas — **corregir bug `med_dictionary` → `custom_med_dict`**, backup export/import, localStorage.clear, loop de tamaño)
- `business.js` (34 llamadas — factory setup con múltiples read-modify-write de pdf_config)

⚠️ **`settingsPanel.js` tiene `localStorage.clear()`**: Reemplazar por `await appDB.clear()`.
⚠️ **`settingsPanel.js` L846-848 itera todo localStorage** con `localStorage.key(i)` en loop para calcular tamaño: Reemplazar por `await appDB.sizeInBytes()`.
⚠️ **`settingsPanel.js` export backup** (L734): Lee múltiples claves en loop. Usar `await appDB.getAll()` filtrado por las exportKeys.
⚠️ **`settingsPanel.js` import backup** (L762): Escribe múltiples claves en loop. Usar loop con `await appDB.set()`.

**Test**: `npm test` debe seguir pasando.

### FASE 5: Migración y cleanup

- En `db.js`, la migración automática debe:
  1. Verificar si ya migró (flag `_idb_migrated`)
  2. Leer TODAS las claves de localStorage
  3. Escribirlas en IndexedDB
  4. Marcar `_idb_migrated = true` en IndexedDB
  5. Limpiar localStorage (excepto `theme`)
- Verificar que la app funciona sin nada en localStorage
- Eliminar cualquier referencia directa a `localStorage` que haya quedado (excepto `theme`)

### FASE 6: Tests y SW

- Actualizar `tests/run_tests.js`:
  - El mock actual simula `LocalStorage` como clase en `global.localStorage`
  - Agregar mock de `appDB` con la misma interfaz (pero sync, ya que los tests corren en Node)
  - O crear un mock async que funcione con los tests
- Bumpar `sw.js` CACHE_NAME a `transcriptor-pro-v41`
- `npm test` debe dar 287/287
- Commit y push final

---

## CONSIDERACIONES ESPECIALES

### Patrón sync → async

El mayor desafío es que `localStorage.getItem()` es **síncrono** y `appDB.get()` es **asíncrono**. Esto significa:

```javascript
// ANTES
function getRegistry() {
    return JSON.parse(localStorage.getItem('patient_registry') || '[]');
}

// DESPUÉS  
async function getRegistry() {
    return (await appDB.get('patient_registry')) || [];
}
```

Y TODOS los que llaman a `getRegistry()` necesitan `await`:
```javascript
// ANTES
const patients = getRegistry();

// DESPUÉS
const patients = await getRegistry();
```

### Claves que necesitan consideración especial

| Clave | Por qué | Qué hacer |
|-------|---------|-----------|
| `theme` | CSS `:root[data-theme]` la lee antes de JS | Mantener en localStorage Y en IndexedDB. Escribir en ambos siempre. |
| `groq_api_key` | Leída en top-level de `state.js` | Convertir a función init async |
| `pdf_config` | Leída en 11 archivos, read-modify-write frecuente | Cachear en memoria tras primera lectura |

### Archivos a NO tocar

- `audio.js` — sin localStorage
- `tabs.js` — sin localStorage  
- `toast.js` — sin localStorage
- `studyTerminology.js` — sin localStorage
- `templates.js` — sin localStorage
- `recursos/admin.html` — tiene su propio localStorage, es app separada
- `recursos/manual.html` — solo lee `theme`
- `recursos/login.html` / `registro.html` — apps separadas

### Cómo verificar que funciona

1. `npm test` → 287/287
2. `node build.js` → build exitoso sin errores
3. Abrir `index.html` directo en browser → la app carga sin errores en consola
4. Verificar que datos existentes migraron (si había datos en localStorage, ahora están en IndexedDB)
5. Verificar en DevTools → Application → IndexedDB → TranscriptorProDB que las claves existen

---

## RESUMEN DE ARCHIVOS Y RUTAS

```
c:\Users\kengy\Desktop\Transcriptor-pro\
├── build.js                          ← Agregar db.js al array JS_FILES
├── index.html                        ← Agregar <script> de db.js
├── sw.js                             ← Bumpar a v41 al final
├── src/js/
│   ├── utils/db.js                   ← ARCHIVO NUEVO (wrapper IndexedDB)
│   ├── utils/dom.js                  ← 1 llamada
│   ├── utils/ui.js                   ← 26 llamadas
│   ├── utils/stateManager.js         ← 6 llamadas
│   ├── utils/tabs.js                 ← NO TOCAR
│   ├── utils/toast.js                ← NO TOCAR
│   ├── config/config.js              ← 3 llamadas
│   ├── core/state.js                 ← 1 llamada (top-level, cuidado)
│   ├── core/audio.js                 ← NO TOCAR
│   └── features/
│       ├── business.js               ← 34 llamadas
│       ├── contact.js                ← 8 llamadas
│       ├── diagnostic.js             ← 13 llamadas
│       ├── editor.js                 ← 9 llamadas
│       ├── formHandler.js            ← 9 llamadas
│       ├── licenseManager.js         ← 10 llamadas
│       ├── medDictionary.js          ← 4 llamadas
│       ├── outputProfiles.js         ← 2 llamadas
│       ├── patientRegistry.js        ← 2 llamadas
│       ├── pdfMaker.js               ← 5 llamadas
│       ├── pdfPreview.js             ← 19 llamadas (bug: workplaces → workplace_profiles)
│       ├── pricingCart.js             ← 6 llamadas
│       ├── reportHistory.js          ← 8 llamadas
│       ├── sessionAssistant.js       ← 8 llamadas
│       ├── settingsPanel.js          ← 31 llamadas (bug: med_dictionary → custom_med_dict)
│       ├── structurer.js             ← 7 llamadas
│       ├── transcriptor.js           ← 3 llamadas
│       └── userGuide.js              ← 3 llamadas
├── tests/run_tests.js                ← Actualizar mock de localStorage → appDB
```

**Total: 215 llamadas a localStorage en 22 archivos → migrar a `await appDB.xxx()`**

---

Comienza por la Fase 0. Después de cada fase, corre `npm test` y confirmame el resultado antes de continuar con la siguiente. NO hagas más de una fase a la vez sin verificar.
