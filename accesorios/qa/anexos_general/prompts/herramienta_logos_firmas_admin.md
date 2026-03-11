# Prompt: Herramienta de Procesamiento de Logos y Firmas — Panel Admin

## Contexto del proyecto

Proyecto: **Transcriptor Médico Pro** — PWA de transcripción médica.
Repo: `TranscriptorPro/transcripcion`, rama `main`.
Stack: HTML/CSS/JS vanilla (sin frameworks), jsPDF para generación de PDF.

El admin registra médicos desde `recursos/admin.html` (dashboard). Cada médico puede tener:
- **Logo institucional** (ej: logo del hospital/clínica) → se incrusta en la esquina superior izquierda del header del PDF.
- **Logo del profesional** (foto o emblema personal) → esquina superior derecha del header del PDF.
- **Firma digital** (imagen de la firma manuscrita) → bloque de firma al final del informe PDF.

### Dimensiones exactas que usa la app (en mm, jsPDF):

| Imagen | Ancho (mm) | Alto (mm) | Ubicación en PDF |
|--------|-----------|----------|-----------------|
| Logo institucional | 28 | 18 | Header izquierda |
| Logo profesional | 16 | 16 | Header derecha |
| Firma | 50 | 20 | Bloque firma (centrado derecha) |

### Formato de almacenamiento:
- Todas las imágenes se guardan como **base64 data URI** (`data:image/png;base64,...`).
- Se transmiten al cliente via el campo `Registro_Datos` (JSON) del backend Google Sheets.
- Keys en la app cliente: `pdf_logo` (logo inst.), `pdf_signature` (firma), `activePro.logo`, `activePro.firma`.
- jsPDF acepta PNG (con transparencia) y JPEG.

### Archivo clave:
- **`src/js/features/pdfMaker.js`** → `drawHeader()` (línea ~163) y `drawSignature()` (línea ~578).

---

## Tarea: Crear herramienta de procesamiento de imágenes en admin.html

### Objetivo
Agregar una sección/herramienta en `recursos/admin.html` que permita al administrador:

1. **Subir una imagen** (logo o firma) desde archivo o pegando una URL.
2. **Previsualizar** la imagen original.
3. **Procesarla automáticamente** según el tipo seleccionado:
   - **Logo institucional**: recortar/escalar a aspect ratio 28:18 (~1.56:1), exportar PNG con transparencia.
   - **Logo profesional**: recortar/escalar a 1:1 (cuadrado, 16:16), exportar PNG con transparencia.
   - **Firma**: recortar/escalar a aspect ratio 50:20 (2.5:1), exportar PNG con transparencia.
4. **Remover fondo** (background removal) usando Canvas:
   - Detectar el color dominante de las esquinas (típicamente blanco o color sólido de fondo).
   - Convertir ese color (y similares dentro de un umbral configurable) en transparente (alpha=0).
   - Esto es especialmente útil para logos con fondo blanco/color sólido y firmas escaneadas.
5. **Previsualizar el resultado** sobre un fondo simulado de PDF (blanco) y sobre un header de ejemplo con color.
6. **Copiar el base64** resultante al portapapeles, o **descargarlo como PNG**.
7. **Insertar directamente** en el registro del médico seleccionado (si hay uno abierto en edición).

### Especificaciones técnicas

#### Ubicación en admin.html
- Agregar como una nueva **sección/tab** en el dashboard del admin, o como un **modal/herramienta** accesible desde un botón en la barra de herramientas.
- Título sugerido: "🖼️ Procesador de Imágenes" o "🖼️ Logo & Firma".
- Solo visible para el admin (ya está en admin.html, así que está implícito).

#### UI de la herramienta

