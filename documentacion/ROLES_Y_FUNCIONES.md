# FUNCIONES POR ROL — Transcriptor Médico Pro

> **Instrucciones:** Revisá cada fila. Las columnas N (Normal), P (Pro) y C (Clínica) indican mi propuesta.  
> ✅ = incluido | ❌ = no incluido | 🔒 = bloqueado/deshabilitado  
> Trial = igual que Pro pero limitado a 7 días y 1 dispositivo.  
> Marcá lo que quieras cambiar y yo lo paso a código.

---

## 🎙️ GRABACIÓN DE AUDIO

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 1 | Grabar audio en vivo con micrófono | ✅ | ✅ | ✅ |
| 2 | Botón Grabar / Detener con animación de pulso rojo | ✅ | ✅ | ✅ |
| 3 | Temporizador visual mm:ss durante la grabación | ✅ | ✅ | ✅ |
| 4 | Indicador de estado "Grabando..." con animación | ✅ | ✅ | ✅ |
| 5 | Warning automático a los 30 minutos de grabación | ✅ | ✅ | ✅ |
| 6 | Auto-stop a los 45 minutos de grabación | ✅ | ✅ | ✅ |
| 7 | Manejo de error de acceso al micrófono con toast | ✅ | ✅ | ✅ |

## 📁 CARGA DE ARCHIVOS DE AUDIO

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 8 | Subir archivo de audio haciendo clic en dropZone | ✅ | ✅ | ✅ |
| 9 | Subir archivo arrastrando y soltando (drag & drop) | ✅ | ✅ | ✅ |
| 10 | Efecto visual dragover al arrastrar archivos | ✅ | ✅ | ✅ |
| 11 | Validación de formatos: MP3, WAV, OGG, M4A, WEBM, FLAC | ✅ | ✅ | ✅ |
| 12 | Validación de tamaño máximo: 25 MB | ✅ | ✅ | ✅ |
| 13 | Subir múltiples archivos de audio simultáneamente | ✅ | ✅ | ✅ |
| 14 | Lista visual de archivos con nombre, tamaño y estado | ✅ | ✅ | ✅ |
| 15 | Botón reproducir/pausar audio por archivo | ✅ | ✅ | ✅ |
| 16 | Control de reproducción exclusiva (pausar anterior) | ✅ | ✅ | ✅ |
| 17 | Botón eliminar archivo individual de la lista | ✅ | ✅ | ✅ |
| 18 | Botón "Reintentar fallidos" | ✅ | ✅ | ✅ |

## 🔊 PROCESAMIENTO DE AUDIO (Pre-envío)

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 19 | Normalización de volumen (ganancia al 95%) | ✅ | ✅ | ✅ |
| 20 | Reducción de ruido (filtro 80 Hz – 12 kHz) | ✅ | ✅ | ✅ |
| 21 | Checkbox "Normalizar volumen" en la interfaz | ✅ | ✅ | ✅ |
| 22 | Checkbox "Reducir ruido" en la interfaz | ✅ | ✅ | ✅ |

## ⚡ TRANSCRIPCIÓN

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 23 | Botón "Transcribir" — envía archivos a Groq Whisper | ✅ | ✅ | ✅ |
| 24 | Botón "Transcribir y Estructurar" (combo) | ❌ | ✅ | ✅ |
| 25 | Barra de progreso visual durante transcripción | ✅ | ✅ | ✅ |
| 26 | Indicador de archivo actual ("Procesando 2/5") | ✅ | ✅ | ✅ |
| 27 | Prompt contextual para Whisper (4 niveles de prioridad) | ✅ | ✅ | ✅ |
| 28 | Retries automáticos (hasta 4 intentos con reparación) | ✅ | ✅ | ✅ |
| 29 | Modal de reparación de audio | ✅ | ✅ | ✅ |
| 30 | Modal de decisión para batch fallido | ✅ | ✅ | ✅ |
| 31 | Detección de silencio pre-envío (análisis RMS) | ✅ | ✅ | ✅ |
| 32 | Filtro anti-alucinaciones de Whisper | ✅ | ✅ | ✅ |
| 33 | Reunión de términos médicos separados por Whisper | ✅ | ✅ | ✅ |
| 34 | Auto-correcciones del diccionario médico tras transcribir | ✅ | ✅ | ✅ |
| 35 | Diálogo "¿Unir audios?" al subir múltiples archivos | ✅ | ✅ | ✅ |
| 36 | Checkbox "Unir audios" (auto-unir sin diálogo) | ✅ | ✅ | ✅ |
| 37 | Apertura en pestañas separadas si elige no unir | ✅ | ✅ | ✅ |
| 38 | Botón "Reintentar fallidos" (resetear archivos con error) | ✅ | ✅ | ✅ |
| 39 | Tracking de uso: conteo de transcripciones | ✅ | ✅ | ✅ |

