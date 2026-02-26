# INVENTARIO EXHAUSTIVO DE FUNCIONALIDADES — Transcriptor Médico Pro

> Generado exhaustivamente desde el código fuente.  
> Cada línea = una funcionalidad individual orientada al usuario.  
> Entre paréntesis: archivo(s) que la implementa(n).

---

## 🎙️ GRABACIÓN DE AUDIO

- Grabar audio en vivo con el micrófono del dispositivo (`audio.js`)
- Botón Grabar / Detener con animación de pulso rojo (`audio.js`)
- Temporizador visual mm:ss durante la grabación (`audio.js`)
- Indicador de estado "Grabando..." con animación (`audio.js`)
- Warning automático a los 30 minutos de grabación continua (`audio.js`)
- Auto-stop a los 45 minutos de grabación continua (`audio.js`)
- Liberación de pistas de audio (stream.getTracks) al detener (`audio.js`)
- Detección de MIME type real del MediaRecorder (webm/ogg) (`audio.js`)
- Generación automática de nombre de archivo con hora (ej: "Grabación 14-30-00.webm") (`audio.js`)
- Manejo de error de acceso al micrófono con toast informativo (`audio.js`)

## 📁 CARGA DE ARCHIVOS DE AUDIO

- Subir archivos de audio haciendo clic en la zona de carga (dropZone) (`audio.js`)
- Subir archivos arrastrando y soltando (drag & drop) en la dropZone (`audio.js`)
- Efecto visual dragover al arrastrar archivos sobre la dropZone (`audio.js`)
- Validación de formatos de audio aceptados: MP3, WAV, OGG, M4A, WEBM, FLAC (`audio.js`)
- Validación de tamaño máximo por archivo: 25 MB (`audio.js`)
- Toast de error si se suben archivos >25 MB (`audio.js`)
- Subir múltiples archivos de audio simultáneamente (`audio.js`)
- Lista visual de archivos cargados con nombre, tamaño y estado (Pendiente/Procesando/Listo) (`audio.js`)
- Botón reproducir/pausar audio para cada archivo cargado (`audio.js`)
- Control de reproducción exclusiva (pausar audio anterior al reproducir otro) (`audio.js`)
- Botón eliminar archivo individual de la lista (`audio.js`)
- Icono diferenciado según estado del archivo (nota musical vs. check) (`audio.js`)
- Botón "Reintentar fallidos" visible solo cuando hay archivos con error (`audio.js`, `stateManager.js`)
- Desbloqueo de botón "Transcribir" al cargar archivos (`audio.js`)
- Desbloqueo de botón "Transcribir y Estructurar" al cargar archivos (`audio.js`)

## 🔊 PROCESAMIENTO DE AUDIO (Pre-envío)

- Normalización de volumen (ajuste de ganancia al 95% del pico) (`audio.js`)
- Reducción de ruido con filtro high-pass 80 Hz + low-pass 12 kHz (`audio.js`)
- Conversión de audio procesado a formato WAV (`audio.js`)
- Checkbox "Normalizar volumen" en la interfaz (`audio.js`)
- Checkbox "Reducir ruido" en la interfaz (`audio.js`)
- Fallback silencioso al audio original si el procesamiento falla (`audio.js`)

## ⚡ TRANSCRIPCIÓN

- Botón "Transcribir" — envía archivos pendientes a Groq Whisper API (`transcriptor.js`)
- Botón "Transcribir y Estructurar" (combo) — transcribe y auto-estructura en Pro mode (`transcriptor.js`)
- Barra de progreso visual durante la transcripción (`transcriptor.js`)
- Indicador de archivo actual (ej: "Procesando 2/5") (`transcriptor.js`)
- Prompt contextual para Whisper con 4 niveles de prioridad: plantilla → perfil → especialidad → universal (`transcriptor.js`)
- Retries automáticos: hasta 4 intentos con reparación progresiva del audio (`transcriptor.js`)
- Intento 1: envío directo del audio original (`transcriptor.js`)
- Intento 2: envío con prompt más específico (`transcriptor.js`)
- Intento 3: reparación del audio (normalización + filtro ruido + mono 16 kHz) (`transcriptor.js`)
- Intento 4: reparación + reintento final (`transcriptor.js`)
- Modal de reparación de audio: el usuario elige opciones de reparación (`transcriptor.js`)
- Modal de decisión para batch fallido: continuar con el resto o cancelar (`transcriptor.js`)
- Detección de silencio pre-envío mediante análisis RMS (`transcriptor.js`)
- Validación de archivo (formato, tamaño, vacío) antes de enviar (`transcriptor.js`)
- Filtro anti-alucinaciones de Whisper (HALLUCINATION_PHRASES) (`transcriptor.js`)
- Reunión de términos médicos separados erróneamente por Whisper (MEDICAL_REJOIN_RULES) (`transcriptor.js`)
- Auto-aplicación de correcciones del diccionario médico tras transcribir (`transcriptor.js`)
- Clasificación de errores de transcripción con mensajes amigables al usuario (`transcriptor.js`)
- Diálogo "¿Unir audios?" al subir múltiples archivos (`transcriptor.js`, `toast.js`)
- Checkbox "Unir audios" — auto-unir sin diálogo (`transcriptor.js`)
- Apertura en pestañas separadas si elige no unir (`transcriptor.js`)
- Botón "Reintentar fallidos" — resetea archivos con error a pendiente (`transcriptor.js`)
- Liberación de ObjectURLs de audio después de procesar (`transcriptor.js`)
- Tracking de uso: conteo de transcripciones realizadas (`config.js`)
- Test de conexión con Groq (envía audio de prueba generado) (`transcriptor.js`)

