# TRANSCRIPTOR PRO — Auditoría Completa de Flujos

## PROMPT PARA LA IA AUDITORA

> **INSTRUCCIONES PARA LA IA QUE RECIBE ESTE DOCUMENTO:**
>
> Sos un auditor técnico de software especializado en aplicaciones web SPA (Single Page Application). Tu trabajo es poner a prueba CADA elemento, botón, estado, transición y comportamiento descrito en el documento de flujos que aparece más abajo.
>
> **Tu metodología obligatoria:**
>
> 1. **Leé TODO el documento de flujos** antes de hacer la primera pregunta.
> 2. **Generá preguntas técnicas exhaustivas** sobre cada elemento mencionado. Mínimo 10 preguntas por fase/sección. Las preguntas deben cubrir:
>    - **Comportamiento al hover** (¿cambia color? ¿cursor pointer? ¿tooltip?)
>    - **Comportamiento al click** (¿qué función llama? ¿qué cambia en pantalla?)
>    - **Comportamiento al doble-click** (¿hace algo diferente?)
>    - **Estado disabled** (¿se puede hacer click cuando está deshabilitado? ¿visual diferente?)
>    - **Estado de carga/loading** (¿muestra spinner? ¿se deshabilita? ¿texto cambia?)
>    - **Qué pasa si se hace click múltiples veces rápido** (¿hay debounce? ¿mutex?)
>    - **Qué pasa si falla la operación** (¿mensaje de error? ¿retry? ¿rollback?)
>    - **Qué pasa con conexión lenta o sin internet**
>    - **Responsividad** (¿se ve bien en móvil? ¿se oculta? ¿se reordena?)
>    - **Accesibilidad** (¿tiene aria-label? ¿es navegable con Tab? ¿screen reader?)
>    - **Casos borde** (archivo vacío, texto de 1 carácter, texto de 100.000 palabras, etc.)
>    - **Interacción entre elementos** (¿si presiono X mientras Y está activo, qué pasa?)
>    - **Persistencia** (¿se pierde si recargo la página? ¿se guarda en localStorage?)
>    - **Consistencia visual** (¿mismo estilo que otros botones? ¿sigue el design system?)
>
> 3. **Formato de preguntas**: Hacé las preguntas una sección a la vez (FASE 0, luego FASE 1, etc.). Esperá las respuestas antes de pasar a la siguiente fase. Cada pregunta debe poder responderse con **Sí**, **No**, o una respuesta corta.
>
> 4. **Sé implacable**: Si algo no está claro en el documento, preguntá. Si algo parece que falta, preguntá. Si algo parece redundante o contradictorio, preguntá. Tu objetivo es encontrar TODOS los huecos, inconsistencias, bugs potenciales y comportamientos no documentados.
>
> 5. **Categorías de preguntas obligatorias por cada botón/elemento:**
>    - ¿Existe visualmente en el DOM en todo momento o se crea dinámicamente?
>    - ¿Se oculta con `display:none`, `visibility:hidden`, o se remueve del DOM?
>    - ¿Tiene animación de entrada/salida?
>    - ¿Qué pasa si el usuario hace click mientras hay una operación en curso?
>    - ¿Tiene feedback visual inmediato al presionarlo (ripple, color change, scale)?
>    - ¿Muestra confirmación antes de ejecutar la acción?
>    - ¿Se puede deshacer la acción?
>    - ¿Cuánto tarda la operación típicamente?
>    - ¿Qué pasa si se cierra la pestaña durante la operación?
>
> 6. **Categorías de preguntas obligatorias por cada transición de estado:**
>    - ¿La transición es instantánea o tiene delay?
>    - ¿Hay animación visual que indique el cambio de estado?
>    - ¿Se puede volver al estado anterior? ¿Cómo?
>    - ¿Qué botones aparecen? ¿Cuáles desaparecen? ¿Cuáles cambian?
>    - ¿El editor cambia su contenido en esta transición?
>    - ¿Se guarda algo en localStorage en esta transición?
>    - ¿Qué pasa si la transición falla a mitad de camino?
>
> 7. **Categorías de preguntas obligatorias por cada llamada API:**
>    - ¿Qué endpoint se usa?
>    - ¿Qué headers se envían?
>    - ¿Qué pasa con timeout?
>    - ¿Hay retry automático?
>    - ¿Se muestra progreso al usuario?
>    - ¿Qué códigos de error se manejan específicamente?
>    - ¿Hay rate limiting? ¿Cómo se maneja?
>
> 8. **Al final de todas las fases**, hacé un resumen de:
>    - Elementos que parecen completos y bien implementados ✅
>    - Elementos con posibles huecos o ambigüedades ⚠️
>    - Elementos que faltan o están incompletos ❌
>    - Sugerencias de mejora 💡
>
> **COMENZÁ pidiendo confirmación de que el usuario está listo, y luego empezá con FASE 0.**