## ✨ ESTRUCTURACIÓN CON IA

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 40 | Botón "Estructurar con IA" (envía texto a LLaMA) | ❌ | ✅ | ✅ |
| 41 | Auto-detección de plantilla médica desde el texto | ❌ | ✅ | ✅ |
| 42 | Toast "Plantilla detectada: X [Cambiar]" con auto-confirm 5s | ❌ | ✅ | ✅ |
| 43 | Selección manual de plantilla desde el toast | ❌ | ✅ | ✅ |
| 44 | Conversión markdown → HTML con clases de informe | ❌ | ✅ | ✅ |
| 45 | Campos "[No especificado]" como spans interactivos | ❌ | ✅ | ✅ |
| 46 | Cadena de modelos de fallback (70b → 70b → 8b) | ❌ | ✅ | ✅ |
| 47 | Retries con variación de temperatura y cambio de modelo | ❌ | ✅ | ✅ |
| 48 | Panel de notas de la IA (nota clínica + plantilla) | ❌ | ✅ | ✅ |
| 49 | Cola de pendientes para estructuraciones fallidas | ❌ | ✅ | ✅ |
| 50 | Badge de pendientes en botón de estructurar | ❌ | ✅ | ✅ |
| 51 | Modal de cola de pendientes (ver, re-procesar, eliminar) | ❌ | ✅ | ✅ |
| 52 | Check de datos del paciente: extrae nombre/DNI del texto | ❌ | ✅ | ✅ |
| 53 | Placeholder clickable "Completar datos del paciente" | ❌ | ✅ | ✅ |
| 54 | Notificación de escritorio al completar estructuración | ❌ | ✅ | ✅ |
| 55 | Botón "Original" — alternar original vs estructurado | ❌ | ✅ | ✅ |
| 56 | Re-estructuración auto al volver de vista original con nuevo texto | ❌ | ✅ | ✅ |
| 57 | Tracking de uso: conteo de estructuraciones | ❌ | ✅ | ✅ |

## 📄 PLANTILLAS

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 58 | Botón "Aplicar Plantilla" visible en modo Normal | ✅ | ❌ | ❌ |
| 59 | Dropdown de plantillas categorizado por especialidad | ✅ | ✅ | ✅ |
| 60 | Constructor de plantilla estática (sin IA) | ✅ | ❌ | ❌ |
| 61 | Aplicación de plantilla con IA (si tiene API key) | ❌ | ✅ | ✅ |
| 62 | 37 plantillas médicas especializadas | ✅ | ✅ | ✅ |
| 63 | Filtrado de plantillas por allowedTemplates (licencia) | ✅ | ✅ | ✅ |
| 64 | Detección automática del tipo de estudio por keywords | ❌ | ✅ | ✅ |