## ✨ ESTRUCTURACIÓN CON IA

- Botón "Estructurar con IA" — envía texto a Groq LLaMA para estructurar (`structurer.js`)
- Auto-detección de plantilla médica desde el contenido del texto (`structurer.js`)
- Toast interactivo "Plantilla detectada: X [Cambiar]" con auto-confirmación a 5 segundos (`structurer.js`)
- Selección manual de plantilla altern. desde el toast de detección (`structurer.js`)
- Prompt de estructuración con 13 reglas médicas detalladas (`structurer.js`)
- Conversión markdown→HTML con clases CSS de informe (`structurer.js`)
- Reemplazo de "[No especificado]" por spans interactivos editables (`structurer.js`)
- Cadena de modelos de fallback: llama-3.3-70b → llama-3.1-70b → llama-3.1-8b-instant (`structurer.js`)
- Retries con variación de temperatura y cambio de modelo (`structurer.js`)
- Extracción de meta-notas de la IA desde la respuesta (`structurer.js`)
- Panel de notas de la IA (nota clínica + plantilla usada) (`structurer.js`)
- Cola de pendientes para estructuraciones fallidas (`structurer.js`)
- Badge de pendientes en el botón de estructurar (`structurer.js`)
- Modal de cola de pendientes: ver, re-procesar o eliminar items (`structurer.js`)
- Re-procesar item individual de la cola de pendientes (`structurer.js`)
- Eliminar item individual de la cola de pendientes (`structurer.js`)
- Auto-expiración de items de la cola >7 días (`structurer.js`)
- Check de datos del paciente: extrae nombre/DNI del texto transcrito (`structurer.js`)
- Inserción de placeholder clickable "Completar datos del paciente" (`structurer.js`)
- Notificación de escritorio cuando la estructuración completa en segundo plano (`structurer.js`)
- Botón "Original" — alternar entre texto original y estructurado (`structurer.js`, `ui.js`)
- Re-estructuración automática al volver de la vista original si se agregó texto nuevo (`ui.js`)
- Tracking de uso: conteo de estructuraciones realizadas (`config.js`)

## 📝 EDITOR DE TEXTO ENRIQUECIDO

- Editor WYSIWYG contenteditable para editar el informe (`editor.js`)
- Pegado inteligente desde Word/Google Docs con limpieza de formato (`editor.js`)
- Detección de pegado → auto-activar botón "Estructurar" (`editor.js`)
- Botón Negrita (+ Ctrl+B) (`editor.js`)
- Botón Cursiva (+ Ctrl+I) (`editor.js`)
- Botón Subrayado (+ Ctrl+U) (`editor.js`)
- Botón Tachado (`editor.js`)
- Alineación izquierda (`editor.js`)
- Alineación centrada (`editor.js`)
- Alineación derecha (`editor.js`)
- Alineación justificada (`editor.js`)
- Lista con viñetas (`editor.js`)
- Lista numerada (`editor.js`)
- Selector de tamaño de fuente (`editor.js`)
- Botón aumentar tamaño de fuente (`editor.js`)
- Botón disminuir tamaño de fuente (`editor.js`)
- Selector de interlineado (`editor.js`)
- Botón limpiar formato (`editor.js`)
- Botón insertar enlace (con prompt personalizado) (`editor.js`)
- Botón insertar tabla (prompt de filas y columnas) (`editor.js`)
- Botón Deshacer (+ Ctrl+Z, stack de 50 estados) (`editor.js`)
- Botón Rehacer (+ Ctrl+Y) (`editor.js`)
- Contador de palabras en tiempo real (`ui.js`)
- Auto-guardado del editor cada 30 segundos (`ui.js`)
- Restauración de borrador con botón "Restaurar sesión anterior" (expira a las 2 horas) (`ui.js`)
- Toast informativo cuando hay borrador disponible para restaurar (`ui.js`)
- Guardado de borrador al cerrar pestaña (beforeunload) (`ui.js`)

## 🔍 BUSCAR Y REEMPLAZAR

- Panel de Buscar y Reemplazar (toggle con botón o Ctrl+H) (`editor.js`)
- Botón "Buscar siguiente" — resalta coincidencia en el editor (`editor.js`)
- Botón "Reemplazar" — reemplaza una ocurrencia (`editor.js`)
- Botón "Reemplazar todo" — reemplaza todas las ocurrencias (`editor.js`)
- Toggle "Coincidir mayúsculas/minúsculas" (`editor.js`)
- Toggle "Palabra completa" (`editor.js`)