---
---

# DOCUMENTO DE FLUJOS — TRANSCRIPTOR PRO

## Descripción General

**Transcriptor Pro** es una SPA (Single Page Application) médica que:
- Graba o recibe audio de consultas médicas
- Transcribe audio a texto usando Whisper (Groq API)
- Estructura el texto en informes médicos formales usando LLMs (Groq API)
- Genera PDFs profesionales con header, footer, firma y QR
- Funciona como PWA instalable

**Stack**: HTML/CSS/JS vanilla (sin frameworks), jsPDF para PDF, Groq API (Whisper + LLaMA).

**Archivos clave del proyecto:**
- `index.html` — Estructura HTML completa
- `src/js/core/state.js` — Variables de estado globales
- `src/js/core/audio.js` — Grabación y manejo de archivos de audio
- `src/js/utils/stateManager.js` — Máquina de estados y visibilidad de botones
- `src/js/features/editor.js` — Editor WYSIWYG + detección de paste
- `src/js/features/transcriptor.js` — Pipeline de transcripción con retry
- `src/js/features/structurer.js` — Estructuración IA con detección de plantilla
- `src/js/features/pdfPreview.js` — Vista previa del informe
- `src/js/features/pdfMaker.js` — Generación de PDF con jsPDF
- `src/js/utils/ui.js` — Event wiring de botones de UI
- `src/js/config/templates.js` — 37 plantillas médicas
- `src/js/config/config.js` — Configuración y API keys

---

## MÁQUINA DE ESTADOS

```
IDLE → FILES_LOADED → TRANSCRIBED → STRUCTURED → PREVIEWED
```

| Estado | Significado | Cómo se llega |
|---|---|---|
| `IDLE` | App vacía, sin contenido | Al cargar la app, o al hacer Reset |
| `FILES_LOADED` | Hay archivos de audio cargados, pendientes de transcribir | Al grabar audio o subir archivos |
| `TRANSCRIBED` | Hay texto en el editor (transcrito o pegado) | Al completar transcripción o al pegar texto |
| `STRUCTURED` | El texto fue estructurado por IA en formato de informe | Al completar la estructuración |
| `PREVIEWED` | Se abrió la vista previa del PDF | Al abrir la vista previa |

**Variable global**: `appState` en `state.js` (string).

---

## MODOS DE OPERACIÓN

| Modo | Variable | UI | Diferencia principal |
|---|---|---|---|
| Normal | `currentMode = 'normal'` | Toggle desactivado | El usuario elige plantilla manualmente de un `<select>` |
| Pro | `currentMode = 'pro'` | Toggle activado | Auto-detección de plantilla + botón 1-clic |

**Toggle**: `proModeToggle` (checkbox), persiste en `localStorage('pro_mode')`.

---

## FASE 0 — ESTADO INICIAL (IDLE)

### Al cargar la app:

1. **Estado**: `appState = 'IDLE'`
2. **Modo**: Se lee `localStorage('pro_mode')`:
   - Si `true` → `currentMode = 'pro'`, toggle activado
   - Si `false` o ausente → `currentMode = 'normal'`