## ✏️ EDITOR DE TEXTO ENRIQUECIDO

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 65 | Editor WYSIWYG contenteditable | ✅ | ✅ | ✅ |
| 66 | Pegado inteligente desde Word/Google Docs | ✅ | ✅ | ✅ |
| 67 | Detección de pegado → activa botón "Estructurar" | ❌ | ✅ | ✅ |
| 68 | Botón Negrita (Ctrl+B) | ✅ | ✅ | ✅ |
| 69 | Botón Cursiva (Ctrl+I) | ✅ | ✅ | ✅ |
| 70 | Botón Subrayado (Ctrl+U) | ✅ | ✅ | ✅ |
| 71 | Botón Tachado | ✅ | ✅ | ✅ |
| 72 | Alineación: izquierda, centrada, derecha, justificada | ✅ | ✅ | ✅ |
| 73 | Lista con viñetas | ✅ | ✅ | ✅ |
| 74 | Lista numerada | ✅ | ✅ | ✅ |
| 75 | Selector de tamaño de fuente (+/-) | ✅ | ✅ | ✅ |
| 76 | Selector de interlineado | ✅ | ✅ | ✅ |
| 77 | Botón limpiar formato | ✅ | ✅ | ✅ |
| 78 | Botón insertar enlace | ✅ | ✅ | ✅ |
| 79 | Botón insertar tabla (filas × columnas) | ✅ | ✅ | ✅ |
| 80 | Deshacer (Ctrl+Z, 50 estados) | ✅ | ✅ | ✅ |
| 81 | Rehacer (Ctrl+Y) | ✅ | ✅ | ✅ |
| 82 | Contador de palabras en tiempo real | ✅ | ✅ | ✅ |
| 83 | Auto-guardado del editor cada 30 segundos | ✅ | ✅ | ✅ |
| 84 | Restaurar sesión anterior (borrador, expira 2h) | ✅ | ✅ | ✅ |
| 85 | Toast informativo de borrador disponible | ✅ | ✅ | ✅ |
| 86 | Guardado de borrador al cerrar pestaña | ✅ | ✅ | ✅ |

## 🔍 BUSCAR Y REEMPLAZAR

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 87 | Panel de Buscar y Reemplazar (Ctrl+H) | ✅ | ✅ | ✅ |
| 88 | Buscar siguiente — resalta coincidencia | ✅ | ✅ | ✅ |
| 89 | Reemplazar una ocurrencia | ✅ | ✅ | ✅ |
| 90 | Reemplazar todo | ✅ | ✅ | ✅ |
| 91 | Toggle "Coincidir mayúsculas/minúsculas" | ✅ | ✅ | ✅ |
| 92 | Toggle "Palabra completa" | ✅ | ✅ | ✅ |

## ✏️ EDICIÓN DE CAMPOS [No especificado]

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 93 | Clic en "[No especificado]" → abre modal de edición | ❌ | ✅ | ✅ |
| 94 | Tab "Escribir" con input de texto | ❌ | ✅ | ✅ |
| 95 | Botón rápido "s/p" (sin particularidades) | ❌ | ✅ | ✅ |
| 96 | Botón rápido "Sin particularidades" | ❌ | ✅ | ✅ |
| 97 | Tab "Grabar" — grabar audio y obtener texto (Whisper) | ❌ | ✅ | ✅ |
| 98 | Candado 🔒 en tab "Grabar" (modo Normal) | 🔒 | ✅ | ✅ |
| 99 | Botón "Aplicar" (inserta valor en el campo) | ❌ | ✅ | ✅ |
| 100 | Botón "Dejar en blanco" | ❌ | ✅ | ✅ |
| 101 | Botón "Eliminar sección" (H2/H3 + contenido) | ❌ | ✅ | ✅ |

## 🎙️ GRABAR Y AGREGAR TEXTO (Append)

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 102 | Botón inline "Grabar y agregar +" dentro del editor | ❌ | ✅ | ✅ |
| 103 | Grabación de audio adicional desde el editor | ❌ | ✅ | ✅ |
| 104 | Transcripción automática del audio adicional | ❌ | ✅ | ✅ |
| 105 | Inserción del texto transcrito al final del editor | ❌ | ✅ | ✅ |
| 106 | Re-estructuración automática al volver a vista estructurada | ❌ | ✅ | ✅ |

## ⧉ VISTA COMPARATIVA

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 107 | Botón "Comparar" — vista lado a lado (original vs estructurado) | ❌ | ✅ | ✅ |
| 108 | Copiar texto original desde comparación | ❌ | ✅ | ✅ |
| 109 | Copiar texto estructurado desde comparación | ❌ | ✅ | ✅ |
| 110 | Imprimir texto original desde comparación | ❌ | ✅ | ✅ |
| 111 | Imprimir texto estructurado desde comparación | ❌ | ✅ | ✅ |
| 112 | Botón cerrar comparación | ❌ | ✅ | ✅ |