## 📋 COPIAR, DESCARGAR E IMPRIMIR

- Botón "Copiar al portapapeles" — copia texto del editor (`editor.js`)
- Botón "Imprimir" — abre vista previa de impresión (`editor.js`)
- Botón principal de descarga con formato favorito (1-clic) (`editor.js`)
- Dropdown de formatos: PDF, RTF, TXT, HTML (`editor.js`)
- Marcar formato favorito con estrella ⭐ (`editor.js`)
- Descarga como PDF (vía pdfMaker) (`editor.js`, `pdfMaker.js`)
- Descarga como RTF (`editor.js`)
- Descarga como TXT (`editor.js`)
- Descarga como HTML (`editor.js`)
- Uso de File System Access API para guardar sin Zone.Identifier (`editor.js`)
- Warning "Sin datos del paciente" antes de descargar (`editor.js`)

## 📄 PLANTILLAS (Modo Normal)

- Botón "Aplicar Plantilla" visible en modo Normal tras transcripción (`editor.js`)
- Dropdown de selección de plantilla (categorizado por especialidad) (`editor.js`, `templates.js`)
- Constructor de plantilla estática (buildStaticTemplate) sin IA (`editor.js`)
- Aplicación de plantilla con IA (modo Normal con API key) (`editor.js`)
- 29 plantillas médicas especializadas por especialidad (`templates.js`):
  - Neumología: Espirometría, Test de Marcha 6 min, Pletismografía, Oximetría Nocturna
  - Oftalmología: Campimetría Humphrey, OCT Retinal, Topografía Corneal, Fondo de Ojo
  - Imágenes: TAC, Resonancia Magnética, Mamografía, Densitometría, PET-CT, Radiografía, Ecografía Abdominal/Doppler, Eco Doppler Vascular
  - Endoscopía: Gastroscopía, Colonoscopía, Broncoscopía, Laringoscopía
  - Cardiología: Gammagrafía Cardíaca, Holter ECG, MAPA, Cinecoronariografía, ECG, Eco-Stress, Ecocardiograma Transtorácico (ETT)
  - Ginecología: Papanicolaou, Colposcopía
  - Neurología: Electromiografía, Polisomnografía
  - ORL: Videonaso/Laringoscopía, Endoscopía Otológica
  - Quirúrgico: Protocolo Quirúrgico
  - General: Nota de Evolución, Epicrisis, Informe Médico General
- Filtrado de plantillas por allowedTemplates (restricción por licencia) (`templates.js`)
- Población dinámica de dropdowns de plantillas con iconos por categoría (`templates.js`)
- Detección automática del tipo de estudio por keywords del texto (`templates.js`)

## ✏️ EDICIÓN DE CAMPOS [No especificado]

- Clic en campo "[No especificado]" → abre modal de edición (`editor.js`)
- Tab "Escribir" — input de texto con botones rápidos (`editor.js`)
- Botón rápido "s/p" (sin particularidades) (`editor.js`)
- Botón rápido "Sin particularidades" (`editor.js`)
- Tab "Grabar" (solo Pro) — grabar audio, transcribir con Whisper, obtener texto (`editor.js`)
- Temporizador visual en tab Grabar (`editor.js`)
- Botón "Aplicar" — inserta el valor en el campo (`editor.js`)
- Botón "Dejar en blanco" — marca el campo como vacío intencionalmente (`editor.js`)
- Botón "Eliminar sección" — elimina encabezado H2/H3 + contenido hasta el siguiente heading (`editor.js`)
- Candado 🔒 en tab "Grabar" para modo Normal (`editor.js`)

## 🎙️ GRABAR Y AGREGAR (Modo Pro)

- Botón inline "Grabar y agregar +" dentro del editor (Pro only) (`ui.js`)
- Grabación de audio adicional desde el editor (`ui.js`)
- Transcripción automática del audio adicional con Whisper (`ui.js`)
- Inserción del texto transcrito al final del editor (`ui.js`)
- Sincronización del texto crudo original con el nuevo texto (`ui.js`)
- Re-estructuración automática al volver a vista estructurada si se grabó en vista original (`ui.js`)
- Animación "btn-pro-animated" + pulso rojo durante grabación (`ui.js`)

## ⧉ VISTA COMPARATIVA

- Botón "Comparar" — vista lado a lado de original vs. estructurado (`ui.js`)
- Panel izquierdo: texto original sin estructurar (`ui.js`)
- Panel derecho: texto estructurado por la IA (`ui.js`)
- Botón copiar texto original desde panel de comparación (`ui.js`)
- Botón copiar texto estructurado desde panel de comparación (`ui.js`)
- Botón imprimir texto original desde panel de comparación (`ui.js`)
- Botón imprimir texto estructurado desde panel de comparación (`ui.js`)
- Botón cerrar comparación — vuelve al editor normal (`ui.js`)
- Deshabilitación de botones copy/print principales durante comparación (`ui.js`)