3. **API Key**: Se lee de `localStorage('GROQ_API_KEY')`:
   - Si no existe → se muestra modal de bienvenida para ingresar la key
   - Si existe → se asigna a variable global `GROQ_API_KEY`
4. **Datos profesionales**: Se leen de `localStorage('pdf_config')`:
   - Nombre, matrícula, especialidad, institución, dirección, teléfono, logo
5. **Licencia**: Se lee de `localStorage('license_info')`:
   - Tipo: `ADMIN` o `CLONE`
   - Device ID

### Variables globales inicializadas (state.js):

| Variable | Valor inicial | Tipo |
|---|---|---|
| `appState` | `'IDLE'` | string |
| `currentMode` | `'normal'` | string |
| `selectedTemplate` | `'generico'` | string |
| `uploadedFiles` | `[]` | array |
| `transcriptions` | `[]` | array |
| `activeTabIndex` | `0` | number |
| `isProcessing` | `false` | boolean |
| `isRecording` | `false` | boolean |
| `GROQ_API_KEY` | `''` | string |

### Botones visibles en IDLE:

| Botón/Elemento | Visible | Habilitado |
|---|---|---|
| Botón Grabar | ✅ | ✅ |
| Input subir archivos | ✅ | ✅ |
| Dropzone (drag & drop) | ✅ | ✅ |
| Editor (vacío) | ✅ | ✅ (editable) |
| Toggle modo Pro | ✅ | ✅ |
| `transcribeBtn` | ✅ | ❌ (disabled) |
| `transcribeAndStructureBtn` | ✅ solo en Pro | ❌ (disabled) |
| `btnStructureAI` | ❌ | — |
| `btnApplyTemplate` | ❌ | — |
| `copyBtn` | ❌ | — |
| `printBtn` | ❌ | — |
| `downloadBtnContainer` | ❌ | — |
| `downloadPdfBtn` | ❌ | — |
| `btnConfigPdfMain` | ❌ | — |
| `btnPreviewPdfMain` | ❌ | — |
| `btnCompareView` | ❌ | — |
| `btnRestoreOriginal` | ❌ | — |
| `btnMedicalCheck` | ❌ | — |
| `quickProfileSelector` | ❌ | — |

---

## FASE 1 — INGRESO DE CONTENIDO

### Camino A: Grabar Audio

| Paso | Acción | Función | Archivo |
|---|---|---|---|
| A1 | Usuario hace clic en botón Grabar | `toggleRecording()` | `audio.js` |
| A2 | Se solicita permiso de micrófono | `getUserMedia({audio:true})` | `audio.js` |
| A3 | MediaRecorder comienza a grabar | `mediaRecorder.start()` | `audio.js` |
| A4 | UI: botón cambia a rojo pulsante, timer visible | CSS class `recording` | `audio.js` |
| A5 | Usuario hace clic de nuevo para detener | `toggleRecording()` | `audio.js` |
| A6 | `mediaRecorder.stop()` → evento `onstop` | — | `audio.js` |
| A7 | Chunks se unen en Blob | `new Blob(chunks, {type})` | `audio.js` |
| A8 | Blob → File con nombre `grabacion_HHMMSS.webm` | `new File(...)` | `audio.js` |
| A9 | Se invoca `handleFiles([file])` | `handleFiles()` | `audio.js` |

### Camino B: Subir Archivos

| Paso | Acción | Función | Archivo |
|---|---|---|---|
| B1 | Usuario arrastra archivos al dropzone o hace clic en input file | — | `audio.js` |
| B2 | Se invoca `handleFiles(fileList)` | `handleFiles()` | `audio.js` |

### Procesamiento común de archivos (Caminos A y B):