## 📑 PESTAÑAS (TABS)

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 113 | Pestañas para múltiples transcripciones simultáneas | ✅ | ✅ | ✅ |
| 114 | Nombre del archivo en la pestaña (truncado) | ✅ | ✅ | ✅ |
| 115 | Cambiar entre pestañas con clic | ✅ | ✅ | ✅ |
| 116 | Guardar contenido al cambiar de pestaña | ✅ | ✅ | ✅ |
| 117 | Botón cerrar pestaña individual (×) | ✅ | ✅ | ✅ |

## 📋 COPIAR, DESCARGAR E IMPRIMIR

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 118 | Botón "Copiar al portapapeles" | ✅ | ✅ | ✅ |
| 119 | Botón "Imprimir" | ✅ | ✅ | ✅ |
| 120 | Botón principal de descarga (1-clic con formato favorito) | ✅ | ✅ | ✅ |
| 121 | Descarga como PDF | ✅ | ✅ | ✅ |
| 122 | Descarga como RTF | ❌ | ✅ | ✅ |
| 123 | Descarga como TXT | ❌ | ✅ | ✅ |
| 124 | Descarga como HTML | ❌ | ✅ | ✅ |
| 125 | Dropdown de formatos (PDF/RTF/TXT/HTML) | ❌ | ✅ | ✅ |
| 126 | Marcar formato favorito con estrella ⭐ | ❌ | ✅ | ✅ |
| 127 | Warning "Sin datos del paciente" antes de descargar | ✅ | ✅ | ✅ |

## 🏥 DATOS DEL PACIENTE

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 128 | Modal de datos del paciente (nombre, DNI, edad, sexo, OS) | ✅ | ✅ | ✅ |
| 129 | Validación: nombre obligatorio | ✅ | ✅ | ✅ |
| 130 | Búsqueda con autocompletado desde el registro | ✅ | ✅ | ✅ |
| 131 | Auto-rellenado al seleccionar paciente del registro | ✅ | ✅ | ✅ |
| 132 | Cálculo automático de edad desde fecha de nacimiento | ✅ | ✅ | ✅ |
| 133 | Extracción automática de datos del paciente desde transcripción | ✅ | ✅ | ✅ |
| 134 | Encabezado de datos del paciente en el editor (no editable) | ✅ | ✅ | ✅ |
| 135 | Botón "Editar ✏️" en encabezado de paciente | ✅ | ✅ | ✅ |
| 136 | Placeholder clickable "Completar datos del paciente" | ✅ | ✅ | ✅ |
| 137 | Botón "Omitir" en modal de datos | ✅ | ✅ | ✅ |
| 138 | Guardado automático del paciente en el registro | ✅ | ✅ | ✅ |

## 👥 REGISTRO DE PACIENTES

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 139 | Guardar paciente (crear o actualizar por DNI) | ✅ | ✅ | ✅ |
| 140 | Buscar pacientes por nombre/apellido/DNI | ✅ | ✅ | ✅ |
| 141 | Datalist autocomplete en campos de búsqueda | ✅ | ✅ | ✅ |
| 142 | Panel de gestión del registro (modal) | ✅ | ✅ | ✅ |
| 143 | Tabla de pacientes (nombre, DNI, edad, última visita) | ✅ | ✅ | ✅ |
| 144 | Filtro de búsqueda en tiempo real | ✅ | ✅ | ✅ |
| 145 | Editar paciente inline desde el panel | ✅ | ✅ | ✅ |
| 146 | Eliminar paciente con confirmación | ✅ | ✅ | ✅ |
| 147 | Ver historial de informes de un paciente | ✅ | ✅ | ✅ |
| 148 | Exportar registro a JSON | ❌ | ✅ | ✅ |
| 149 | Exportar registro a CSV | ❌ | ✅ | ✅ |
| 150 | Importar pacientes desde JSON | ❌ | ✅ | ✅ |