## 📑 PESTAÑAS (TABS)

- Creación de pestañas para múltiples transcripciones simultáneas (`tabs.js`)
- Mostrar nombre del archivo en la pestaña (truncado a 28 caracteres) (`tabs.js`)
- Tooltip con nombre completo del archivo en cada pestaña (`tabs.js`)
- Cambiar entre pestañas con clic (`tabs.js`)
- Guardar contenido del editor al cambiar de pestaña (`tabs.js`)
- Botón cerrar pestaña individual (×) (`tabs.js`)
- Reset automático al cerrar la última pestaña (vuelve a estado IDLE) (`tabs.js`)
- Ajuste automático del índice activo al cerrar pestañas (`tabs.js`)

## 🏥 DATOS DEL PACIENTE

- Modal de datos del paciente: nombre, DNI, edad, sexo, obra social, Nº afiliado (`ui.js`)
- Validación: nombre del paciente es obligatorio (`ui.js`)
- Búsqueda de paciente con autocompletado desde el registro (`ui.js`, `patientRegistry.js`)
- Auto-rellenado de formulario al seleccionar paciente del registro (`patientRegistry.js`)
- Cálculo automático de edad a partir de fecha de nacimiento (`formHandler.js`)
- Extracción automática de datos del paciente desde la transcripción (nombre, DNI, edad, sexo) (`formHandler.js`)
- Encabezado de datos del paciente insertado en el editor (no editable) (`ui.js`)
- Botón "Editar ✏️" en el encabezado de paciente para re-abrir el modal (`ui.js`)
- Placeholder clickable "Completar datos del paciente" si no hay datos (`structurer.js`, `ui.js`)
- Botón "Omitir" — cierra el modal sin ingresar datos, con toast informativo (`ui.js`)
- Guardado automático del paciente en el registro tras completar datos (`ui.js`)
- Sincronización de datos de paciente entre vista original y estructurada (`ui.js`)

## 👥 REGISTRO DE PACIENTES

- Guardar paciente (crear o actualizar por DNI) (`patientRegistry.js`)
- Buscar pacientes por nombre, apellido o DNI (insensible a acentos) (`patientRegistry.js`)
- Datalist autocomplete en campos de búsqueda de pacientes (`patientRegistry.js`)
- Dropdown de resultados de búsqueda en vivo (`patientRegistry.js`)
- Panel de gestión del registro de pacientes (modal) (`patientRegistry.js`)
- Tabla de pacientes: Nombre, DNI, Edad, Última visita, Nº de visitas (`patientRegistry.js`)
- Filtro de búsqueda en tiempo real en la tabla del registro (`patientRegistry.js`)
- Editar paciente inline desde el panel del registro (`patientRegistry.js`)
- Eliminar paciente con confirmación (`patientRegistry.js`)
- Ver historial de informes de un paciente desde el registro (`patientRegistry.js`, `reportHistory.js`)
- Exportar registro de pacientes a JSON (`patientRegistry.js`)
- Exportar registro de pacientes a CSV (`patientRegistry.js`)
- Importar pacientes desde JSON (merge sin duplicados) (`patientRegistry.js`)
- Contador de visitas incrementado al guardar paciente (`patientRegistry.js`)

## 📊 HISTORIAL DE INFORMES

- Guardar informe al descargar PDF (automático) (`reportHistory.js`)
- Obtener todos los informes guardados (`reportHistory.js`)
- Buscar informes por nombre de paciente o DNI (`reportHistory.js`)
- Ver informe en modal de solo lectura con HTML completo (`reportHistory.js`)
- Re-exportar informe a PDF desde el visor (`reportHistory.js`)
- Eliminar informe individual con confirmación (`reportHistory.js`)
- Eliminar todos los informes de un paciente (`reportHistory.js`)
- Panel de historial de informes (modal) (`reportHistory.js`)
- Tabla de historial: Paciente, Plantilla, Fecha, Hora, Acciones (`reportHistory.js`)
- Filtro de búsqueda en tiempo real en la tabla del historial (`reportHistory.js`)
- Estadísticas: total informes, total pacientes, espacio en KB (`reportHistory.js`)
- Exportar historial completo como JSON (`reportHistory.js`)
- Importar historial desde JSON (sin duplicados) (`reportHistory.js`)
- Limpiar todo el historial con confirmación (`reportHistory.js`)
- Mini-modal de informes de un paciente (desde registro) (`reportHistory.js`)
- Manejo de QuotaExceededError: elimina informes antiguos si localStorage lleno (`reportHistory.js`)
- Flag _skipReportSave para evitar duplicados al re-exportar (`reportHistory.js`)

## 📄 GENERACIÓN DE PDF

