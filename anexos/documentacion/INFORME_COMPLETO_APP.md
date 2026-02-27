# Transcriptor Médico Pro — Informe técnico y de producto completo

> Versión del documento: 22/02/2026  
> Basado en el estado actual del repositorio `aldowagner78-cmd/transcripcion` rama `main`  
> Última versión deployada: https://aldowagner78-cmd.github.io/transcripcion/

---

## ÍNDICE

1. [Concepto y visión de negocio](#1-concepto-y-visión-de-negocio)
2. [Arquitectura técnica](#2-arquitectura-técnica)
3. [Modos de uso](#3-modos-de-uso)
4. [Flujos detallados paso a paso](#4-flujos-detallados-paso-a-paso)
5. [Módulos del sistema](#5-módulos-del-sistema)
6. [Inteligencia artificial — cómo funciona por dentro](#6-inteligencia-artificial--cómo-funciona-por-dentro)
7. [Plantillas médicas — catálogo completo](#7-plantillas-médicas--catálogo-completo)
8. [Sistema de pacientes y datos clínicos](#8-sistema-de-pacientes-y-datos-clínicos)
9. [Generación PDF](#9-generación-pdf)
10. [Sistema de licencias y tipos de usuario](#10-sistema-de-licencias-y-tipos-de-usuario)
11. [Modelo de negocio](#11-modelo-de-negocio)
12. [Estado actual — qué está 100% funcional](#12-estado-actual--qué-está-100-funcional)
13. [Lo que falta para el objetivo completo](#13-lo-que-falta-para-el-objetivo-completo)
14. [Deuda técnica y bugs conocidos](#14-deuda-técnica-y-bugs-conocidos)

---

## 1. Concepto y visión de negocio

### ¿Qué es?
**Transcriptor Médico Pro** es un **ecosistema de aplicaciones web PWA** para profesionales de la salud. El núcleo es una PWA (*Progressive Web App*): funciona 100% en el navegador pero se instala en el escritorio del PC o en la pantalla de inicio del celular con un solo clic, sin App Store ni Play Store.

El médico o técnico dicta durante el estudio → el sistema transcribe → la IA estructura → informe profesional listo para PDF.

---

### La arquitectura de dos capas

#### 🧠 CAPA 1 — App Nodriza (este repo)
La app del **desarrollador/dueño del negocio**. Todo desbloqueado:
- Acceso completo a todas las plantillas, modos y funciones
- **Dashboard de control** conectado a **Google Sheets via Apps Script:**
  - Lista de clientes activos con estado de suscripción
  - Activar / suspender / revocar licencias
  - Ver consumo por cliente (informes generados, sesiones, fecha último uso)
  - Detectar y bloquear device IDs no autorizados (anti-piratería)
- Panel de administración propio (datos del profesional, lugar de trabajo, etc.)

#### 🏭 CAPA 2 — Fábrica de Clones (fase futura)
Sistema construido sobre la Nodriza que genera **apps hija personalizadas** para cada cliente:
- Cada clone tiene el nombre, logo y colores del médico o institución cliente
- Las funciones disponibles se limitan según el tier de suscripción (Normal / Pro)
- La app se **distribuye como un link único** por cliente
- **Flujo de primer uso del cliente:**
  1. Abre el link → pantalla de bienvenida personalizada con su nombre/institución
  2. Acepta los Términos y Condiciones
  3. El sistema registra el device ID + fecha de activación en Google Sheets
  4. El navegador ofrece "Instalar" → la app queda como ícono en escritorio o celular
  5. A partir de ahí la usa como app nativa (sin abrir el navegador manualmente)
- **Anti-piratería:** cada vez que la app abre verifica contra Google Sheets que el device ID y la suscripción estén activos. Sin conexión → usa cache por N días antes de requerir re-validación

---

### Fases del proyecto

| Fase | Estado | Descripción |
|------|--------|-------------|
| **Fase 1 — Optimización de la Nodriza** | 🔄 En curso | Completar y pulir la app: calidad de IA, UX, PWA, flujos, seguridad |
| **Fase 2 — Infraestructura de licencias** | ⏳ Pendiente | Dashboard Google Sheets, sistema de device ID, anti-piratería |
| **Fase 3 — Fábrica de Clones** | ⏳ Pendiente | Motor de generación de clones configurables, distribución por link |

> **Estamos en Fase 1.** La Nodriza debe estar estable y optimizada antes de construir la infraestructura de licencias y la fábrica.

---

### Problema que resuelve
El médico que realiza un estudio necesita convertir su dictado en un informe estructurado. Hoy eso implica escribir a mano, contratar dactilógrafo o usar voz sin formato. **La app elimina ese cuello de botella completamente.**

### Propuesta de valor
| Lo que hace el médico | Lo que hace la app |
|-----------------------|-------------------|
| Habla 2-5 minutos durante el estudio | Transcribe con Whisper en segundos |
| Elige o confirma el tipo de estudio | Detecta automáticamente la especialidad |
| Revisa el informe | Estructura el texto con IA en secciones clínicas |
| Completa datos del paciente | Autonumera, autocompleta con historial |
| Hace clic en PDF | PDF con membrete, firma digital, datos del paciente |

### Público objetivo
- Médicos en práctica privada (consultorio propio)
- Técnicos de diagnóstico por imágenes, espirometría, endoscopía
- Centros de salud pequeños y medianos
- Cardiólogos, neumólogos, gastroenterólogos, oftalmólogos, ORL

### Ventaja competitiva
- **PWA instalable** — ícono en escritorio/celular, sin tiendas de apps, funciona offline (parcial)
- **Sin servidor propio** — infraestructura en $0 (GitHub Pages gratis)
- **IA de primer nivel** — Whisper (transcripción) + LLaMA 3.3 70B (estructuración) vía Groq
- **Costo por informe < $0.01 USD** — el médico usa su propia API Key de Groq
- **Personalizable** — 32+ plantillas por especialidad, logo, colores, firma digital

---

## 2. Arquitectura técnica

### Stack completo
| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 + CSS3 + Vanilla JavaScript (sin frameworks) |
| UI | CSS custom variables, Dark mode, animaciones CSS |
| Renderizado PDF | jsPDF 2.5.1 (CDN) |
| Transcripción de audio | Groq API → Whisper `large-v3-turbo` |
| Estructuración de texto | Groq API → LLaMA `3.3-70b-versatile` |
| Almacenamiento | `localStorage` (100% cliente, sin base de datos) |
| Deploy | GitHub Pages (gratis, sin servidor) |
| Tests | Node.js + módulo `vm` (tests unitarios sin dependencias externas) |

### Estructura de archivos
```
index.html                    ← SPA principal (1051 líneas)
src/
  css/
    variables.css             ← Variables de diseño (colores, tipografías, espaciados)
    base.css                  ← Reset, body, layout base
    components.css            ← Todos los componentes UI (modales, botones, editor, PDF preview)
    layout.css                ← Responsive, grids, columnas
    animations.css            ← Keyframes, transiciones
  js/
    config/
      config.js               ← CLIENT_CONFIG (tipo de licencia, flags de modo)
      templates.js            ← 32+ plantillas médicas con prompts de IA
    core/
      state.js                ← Estado global de la app (window.*)
      audio.js                ← Grabación, MediaRecorder, timer
    features/
      editor.js               ← Editor WYSIWYG, historial undo/redo, modal editar campos
      transcriptor.js         ← Transcripción Whisper vía Groq, procesamiento de archivos
      structurer.js           ← Detección de plantilla, estructuración LLaMA, markdownToHtml
      patientRegistry.js      ← Registro de pacientes (localStorage, búsqueda, autocompletado)
      formHandler.js          ← Extracción datos del paciente desde texto, manejo de formularios
      medDictionary.js        ← Diccionario de términos médicos con corrección automática
      pdfPreview.js           ← Previsualización A4 del informe
      pdfMaker.js             ← Generación del PDF con jsPDF
      business.js             ← Inicialización de la app, gestión de perfiles de lugar
    utils/
      dom.js                  ← Helpers de DOM ($, $$)
      toast.js                ← Sistema de notificaciones toast
      ui.js                   ← Modales, temas, API status, handlers del modal de paciente
      tabs.js                 ← Sistema de tabs (transcripciones, editor)
      stateManager.js         ← Visibilidad de botones según estado de la app
backend/
  google_apps_script.js       ← Script para Google Sheets (sistema de licencias — en desarrollo)
  admin_config.json           ← Configuración del panel de administración
tests/
  run_tests.js                ← 27 tests automatizados (Node.js)
recursos/
  admin.html                  ← Panel de administración
  login.html                  ← Pantalla de login
documentacion/
  CONTEXTO_PROYECTO.md        ← Contexto para agentes IA
  BRAINSTORM_MEJORAS.md       ← Brainstorm de mejoras pendientes
  INFORME_COMPLETO_APP.md     ← Este archivo
```

### Orden de carga de scripts (crítico)
```
config.js → templates.js → dom.js → toast.js → ui.js → tabs.js → stateManager.js
→ state.js → audio.js → editor.js → transcriptor.js → structurer.js
→ medDictionary.js → patientRegistry.js → formHandler.js → business.js
→ pdfPreview.js → pdfMaker.js
→ DOMContentLoaded → initBusinessSuite()
```

---

## 3. Modos de uso

La app tiene **dos modos** activos en tiempo de ejecución, determinados por la presencia de `window.GROQ_API_KEY`:

### Modo Normal (sin API Key)
El usuario **no configura** ninguna API Key. Tiene acceso a:
- ✅ Grabación de audio en vivo
- ✅ Carga de archivos de audio (MP3, WAV, OGG, M4A, WebM)
- ✅ Transcripción de voz (requiere API Key — **esto es una inconsistencia actual**: sin API Key la transcripción no funciona, pero el modo se llama "Normal". Ver sección 14)
- ✅ Editor WYSIWYG completo
- ✅ Exportación PDF con encabezado y firma
- ✅ Configuración del PDF (datos del médico, lugar de trabajo)
- ✅ Vista previa A4
- ✅ Aplicar plantilla estática (estructura fija, sin IA)
- ✅ Registro de pacientes
- ❌ Estructuración automática con IA
- ❌ Detección automática de plantilla
- ❌ Grabar audio para completar un campo vacío del informe

### Modo Pro (con API Key de Groq)
El usuario ingresa su API Key de Groq (`gsk_...`). Adicionalmente al Modo Normal:
- ✅ Transcripción con Whisper `large-v3-turbo`
- ✅ Detección automática del tipo de estudio
- ✅ Estructuración del informe con LLaMA `3.3-70b-versatile`
- ✅ Completar campos vacíos grabando y transcribiendo (modal editar campo)
- ✅ Auto-completado de datos del paciente desde el texto transcripto
- ✅ Revisión terminológica con IA (Med Dictionary AI scan)

### Tipos de licencia definidos en config.js
```javascript
CLIENT_CONFIG.type = 'ADMIN' | 'TRIAL' | 'NORMAL' | 'PRO'
```
> Actualmente toda la app corre como `ADMIN` (modo de desarrollo/demo). El sistema de licencias por device ID + Google Sheets está en desarrollo (PR #17, no implementado aún).

---

## 4. Flujos detallados paso a paso

### Flujo A — Modo Normal: audio → PDF

```
1. INICIO
   └─ Usuario abre index.html
   └─ initBusinessSuite() carga configuración, tema, dropdown de plantillas

2. AUDIO
   └─ Opción A: clic "Grabar Audio" → MediaRecorder captura micrófono
   └─ Opción B: arrastra/sube archivo de audio (MP3, WAV, etc.)
   └─ Aparece lista de archivos con controles de reproducción y eliminación

3. TRANSCRIPCIÓN (requiere API Key aunque sea Modo Normal)
   └─ "Transcribir" → Groq Whisper → texto crudo en editor
   └─ Múltiples archivos → múltiples tabs de transcripción

4. EDICIÓN
   └─ Editor WYSIWYG activo: negrita, cursiva, listas, alineación, deshacer/rehacer
   └─ Buscar y reemplazar
   └─ Contador de palabras en tiempo real

5. PLANTILLA (opcional, sin IA)
   └─ Dropdown de plantilla → "Aplicar plantilla" → estructura estática generada
   └─ El texto crudo se coloca en las secciones predefinidas SIN procesamiento IA

6. DATOS DEL PACIENTE
   └─ Modal automático tras estructurar: nombre*, DNI, edad, sexo, obra social, nro afiliado
   └─ Búsqueda en registro de pacientes anteriores con autocompletado

7. CONFIGURACIÓN PDF (modal "Configurar PDF")
   └─ Datos del médico: nombre, matrícula, especialidad
   └─ Datos del estudio: tipo, fecha, hora, equipo, indicación, médico derivante
   └─ Lugar de trabajo: perfil guardado (dirección, teléfono, email, logo)
   └─ Opciones: página (A4/carta), márgenes, fuente, interlineado
   └─ Opciones de impresión: encabezado, pie de página, número de página, fecha, QR, firma

8. PDF
   └─ "Vista previa" → preview A4 con encabezado del médico, datos del paciente, informe, firma
   └─ "Descargar PDF" → jsPDF genera y descarga el archivo
   └─ "Imprimir" → ventana de impresión del sistema operativo
```

### Flujo B — Modo Pro: audio → informe estructurado con IA → PDF

```
1-3. Igual que Modo Normal (grabar / subir / transcribir)

4. DETECCIÓN AUTOMÁTICA DE PLANTILLA
   └─ autoDetectTemplateKey(texto) analiza el texto con algoritmo de puntuación
   └─ Compara nombre de plantilla + keywords con ventana de proximidad
   └─ MIN_SCORE = 7 para evitar falsos positivos
   └─ Retorna la clave de plantilla o 'generico' si no hay suficiente confianza

5. ESTRUCTURACIÓN CON IA
   └─ structureTranscription(texto, plantilla) → Groq → LLaMA 3.3-70b
   └─ El sistema prompt incluye las instrucciones de la plantilla + 8 reglas absolutas
   └─ Temperatura: 0.1 (respuestas reproducibles, poca creatividad)
   └─ Límite: 15.000 caracteres de entrada
   └─ Respuesta: Markdown con headers (#, ##, ###) y párrafos

6. RENDERIZADO DEL INFORME
   └─ parseAIResponse() extrae notas del modelo (si las hay) y el cuerpo del informe
   └─ markdownToHtml() convierte Markdown → HTML con clases report-h1/h2/h3/p/list
   └─ [No especificado] → span.no-data-field con botón lápiz al hover
   └─ Informe visible en editor como HTML formateado

7. COMPLETAR CAMPOS VACÍOS (hover sobre campo → botón lápiz ✏️)
   └─ Modal "Completar campo" con dos tabs:
      - Tab Escribir: textarea + Enter para confirmar
      - Tab Grabar (solo Pro): graba audio → Whisper → texto editable → confirmar
   └─ El span se reemplaza por el texto escrito

8-11. Igual que Modo Normal (datos paciente, config PDF, preview, descargar)
```

### Flujo C — Diccionario médico

```
1. Con informe en el editor → botón "Revisor médico" (🩺)
2. Modal de diccionario:
   - Tab "Revisión": lista de sugerencias automáticas desde diccionario local
   - Tab "Diccionario": CRUD de entradas personalizadas (incorrecto → correcto)
3. Seleccionar cuáles aplicar → "Aplicar seleccionadas" → reemplazos en el editor
4. Opcionalmente: "Buscar más con IA" → escaneo inteligente del texto completo
```

---

## 5. Módulos del sistema

### `state.js` — Estado global
Variables globales en `window.*` compartidas por todos los módulos:
- `currentMode`: `'normal'` | `'pro'`
- `appState`: `'IDLE'` → `'FILES_LOADED'` → `'TRANSCRIBED'` → `'STRUCTURED'` → `'PREVIEWED'`
- `uploadedFiles[]`: archivos de audio pendientes de transcripción
- `transcriptions[]`: textos transcritos, uno por archivo
- `undoStack[]` / `redoStack[]`: historial de deshacer del editor
- `GROQ_API_KEY`: API Key de Groq (leída desde localStorage al iniciar)

### `audio.js` — Grabación
- `toggleRecording()`: inicia/detiene MediaRecorder con getUserMedia
- Timer de grabación en pantalla (formato MM:SS)
- Al detener: crea un `File` WAV y lo pasa a `handleFiles()`
- `handleFiles(files)`: agrega archivos a `uploadedFiles[]`, habilita el botón de transcripción

### `transcriptor.js` — Transcripción
- `transcribeWithGroq(file)`: FormData → POST a `groq.com/v1/audio/transcriptions`
  - Modelo: `whisper-large-v3-turbo`
  - Idioma: `es`
  - Formato: texto plano
- Validación de tamaño (máx. 25 MB por archivo)
- Procesamiento de múltiples archivos en secuencia
- Normalización ultrabásica del audio (sin DSP real actualmente)

### `structurer.js` — Núcleo de IA

#### `autoDetectTemplateKey(text)` — Detección de plantilla
```
Para cada plantilla distinta de 'generico':
  1. Busca el nombre completo de la plantilla como frase en el texto → +10 pts
  2. Si no: busca todas las palabras significativas (>4 chars) juntas en ventana de 6 → +7 pts
  3. Para cada keyword del array:
     - Frase exacta → +6 pts
     - Multi-palabra en ventana de 8 → +4 pts
     - Palabra única (≥4 chars) → +4 pts (o +2 con stem)
Gana la plantilla con más puntos si supera MIN_SCORE=7
Si dos candidatos están muy cerca con puntaje bajo → 'generico'
```

#### `markdownToHtml(md)` — Renderizado
- `# Título` → `<h1 class="report-h1">`
- `## Sección` → `<h2 class="report-h2">`
- `### Subsección` → `<h3 class="report-h3">`
- Líneas terminadas en `,` o `;` → se agrupan en un párrafo fluido (`<p class="report-p">`)
- Líneas sueltas → párrafo independiente
- `- item` / `* item` → `<ul class="report-list"><li>`
- **negrita** → `<strong>`, _cursiva_ → `<em>`, `código` → `<code>`
- `[No especificado]` → `<span class="no-data-field">...<button class="no-data-edit-btn">✏️</button></span>`

#### `structureTranscription(text, templateKey)` — Llamada a LLaMA
- Toma el prompt de la plantilla + 8 reglas absolutas (preservar contenido, no inventar, formato párrafo fluido, etc.)
- POST a `groq.com/v1/chat/completions`
- Modelo: `llama-3.3-70b-versatile`, temperatura 0.1
- Fallback: si falla la API, devuelve el texto crudo sin modificar

### `patientRegistry.js` — Registro de pacientes
- **Almacenamiento:** `localStorage['patient_registry']`, máx. 500 entradas
- `savePatientToRegistry({name, dni, age, sex, insurance, affiliateNum})`: upsert por DNI o por nombre
- `searchPatientRegistry(query)`: búsqueda por apellido parcial o DNI parcial, hasta 20 resultados
- `populatePatientDatalist()`: llena el datalist del modal con los 100 pacientes más recientes
- `initPatientRegistrySearch()`: listener en el campo de búsqueda → autocompletado de todos los campos al seleccionar

### `formHandler.js` — Formularios y extracción de datos
- Historial de pacientes (sistema paralelo más antiguo, máx. 50, a consolidar con patientRegistry)
- `extractPatientDataFromText(text)`: extrae con regex nombre, DNI, edad y sexo del texto transcripto
- `generateReportNumber()`: numeración correlativa por año (`2026-0001`)
- `handleImageUpload()`: logo e imagen de firma via FileReader → base64 en localStorage

### `medDictionary.js` — Diccionario médico
- Diccionario local predefinido con ~50 correcciones comunes (ej: "espirometria" → "espirometría")
- Diccionario personalizado guardado en localStorage
- Escaneo del texto del editor y marcado de ocurrencias
- Integración opcional con IA para detección extendida

### `pdfMaker.js` / `pdfPreview.js` — Generación de documentos
- **Preview:** clona el HTML del editor, inyecta encabezado del médico, datos del paciente, datos del estudio, firma digital, pie de página, QR (si activado)
- **PDF:** jsPDF 2.5.1 con soporte de imágenes (logo, firma), múltiples páginas automáticas
- Limpieza automática antes de imprimir: oculta botones `.no-data-edit-btn`, quita estilos de campos vacíos

### `business.js` — Inicialización y perfiles
- `initBusinessSuite()`: punto de entrada principal de la app, llama todos los `init*` en orden
- Gestión de perfiles de lugar de trabajo (hasta N consultorios con nombre, dirección, teléfono, email, logo)

---

## 6. Inteligencia artificial — cómo funciona por dentro

### Whisper (transcripción)
- Proveedor: **Groq** (no OpenAI directo — Groq es ~10x más rápido y más barato)
- Modelo: `whisper-large-v3-turbo`
- Input: archivo binario de audio (WAV, MP3, etc.) via FormData
- Output: texto plano en español
- Costo aproximado: USD 0.004 / minuto de audio
- Limitación: máximo 25 MB por archivo

### LLaMA 3.3 70B (estructuración)
- Proveedor: **Groq**
- Modelo: `llama-3.3-70b-versatile`
- Input: system prompt (plantilla + reglas) + user message (texto de la transcripción)
- Output: informe en Markdown
- Temperatura: 0.1 (muy baja → resultados consistentes, casi determinísticos)
- Costo aproximado: USD 0.0001 / informe promedio
- Límite de entrada enviado: 15.000 caracteres

### Sistema de prompts
Cada plantilla tiene su propio `prompt` que define:
1. El rol del modelo ("Actúa como neumólogo especializado")
2. Las secciones esperadas del informe con sus subsecciones
3. Qué campos son opcionales y cuándo usar `[No especificado]`

A ese prompt se le concatenan **8 reglas absolutas globales** en cada llamada:
1. Preservar TODA la información de la transcripción
2. Ubicar datos fuera de secciones en la sección más apropiada
3. `[No especificado]` solo si no hay NINGÚN dato para ese campo
4. No añadir información no presente
5. No añadir notas ni comentarios propios
6. Devolver solo el contenido del informe en Markdown
7. No usar encabezados > `###`
8. Escribir hallazgos como párrafo fluido dentro de cada sección (no saltos de línea dobles entre ítems)

---

## 7. Plantillas médicas — catálogo completo

| # | Clave | Nombre | Categoría |
|---|-------|--------|-----------|
| 1 | `espirometria` | Espirometría | Neumología |
| 2 | `test_marcha` | Test de Marcha 6 min | Neumología |
| 3 | `pletismografia` | Pletismografía | Neumología |
| 4 | `oximetria_nocturna` | Oximetría Nocturna | Neumología |
| 5 | `campimetria` | Campimetría / Perimetría | Oftalmología |
| 6 | `oct_retinal` | OCT Retinal | Oftalmología |
| 7 | `topografia_corneal` | Topografía Corneal | Oftalmología |
| 8 | `fondo_ojo` | Fondo de Ojo | Oftalmología |
| 9 | `tac` | TAC / TC | Imágenes |
| 10 | `resonancia` | Resonancia Magnética | Imágenes |
| 11 | `mamografia` | Mamografía | Imágenes |
| 12 | `densitometria` | Densitometría Ósea | Imágenes |
| 13 | `pet_ct` | PET-CT (Tomografía por Emisión) | Imágenes |
| 14 | `radiografia` | Radiografía Convencional | Imágenes |
| 15 | `ecografia_abdominal` | Ecografía Abdominal / Doppler | Imágenes |
| 16 | `gastroscopia` | Gastroscopía / EDA | Endoscopía |
| 17 | `colonoscopia` | Colonoscopía | Endoscopía |
| 18 | `broncoscopia` | Broncoscopía | Endoscopía |
| 19 | `laringoscopia` | Laringoscopía | Endoscopía |
| 20 | `gammagrafia_cardiaca` | Gammagrafía Cardíaca (SPECT) | Cardiología |
| 21 | `holter` | Holter ECG | Cardiología |
| 22 | `mapa` | MAPA (Presión Arterial) | Cardiología |
| 23 | `cinecoro` | Cinecoronariografía | Cardiología |
| 24 | `ecg` | ECG | Cardiología |
| 25 | `eco_stress` | Eco-Stress | Cardiología |
| 26 | `pap` | PAP / Citología Cervical | Ginecología |
| 27 | `colposcopia` | Colposcopía | Ginecología |
| 28 | `electromiografia` | Electromiografía / Potenciales Evocados | Neurología |
| 29 | `polisomnografia` | Polisomnografía | Neurología |
| 30 | `naso` | Videonasofibrolaringoscopía | ORL |
| 31 | `endoscopia_otologica` | Endoscopía Otológica | ORL |
| 32 | `videonaso_laringoscopia` | Videonaso-Laringoscopía | ORL |
| 33 | `protocolo_quirurgico` | Protocolo Quirúrgico | Quirúrgico |
| 34 | `generico` | Informe Médico General | General |

**Plantillas notablemente ausentes:**
- Ecocardiograma transtorácico estándar (ETT) — solo existe `eco_stress`
- Eco Doppler vascular de miembros (arterial/venoso)
- Nota de evolución / consulta ambulatoria
- Epicrisis / resumen de internación
- Audiometría tonal

---

## 8. Sistema de pacientes y datos clínicos

### Dos sistemas paralelos (a unificar)
La app tiene actualmente dos mecanismos de gestión de pacientes que coexisten:

| | `formHandler.js` (viejo) | `patientRegistry.js` (nuevo) |
|--|--------------------------|------------------------------|
| Clave localStorage | `patient_history` | `patient_registry` |
| Máximo | 50 entradas | 500 entradas |
| Búsqueda | Por nombre o DNI exacto | Por apellido parcial o DNI parcial |
| Autocompletado | Modal PDF config | Modal datos del paciente (post-estructurar) |
| Campos | nombre, DNI, edad, sexo, teléfono, obra social | nombre, DNI, edad, sexo, obra social, nro. afiliado |
| Upsert | No (duplica) | Sí (por DNI o nombre) |

### Flujo de datos del paciente
1. Al estructurar: `extractPatientDataFromText()` busca nombre/DNI/edad/sexo en el texto transcripto usando regex
2. Si encuentra datos → los guarda en `pdf_config` y notifica al médico
3. Si no encuentra → muestra el modal de datos del paciente con el registro de búsqueda
4. Al guardar: `savePatientToRegistry()` persiste el paciente en localStorage
5. El PDF toma los datos desde `pdf_config` en localStorage

### Extracción automática desde el audio (regex actuales)
```
Nombre:  "paciente [Nombre Apellido]" (dos palabras en mayúscula)
DNI:     "DNI N° XXXXXXXX" (con o sin puntos en el número)
Edad:    "XX años"
Sexo:    "sexo masculino/femenino"
```
> Limitación: si el médico no nombra explícitamente al paciente con esas frases, no se extrae.

---

## 9. Generación PDF

### Configuración disponible
| Sección | Campos |
|---------|--------|
| Profesional | Nombre, matrícula, especialidad, institución |
| Lugar de trabajo | Perfil guardado (nombre, dirección, teléfono, email, logo) |
| Paciente | Nombre, DNI, edad, sexo, fecha de nacimiento, obra social, nro afiliado, teléfono |
| Estudio | Tipo de estudio, fecha, hora, equipo, técnica, médico derivante, motivo |
| Diseño | Tamaño (A4/carta), orientación, márgenes, fuente, tamaño de fuente, interlineado |
| Elementos | Encabezado on/off, pie de página, número de página, fecha de emisión, QR, línea de firma, nombre en firma, matrícula en firma |

### Encabezado del PDF
```
[COLOR DE BARRA PERSONALIZABLE]
[LOGO]  NOMBRE DEL PROFESIONAL          INSTITUCIÓN
        Mat. XXXXXXX                    Dirección
        Especialidad                    Tel / Email
```

### Firma
- Imagen PNG/JPG cargada por el usuario (guardada como base64 en localStorage)
- Se posiciona al final del informe antes del nombre y matrícula

### Campos vacíos en PDF
Los `span.no-data-field` (campos no completados) se muestran en gris claro en el preview y el botón lápiz se elimina. En el PDF descargado aparece el texto "No especificado" en gris.

---

## 10. Sistema de licencias y tipos de usuario

### Estado actual: TODO EN MODO ADMIN (solo Fase 1)
Actualmente `config.js` tiene hardcodeado `type: 'ADMIN'` — acceso total para el desarrollador. El sistema de licencias **no está implementado aún**. Es el objetivo de Fase 2.

### Diseño del sistema de validación (Fase 2)
```
[Usuario abre la app clone por primera vez]
      ↓
[Genera deviceId único → guarda en localStorage]
      ↓
[POST a Google Apps Script (WebApp URL única por cliente)]
      ↓
¿deviceId en Google Sheets y suscripción activa?
  SÍ → devuelve CLIENT_CONFIG (tipo, features, días restantes)
  NO → muestra pantalla de bloqueado con mensaje personalizado
      ↓
[App carga con las funciones habilitadas según CLIENT_CONFIG]
[Cache de validación: N días sin reconectar antes de re-validar]
```

### Tipos de licencia planificados
| Tipo | Transcripción | IA estructuración | Plantillas | Precio sugerido |
|------|:---:|:---:|:---:|---|
| `TRIAL` | ✅ | ✅ | Todas | Gratis 15 días |
| `NORMAL` | ✅ | ❌ | Estáticas | ~$15 USD/mes |
| `PRO` | ✅ | ✅ | Todas | ~$25 USD/mes |
| `ADMIN` | ✅ | ✅ | Todas + gestión | Dueño del sistema |

### Componentes de la infraestructura (Fase 2)
| Componente | Archivo | Estado |
|------------|---------|--------|
| Google Apps Script backend | `backend/google_apps_script.js` | 🟡 Borrador inicial |
| Panel de admin web | `recursos/admin.html` | 🟡 UI básica sin funcionalidad real |
| Configuración de ejemplo | `backend/admin_config.json` | 🟡 Plantilla |
| Login de admin | `recursos/login.html` | 🟡 UI sin lógica |

### Anti-piratería
- Cada device ID se genera una vez y se guarda en localStorage
- La app clone valida contra Google Sheets en cada apertura (o cada N días en cache)
- Si el device ID no está en la hoja o la suscripción está inactiva → bloqueo total
- El administrador (Nodriza) puede revocar un device ID desde el dashboard en tiempo real
- **Límite de devices por licencia:** configurable por cliente (ej: 1 PC + 1 celular)

---

## 11. Modelo de negocio

### Flujo comercial
```
[Médico interesado]
       ↓
[Desarrollador configura su clone: logo, nombre, tier]
       ↓
[Genera el link único y lo envía al cliente]
       ↓
[Cliente abre, acepta T&C, instala como PWA]
       ↓
[Sistema registra el device ID en Google Sheets del desarrollador]
       ↓
[Cliente paga mensualmente → desarrollador mantiene suscripción activa]
       ↓
[Si no paga → revocar desde dashboard → app bloqueada automáticamente]
```

### Estructura de precios sugerida
| Producto | Precio |
|----------|--------|
| Setup inicial (personalización + configuración) | ~$100-200 USD (pago único) |
| Suscripción Modo Normal (transcripción + PDF) | ~$15 USD/mes |
| Suscripción Modo Pro (Normal + IA estructuración) | ~$25 USD/mes |
| Soporte premium / actualizaciones extra | Por hora o plan anual |

### Costo real para el desarrollador
| Concepto | Costo |
|----------|-------|
| Hosting (GitHub Pages) | $0 |
| API Groq — el cliente usa su propio API Key | $0 para el desarrollador |
| Google Sheets + Apps Script | $0 |
| Dominio custom (opcional) | ~$10-15 USD/año |
| **Costo operativo por cliente/mes** | **~$0** |

### Proyección de rentabilidad
- 10 clientes Modo Normal → $150 USD/mes recurrente
- 10 clientes Modo Pro → $250 USD/mes recurrente
- 20 clientes mixtos → **~$400 USD/mes de ingreso pasivo** con costo casi cero
- Cada nuevo cliente: solo el tiempo de setup (~1-2 horas)

### Por qué funciona el modelo
- El cliente **no puede piratear** la app fácilmente (device ID + validación online)
- El costo de IA lo paga el cliente con su propia key (no hay riesgo de consumo descontrolado)
- La app se instala como nativa → retención alta (el médico la usa todos los días)
- Actualizaciones automáticas: cuando el desarrollador hace push al repo del clone, el cliente recibe la actualización al reabrir la app

---

## 12. Estado actual — qué está 100% funcional

### ✅ Completamente funcional
- Grabación de audio (micrófono)
- Carga y reproducción de archivos de audio
- Transcripción con Whisper
- Detección automática de plantilla (32 plantillas, MIN_SCORE=7, proximity checks)
- Estructuración con LLaMA 3.3-70b
- Renderizado de Markdown a HTML profesional (párrafos fluidos, secciones)
- Editor WYSIWYG (negrita, cursiva, subrayado, listas, tablas, undo/redo, buscar/reemplazar)
- Modal de datos del paciente (búsqueda en registro, autocompletado)
- Registro de pacientes en localStorage (500 entradas, búsqueda parcial por apellido/DNI)
- Campos vacíos `[No especificado]` con botón lápiz y modal de edición (escribir o grabar)
- Generación de PDF (encabezado, datos, informe, firma, QR opcional)
- Vista previa A4
- Diccionario médico (correcciones del diccionario local)
- Perfiles de lugar de trabajo (múltiples consultorios)
- Dark mode
- 27 tests automatizados pasando

### ⚠️ Funcional con limitaciones
- **Exportación a Word**: existe el botón, pero la implementación puede no estar completa en todos los escenarios
- **Normalización de audio**: el código menciona normalización y reducción de ruido, pero el procesamiento DSP real en browser es limitado
- **Extracción de datos del paciente desde audio**: funciona solo si el médico usa frases muy específicas ("paciente NOMBRE APELLIDO")
- **Dictado múltiple**: unir varios audios funciona, pero la IA estructura todos como un solo texto sin distinguir fuentes
- **Diccionario médico con IA**: implementado, pero la calidad depende del prompt y puede ser inconsistente

---

## 13. Lo que falta para el objetivo completo

### FASE 1 — Optimización de la Nodriza (prioridad ahora)

#### Calidad del informe generado
| Ítem | Impacto | Complejidad |
|------|---------|-------------|
| Formato por órgano con `s/p` + conclusión solo positivos | 🔴 Muy alto | Media |
| Ocultar tab "Grabar" en modal editar campo en Modo Normal | 🟠 Medio | Baja |
| Plantilla Ecocardiograma transtorácico (ETT) | 🟠 Alto | Baja |
| Nuevas plantillas: Eco Doppler, Nota evolutiva, Epicrisis, Audiometría | 🟡 Medio | Baja c/u |
| Toast con plantilla detectada + opción de cambio antes de estructurar | 🟡 Medio | Baja |

#### UX y usabilidad
| Ítem | Impacto | Complejidad |
|------|---------|-------------|
| Onboarding: wizard paso a paso para primer uso | 🟠 Alto | Media |
| Panel de gestión del registro de pacientes (ver/editar/borrar) | 🟡 Medio | Media |
| Unificar `patientHistory` + `patientRegistry` en un solo sistema | 🟡 Medio | Media |
| Exportar/importar registro de pacientes (JSON/CSV) | 🟡 Bajo | Baja |

#### PWA (necesario para Fase 2 — instalar en escritorio/celular)
| Ítem | Impacto | Complejidad |
|------|---------|-------------|
| `manifest.json` — nombre, ícono, colores, orientación | 🔴 Crítico para PWA | Baja |
| Service Worker — cache offline de la app shell | 🔴 Crítico para PWA | Media |
| Botón / lógica de instalación (beforeinstallprompt) | 🔴 Crítico para PWA | Baja |
| Ícono 192×192 y 512×512 para pantalla de inicio | 🔴 Crítico para PWA | Baja |

---

### FASE 2 — Infraestructura de licencias
| Ítem | Impacto | Complejidad |
|------|---------|-------------|
| Generación y persistencia de deviceId único | 🔴 Crítico | Baja |
| Google Apps Script WebApp — validación de device ID | 🔴 Crítico | Media |
| Google Sheets — estructura de datos de clientes y licencias | 🔴 Crítico | Baja |
| Dashboard Nodriza — ver clientes, activar/revoccar | 🔴 Crítico | Media |
| Pantalla de bloqueo elegante con mensaje personalizable | 🟠 Alto | Baja |
| Pantalla T&C para primer uso (clone) | 🟠 Alto | Baja |
| Cache de validación offline (N días sin red antes de revalidar) | 🟡 Medio | Media |

---

### FASE 3 — Fábrica de Clones
| Ítem | Impacto | Complejidad |
|------|---------|-------------|
| Script de generación de clone (personaliza config, logo, colores) | 🔴 Crítico | Media |
| Sistema de distribución de links únicos por cliente | 🔴 Crítico | Baja |
| Protección del código del clone (ofuscación básica) | 🟠 Alto | Media |

---

### Diferenciadores futuros (post Fase 3)
| Ítem | Complejidad |
|------|-------------|
| Historial de informes por paciente | Alta |
| Sincronización vía Google Drive | Alta |
| Plantillas personalizadas por usuario | Alta |
| Estadísticas de uso (por día, especialidad, cliente) | Media |
| Soporte multiidioma | Media |

---

## 14. Deuda técnica y bugs conocidos

### Bugs activos
| Bug | Severidad | Descripción |
|-----|-----------|-------------|
| Tab "Grabar" visible en Modo Normal | 🟠 Media | El modal "Editar campo vacío" muestra la pestaña de grabación aunque no haya API Key |
| Dos sistemas de historial de pacientes | 🟡 Baja | `patient_history` (formHandler) y `patient_registry` (patientRegistry) coexisten sin sincronización |
| `window.GROQ_API_KEY` requerida en "Modo Normal" | 🟡 Baja | El modo se llama "Normal" pero la transcripción también requiere Groq |

### Deuda técnica
| Item | Descripción |
|------|-------------|
| Código sin módulos ES | Todo en `window.*` globals — dificulta el testing y el mantenimiento a largo plazo |
| `config.js` hardcodeado | `CLIENT_CONFIG` con `type: 'ADMIN'` hardcodeado — debe venir de un servidor |
| Sin manejo de errores de red consistente | Algunos fetch tienen try/catch, otros no |
| Tests solo para lógica pura | Los tests no cubren DOM ni llamadas a API (difícil sin browser real) |
| `formHandler.js` legacy | Tiene funcionalidad duplicada con `patientRegistry.js`; debe consolidarse |

---

*Documento generado internamente. No para distribución pública.*