## 📊 HISTORIAL DE INFORMES

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 151 | Guardar informe automático al descargar PDF | ✅ | ✅ | ✅ |
| 152 | Ver todos los informes guardados | ✅ | ✅ | ✅ |
| 153 | Buscar informes por nombre/DNI | ✅ | ✅ | ✅ |
| 154 | Ver informe en modal de solo lectura | ✅ | ✅ | ✅ |
| 155 | Re-exportar informe a PDF desde el visor | ✅ | ✅ | ✅ |
| 156 | Eliminar informe individual | ✅ | ✅ | ✅ |
| 157 | Panel de historial de informes (modal) | ✅ | ✅ | ✅ |
| 158 | Tabla del historial (paciente, plantilla, fecha, acciones) | ✅ | ✅ | ✅ |
| 159 | Filtro de búsqueda en el historial | ✅ | ✅ | ✅ |
| 160 | Estadísticas: total informes, pacientes, espacio | ✅ | ✅ | ✅ |
| 161 | Exportar historial como JSON | ❌ | ✅ | ✅ |
| 162 | Importar historial desde JSON | ❌ | ✅ | ✅ |
| 163 | Limpiar todo el historial con confirmación | ✅ | ✅ | ✅ |

## 📄 GENERACIÓN DE PDF

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 164 | Generación de PDF con jsPDF | ✅ | ✅ | ✅ |
| 165 | Tamaño de página configurable (A4, Letter) | ❌ | ✅ | ✅ |
| 166 | Orientación configurable (retrato/paisaje) | ❌ | ✅ | ✅ |
| 167 | Márgenes configurables (angosto/normal/ancho) | ❌ | ✅ | ✅ |
| 168 | Fuente configurable (Helvetica, Times, Courier) | ❌ | ✅ | ✅ |
| 169 | Tamaño de fuente configurable | ❌ | ✅ | ✅ |
| 170 | Encabezado con logo, nombre, especialidad, matrícula | ✅ | ✅ | ✅ |
| 171 | Color de encabezado personalizable | ✅ | ✅ | ✅ |
| 172 | Pie de página (texto libre, fecha, Nº de página) | ✅ | ✅ | ✅ |
| 173 | Banner de lugar de trabajo repetido en cada página | ✅ | ✅ | ✅ |
| 174 | Bloque de datos del estudio (tipo, Nº, fecha, etc.) | ✅ | ✅ | ✅ |
| 175 | Bloque de datos del paciente | ✅ | ✅ | ✅ |
| 176 | Renderizado completo: H1/H2/H3, listas, tablas, etc. | ✅ | ✅ | ✅ |
| 177 | Detección de "s/p" → gris itálica en PDF | ❌ | ✅ | ✅ |
| 178 | Bloque de firma con imagen | ✅ | ✅ | ✅ |
| 179 | Código QR de verificación en PDF | ❌ | ✅ | ✅ |

## 🖨️ VISTA PREVIA DE IMPRESIÓN

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 180 | Modal de vista previa A4 a escala real | ✅ | ✅ | ✅ |
| 181 | Encabezado de lugar repetido en cada página | ✅ | ✅ | ✅ |
| 182 | Encabezado profesional solo en página 1 | ✅ | ✅ | ✅ |
| 183 | Grilla de datos del paciente | ✅ | ✅ | ✅ |
| 184 | Grilla de datos del estudio | ✅ | ✅ | ✅ |
| 185 | Firma con imagen | ✅ | ✅ | ✅ |
| 186 | Pie de página (texto, fecha, Nº de página) | ✅ | ✅ | ✅ |
| 187 | QR de verificación en vista previa | ❌ | ✅ | ✅ |
| 188 | Saltos de página con banner de lugar repetido | ✅ | ✅ | ✅ |
| 189 | Navegación multi-página (Anterior/Siguiente) | ✅ | ✅ | ✅ |
| 190 | Botón "Descargar PDF" desde vista previa | ✅ | ✅ | ✅ |
| 191 | Dropdown de formatos desde vista previa | ❌ | ✅ | ✅ |
| 192 | Botón "Imprimir" desde vista previa | ✅ | ✅ | ✅ |