- Generación de PDF con jsPDF y jsPDF-AutoTable (`pdfMaker.js`)
- Tamaño de página configurable: A4, Letter, etc. (`pdfMaker.js`)
- Orientación configurable: retrato/paisaje (`pdfMaker.js`)
- Márgenes configurables: angosto/normal/ancho (`pdfMaker.js`)
- Fuente configurable: Helvetica, Times, Courier (`pdfMaker.js`)
- Tamaño de fuente configurable (`pdfMaker.js`)
- Encabezado con logo, nombre profesional, especialidad, institución, dirección, teléfono, matrícula (`pdfMaker.js`)
- Color de encabezado personalizable con color picker (`pdfMaker.js`, `ui.js`)
- Pie de página con texto libre, fecha, numeración de páginas (`pdfMaker.js`)
- Banner de lugar de trabajo repetido en cada página (`pdfMaker.js`)
- Bloque de datos del estudio: tipo, número de informe, fecha, hora, médico derivante, motivo (`pdfMaker.js`)
- Bloque de datos del paciente: nombre, DNI, edad, sexo, obra social, Nº afiliado (`pdfMaker.js`)
- Renderizado de contenido: H1/H2/H3, párrafos con negrita/cursiva inline, listas (UL/OL), tablas, HR, BR (`pdfMaker.js`)
- Detección de "s/p" → renderizado en gris itálica (`pdfMaker.js`)
- Bloque de firma con imagen, línea, nombre, matrícula, especialidad (`pdfMaker.js`)
- Código QR de verificación debajo de la firma (opcional) (`pdfMaker.js`)
- Guardado automático del informe en el historial al descargar PDF (`pdfMaker.js`)
- Prioridad de datos del profesional activo sobre datos globales (`pdfMaker.js`)

## 🖨️ VISTA PREVIA DE IMPRESIÓN

- Modal de vista previa A4 a escala real (`pdfPreview.js`)
- Encabezado de lugar de trabajo repetido en cada página (`pdfPreview.js`)
- Encabezado profesional solo en página 1 (`pdfPreview.js`)
- Grilla de datos del paciente (`pdfPreview.js`)
- Grilla de datos del estudio (3 columnas) (`pdfPreview.js`)
- Contenido del editor renderizado (`pdfPreview.js`)
- Bloque de firma con imagen opcional (`pdfPreview.js`)
- Pie de página con texto, fecha, número de página (`pdfPreview.js`)
- Código QR de verificación (`pdfPreview.js`)
- Indicadores de salto de página con banner de lugar repetido (`pdfPreview.js`)
- Navegación multi-página: botones Anterior/Siguiente (`pdfPreview.js`)
- Contador de página sincronizado con scroll (`pdfPreview.js`)
- Botón "Descargar PDF" desde la vista previa (`ui.js`)
- Dropdown de formatos (PDF/RTF/TXT/HTML) desde la vista previa (`ui.js`)
- Botón "Imprimir" desde la vista previa (via iframe con thead/tfoot repetidos) (`pdfPreview.js`)
- Botón "Enviar por email" desde la vista previa (`pdfPreview.js`, `ui.js`)

## ✉️ ENVÍO POR EMAIL

- Modal de envío de email: destinatario, asunto auto-generado, cuerpo HTML (`pdfPreview.js`)
- Previsualización del cuerpo HTML del email (`pdfPreview.js`)
- Generación de PDF como base64 para adjuntar al email (`pdfPreview.js`)
- Envío vía backend (Google Apps Script) (`pdfPreview.js`)
- Fallback a mailto: si no hay backend disponible (`pdfPreview.js`)

## ⚙️ CONFIGURACIÓN DE PDF

- Modal de configuración de PDF con múltiples pestañas (`pdfPreview.js`, `ui.js`)
- Pestaña Profesional: nombre, matrícula, especialidad (bloqueados para no-admin) (`pdfPreview.js`)
- Pestaña Formato: tamaño página, orientación, márgenes, fuente, tamaño fuente, interlineado (`pdfPreview.js`)
- Pestaña Estudio: tipo de estudio, fecha/hora auto-rellenados, motivo, médico derivante, equipo, técnica (`pdfPreview.js`)
- Pestaña Paciente: nombre, DNI, edad, sexo, obra social, Nº afiliado, teléfono, fecha de nacimiento (`pdfPreview.js`)
- Pestaña Pie/Firma: texto de pie, checkboxes (mostrar header/footer/fechas/QR/firma/imagen firma) (`pdfPreview.js`)
- Dropdown de tipo de estudio auto-poblado desde plantillas (`pdfPreview.js`)
- Auto-selección de tipo de estudio según plantilla detectada (Pro) (`pdfPreview.js`)
- Dropdown de lugar de trabajo (`pdfPreview.js`)
- Extracción automática de datos del paciente desde el texto del editor (`pdfPreview.js`)
- Fallback de datos del paciente desde campos del formulario (`pdfPreview.js`)
- Número de informe auto-generado (YYYY-NNNN) (`formHandler.js`)
- Restauración de datos del profesional activo (`pdfPreview.js`)
- Checkbox imagen de firma (`pdfPreview.js`)
- Opción "Otro" en tipo de estudio → input de texto libre (`ui.js`)
- Subir logo del profesional/lugar (`formHandler.js`, `ui.js`)
- Semáforo de completitud de configuración (rojo/amarillo/verde) (`pdfPreview.js`)
- Validación antes de descargar: bloqueo si rojo, advertencia si amarillo (`pdfPreview.js`)
- Guardar configuración (persiste todos los campos en localStorage) (`formHandler.js`, `ui.js`)
- Botón "Previsualizar" desde el modal de configuración (`ui.js`)