| Paso | Acción | Detalle |
|---|---|---|
| AB1 | Filtrar archivos válidos | Solo `audio/*`, máximo 25MB por archivo |
| AB2 | Cada archivo se agrega a `uploadedFiles[]` | Con `status: 'pending'`, URL blob para preview |
| AB3 | Se renderiza lista de archivos | `updateFileList()` — botones play/remove por archivo |
| AB4 | **Estado → `FILES_LOADED`** | `updateButtonsVisibility('FILES_LOADED')` |
| AB5 | `transcribeBtn` se habilita | `disabled = false` |
| AB6 | Si modo Pro: `transcribeAndStructureBtn` se habilita | `disabled = false` |

### Camino C: Pegar Texto

| Paso | Acción | Función | Archivo |
|---|---|---|---|
| C1 | Usuario pega texto (Ctrl+V) en el editor | listener `paste` | `editor.js` |
| C2 | Se obtiene `clipboardData.getData('text/html')` | — | `editor.js` |
| C3 | **Detección Word/Docs**: regex busca `mso-`, `MsoNormal`, `docs-internal-guid`, `<o:p>` | — | `editor.js` |
| C4 | **Si es Word/Docs → Limpieza completa**: | — | `editor.js` |
| | — Eliminar `<o:p>` y `</o:p>` | regex replace | |
| | — Eliminar `<style>...</style>` | regex replace | |
| | — Eliminar `<meta ...>` | regex replace | |
| | — Eliminar atributos `class="..."` | regex replace | |
| | — Eliminar atributos `style="..."` | regex replace | |
| | — Eliminar `<span>` vacíos (sin atributos) | regex replace | |
| | — Eliminar `<font>` tags | regex replace | |
| | — Eliminar `<p>` vacíos | regex replace | |
| | — Eliminar `<br>` dobles | regex replace | |
| | — Se previene default y se inserta HTML limpio con `insertHTML` | `execCommand` | |
| C5 | **Si NO es Word** → paste nativo normal | — | `editor.js` |
| C6 | Post-paste: ¿estado === IDLE o FILES_LOADED Y texto > 30 chars? | — | `editor.js` |
| C7 | **Si sí** → crear `transcriptions[0] = {name: 'Texto pegado', text: contenido}` | — | `editor.js` |
| C8 | **Estado → `TRANSCRIBED`** (salta FILES_LOADED) | — | `editor.js` |
| C9 | Toast: "📋 Texto pegado detectado. Podés estructurarlo con IA." | `showToast()` | `editor.js` |
| C10 | **NO pasa por transcripción Whisper** | — | — |

---

## FASE 2 — TRANSCRIPCIÓN (solo audio)

### Activación:

- **Click en `transcribeBtn`** → transcripción normal
- **Click en `transcribeAndStructureBtn`** (solo Pro) → setea `_shouldAutoStructure = true`, luego simula click en `transcribeBtn`

### Pipeline de transcripción:

| Paso | Acción | Detalle |
|---|---|---|
| T1 | Validar `GROQ_API_KEY` | Si falta → toast error, abortar |
| T2 | `isProcessing = true` | Deshabilitar controles |
| T3 | Si múltiples archivos → preguntar ¿unir audios? | Checkbox o diálogo |
| T4 | **Bucle por cada archivo con status `pending`**: | — |
| T5 | `validateAudioFile(file)` | Verificar formato, tamaño, no vacío |
| T6 | `transcribeWithRetry(file)` | 4 intentos progresivos (ver abajo) |
| T7 | `cleanTranscriptionText(result)` | Quitar `...`, capitalizar, limpiar espacios |
| T8 | Si error en archivo individual → `showAudioRepairModal()` | Opciones: normalizar, filtrar ruido, mono 16kHz |
| T9 | Si error en batch → `askBatchDecision()` | Continuar con los demás o cancelar todo |
| T10 | Resultados → `transcriptions[].text` | O concatenado si eligió unir |
| T11 | Crear tabs en editor si múltiples | `createTabs()` |
| T12 | Editor muestra texto crudo | Sin formato, solo texto |
| T13 | **Estado → `TRANSCRIBED`** | `updateButtonsVisibility('TRANSCRIBED')` |
| T14 | `isProcessing = false` | Rehabilitar controles |