## ✉️ ENVÍO POR EMAIL

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 193 | Botón "Enviar por email" desde vista previa | ❌ | ✅ | ✅ |
| 194 | Modal de email: destinatario, asunto, cuerpo HTML | ❌ | ✅ | ✅ |
| 195 | Previsualización del cuerpo del email | ❌ | ✅ | ✅ |
| 196 | PDF como base64 adjunto al email | ❌ | ✅ | ✅ |
| 197 | Envío vía backend (Google Apps Script) | ❌ | ✅ | ✅ |
| 198 | Fallback a mailto: si no hay backend | ❌ | ✅ | ✅ |

## ⚙️ CONFIGURACIÓN DE PDF

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 199 | Modal de configuración con múltiples pestañas | ✅ | ✅ | ✅ |
| 200 | Pestaña Profesional (nombre, matrícula, especialidad) | ✅ | ✅ | ✅ |
| 201 | Pestaña Formato (tamaño, orientación, márgenes, fuente) | ❌ | ✅ | ✅ |
| 202 | Pestaña Estudio (tipo, fecha/hora, motivo, derivante) | ✅ | ✅ | ✅ |
| 203 | Pestaña Paciente (nombre, DNI, edad, sexo, OS) | ✅ | ✅ | ✅ |
| 204 | Pestaña Pie/Firma (texto pie, checkboxes de visibilidad) | ✅ | ✅ | ✅ |
| 205 | Dropdown de tipo de estudio auto-poblado desde plantillas | ✅ | ✅ | ✅ |
| 206 | Dropdown de lugar de trabajo | ✅ | ✅ | ✅ |
| 207 | Número de informe auto-generado (YYYY-NNNN) | ✅ | ✅ | ✅ |
| 208 | Subir logo del lugar/profesional | ✅ | ✅ | ✅ |
| 209 | Subir imagen de firma | ✅ | ✅ | ✅ |
| 210 | Semáforo de completitud (rojo/amarillo/verde) | ✅ | ✅ | ✅ |
| 211 | Guardar configuración (persiste en localStorage) | ✅ | ✅ | ✅ |
| 212 | Botón "Previsualizar" desde el modal de configuración | ✅ | ✅ | ✅ |

## 📦 PERFILES DE SALIDA

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 213 | Guardar configuración como perfil con nombre | ✅ | ✅ | ✅ |
| 214 | Cargar perfil seleccionado | ✅ | ✅ | ✅ |
| 215 | Actualizar perfil existente | ✅ | ✅ | ✅ |
| 216 | Eliminar perfil | ✅ | ✅ | ✅ |
| 217 | Marcar perfil como predeterminado (estrella) | ✅ | ✅ | ✅ |
| 218 | Selector rápido de perfil en barra de herramientas | ✅ | ✅ | ✅ |
| 219 | Auto-carga del perfil predeterminado al iniciar | ✅ | ✅ | ✅ |

## 🏢 LUGARES DE TRABAJO

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 220 | Dropdown de lugares configurados | ✅ | ✅ | ✅ |
| 221 | Cargar perfil de lugar (dirección, teléfono, logo, pie) | ✅ | ✅ | ✅ |
| 222 | Guardar nuevo lugar de trabajo | ✅ | ✅ | ✅ |
| 223 | Cantidad máxima de lugares | 1 | ∞ | ∞ |

## 👨‍⚕️ GESTIÓN DE PROFESIONALES

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 224 | Dropdown de profesionales por lugar | ❌ | ❌ | ✅ |
| 225 | Agregar profesional (nombre, matrícula, firma, logo) | ❌ | ❌ | ✅ |
| 226 | Editar datos de profesional | ❌ | ❌ | ✅ |
| 227 | Eliminar profesional | ❌ | ❌ | ✅ |
| 228 | Aplicar datos del profesional activo a la config PDF | ❌ | ❌ | ✅ |