## 📦 PERFILES DE SALIDA

- Guardar configuración actual como perfil con nombre (`outputProfiles.js`)
- Cargar perfil seleccionado (restaura toda la config) (`outputProfiles.js`)
- Actualizar perfil existente (`outputProfiles.js`)
- Eliminar perfil (`outputProfiles.js`)
- Marcar perfil como predeterminado (estrella) (`outputProfiles.js`)
- Selector de perfil dentro del modal de configuración PDF (`outputProfiles.js`)
- Selector rápido de perfil en la barra de herramientas (`outputProfiles.js`)
- Auto-carga del perfil predeterminado al iniciar la app (`outputProfiles.js`)
- Visibilidad condicional del selector rápido (Admin siempre; Clones solo si omitió Session Assistant) (`stateManager.js`)

## 🏢 GESTIÓN DE LUGARES DE TRABAJO

- Dropdown de lugares de trabajo configurados (`business.js`)
- Cargar perfil de lugar de trabajo: dirección, teléfono, email, pie de página, logo (`business.js`)
- Guardar nuevo lugar de trabajo con subida de logo (`business.js`)
- Panel de detalles del lugar al seleccionar del dropdown (`ui.js`)
- Botón "Agregar lugar" (Pro only para clones) (`ui.js`)

## 👨‍⚕️ GESTIÓN DE PROFESIONALES

- Dropdown de profesionales por lugar de trabajo (`business.js`)
- Modal de gestión de lista de profesionales (`business.js`)
- Agregar profesional: nombre, matrícula, especialidades, teléfono, email, firma, logo (`business.js`)
- Editar datos de profesional existente (`business.js`)
- Eliminar profesional de la lista (`business.js`)
- Preview de firma y logo al subir imagen del profesional (`business.js`)
- Aplicar datos del profesional activo a la configuración de PDF (`business.js`)

## 🧑‍💼 ASISTENTE DE SESIÓN

- Modal de asistente de sesión al iniciar la app (para clones) (`sessionAssistant.js`)
- Saludo según hora del día (Buenos días/tardes/noches) (`sessionAssistant.js`)
- Selección de lugar de trabajo via dropdown (`sessionAssistant.js`)
- Selección de profesional (modo clínica con múltiples profesionales) (`sessionAssistant.js`)
- Selección de plantilla/estudio (solo modo Normal — Pro usa auto-detección) (`sessionAssistant.js`)
- Display de estado en vivo: lugar + profesional + estudio seleccionados (`sessionAssistant.js`)
- Pre-selección desde la última sesión (`sessionAssistant.js`)
- Botón "Confirmar" — aplica lugar, profesional y plantilla a la app (`sessionAssistant.js`)
- Botón "Omitir" — iniciar sin configurar (`sessionAssistant.js`)

## 📚 DICCIONARIO MÉDICO

- Base predefinida de ~200+ correcciones de términos médicos (`medDictionary.js`)
- Correcciones para errores de ASR de Whisper por especialidad (ORL, Cardiología, Neumología, Oftalmología, etc.) (`medDictionary.js`)
- Correcciones de anglicismos (laryngoscopy → laringoscopía, etc.) (`medDictionary.js`)
- Correcciones de concordancia de género/número (`medDictionary.js`)
- Correcciones de términos anatómicos sin tilde (`medDictionary.js`)
- Diccionario personalizado del usuario (almacenado en localStorage) (`medDictionary.js`)
- Agregar entrada personalizada al diccionario (campo "de" → "a") (`medDictionary.js`)
- Eliminar entrada personalizada del diccionario (`medDictionary.js`)
- Motor de búsqueda de coincidencias en el texto del editor (`medDictionary.js`)
- Modal del diccionario médico con dos pestañas: Revisión y Diccionario (`medDictionary.js`)
- Pestaña Revisión: lista de coincidencias encontradas con checkbox para seleccionar/deseleccionar (`medDictionary.js`)
- Badges por tipo: BASE, MÍO, IA (`medDictionary.js`)
- Contador de correcciones seleccionadas (`medDictionary.js`)
- Contador de ocurrencias por término (×N) (`medDictionary.js`)
- Botón "Buscar más con IA" — envía texto a LLaMA para detectar errores adicionales de ASR (`medDictionary.js`)
- Guardar sugerencia de IA en diccionario personal (botón 💾) (`medDictionary.js`)
- Botón "Aplicar correcciones" — aplica correcciones seleccionadas al editor (`medDictionary.js`)
- Pestaña Diccionario: vista del diccionario base (solo lectura) y custom (editable) (`medDictionary.js`)
- Detalle expandible del diccionario base (`medDictionary.js`)

## 📖 TERMINOLOGÍA POR ESTUDIO