### Estrategia de retry (`transcribeWithRetry`):

| Intento | Idioma | Audio | Modelo |
|---|---|---|---|
| 1 | `es` (español forzado) | Original | `whisper-large-v3` |
| 2 | `auto` (sin forzar) | Original | `whisper-large-v3` |
| 3 | `es` | **Reparado** (normalize+noise+mono) | `whisper-large-v3` |
| 4 | `auto` | **Reparado** | `whisper-large-v3` |

**API endpoint**: `POST https://api.groq.com/openai/v1/audio/transcriptions`
**Headers**: `Authorization: Bearer ${GROQ_API_KEY}`
**Body**: `FormData` con `file`, `model`, `language`

### Si `_shouldAutoStructure === true`:

| Paso | Acción |
|---|---|
| AS1 | Inmediatamente después de TRANSCRIBED |
| AS2 | `autoDetectTemplateKey(text)` silenciosamente |
| AS3 | `autoStructure({ silent: true })` |
| AS4 | No muestra toast de selección de plantilla |

---

## Botones visibles en TRANSCRIBED:

| Botón/Elemento | Modo Normal | Modo Pro |
|---|---|---|
| `btnStructureAI` | ❌ | ✅ (visible + habilitado) |
| `applyTemplateWrapper` + `btnApplyTemplate` + `templateSelect` | ✅ | ❌ |
| `transcribeAndStructureBtn` | ❌ | ✅ (pero disabled si ya transcribió) |
| `copyBtn` | ✅ | ✅ |
| `printBtn` | ✅ | ✅ |
| `downloadBtnContainer` | ✅ | ✅ |
| `downloadPdfBtn` | ❌ | ❌ |
| `btnConfigPdfMain` | ✅ | ✅ |
| `btnPreviewPdfMain` | ✅ | ✅ |
| `btnMedicalCheck` | ✅ | ✅ |
| `quickProfileSelector` | ✅ (admin siempre; clones si SA no completado) | ✅ |
| `btnCompareView` | ❌ | ❌ |
| `btnRestoreOriginal` | ❌ | ❌ |

---

## FASE 3 — ESTRUCTURACIÓN CON IA

### 3 formas de activar:

| Forma | Botón | Modo | Selección de plantilla |
|---|---|---|---|
| Manual Pro | `btnStructureAI` | Pro | Auto-detectada + toast confirmación |
| Manual Normal | `btnApplyTemplate` | Normal | `templateSelect.value` elegido por usuario |
| Auto Pipeline | `transcribeAndStructureBtn` | Pro | Auto-detectada, sin toast (silent) |

### Detección de plantilla (`autoDetectTemplateKey`):

| Paso | Detalle |
|---|---|
| DT1 | Se toma el texto transcrito |
| DT2 | Se evalúa contra las **37 plantillas** de `templates.js` |
| DT3 | Cada plantilla tiene: `name`, `category`, `keywords[]`, `prompt` |
| DT4 | Puntaje: nombre de plantilla en texto → **+10 puntos** |
| DT5 | Keyword encontrado como frase literal → **+6 puntos** |
| DT6 | Keyword encontrado por proximidad (ventana de 6-8 palabras) → **+4 puntos** |
| DT7 | `MIN_SCORE = 7` — si el mejor score < 7 → `'generico'` |
| DT8 | Anti-ambigüedad: si la diferencia entre 1° y 2° score ≤ 3 → `'generico'` |
| DT9 | Resultado: `templateKey` string (ej: `'eco_abdominal'`, `'rx_torax'`, `'generico'`) |

### Confirmación de plantilla (`promptTemplateSelection`):