## 🧑‍💼 ASISTENTE DE SESIÓN

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 229 | Modal de asistente al iniciar la app | ✅ | ✅ | ✅ |
| 230 | Saludo según hora del día | ✅ | ✅ | ✅ |
| 231 | Selección de lugar de trabajo | ✅ | ✅ | ✅ |
| 232 | Selección de profesional (si hay varios) | ❌ | ❌ | ✅ |
| 233 | Selección de plantilla/estudio (modo Normal) | ✅ | ❌ | ❌ |
| 234 | Pre-selección desde última sesión | ✅ | ✅ | ✅ |
| 235 | Botón "Confirmar" | ✅ | ✅ | ✅ |
| 236 | Botón "Omitir" | ✅ | ✅ | ✅ |

## 📚 DICCIONARIO MÉDICO

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 237 | Base predefinida de ~200+ correcciones ASR | ✅ | ✅ | ✅ |
| 238 | Diccionario personalizado del usuario (localStorage) | ✅ | ✅ | ✅ |
| 239 | Agregar entrada personalizada al diccionario | ✅ | ✅ | ✅ |
| 240 | Eliminar entrada personalizada | ✅ | ✅ | ✅ |
| 241 | Modal del diccionario con tabs Revisión y Diccionario | ✅ | ✅ | ✅ |
| 242 | Lista de coincidencias con checkbox seleccionar/deseleccionar | ✅ | ✅ | ✅ |
| 243 | Badges tipo: BASE, MÍO, IA | ✅ | ✅ | ✅ |
| 244 | Contador de correcciones seleccionadas | ✅ | ✅ | ✅ |
| 245 | Botón "Buscar más con IA" (envía a LLaMA) | ❌ | ✅ | ✅ |
| 246 | Guardar sugerencia de IA en diccionario personal | ❌ | ✅ | ✅ |
| 247 | Botón "Aplicar correcciones" al editor | ✅ | ✅ | ✅ |

## 🔄 MODO PRO / NORMAL

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 248 | Toggle switch Pro/Normal | 🔒 | ✅ | ✅ |
| 249 | Borde superior verde en modo Pro | ❌ | ✅ | ✅ |
| 250 | Persistencia del modo seleccionado | ✅ | ✅ | ✅ |

## 🔀 GESTIÓN DE ESTADO

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 251 | Estados: IDLE → FILES_LOADED → TRANSCRIBED → STRUCTURED | ✅ | ✅ | ✅ |
| 252 | Visibilidad dinámica de botones según estado | ✅ | ✅ | ✅ |
| 253 | Botón "Limpiar" (reset de sesión) | ✅ | ✅ | ✅ |
| 254 | Toast "Deshacer" (7s) al limpiar con contenido | ✅ | ✅ | ✅ |

## 🎨 TEMA

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 255 | Toggle tema claro/oscuro | ✅ | ✅ | ✅ |
| 256 | Icono dinámico sol/luna | ✅ | ✅ | ✅ |
| 257 | Persistencia del tema en localStorage | ✅ | ✅ | ✅ |

## 🔑 API KEY

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 258 | Card de API Key visible | ❌ | ❌ | ❌ |
| 259 | Input para ingresar API Key | ❌ | ❌ | ❌ |
| 260 | Validación contra Groq API | ❌ | ❌ | ❌ |
| 261 | Botón "Probar conexión" | ❌ | ❌ | ❌ |

> Nota: La API Key la precarga el admin via la fábrica. El usuario nunca la ve ni la gestiona.

## 🛡️ LICENCIA Y BACKEND

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 262 | Validación de licencia al iniciar | ✅ | ✅ | ✅ |
| 263 | Cache de licencia (4 horas) | ✅ | ✅ | ✅ |
| 264 | Overlay de bloqueo por licencia expirada/baneada | ✅ | ✅ | ✅ |
| 265 | Toast de advertencia trial (X días restantes) | ✅ | ❌ | ❌ |
| 266 | Envío periódico de métricas (cada 15 min) | ✅ | ✅ | ✅ |
| 267 | Envío vía sendBeacon al cerrar la página | ✅ | ✅ | ✅ |
| 268 | Fallback offline | ✅ | ✅ | ✅ |
| 269 | Límite de dispositivos | 1 | 2 | 10 |