- 54 estudios con keywords, abreviaturas, clasificaciones y unidades (`studyTerminology.js`)
- Abreviaturas médicas con expansión completa por especialidad (`studyTerminology.js`)
- Alimenta el prompt contextual de Whisper para mejorar transcripción (`transcriptor.js`)

## 🔄 MODO PRO vs NORMAL

- Toggle switch Pro/Normal (`stateManager.js`)
- Modo Pro: auto-detección de plantilla, estructuración automática, grabación inline (`stateManager.js`)
- Modo Normal: selección manual de plantilla, plantillas estáticas (`stateManager.js`)
- Borde superior verde en modo Pro (`stateManager.js`)
- Deshabilitación del toggle Pro para usuarios NORMAL (licencia básica) (`stateManager.js`)
- Persistencia del modo seleccionado en localStorage (`stateManager.js`)
- Visibilidad condicional de botones según modo y estado (`stateManager.js`)

## 🔀 GESTIÓN DE ESTADO DE LA APP

- Estados de la app: IDLE → FILES_LOADED → TRANSCRIBED → STRUCTURED → PREVIEWED (`state.js`)
- Visibilidad dinámica de botones según estado actual (`stateManager.js`)
- Botón "Limpiar" (reset de sesión): borra editor, archivos, transcripciones (`stateManager.js`)
- Toast con opción "Deshacer" (7 segundos) al limpiar si había contenido (`stateManager.js`)
- Bloqueo de reset mientras se procesa (`stateManager.js`)
- Salida automática del modo comparación al resetear (`stateManager.js`)

## 🎨 TEMA (Claro/Oscuro)

- Botón toggle de tema claro/oscuro (`ui.js`)
- Icono dinámico sol/luna según tema activo (`ui.js`)
- Persistencia del tema en localStorage (`ui.js`)
- Evento themeChanged para sincronizar componentes (`ui.js`)

## 🔑 GESTIÓN DE API KEY

- Card de API Key con status (Conectada ✓ / No configurada) (`ui.js`)
- Input para ingresar la API Key (oculta con •••• cuando guardada) (`ui.js`)
- Validación real contra Groq API antes de guardar (`ui.js`)
- Validación de formato: debe empezar con "gsk_" (`ui.js`)
- Guardar clave sin verificar si no hay conexión (con confirmación) (`ui.js`)
- Botón "Probar conexión" 🔌 — test real con Groq (`ui.js`)
- Resultado visual del test (✅/❌) (`ui.js`)
- Validación silenciosa al inicio (2.5s delay) — warning si key fue revocada (`ui.js`)
- Expandir/colapsar card de API Key al clic en status "Conectada" (`ui.js`)
- Ocultar card de API Key para clones (solo visible para admin) (`business.js`)
- Banner de advertencia si la key es inválida (`ui.js`)

## 📱 CONFIGURACIÓN DE CLIENTE / LICENCIA

- Tipos de usuario: ADMIN, PRO, TRIAL, NORMAL (`config.js`)
- Configuración dinámica desde localStorage o URL ?id= (`config.js`)
- Setup de fábrica (clonación): leer ?id=MED001 de la URL (`business.js`)
- Generación de device_id único por navegador (`business.js`)
- Validación de licencia contra backend (`licenseManager.js`)
- Cache de licencia por 4 horas (`licenseManager.js`)
- Estados de licencia: EXPIRED, BANNED, INACTIVE, DEVICE_LIMIT, NOT_FOUND, OFFLINE (`licenseManager.js`)
- Overlay de bloqueo por estado de licencia (pantalla completa) (`licenseManager.js`)
- Toast de advertencia para trial (X días restantes) (`licenseManager.js`)
- Tracking de métricas de uso (transcripciones, estructuraciones) (`licenseManager.js`)
- Sincronización periódica de métricas cada 15 minutos (`licenseManager.js`)
- Envío de métricas vía sendBeacon al cerrar la página (`licenseManager.js`)
- Fallback offline para validación de licencia (`licenseManager.js`)
- Conteo local de uso de API con historial (`config.js`)

## 🏭 FLUJOS ADMIN vs CLIENTE

- Flujo Admin: datos profesionales por defecto, card de API key visible, módulos completos (`business.js`)
- Flujo Cliente: card de API key oculta, aceptación de T&C, onboarding de primer uso (`business.js`)
- Onboarding: muestra datos preconfigurados del profesional, aceptar T&C (`business.js`)
- Session Assistant se lanza después del onboarding (`business.js`)
- Reset App (admin): limpia workplace_profiles, prof_data, registry, pdf_config, etc. Preserva API key y tema (`business.js`)

## 📞 CONTACTO

- Botón de contacto (oculto para ADMIN) (`contact.js`)
- Modal de contacto: selector de motivo, textarea de descripción (`contact.js`)
- Validación de campos (motivo + descripción requeridos) (`contact.js`)
- Envío vía mailto: con asunto y cuerpo pre-formateados (`contact.js`)
- Confirmación de envío exitoso (`contact.js`)

## 🔧 DIAGNÓSTICO REMOTO