| Paso | Detalle |
|---|---|
| PS1 | Solo se ejecuta en modo manual (no silent) |
| PS2 | Toast visible 5 segundos: "Plantilla detectada: **Ecografía abdominal** [Cambiar]" |
| PS3 | Si usuario no hace nada en 5s → se confirma automáticamente |
| PS4 | Si hace clic en [Cambiar] → se muestra select con todas las plantillas |
| PS5 | Si selecciona otra → se usa la nueva |

### Llamada a la IA (`structureWithRetry`):

| Intento | Modelo | Temperature |
|---|---|---|
| 1 | `llama-3.3-70b-versatile` | `0.1` |
| 2 | `llama-3.3-70b-versatile` | `0.15` |
| 3 | `llama-3.1-70b-versatile` | `0.1` |
| 4 | `llama-3.1-8b-instant` | `0.1` |

**API endpoint**: `POST https://api.groq.com/openai/v1/chat/completions`
**Headers**: `Authorization: Bearer ${GROQ_API_KEY}`, `Content-Type: application/json`
**Body**: `{ model, temperature, messages: [{role:'system', content: prompt}] }`

### Prompt enviado a la IA:

Contiene:
1. `template.prompt` — instrucciones específicas de la plantilla médica
2. **11 reglas estrictas**:
   - R1: Formato Markdown con `#`, `##`, `###`
   - R2: Cada campo refleja SOLO lo dicho por el profesional
   - R3: NO inventar datos
   - R4: Si un campo no tiene info → `[No especificado]`
   - R5: Respetar terminología médica exacta
   - R6: Usar listas con `-` para enumeraciones
   - R7-R11: Reglas adicionales de formato y contenido
3. El texto transcrito como input

### Procesamiento de la respuesta:

| Paso | Función | Detalle |
|---|---|---|
| PR1 | `parseAIResponse(raw)` | Separa cuerpo del informe de nota/aclaración final |
| PR2 | `markdownToHtml(markdown)` | Convierte markdown a HTML semántico |
| PR3 | `# Título` → `<h1 class="report-h1">` | — |
| PR4 | `## Sección` → `<h2 class="report-h2">` | — |
| PR5 | `### Subsección` → `<h3 class="report-h3">` | — |
| PR6 | `- item` → `<li>` agrupados en `<ul>` | Listas consecutivas se fusionan |
| PR7 | `**negrita**` → `<strong>` | — |
| PR8 | `*cursiva*` → `<em>` | — |
| PR9 | `[No especificado]` → `<span class="editable-field" contenteditable>---</span>` | Campo editable clickeable |
| PR10 | HTML se inyecta en el editor | `editor.innerHTML = html` |

### Post-estructuración:

| Paso | Función | Detalle |
|---|---|---|
| PE1 | `triggerPatientDataCheck()` | Busca nombres propios con regex |
| PE2 | Si encuentra nombre → toast "👤 Paciente: Juan Pérez" | Guarda en `pdf_config.patientName` |
| PE3 | Si NO encuentra → `insertPatientPlaceholder()` | Banner clickeable: "Agregar datos del paciente" |
| PE4 | **Estado → `STRUCTURED`** | `updateButtonsVisibility('STRUCTURED')` |

---

## Botones visibles en STRUCTURED:

| Botón/Elemento | Visible | Nota |
|---|---|---|
| `btnRestoreOriginal` | ✅ | Restaura el texto crudo original |
| `btnCompareView` | ✅ | Vista lado a lado (original vs estructurado) |
| `copyBtn` | ✅ | — |
| `printBtn` | ✅ | — |
| `downloadBtnContainer` | ✅ | — |
| `downloadPdfBtn` | ✅ | **Ahora visible** (solo después de estructurar) |
| `btnConfigPdfMain` | ✅ | — |
| `btnPreviewPdfMain` | ✅ | — |
| `btnMedicalCheck` | ✅ | — |
| `btnStructureAI` | ❌ | Oculto (ya se estructuró) |
| `btnApplyTemplate` | ❌ | Oculto |
| `applyTemplateWrapper` | ❌ | Oculto |

---