```
┌─────────────────────────────────────────────────────┐
│  🖼️ Procesador de Logos y Firmas                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Tipo: [Logo institucional ▾]  ← select: inst/prof/firma
│                                                     │
│  [📂 Subir imagen]  [📋 Pegar URL]                  │
│                                                     │
│  ┌──── Original ────┐  ┌──── Resultado ────┐       │
│  │                   │  │                   │       │
│  │   (preview)       │  │   (procesada)     │       │
│  │                   │  │                   │       │
│  └───────────────────┘  └───────────────────┘       │
│                                                     │
│  Opciones:                                          │
│  [✓] Quitar fondo    Umbral: [30 ▸────────]        │
│  [✓] Auto-recortar bordes vacíos (trim)             │
│  [✓] Escalar a medidas del PDF                      │
│                                                     │
│  Preview en contexto:                               │
│  ┌──── Simulación Header PDF ──────────────────┐   │
│  │ [LOGO]  Dr. Nombre Ejemplo                   │   │
│  │         Especialidad · Mat. MP-000  [PROF]   │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  [⬇️ Descargar PNG]  [📋 Copiar Base64]  [💾 Guardar en registro]
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Algoritmo de procesamiento (todo en Canvas, sin dependencias externas)

```javascript
// Pseudocódigo del pipeline de procesamiento
async function processImage(file, type, options) {
    // 1. Cargar imagen en un canvas temporal
    const img = await loadImage(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // 2. Background removal (si activado)
    if (options.removeBackground) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const bgColor = detectBackgroundColor(imageData); // muestrear esquinas
        removeColor(imageData, bgColor, options.threshold); // threshold ~30
        ctx.putImageData(imageData, 0, 0);
    }

    // 3. Auto-trim (recortar bordes transparentes)
    if (options.autoTrim) {
        trimTransparent(canvas); // reduce canvas al bounding box del contenido
    }

    // 4. Escalar al aspect ratio correcto según tipo
    const TARGET = {
        'inst':  { w: 280, h: 180 },  // 28mm:18mm → 280:180 px (10x para calidad)
        'prof':  { w: 160, h: 160 },  // 16:16 → 160:160 px
        'firma': { w: 500, h: 200 },  // 50:20 → 500:200 px
    };
    const target = TARGET[type];
    const finalCanvas = scaleToFit(canvas, target.w, target.h);

    // 5. Exportar como PNG base64
    return finalCanvas.toDataURL('image/png');
}
```

#### Funciones clave a implementar

1. **`detectBackgroundColor(imageData)`**: Muestrear píxeles de las 4 esquinas (ej: 10x10 px cada una), calcular el color promedio. Retornar `{r, g, b}`.

2. **`removeColor(imageData, bgColor, threshold)`**: Recorrer cada píxel; si la distancia euclidiana al bgColor es menor que `threshold`, poner alpha=0. Opcionalmente aplicar bordes suaves (feathering) para evitar bordes duros.

3. **`trimTransparent(canvas)`**: Encontrar el bounding box del contenido no transparente. Crear un nuevo canvas del tamaño del bounding box y copiar solo esa región.

4. **`scaleToFit(canvas, maxW, maxH)`**: Escalar manteniendo aspect ratio para que quepa en maxW×maxH. Centrar si el aspect ratio no coincide exactamente.

5. **Preview**: Mostrar el resultado sobre un mini-header simulado con el color del headerColor del registro activo (o #1a56a0 por defecto).

#### Resolución de salida
- La imagen final debe tener resolución suficiente para verse nítida en el PDF.
- Factor: 10 px por mm → logo inst. = 280×180 px, logo prof. = 160×160 px, firma = 500×200 px.
- Esto produce base64 razonablemente pequeños (~5-30KB) que no explotan el JSON de Registro_Datos.

#### Integración con el flujo existente
- Cuando el admin tiene un registro de usuario abierto (en edición), el botón "💾 Guardar en registro" debe:
  - Identificar qué campo corresponde (logo inst. → `workplace.logo`, logo prof. → `proLogo`, firma → `firma`).
  - Inyectar el base64 resultante en el campo correspondiente del formulario de edición.
  - Mostrar un toast confirmando: "Logo institucional guardado en el registro de Dr. X".

---

## Restricciones

1. **Sin dependencias externas** — todo debe hacerse con Canvas API nativa del navegador.
2. **No modificar** `pdfMaker.js`, `business.js`, ni la app cliente (`index.html`, `src/js/`).
3. **Solo en `recursos/admin.html`** — esta herramienta es exclusiva del panel admin.
4. **No romper funcionalidad existente** del dashboard admin.
5. **El base64 resultante debe ser válido** para jsPDF — formato `data:image/png;base64,...`.
6. **Testear** con:
   - Logo con fondo blanco sólido → debe quedar transparente.
   - Logo con fondo de color → debe quedar transparente.
   - Firma escaneada sobre papel blanco → debe quedar solo la tinta.
   - Foto/logo sin fondo → no debe dañar la imagen.
   - Logo ya en PNG con transparencia → debe mantenerla.

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `recursos/admin.html` | Agregar sección/herramienta de procesamiento de imágenes (HTML + CSS + JS inline o en `<script>`) |

## Archivos de referencia (solo lectura)

| Archivo | Para qué |
|---------|----------|
| `src/js/features/pdfMaker.js` | Ver dimensiones exactas de logo/firma en el PDF (líneas 163-230, 578-600) |
| `src/js/features/business.js` | Ver cómo se guardan logo/firma desde Registro_Datos (líneas 600-640) |
| `backend/google_apps_script.js` | Ver estructura de Registro_Datos en el backend (líneas 930-960) |