- Reporte de diagnóstico: estado API key, completitud config, cola pendientes, modo, navegador, PWA, SW (`diagnostic.js`)
- Envío manual de diagnóstico a Google Sheets (`diagnostic.js`)
- Auto-envío de diagnóstico si el admin lo solicitó vía respuesta de licencia (`diagnostic.js`)
- Botón "Enviar diagnóstico" (oculto para ADMIN) (`diagnostic.js`)

## ❓ GUÍA DE USUARIO / AYUDA

- Modal de ayuda con pestañas (`userGuide.js`)
- Tour interactivo (spotlight) de 6 pasos guiados (`userGuide.js`):
  1. Grabá o subí tu audio (botón Grabar)
  2. Zona de carga (dropZone)
  3. Transcribí (botón Transcribir)
  4. Modo Pro (toggle)
  5. Editá el informe (editor)
  6. Exportá (botones PDF/descarga)
- Spotlight con tooltip posicionado dinámicamente (right/left/bottom/top) (`userGuide.js`)
- Dots de progreso del tour (`userGuide.js`)
- Botón "Siguiente" / "Finalizar" (`userGuide.js`)
- Botón "Salir" del tour (`userGuide.js`)
- Auto-inicio del tour en primera visita (post-onboarding) (`userGuide.js`)
- Marca tour como completado en localStorage (`userGuide.js`)
- Botón "Iniciar tour" en el modal de ayuda (`userGuide.js`)
- Tour se ajusta al redimensionar ventana (`userGuide.js`)
- Cierre de tour con tecla Escape (`userGuide.js`)
- Botón "Contacto" dentro del modal de ayuda (abre modal de contacto) (`userGuide.js`)

## 🔔 NOTIFICACIONES (TOASTS)

- Toast de éxito/error/warning/info con auto-cierre (`toast.js`)
- Toast con botón de acción: texto + función callback (`toast.js`)
- Cancelación de timer si el usuario hace clic en la acción (`toast.js`)
- Diálogo inline "¿Unir audios?" junto al botón Transcribir (`toast.js`)

## 🪟 MODALES E INTERFAZ

- Focus trap genérico para todos los modales (Tab/Shift+Tab cicla dentro del modal) (`ui.js`)
- Cierre automático de focus trap al cerrar modal (`ui.js`)
- Observer automático para modales con clase .modal-overlay (`ui.js`)
- Cierre de cualquier modal abierto con la tecla Escape (`ui.js`)
- Cierre de modal al click fuera (en el overlay) (`ui.js`)
- Modal de confirmación personalizado (reemplaza confirm() nativo) (`editor.js`)
- Modal de prompt personalizado (reemplaza prompt() nativo) (`editor.js`)

## ⌨️ ATAJOS DE TECLADO

- Ctrl+B — Negrita (`editor.js`)
- Ctrl+I — Cursiva (`editor.js`)
- Ctrl+U — Subrayado (`editor.js`)
- Ctrl+H — Buscar y reemplazar (`ui.js`)
- Ctrl+Enter — Estructurar con IA (`ui.js`)
- Ctrl+Shift+R — Re-estructurar con IA (`ui.js`)
- Ctrl+Shift+S — Guardar configuración de impresión (`ui.js`)
- Ctrl+Shift+P — Previsualizar PDF (`ui.js`)
- Ctrl+Shift+D — Descargar en formato favorito (`ui.js`)

## 🔤 NORMALIZACIÓN DE TEXTO

- Normalización modo oración en campos de formulario al blur (`dom.js`)
- Normalización modo nombre (cada palabra capitalizada) para campos de nombre (`dom.js`)
- Forzar MAYÚSCULAS para campo obra social (`dom.js`)
- Preservación de siglas médicas (~130 siglas) en mayúsculas durante normalización (`dom.js`)
- Preposiciones y artículos en minúscula (excepto inicio de oración) (`dom.js`)
- Detección de siglas con números intercalados (VEF1, T4, PO2) (`dom.js`)
- safeJSONParse — lectura segura de localStorage sin crash (`dom.js`)
- fetchWithTimeout — fetch con AbortController y timeout de 120s (`dom.js`)
- escapeHtml — sanitización de strings para inserción en HTML (`ui.js`)

## 🔒 SEGURIDAD Y ESTABILIDAD

- Detección multi-pestaña vía BroadcastChannel (warning si hay otra pestaña abierta) (`ui.js`)
- Guardado de borrador del editor al cerrar ventana (`ui.js`)
- Bloqueo de reset durante procesamiento activo (`stateManager.js`)

## 📱 PWA

- manifest.json para instalación como app (`manifest.json`)
- Service Worker con estrategia Cache-First para app shell (`sw.js`)
- Network-first para llamadas a la API Groq (`sw.js`)
- Registro del Service Worker en index.html (`index.html`)

## 🧪 ADMINISTRACIÓN

- Botón "Ejecutar Tests" (solo admin) — abre auto-test-full.html (`ui.js`)

---

**Total de funcionalidades individuales listadas: ~300+**