## FASE 4 — SALIDA

### Vista Previa (`openPrintPreview`):

| Paso | Detalle |
|---|---|
| VP1 | Clic en `btnPreviewPdfMain` → abre modal fullscreen |
| VP2 | Secciones del modal: |
| | — Banner del lugar de trabajo (si existe) |
| | — Header profesional: nombre, matrícula, especialidad, institución |
| | — Datos del paciente: nombre, DNI, obra social |
| | — Tipo de estudio (auto-detectado desde plantilla) |
| | — Contenido del informe (HTML estructurado) |
| | — Firma del profesional |
| | — Código QR (generado con qrcode-generator) |
| | — Footer con fecha y info adicional |
| VP3 | Desde el modal se puede: Descargar PDF, Más formatos, Imprimir, Enviar Email |

### Descarga PDF (`downloadPDFWrapper`):

| Paso | Detalle |
|---|---|
| PDF1 | `jsPDF` genera documento A4 |
| PDF2 | `drawHeader()` en página 1: logo, nombre, matrícula, especialidad, institución, dirección, teléfono |
| PDF3 | Se escribe el contenido del informe |
| PDF4 | `ensureSpace(needed)`: si no hay espacio → `addPage()` + `drawHeader()` en la nueva página |
| PDF5 | `drawFooter()`: número de página, texto footer personalizable |
| PDF6 | Resultado: archivo `informe_FECHA.pdf` descargado |

### Otros formatos de descarga:

| Formato | Función | Detalle |
|---|---|---|
| PDF | `downloadPDFWrapper()` | PDF completo con header/footer |
| RTF | `downloadRTF()` | Convierte HTML a RTF con `htmlToRtf()` |
| TXT | `downloadTXT()` | Extrae `editor.innerText` |
| HTML | `downloadHTML()` | HTML completo con estilos inline |

### Dropdown multi-formato:

| Paso | Detalle |
|---|---|
| MF1 | Clic en "▾ Más formatos" → toggle dropdown |
| MF2 | Dropdown posicionado con `position: relative` en `modal-footer` |
| MF3 | `z-index: 10010` para superar el modal |
| MF4 | Cada opción llama `window['download' + fmt.toUpperCase()]()` |

### Otras acciones:

| Acción | Función | Detalle |
|---|---|---|
| Copiar | `navigator.clipboard.writeText(editor.innerText)` | Copia texto plano |
| Imprimir | `printFromPreview()` | Iframe con contenido formateado |
| Email | `emailFromPreview()` | `mailto:` con subject y body pre-rellenados |

---

## FASE 5 — RESET

| Paso | Acción |
|---|---|
| R1 | Clic en botón Reset |
| R2 | `uploadedFiles = []` — vaciar lista de archivos |
| R3 | `transcriptions = []` — borrar transcripciones |
| R4 | `editor.innerHTML = ''` — limpiar editor |
| R5 | Resetear input file |
| R6 | Eliminar tabs |
| R7 | `_shouldAutoStructure = false` |
| R8 | **Estado → `IDLE`** → todos los botones de acción ocultos |
| R9 | **NO se borra localStorage** — `pdf_config`, `API_KEY`, `patient_registry` persisten |
| R10 | El usuario puede empezar un nuevo informe desde cero |

---

## DIFERENCIAS MODO NORMAL vs PRO

| Aspecto | Normal | Pro |
|---|---|---|
| Botón de estructurar | `btnApplyTemplate` + `<select>` de plantillas | `btnStructureAI` (solo ícono/texto) |
| Selección de plantilla | Manual: el usuario elige del dropdown | Automática: `autoDetectTemplateKey()` |
| Pipeline 1-clic | No disponible | `transcribeAndStructureBtn` (transcribir + estructurar automático) |
| Toast de plantilla | No (selección directa del usuario) | Toast 5s con auto-confirmación |
| Botón transcribir | Solo `transcribeBtn` | `transcribeBtn` + `transcribeAndStructureBtn` |