## 🏭 ONBOARDING Y SETUP

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 270 | Setup automático desde link ?id=MED001 (fábrica) | ✅ | ✅ | ✅ |
| 271 | Overlay de carga durante setup | ✅ | ✅ | ✅ |
| 272 | Pantalla de error si el link es inválido | ✅ | ✅ | ✅ |
| 273 | Onboarding: T&C + datos precargados (primer uso) | ✅ | ✅ | ✅ |
| 274 | Session Assistant después del onboarding | ✅ | ✅ | ✅ |

## 📞 CONTACTO

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 275 | Botón de contacto visible | ✅ | ✅ | ✅ |
| 276 | Modal: selector de motivo + textarea | ✅ | ✅ | ✅ |
| 277 | Envío vía mailto: | ✅ | ✅ | ✅ |

## 🔧 DIAGNÓSTICO REMOTO

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 278 | Reporte de diagnóstico (estado API, config, modo, browser) | ✅ | ✅ | ✅ |
| 279 | Envío manual de diagnóstico al backend | ✅ | ✅ | ✅ |
| 280 | Auto-envío si el admin lo solicitó | ✅ | ✅ | ✅ |
| 281 | Botón "Enviar diagnóstico" | ✅ | ✅ | ✅ |

## ❓ GUÍA DE USUARIO

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 282 | Modal de ayuda con pestañas | ✅ | ✅ | ✅ |
| 283 | Tour interactivo de 6 pasos (spotlight) | ✅ | ✅ | ✅ |
| 284 | Auto-inicio del tour en primera visita | ✅ | ✅ | ✅ |
| 285 | Botón "Iniciar tour" en modal de ayuda | ✅ | ✅ | ✅ |
| 286 | Cierre del tour con Escape | ✅ | ✅ | ✅ |

## ⌨️ ATAJOS DE TECLADO

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 287 | Ctrl+B — Negrita | ✅ | ✅ | ✅ |
| 288 | Ctrl+I — Cursiva | ✅ | ✅ | ✅ |
| 289 | Ctrl+U — Subrayado | ✅ | ✅ | ✅ |
| 290 | Ctrl+H — Buscar y reemplazar | ✅ | ✅ | ✅ |
| 291 | Ctrl+Enter — Estructurar con IA | ❌ | ✅ | ✅ |
| 292 | Ctrl+Shift+R — Re-estructurar | ❌ | ✅ | ✅ |
| 293 | Ctrl+Shift+S — Guardar config impresión | ✅ | ✅ | ✅ |
| 294 | Ctrl+Shift+P — Previsualizar PDF | ✅ | ✅ | ✅ |
| 295 | Ctrl+Shift+D — Descargar formato favorito | ✅ | ✅ | ✅ |

## 🔤 NORMALIZACIÓN Y SEGURIDAD

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 296 | Normalización de campos (oración, nombre, siglas) | ✅ | ✅ | ✅ |
| 297 | Detección multi-pestaña (BroadcastChannel) | ✅ | ✅ | ✅ |
| 298 | fetchWithTimeout (120s) | ✅ | ✅ | ✅ |
| 299 | escapeHtml para sanitizar strings | ✅ | ✅ | ✅ |

## 📱 PWA

| # | Función | N | P | C |
|---|---------|:-:|:-:|:-:|
| 300 | Instalable como app (manifest + SW) | ✅ | ✅ | ✅ |
| 301 | Cache offline de app shell | ✅ | ✅ | ✅ |
| 302 | Network-first para llamadas API Groq | ✅ | ✅ | ✅ |

---

## RESUMEN DE PROPIEDADES `CLIENT_CONFIG`

| Propiedad | Normal | Pro | Clínica |
|-----------|:------:|:---:|:-------:|
| `type` | `NORMAL` | `PRO` | `CLINIC` |
| `hasProMode` | `false` | `true` | `true` |
| `hasDashboard` | `false` | `true` | `true` |
| `canGenerateApps` | `false` | `false` | `false` |
| `maxDevices` | `2` | `5` | `10` |
| `trialDays` | `0` | `0` | `0` |
| `allowedTemplates` | `[]` | `[]` | Configurable |
| `specialties` | Config. | Config. | Config. |
| `multiProfessional` | `false` | `false` | `true` |

> **Trial** = igual que Pro pero con `trialDays: 7`, `maxDevices: 1`.