---

## MANEJO DE ERRORES

| Escenario | Comportamiento |
|---|---|
| API Key inválida/expirada | Toast rojo, sugiere revisar configuración |
| API Key ausente | Modal de bienvenida para ingresar key |
| Audio corrupto | `showAudioRepairModal()` con 3 opciones de reparación |
| Archivo > 25MB | Rechazado en `handleFiles()` con toast de aviso |
| Rate limit Groq (429) | Espera exponencial, reintento automático |
| Modelo no disponible | Fallback automático al siguiente modelo de la lista |
| Respuesta IA vacía/malformada | Reintento con mayor temperature |
| 4 intentos fallidos en transcripción | Modal de error con opciones de reparación |
| 4 intentos fallidos en estructuración | `addToStructurePendingQueue()` — guarda en localStorage (máx 10 items), puede reintentar después |
| Sin conexión | Fetch falla, catch muestra toast de error |
| Permiso de micrófono denegado | Toast de error, botón Grabar no funciona |

---

## CAMPOS EDITABLES POST-ESTRUCTURACIÓN

Cuando la IA estructura el texto y pone `[No especificado]` en un campo:

| Paso | Detalle |
|---|---|
| CE1 | Se renderiza como `<span class="editable-field" contenteditable>---</span>` |
| CE2 | Visual: fondo celeste/amarillo claro, borde punteado |
| CE3 | Al hacer clic → se selecciona todo el contenido del span |
| CE4 | El usuario puede escribir encima |
| CE5 | Al completar → el span pierde el estilo de "vacío" |

---

## PERSISTENCIA (localStorage)

| Key | Contenido | ¿Se borra con Reset? |
|---|---|---|
| `GROQ_API_KEY` | API key de Groq | ❌ No |
| `pro_mode` | `true`/`false` | ❌ No |
| `pdf_config` | JSON con datos del profesional | ❌ No |
| `patient_registry` | Array de pacientes registrados | ❌ No |
| `patient_history` | Últimos 50 pacientes (legacy) | ❌ No |
| `license_info` | Tipo de licencia + device ID | ❌ No |
| `session_assistant_completed` | Boolean | ❌ No |
| `structure_pending_queue` | Cola de estructuraciones fallidas | ❌ No |
| `uploadedFiles` | ❌ No se persiste | N/A |
| `transcriptions` | ❌ No se persiste | N/A |
| Contenido del editor | ❌ No se persiste | N/A |

---

## PLANTILLAS MÉDICAS (37 total)

### Categorías:
- **Ecografías**: abdominal, renal, vesical, tiroidea, mamaria, obstétrica (1er/2do/3er trimestre), transvaginal, partes blandas, testicular, musculoesquelética
- **Radiología**: tórax, abdomen, columna (cervical/lumbar/dorsal), rodilla, hombro, cadera, mano/muñeca, pie/tobillo, cráneo, senos paranasales, panorámica dental
- **Cardiología**: ECG, ecocardiograma transtorácico (ETT), eco Doppler vascular
- **Otros**: laboratorio clínico, nota de evolución, epicrisis/resumen de internación, consulta general, informe genérico

### Estructura de cada plantilla:
```javascript
{
  key: 'eco_abdominal',
  name: 'Ecografía abdominal',
  category: 'Ecografías',
  keywords: ['hígado', 'vesícula', 'páncreas', 'bazo', 'riñón', 'aorta'],
  prompt: '... instrucciones detalladas para la IA ...'
}
```

---

## TESTS EXISTENTES

| Suite | Cantidad | Tipo | Estado |
|---|---|---|---|
| Node.js (`run_tests.js`) | 287 tests | Unitarios + integración | ✅ Todos pasan |
| Browser E2E (`test-structurer-e2e.html`) | 67 tests | Browser, requiere localhost:8080 | ✅ Todos pasan |

---

*Documento generado el 25 de febrero de 2026. Versión actual del código: commit `0e7e1c3`.*
