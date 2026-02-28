# 📘 Manual Profesional — Transcriptor Médico Pro v2.0

> **Versión:** 2.0.0  
> **Última actualización:** 27 de febrero de 2026  
> **Plataforma:** Aplicación web progresiva (PWA)  
> **URL:** https://transcriptorpro.github.io/transcripcion/

---

## Índice General

1. [Introducción](#1-introducción)
2. [Requisitos del sistema](#2-requisitos-del-sistema)
3. [Instalación y acceso](#3-instalación-y-acceso)
4. [Primer uso — Onboarding](#4-primer-uso--onboarding)
5. [Asistente de sesión](#5-asistente-de-sesión)
6. [Interfaz principal](#6-interfaz-principal)
7. [Grabación de audio](#7-grabación-de-audio)
8. [Carga de archivos de audio](#8-carga-de-archivos-de-audio)
9. [Transcripción automática](#9-transcripción-automática)
10. [Modo Normal vs Modo Pro](#10-modo-normal-vs-modo-pro)
11. [Estructuración inteligente (Modo Pro)](#11-estructuración-inteligente-modo-pro)
12. [Plantillas médicas](#12-plantillas-médicas)
13. [Editor de informes](#13-editor-de-informes)
14. [Edición de campos estructurados](#14-edición-de-campos-estructurados)
15. [Autocompletado inteligente (Chips)](#15-autocompletado-inteligente-chips)
16. [Versionado y snapshots](#16-versionado-y-snapshots)
17. [Vista comparativa](#17-vista-comparativa)
18. [Datos del paciente](#18-datos-del-paciente)
19. [Registro de pacientes](#19-registro-de-pacientes)
20. [Historial de informes](#20-historial-de-informes)
21. [Configuración de impresión (PDF)](#21-configuración-de-impresión-pdf)
22. [Perfiles de salida](#22-perfiles-de-salida)
23. [Exportación de informes](#23-exportación-de-informes)
24. [Vista previa de impresión](#24-vista-previa-de-impresión)
25. [Envío por email](#25-envío-por-email)
26. [Diccionario médico](#26-diccionario-médico)
27. [Pestañas de transcripción](#27-pestañas-de-transcripción)
28. [Guardado automático y restauración](#28-guardado-automático-y-restauración)
29. [Grabación adicional (Append)](#29-grabación-adicional-append)
30. [Panel de configuración](#30-panel-de-configuración)
31. [Tema claro / oscuro](#31-tema-claro--oscuro)
32. [Planes de suscripción](#32-planes-de-suscripción)
33. [Sistema de licencias](#33-sistema-de-licencias)
34. [API Key de Groq](#34-api-key-de-groq)
35. [Contacto y soporte](#35-contacto-y-soporte)
36. [Diagnóstico remoto](#36-diagnóstico-remoto)
37. [Recordatorio de respaldo](#37-recordatorio-de-respaldo)
38. [Atajos de teclado](#38-atajos-de-teclado)
39. [Instalación PWA](#39-instalación-pwa)
40. [Privacidad y seguridad](#40-privacidad-y-seguridad)
41. [Flujo completo — Paso a paso](#41-flujo-completo--paso-a-paso)
42. [Solución de problemas (FAQ)](#42-solución-de-problemas-faq)
43. [Glosario técnico](#43-glosario-técnico)

---

## 1. Introducción

**Transcriptor Médico Pro** es una aplicación web profesional diseñada para profesionales de la salud que necesitan convertir dictados médicos en informes estructurados de calidad. 

### ¿Qué hace la app?

1. **Graba** dictados médicos en tiempo real o acepta archivos de audio
2. **Transcribe** automáticamente usando inteligencia artificial (Whisper de Groq)
3. **Detecta** el tipo de estudio médico (entre 37 especialidades)
4. **Estructura** el informe con plantillas profesionales por especialidad (LLaMA 3.3-70b)
5. **Exporta** como PDF profesional con encabezado, firma digital, QR y datos del paciente
6. **Guarda** historial de informes y registro de pacientes

### Características destacadas

- 37 plantillas médicas especializadas
- Detección automática de tipo de estudio
- PDF profesional con logo, firma y código QR
- Diccionario médico con corrección automática de términos
- Registro de pacientes con autocompletado
- Historial de informes con búsqueda
- Versionado automático del editor (snapshots)
- Autocompletado inteligente en campos médicos
- Funciona offline para edición y exportación (PWA)
- Modo oscuro / claro
- 4 formatos de exportación: PDF, RTF (Word), TXT, HTML

---

## 2. Requisitos del sistema

| Requisito | Detalle |
|-----------|---------|
| **Navegador** | Google Chrome 90+, Microsoft Edge 90+, Firefox 90+, Safari 15+ |
| **Conexión a internet** | Necesaria para transcripción y estructuración con IA |
| **Micrófono** | Necesario solo para grabación en vivo |
| **Sistema operativo** | Windows, macOS, Linux, Android, iOS |
| **Espacio** | ~10 MB en localStorage para datos, configuración, historial y registro |
| **Pantalla** | Mínimo 320px de ancho (responsive). Recomendado: 1024px+ |

> **Nota:** El editor, la configuración, la exportación a PDF y el registro de pacientes funcionan sin conexión a internet si la app fue instalada como PWA.

---

## 3. Instalación y acceso

### 3.1 Acceso web
Abrí la URL proporcionada por tu administrador en un navegador compatible. No requiere instalación.

### 3.2 Instalar como app (PWA)

#### En Chrome o Edge (escritorio):
1. Abrí la app en el navegador
2. Si aparece el botón **📥 Instalar app** en el encabezado, hacé clic
3. Confirmá la instalación en el diálogo del navegador
4. La app aparece en tu escritorio como una aplicación independiente

#### En Android (Chrome):
1. Abrí la URL en Chrome
2. Tocá el menú ⋮ → **"Instalar aplicación"** o **"Agregar a pantalla de inicio"**
3. Confirmá

#### En iOS (Safari):
1. Abrí la URL en Safari
2. Tocá el botón **Compartir** (ícono de caja con flecha ↑)
3. Seleccioná **"Agregar a pantalla de inicio"**
4. Confirmá el nombre y tocá **"Agregar"**

### 3.3 Ventajas de instalar como PWA
- Se abre en ventana propia (sin barra del navegador)
- Acceso rápido desde escritorio o pantalla de inicio
- Funciona offline para edición, configuración y exportación
- Actualizaciones automáticas transparentes
- Menor consumo de memoria que en pestaña del navegador

---

## 4. Primer uso — Onboarding

Al abrir la app por primera vez, se muestra un flujo de bienvenida de 3 pasos:

### Paso 1 — Bienvenida
Pantalla de presentación con el nombre de la app y una descripción breve de sus capacidades.

### Paso 2 — Datos del profesional
- **Nombre completo:** Tu nombre profesional (puede estar precargado por el administrador)
- **Especialidad:** Tu especialidad médica principal
- **Lugar de trabajo:** Institución o consultorio
- **API Key (opcional):** Si tu administrador no la preconfiguró, podés ingresarla acá. Debe comenzar con `gsk_`

### Paso 3 — Términos y condiciones
Lectura y aceptación obligatoria de los términos de uso para continuar.

Después del onboarding, la app inicia un **tour interactivo** que señala las funciones principales con indicadores visuales. Podés repetirlo en cualquier momento desde **❓ Ayuda → 🎯 Iniciar tour interactivo**.

---

## 5. Asistente de sesión

Al iniciar la app (tras el onboarding), el **Asistente de Sesión** se presenta como un overlay con:

### Selección de lugar de trabajo
Si tenés más de un lugar de trabajo configurado, elegí cuál usarás en esta sesión. Cada lugar tiene su propio logo, dirección y datos de contacto que aparecerán en el PDF.

### Selección de profesional
Si el lugar de trabajo tiene más de un profesional asociado, elegí cuál estará firmando los informes.

### Selección de plantilla (opcional)
Podés preseleccionar la plantilla del estudio que vas a dictar. Si no sabés cuál usar, dejá en "Detección automática" y la IA la elegirá por vos.

### Saludo personalizado
El asistente muestra un saludo según la hora del día: "Buenos días, Dr. [nombre]", "Buenas tardes..." o "Buenas noches...".

---

## 6. Interfaz principal

La interfaz se organiza en tres áreas:

### 6.1 Encabezado (Header)
Barra superior con los siguientes controles:

| Control | Descripción |
|---------|-------------|
| **Logo y título** | Identidad de la app |
| **Toggle Pro/Normal** | Interruptor para cambiar entre modos de operación |
| 🛡️ **Admin** | Acceso al panel de administración (solo visible para administradores) |
| ✉️ **Contacto** | Abre el formulario de contacto/soporte |
| 📡 **Diagnóstico** | Envía reporte técnico al equipo de soporte |
| ❓ **Ayuda** | Modal con documentación + tour interactivo |
| 📥 **Instalar app** | Instala la PWA (desaparece si ya está instalada) |
| ⚙️ **Configuración** | Abre el panel de ajustes completo |
| 🌙/☀️ **Tema** | Alterna entre modo claro y oscuro |

### 6.2 Panel lateral (Sidebar)
Panel izquierdo con las herramientas de input:

- **🎙️ Grabar Audio:** Botón de grabación en vivo
- **Zona de carga:** Área para arrastrar y soltar archivos de audio
- **Opciones de audio:** Normalizar volumen, reducir ruido, unir audios
- **⚡ Transcribir Todo:** Inicia la transcripción de todos los audios cargados
- **✨ Transcribir + Estructurar:** (Modo Pro) Hace transcripción + estructurado en un solo paso
- **Datos del paciente:** Formulario con nombre, DNI, edad, sexo, obra social
- **📋 Registro de pacientes:** Acceso al CRUD completo de pacientes
- **🕒 Historial de informes:** Acceso a informes previos

### 6.3 Área principal (Editor)
Zona central donde se trabaja con el texto:

- **Pestañas:** Si hay múltiples transcripciones, cada una tiene su pestaña
- **Barra de herramientas:** Formato de texto, buscar/reemplazar, versiones, diccionario
- **Editor WYSIWYG:** Texto editable con formato visual (similar a Word)
- **Botones de acción:** Configurar impresión, previsualizar, comparar, copiar, imprimir, descargar

---

## 7. Grabación de audio

### 7.1 Iniciar grabación
1. Pulsá el botón **🎙️ Grabar Audio** en el panel lateral
2. El navegador pedirá permiso para acceder al micrófono — pulsá **Permitir**
3. El botón cambia a rojo y muestra un cronómetro con el tiempo de grabación
4. Dictá tu informe

### 7.2 Detener grabación
- Pulsá **⏹️ Detener** para finalizar
- El audio grabado se agrega automáticamente a la lista de archivos para transcribir
- El formato de grabación es WebM (compatible con Whisper)

### 7.3 Consejos para mejor calidad de grabación
- **Ambiente:** Silencioso, con poca reverberación (evitar ecos)
- **Micrófono:** A 15-20 cm de la boca. Auriculares con micrófono dan mejores resultados
- **Dicción:** Hablá a ritmo constante, articulando claramente
- **Términos médicos:** No es necesario deletrear — Whisper reconoce terminología médica
- **Evitar:** Golpes en la mesa, teclado sonando, conversaciones de fondo

---

## 8. Carga de archivos de audio

### 8.1 Formatos soportados
MP3, WAV, OGG, M4A, WebM — máximo **25 MB** por archivo.

### 8.2 Cómo cargar archivos
- **Arrastrar y soltar:** Arrastrá uno o varios archivos desde tu explorador a la zona punteada "Arrastra audios aquí"
- **Explorador de archivos:** Hacé clic en la zona de carga para abrir el selector

### 8.3 Múltiples archivos
Al cargar varios archivos:
- Cada uno aparece como una entrada en la lista
- **🔗 Unir todos los audios:** Combina todos los archivos en una sola transcripción continua
- **Sin unir:** Cada archivo se transcribe por separado, en su propia pestaña

### 8.4 Opciones de preprocesamiento
| Opción | Qué hace |
|--------|----------|
| 🔊 **Normalizar volumen** | Ajusta el nivel de audio para grabaciones con volumen bajo o inconsistente |
| 🪄 **Reducir ruido** | Filtra ruido de fondo (ventiladores, tráfico, etc.) |

---

## 9. Transcripción automática

### 9.1 Iniciar transcripción
1. Cargá o grabá tu(s) audio(s)
2. Pulsá **⚡ Transcribir Todo**
3. Una barra de progreso muestra el estado de cada archivo

### 9.2 Tecnología
La transcripción utiliza **Whisper** de Groq, un modelo de inteligencia artificial de última generación especializado en reconocimiento de voz en español. El prompt de Whisper se enriquece automáticamente con **vocabulario específico** de la plantilla seleccionada para mejorar la precisión de términos médicos.

### 9.3 Tiempos estimados
- ~5-15 segundos por cada minuto de audio
- Depende de la velocidad de tu conexión a internet y la carga del servidor

### 9.4 Después de la transcripción
- El texto aparece en el editor, en la pestaña correspondiente
- La app aplica automáticamente correcciones del **Diccionario Médico** si hay entradas configuradas
- El sistema cambia al estado `TRANSCRIBED`, habilitando los botones de estructurado y exportación

### 9.5 Si hay errores de transcripción
1. Editá directamente en el editor — es un editor de texto completo
2. Usá el **Diccionario Médico** (📚) para corregir términos técnicos recurrentes
3. Si el error es constante, agregá la corrección al diccionario para que se aplique automáticamente en futuras transcripciones

### 9.6 Errores de conexión
Si la transcripción falla:
- La app clasifica el error (red, API key, servidor, rate limit)
- Puede ofrecer reintentar automáticamente
- Si falla repetidamente, se muestra un modal de **reparación de audio** con opciones de recuperación

---

## 10. Modo Normal vs Modo Pro

La app tiene dos modos de operación, seleccionables con el toggle en el encabezado.

### 10.1 Modo Normal
- Transcripción directa de audio a texto
- Texto libre, sin estructurar
- Ideal para notas rápidas, consultas simples o dictados breves
- Exportación en todos los formatos (PDF, RTF, TXT, HTML)

### 10.2 Modo Pro ✨
- **Detección automática** del tipo de estudio entre 37 plantillas
- **Estructuración inteligente** con IA (LLaMA 3.3-70b)
- Informe organizado en secciones profesionales por especialidad
- Conclusión generada automáticamente
- Campos editables individualmente con sugerencias inteligentes
- Pipeline completo: audio → transcripción → detección → estructura → PDF
- Botón combo **Transcribir + Estructurar** (un solo clic)

### 10.3 Cambiar de modo
- Pulsá el toggle **Pro/Normal** en el encabezado
- La preferencia se guarda y persiste entre sesiones
- Según tu plan de suscripción, el Modo Pro puede no estar disponible

---

## 11. Estructuración inteligente (Modo Pro)

### 11.1 Flujo automático
1. Tras la transcripción, la app analiza el texto para detectar el tipo de estudio
2. Selecciona automáticamente la plantilla más adecuada
3. Un **toast** muestra: *"Plantilla detectada: [nombre]"* con opción de **Cambiar**
4. Si no hacés nada en 5 segundos, o confirmás, la IA estructura el texto

### 11.2 Flujo manual
1. Asegurate de estar en Modo Pro
2. Seleccioná la plantilla deseada (o dejá la auto-detectada)
3. Pulsá **🤖 Estructurar con IA** o el atajo **Ctrl+Shift+R**

### 11.3 Qué hace la IA
La IA (LLaMA 3.3-70b) recibe el texto transcrito junto con un prompt específico de la plantilla y genera:
- **Encabezado** con tipo de estudio
- **Secciones** organizadas según la especialidad (ej: hallazgos por órgano, segmento o sistema)
- **Formato s/p** (sin particularidades) para hallazgos normales
- **Conclusión** con solo los hallazgos positivos o relevantes
- **Nota de la IA** con observaciones o aclaraciones (si corresponde)

### 11.4 Campos vacíos
Los datos que la IA no pudo extraer del dictado aparecen como **[No especificado]**, resaltados en amarillo. Estos son editables individualmente (ver sección 14).

### 11.5 Re-estructurar
Si el resultado no es satisfactorio:
- Editá el texto en el editor
- Pulsá **Ctrl+Shift+R** para re-enviar a la IA
- La IA vuelve a procesar con el texto actualizado

### 11.6 Cola de pendientes
Si la estructuración falla (sin conexión, error del servidor, etc.):
- El texto se guarda en una cola de pendientes
- Podés procesarlo más tarde desde el modal de cola
- Se guardan hasta 10 entradas en la cola

---

## 12. Plantillas médicas

La app incluye **37 plantillas** organizadas por especialidad:

### Cardiología (6)
| Plantilla | Descripción |
|-----------|-------------|
| Ecocardiograma transtorácico (ETT) | Dimensiones, función sistólica/diastólica, valvulopatías |
| Electrocardiograma (ECG) | Ritmo, eje, intervalos, segmento ST |
| Eco-stress | Función en reposo y estrés, motilidad segmentaria |
| Holter | Ritmo predominante, arritmias, pausas, variabilidad |
| Cinecoronariografía | Dominancia, lesiones por arteria, flujo TIMI |
| Eco Doppler vascular | Arterias y venas, flujo, índice tobillo-brazo |

### Gastroenterología (3)
| Plantilla | Descripción |
|-----------|-------------|
| Endoscopía digestiva alta | Esófago, estómago, duodeno por segmento |
| Colonoscopía | Segmento por segmento del colon |
| CPRE | Vía biliar, wirsung, esfinterotomía |

### Neumología (5)
| Plantilla | Descripción |
|-----------|-------------|
| Espirometría | CVF, VEF1, FEF25-75, interpretación |
| Broncoscopía | Vía aérea por segmento |
| Polisomnografía | AHI, saturación, eficiencia del sueño |
| Test de marcha (6MWT) | Distancia, SpO2, FC, Borg |
| Pletismografía | Volúmenes pulmonares, resistencia |

### Diagnóstico por imagen (6)
| Plantilla | Descripción |
|-----------|-------------|
| Ecografía abdominal | Hallazgos por órgano con s/p |
| Tomografía computada (TC) | Por región anatómica |
| Resonancia magnética (RMN) | Por región, secuencias, contraste |
| Mamografía | Categoría BI-RADS, hallazgos |
| Densitometría ósea | T-score, Z-score, categoría OMS |
| PET-CT | SUV, hallazgos metabólicos |

### Oftalmología (4)
| Plantilla | Descripción |
|-----------|-------------|
| Topografía corneal | Curvatura, astigmatismo, asfericidad |
| Campimetría | Defectos, DM, DSM, GHT |
| OCT retinal | Espesor macular, fibras peripapilares |
| Fondo de ojo | Papila, mácula, vasos, retina periférica |

### Ginecología (3)
| Plantilla | Descripción |
|-----------|-------------|
| Ecografía obstétrica | Biometría fetal, placenta, líquido amniótico |
| Colposcopía | Zona de transformación, hallazgos, biopsia |
| Papanicolaou (PAP) | Citología, categoría Bethesda |

### Neurología (2)
| Plantilla | Descripción |
|-----------|-------------|
| Electromiografía (EMG) | Conducción, amplitud, latencia |
| Polisomnografía | Arquitectura del sueño, eventos respiratorios |

### ORL (3)
| Plantilla | Descripción |
|-----------|-------------|
| Laringoscopía | Cuerdas vocales, epiglotis, senos piriformes |
| Nasofibrolaringoscopía | Fosas nasales, nasofaringe, laringe |
| Endoscopía otológica | CAE, membrana timpánica, oído medio |

### Cirugía (1)
| Plantilla | Descripción |
|-----------|-------------|
| Protocolo quirúrgico | Procedimiento, técnica, hallazgos intraoperatorios |

### Radiología general (1)
| Plantilla | Descripción |
|-----------|-------------|
| Radiografía | Según región anatómica radiografiada |

### Cardiología nuclear (1)
| Plantilla | Descripción |
|-----------|-------------|
| Gammagrafía cardíaca | Perfusión, función ventricular, viabilidad |

### Neumología complementaria (1)
| Plantilla | Descripción |
|-----------|-------------|
| Oximetría nocturna | SpO2 promedio, índice de desaturación |

### General (3)
| Plantilla | Descripción |
|-----------|-------------|
| Nota de evolución | Subjetivo, objetivo, análisis, plan (SOAP) |
| Epicrisis / Resumen de internación | Motivo de ingreso, evolución, tratamiento, alta, indicaciones |
| Genérico (universal) | Estructura flexible para cualquier estudio no categorizado |

> Cada plantilla incluye: nombre, campos específicos, prompt optimizado para la IA y keywords de detección automática.

---

## 13. Editor de informes

### 13.1 Barra de herramientas
El editor cuenta con una barra de herramientas profesional:

| Control | Descripción |
|---------|-------------|
| **B** | Negrita (Ctrl+B) |
| **I** | Cursiva (Ctrl+I) |
| **U** | Subrayado (Ctrl+U) |
| **S** | Tachado |
| **Tamaño de fuente** | Selector desplegable + botones A+ / A- |
| **Interlineado** | Selector: 1.0, 1.15, 1.5, 2.0 |
| **Limpiar formato** | Elimina todo el formato del texto seleccionado |
| **Insertar enlace** | Agrega un hipervínculo al texto |
| **Insertar tabla** | Crea una tabla con filas×columnas personalizables |
| **Buscar y reemplazar** | Panel de búsqueda con navegación arriba/abajo y reemplazo |
| **Deshacer** | Ctrl+Z — hasta 50 niveles |
| **Rehacer** | Ctrl+Y — hasta 50 niveles |
| **🕒 Versiones** | Abre el panel de snapshots/versionado |

### 13.2 Edición de texto
El editor es de tipo **WYSIWYG** (What You See Is What You Get):
- Escribí y formateá como en Word
- Soporta encabezados (H1, H2, H3), párrafos, listas, tablas
- Los campos estructurados aparecen como secciones identificadas con títulos

### 13.3 Buscar y reemplazar
1. Pulsá 🔍 o **Ctrl+F**
2. Escribí el término a buscar
3. Usá las flechas ↑↓ para navegar entre coincidencias
4. Opcionalmente, escribí el texto de reemplazo
5. Pulsá "Reemplazar" (uno a uno) o "Reemplazar todo"

---

## 14. Edición de campos estructurados

Cuando la IA estructura un informe, cada campo tiene un botón **✏️** para editarlo individualmente.

### 14.1 Modal de edición
Al hacer clic en ✏️:
1. Se abre un modal con el **nombre del campo** como título
2. Dos tabs disponibles:
   - **📝 Escribir:** Textarea para editar el texto manualmente
   - **🎙️ Grabar:** Graba audio y transcribe directamente al campo

### 14.2 Opciones rápidas
Debajo del textarea aparecen botones de acción rápida:
- **s/p (Sin particularidades):** Rellena el campo con "Sin particularidades"
- **No evaluado:** Marca el campo como no evaluado
- **Dejar en blanco:** Vacía el campo completamente
- **🗑️ Eliminar campo:** Elimina toda la sección del informe

### 14.3 Chips de autocompletado
Ver sección 15 para el detalle completo.

---

## 15. Autocompletado inteligente (Chips)

### 15.1 ¿Qué son los chips?
Son **sugerencias contextuales** que aparecen como botones pequeños debajo del campo de edición. Al hacer clic en un chip, el texto se inserta automáticamente en el campo.

### 15.2 Tipos de sugerencias
1. **Diccionario de campo:** Cada tipo de campo médico tiene sugerencias predefinidas (ej: "Ritmo cardíaco" → ["Ritmo sinusal", "Fibrilación auricular", "Flutter auricular", "Taquicardia sinusal"])
2. **Aprendizaje del usuario:** La app memoriza los valores que ingresaste anteriormente para ese mismo campo y los ofrece como sugerencias en futuras ediciones

### 15.3 Campos con sugerencias predefinidas
| Campo | Ejemplos de sugerencias |
|-------|------------------------|
| Ritmo / Ritmo cardíaco | Ritmo sinusal, FA, Flutter, Taquicardia |
| Función ventricular | Conservada, Leve depresión, Moderada, Severa |
| Válvula mitral / aórtica | Insuficiencia leve, Estenosis, s/p |
| Hígado | Ecoestructura homogénea, Esteatosis, Hepatomegalia |
| Vesícula biliar | Alitiásica, Litiasis, Murphy negativo |
| Riñones | Forma y tamaño conservados, Dilatación pielocalicial |
| Esófago | Mucosa rosada, Esofagitis, Barrett |
| Estómago | Mucosa eritematosa, Gastritis, Úlcera |
| Colon | Mucosa normal, Pólipos, Divertículos |
| Cuerdas vocales | Móviles, Nódulos, Parálisis |
| Córnea | Transparente, Astigmatismo regular, Queratocono |
| Conclusión | Normal, Sin hallazgos significativos, Compatible con... |
| *...y 20+ campos más* | |

### 15.4 Cómo funciona el aprendizaje
- Cada vez que guardás un valor en un campo, se almacena localmente
- En la próxima edición de ese mismo campo, tus valores previos aparecen como chips
- El aprendizaje es por nombre de campo (ej: todo lo que escribiste en "Riñones" aparece al editar "Riñones")
- Los datos se guardan en localStorage

---

## 16. Versionado y snapshots

### 16.1 ¿Qué son los snapshots?
Son **fotografías** periódicas del contenido del editor que permiten restaurar versiones anteriores del informe.

### 16.2 Cuándo se crean snapshots
| Evento | Tipo | Automático |
|--------|------|------------|
| Cada 5 minutos de edición | `auto` | ✅ |
| Al completar una transcripción | `transcription` | ✅ |
| Al completar una estructuración | `structuring` | ✅ |

### 16.3 Panel de versiones
1. Pulsá el botón **🕒** en la barra de herramientas del editor
2. Se abre un panel con la lista de versiones guardadas: fecha, hora, tipo y etiqueta
3. Cada versión tiene un botón **Restaurar** que reemplaza el contenido actual del editor

### 16.4 Límites
- Se guardan hasta **30 snapshots** en localStorage
- Si el contenido no cambió desde el último snapshot, no se crea uno nuevo (deduplicación por hash)
- Botón **Limpiar historial** borra todos los snapshots

---

## 17. Vista comparativa

### 17.1 ¿Qué es?
Permite ver lado a lado el **texto original** (transcripción cruda) y el **texto estructurado** (informe generado por la IA).

### 17.2 Cómo acceder
- Pulsá el botón **📊 Comparar** en la barra de herramientas (visible solo después de estructurar)
- La pantalla se divide en dos paneles:
  - **Izquierda:** Transcripción original
  - **Derecha:** Informe estructurado

### 17.3 Acciones en vista comparativa
Cada panel tiene botones para:
- **📋 Copiar** el contenido al portapapeles
- **🖨️ Imprimir** ese panel

Para salir de la vista comparativa, pulsá el botón **✕ Cerrar** o el mismo botón de comparar.

---

## 18. Datos del paciente

### 18.1 Formulario
En el panel lateral se encuentran los campos del paciente:

| Campo | Ejemplo | Autoextraído |
|-------|---------|:------------:|
| Nombre completo | Juan Pérez | ✅ (desde el dictado) |
| DNI | 30.456.789 | ✅ |
| Fecha de nacimiento | 15/05/1971 | ❌ |
| Edad | 54 años | ✅ (calculada desde fecha de nacimiento) |
| Sexo | Masculino | ✅ |
| Obra social | OSDE | ✅ |
| Nº de afiliado | 12345678 | ❌ |
| Teléfono | (011) 4567-8901 | ❌ |

### 18.2 Extracción automática
Cuando la transcripción contiene datos del paciente (nombre, DNI, edad, sexo, obra social), la app los extrae automáticamente y los precarga en el formulario.

### 18.3 Autocompletado desde registro
Si empezás a escribir un nombre o DNI, la app busca en el **registro de pacientes** y sugiere coincidencias. Al seleccionar un paciente, se cargan todos sus datos automáticamente.

### 18.4 Validación antes de exportar (PDF)
Antes de generar un PDF, si faltan datos del paciente:
- Se muestra un **modal de datos obligatorios** para completar al menos nombre y DNI
- Los datos se guardan automáticamente en el registro de pacientes

---

## 19. Registro de pacientes

### 19.1 Acceder al registro
Pulsá **📋 Registro de Pacientes** en el panel lateral o desde la configuración.

### 19.2 Funciones
| Función | Descripción |
|---------|-------------|
| **Ver todos** | Tabla con nombre, DNI, última visita, cantidad de informes |
| **Buscar** | Filtro en tiempo real por nombre o DNI (búsqueda insensible a acentos y mayúsculas) |
| **Agregar** | Al guardar datos de un paciente en el formulario, se agrega automáticamente |
| **Editar** | Botón de edición en cada fila — abre formulario prellenado |
| **Eliminar** | Botón de eliminación con confirmación |
| **Exportar JSON** | Descarga todo el registro en formato JSON |
| **Exportar CSV** | Descarga todo el registro en formato CSV (compatible con Excel) |
| **Importar JSON** | Carga un archivo JSON con registros previamente exportados |

### 19.3 Deduplicación
Si intentás guardar un paciente que ya existe (mismo DNI), los datos se actualizan en vez de duplicarse. El contador de visitas se incrementa.

---

## 20. Historial de informes

### 20.1 Acceder al historial
Pulsá **🕒 Historial** en el panel lateral o desde la configuración.

### 20.2 Funciones
| Función | Descripción |
|---------|-------------|
| **Listar informes** | Tabla con paciente, plantilla, fecha, preview |
| **Buscar** | Por nombre del paciente o fecha |
| **Ver informe** | Abre el HTML completo del informe en un modal viewer |
| **Informes por paciente** | Filtra y muestra solo informes de un paciente específico |
| **Exportar historial** | Descarga todo el historial en JSON |
| **Importar historial** | Restaura historial desde un archivo JSON |
| **Limpiar historial** | Elimina todos los informes (con confirmación) |

### 20.3 Guardado automático
Cada vez que se estructura un informe, se guarda automáticamente en el historial con:
- Contenido HTML del informe
- Plantilla utilizada
- Datos del paciente
- Fecha y hora

---

## 21. Configuración de impresión (PDF)

### 21.1 Acceder
Pulsá **🖨️ Configurar Impresión** en la barra de herramientas del editor.

### 21.2 Secciones configurables

#### Datos del profesional
| Campo | Descripción |
|-------|-------------|
| Nombre completo | Aparece en el encabezado y firma |
| Matrícula profesional | Número de matrícula |
| Especialidad(es) | Ej: "Cardiología — Ecocardiografía" |

#### Lugar de trabajo
| Campo | Descripción |
|-------|-------------|
| Nombre de la institución | Ej: "Sanatorio de la Trinidad" |
| Dirección | Dirección completa |
| Teléfono | De la institución |
| Email | Institucional |
| Logo | Imagen PNG (se muestra en el encabezado del PDF) |

#### Datos del estudio
| Campo | Descripción |
|-------|-------------|
| Tipo de estudio | Se precarga según la plantilla |
| Fecha y hora | Del estudio |
| Motivo de consulta | Indicación clínica |
| Médico derivante | Nombre del médico que derivó |
| Equipo utilizado | Marca y modelo del equipo |
| Técnica empleada | Descripción de la técnica |

#### Opciones del documento
| Campo | Valores |
|-------|---------|
| Tamaño de página | A4, Carta, Legal, Oficio |
| Orientación | Vertical / Horizontal |
| Márgenes | Normal / Estrecho / Amplio |
| Fuente | Times, Arial, Courier, etc. |
| Tamaño de fuente | 8-16 pt |
| Interlineado | 1.0, 1.15, 1.5, 2.0 |

#### Encabezado y pie de página
| Opción | Descripción |
|--------|-------------|
| Mostrar encabezado | Sí/No — banner con logo + datos de la institución |
| Mostrar pie de página | Sí/No |
| Mostrar número de página | Sí/No |
| Mostrar fecha | Sí/No |
| Texto de pie personalizado | Texto libre para el footer |
| QR de verificación | Código QR con datos del informe |

#### Firma
| Opción | Descripción |
|--------|-------------|
| Línea de firma | Mostrar/ocultar línea para firma manual |
| Nombre bajo firma | Nombre profesional debajo de la línea |
| Matrícula bajo firma | Nro. de matrícula debajo del nombre |
| Firma digital | Imagen PNG con fondo transparente |

### 21.3 Semáforo de completitud
El botón de configuración muestra un indicador de color:
- 🟢 **Verde:** Todo completo — PDF listo para generar
- 🟡 **Amarillo:** Faltan datos secundarios — el PDF se genera pero con información incompleta
- 🔴 **Rojo:** Faltan datos críticos (nombre/matrícula). Al intentar descargar PDF se abre el configurador automáticamente

---

## 22. Perfiles de salida

### 22.1 ¿Qué son?
Configuraciones guardadas que podés intercambiar rápidamente. Útiles si trabajás en más de un consultorio o institución, cada uno con diferente logo, dirección y firma.

### 22.2 Crear un perfil
1. Configurá todos los datos en el modal de impresión
2. Pulsá **💾 Guardar** en la barra de perfiles
3. Escribí un nombre descriptivo (ej: "Clínica San Martín", "Consultorio Centro")
4. Confirmá

### 22.3 Gestionar perfiles
| Acción | Descripción |
|--------|-------------|
| **Selector rápido** | Dropdown en la barra de herramientas para cambiar sin abrir el modal |
| **🔄 Actualizar** | Sobrescribe el perfil seleccionado con la configuración actual |
| **⭐ Predeterminado** | Marca un perfil como el que se carga automáticamente al iniciar |
| **🗑️ Eliminar** | Borra el perfil (con confirmación) |

---

## 23. Exportación de informes

### 23.1 Botón de descarga
El botón de descarga tiene dos partes:
- **Botón principal:** Descarga en el formato favorito con un solo clic
- **Chevron (▾):** Abre el menú con los 4 formatos disponibles

### 23.2 Formatos disponibles

| Formato | Ext. | Descripción |
|---------|------|-------------|
| 📄 **PDF Profesional** | .pdf | Encabezado institucional, logo, datos del paciente, cuerpo estructurado, firma digital, QR de verificación, pie de página. Ideal para entregar al paciente o archivar |
| 📝 **Word (RTF)** | .rtf | Compatible con Microsoft Word, LibreOffice y Google Docs. Conserva formato básico |
| 🗒️ **Texto Simple** | .txt | Archivo plano sin formato. Útil para copiar/pegar en otros sistemas |
| 🌐 **HTML** | .html | Página web con formato visual. Abrible en cualquier navegador |

### 23.3 Formato favorito
Hacé clic en la ⭐ junto a un formato para marcarlo como favorito. El botón principal siempre descargará en ese formato con un solo clic.

### 23.4 Nombre del archivo
El nombre del archivo descargado incluye:
- Tipo de estudio
- Nombre del paciente (si está completado)
- Fecha

Ejemplo: `Ecocardiograma_Juan_Perez_2026-02-27.pdf`

---

## 24. Vista previa de impresión

### 24.1 Acceder
Pulsá **👁️ Previsualizar** o **Ctrl+Shift+P**.

### 24.2 Qué muestra
Una representación fiel de cómo quedará el informe impreso:
- Formato A4 con paginación real
- Encabezado institucional con logo
- Cuerpo del informe con formato
- Firma en la última página
- Pie de página con número de página

### 24.3 Acciones desde la vista previa
| Acción | Descripción |
|--------|-------------|
| **🖨️ Imprimir** | Envía directamente a la impresora (Ctrl+P) |
| **⬇️ Descargar** | Menú con los 4 formatos de exportación |
| **✉️ Enviar por email** | Abre modal de envío por correo |
| **✕ Cerrar** | Vuelve al editor |

---

## 25. Envío por email

### 25.1 Desde la vista previa
1. Pulsá el botón **✉️ Enviar** en la vista previa
2. Completá: destinatario, asunto, cuerpo del mensaje
3. Pulsá **Enviar**

> Nota: Esta función usa `mailto:` para abrir tu cliente de email con el informe adjunto, o puede utilizar un endpoint backend si está configurado.

---

## 26. Diccionario médico

### 26.1 Acceder
Pulsá **📚** en la barra de herramientas del editor, o desde **❓ Ayuda**.

### 26.2 ¿Qué hace?
Corrige automáticamente errores frecuentes de transcripción en términos médicos.

### 26.3 Diccionario predefinido
La app incluye un diccionario base con correcciones comunes:
- "ipertrofia" → "hipertrofia"
- "hinsuficiencia" → "insuficiencia"
- "regurjitación" → "regurgitación"
- Y muchas más...

### 26.4 Diccionario personalizado
Podés agregar tus propias correcciones:
1. Abrí el modal del diccionario (📚)
2. En la sección **"Agregar entrada"**, escribí:
   - **Término erróneo:** La palabra mal transcrita
   - **Corrección:** La palabra correcta
3. Pulsá **Agregar**

### 26.5 Aplicación automática
Tras cada transcripción, la app aplica automáticamente todas las correcciones del diccionario (predefinido + personalizado) al texto.

### 26.6 Escaneo con IA
Botón para que la IA analice el texto y sugiera posibles errores médicos que no están en el diccionario.

### 26.7 Revisión de correcciones
La app muestra una lista de sugerencias para que apruebes o rechaces cada una antes de aplicarla.

---

## 27. Pestañas de transcripción

### 27.1 ¿Cuándo aparecen?
Si subiste múltiples archivos de audio sin unirlos, cada transcripción tiene su propia pestaña.

### 27.2 Funciones
- **Hacer clic** en una pestaña para ver esa transcripción
- **✕** para cerrar una pestaña (guarda el contenido)
- Si solo hay una transcripción, las pestañas se ocultan automáticamente

---

## 28. Guardado automático y restauración

### 28.1 Autoguardado
La app guarda automáticamente cada **30 segundos**:
- Contenido del editor
- Estado de la aplicación
- Datos del paciente
- Archivos cargados

### 28.2 Restauración automática
Si cerrás el navegador accidentalmente o la app se desconecta:
1. Al reabrir, la app detecta la sesión anterior
2. Muestra un botón **♻️ Restaurar sesión** (si tiene menos de 2 horas)
3. Al pulsar, se restaura el editor con todo el contenido previo

### 28.3 Detección de múltiples pestañas
Si abrís la app en dos pestañas del navegador, la app lo detecta y muestra una advertencia para evitar conflictos de datos.

---

## 29. Grabación adicional (Append)

### 29.1 ¿Qué es?
Después de transcribir, si necesitás agregar más dictado al informe existente, podés usar la función **Append**. Graba audio adicional y lo agrega al final del texto actual sin reemplazarlo.

### 29.2 Cómo usarlo
1. Después de la transcripción, aparece un botón **🎙️+** (append) en el editor
2. Hacé clic y grabá el dictado adicional
3. El texto transcrito se agrega al final del contenido actual

---

## 30. Panel de configuración

### 30.1 Acceder
Pulsá **⚙️** en el encabezado.

### 30.2 Secciones (12 accordions)

| Sección | Contenido |
|---------|-----------|
| **1. API Key** | Input para ingresar/cambiar la key de Groq, botón validar, indicador de estado |
| **2. Lugar de trabajo** | Gestión de workplaces: agregar, editar, eliminar |
| **3. Perfiles rápidos** | Gestión de perfiles de salida |
| **4. Configuración PDF** | Acceso directo al modal de configuración de impresión |
| **5. Preferencias del editor** | Fuente, tamaño, interlineado |
| **6. Herramientas** | Accesos a diccionario médico, historial de informes, registro de pacientes |
| **7. Tema** | Toggle claro/oscuro, colores de acento |
| **8. Estadísticas** | Transcripciones realizadas, estructurados, palabras procesadas |
| **9. Respaldo** | Exportar/importar toda la configuración como JSON |
| **10. Información** | Versión, Device ID, tipo de licencia, plan actual |
| **11. Upgrade** | Botón para ver planes y precios disponibles |
| **12. Controles del modal** | Cerrar, scroll automático |

> Nota: Según el tipo de usuario (admin o cliente), algunas secciones pueden estar ocultas o bloqueadas.

---

## 31. Tema claro / oscuro

- Pulsá 🌙/☀️ en el encabezado para alternar
- La preferencia se guarda y persiste entre sesiones
- Todos los elementos se adaptan: editor, modals, PDF preview, botones, sidebar
- PDF generado no se ve afectado por el tema (siempre fondo blanco)

---

## 32. Planes de suscripción

| Plan | Ícono | Precio | Incluye |
|------|-------|--------|---------|
| **Trial** | 🧪 | Gratis (15 días) | Transcripción básica, todas las plantillas, exportar TXT |
| **Normal** | 📝 | $15 USD/mes | Transcripción ilimitada, plantillas estáticas, PDF básico, diccionario médico |
| **Pro** | ⚡ | $25 USD/mes | Todo de Normal + Modo Pro + Todas las plantillas + PDF profesional + Historial + Soporte prioritario |
| **Clínica** | 🏥 | Consultar | Todo de Pro + Multi-profesional + Multi-dispositivo + Apps para médicos + Dashboard + Soporte dedicado |

### Plantillas adicionales (Add-ons)
Para usuarios en plan Trial o Normal, es posible adquirir plantillas individuales a **$990 cada una** sin necesidad de subir de plan.

### Cómo ver los planes
Desde **⚙️ Configuración → Upgrade** o desde cualquier enlace de upgrade en la app.

---

## 33. Sistema de licencias

### 33.1 Validación automática
Al abrir la app, el sistema verifica la licencia contra el servidor backend. Si la licencia:
- **Es válida:** La app funciona normalmente
- **Está por vencer (≤7 días):** Muestra una advertencia con los días restantes
- **Expiró:** Muestra un overlay de bloqueo con opción de contactar soporte
- **Fue suspendida:** Overlay de bloqueo permanente

### 33.2 Funcionamiento offline
Si no hay conexión al servidor de licencias:
- Usa la licencia cacheada (válida por 4 horas)
- Tras 4 horas sin verificar, se requiere conexión

### 33.3 Límite de dispositivos
Según el plan, cada usuario tiene un límite de dispositivos simultáneos. Si se excede, se muestra un aviso y se debe contactar al administrador.

---

## 34. API Key de Groq

### 34.1 ¿Qué es?
La API Key de Groq es la credencial que permite usar los servicios de inteligencia artificial (transcripción y estructurado). Es gratuita para uso personal.

### 34.2 ¿Quién la provee?
- **El administrador** puede preconfigurarla en la app del usuario
- **El usuario** puede obtenerla gratis en https://console.groq.com/keys y pegarla en la app

### 34.3 Indicador de estado
En el panel lateral, el indicador de API Key muestra:
- 🟢 **Verde:** Conectada y funcional
- 🔴 **Rojo:** No configurada o inválida

### 34.4 Colapsado automático
Cuando la API Key está conectada y funcional, la sección de API Key en la sidebar se colapsa automáticamente para no ocupar espacio.

---

## 35. Contacto y soporte

### 35.1 Acceder
Pulsá **✉️ Contacto** en el encabezado, o desde **❓ Ayuda → Contactar soporte**.

### 35.2 Formulario
1. **Motivo** (selector): Problema con la API, Consulta general, Sugerencia de mejora, Otro
2. **Detalle** (textarea): Descripción libre del problema o consulta
3. **Enviar:** Envía el mensaje al equipo de soporte vía Google Apps Script

Un toast confirma el envío exitoso.

---

## 36. Diagnóstico remoto

### 36.1 ¿Qué es?
Un reporte técnico que recolecta información de tu navegador, configuración y estado de la app (sin datos de pacientes) y lo envía al equipo de soporte para diagnosticar problemas.

### 36.2 Contenido del reporte
- Navegador y versión
- Sistema operativo
- Device ID
- Estado de la API Key
- Estadísticas de localStorage
- Errores recientes (si los hay)
- Plan y tipo de licencia

### 36.3 Envío
- **Manual:** Botón 📡 en el encabezado
- **Automático:** Si el administrador solicita un diagnóstico de tu dispositivo, la app lo envía silenciosamente

---

## 37. Recordatorio de respaldo

### 37.1 ¿Qué es?
Un toast informativo que aparece cada **7 días** recordándote exportar tus datos (registro de pacientes, historial de informes) como respaldo.

### 37.2 ¿Por qué es importante?
Todos los datos se guardan en el **localStorage** del navegador. Si limpiás los datos del navegador, reinstalás el SO, o cambiás de dispositivo, los datos se pierden.

### 37.3 Cómo hacer un respaldo
1. **Registro de pacientes:** Abrí 📋 → **Exportar JSON**
2. **Historial de informes:** Abrí 🕒 → **Exportar historial**
3. **Configuración completa:** ⚙️ → Respaldo → **Exportar**

Para restaurar: usá los botones de **Importar** en cada sección.

---

## 38. Atajos de teclado

| Atajo | Acción |
|-------|--------|
| **Ctrl+B** | Negrita |
| **Ctrl+I** | Cursiva |
| **Ctrl+U** | Subrayado |
| **Ctrl+Z** | Deshacer |
| **Ctrl+Y** | Rehacer |
| **Ctrl+F** | Buscar y reemplazar |
| **Ctrl+Enter** | Estructurar con IA |
| **Ctrl+Shift+R** | Re-estructurar con IA |
| **Ctrl+Shift+S** | Guardar configuración de impresión |
| **Ctrl+Shift+P** | Vista previa del informe |
| **Ctrl+Shift+D** | Descargar en formato favorito |
| **Esc** | Cerrar modal / tour activo |

---

## 39. Instalación PWA

### 39.1 Botón de instalación
Si estás en un navegador compatible, aparece el botón **📥 Instalar app** en el encabezado. Al hacer clic, el navegador ofrece instalar la app como aplicación independiente.

### 39.2 Qué se instala
- La app se descarga y se almacena en caché localmente
- Se crea un acceso directo en el escritorio / pantalla de inicio
- Se abre en ventana propia (sin barra de navegador)
- Funciona offline para edición y exportación
- Las actualizaciones se aplican automáticamente al detectar nueva versión

### 39.3 Ya está instalada
Si la app ya fue instalada, el botón de instalar se oculta automáticamente.

---

## 40. Privacidad y seguridad

| Aspecto | Detalle |
|---------|---------|
| **Almacenamiento** | Todo en localStorage del navegador (local, en tu dispositivo). No se usa base de datos en la nube |
| **Audio** | Se envía a Groq exclusivamente para la transcripción y se descarta inmediatamente. No se almacena en servidores |
| **Datos del paciente** | Nunca se transmiten a servidores externos. Solo existen en tu navegador |
| **Conexión** | HTTPS cifrado para todas las comunicaciones |
| **Backend** | Solo se usa para validación de licencias y métricas de uso (sin datos de pacientes) |
| **Código** | Ofuscado y minificado en producción para protección de propiedad intelectual |
| **Anti-manipulación** | Protecciones contra escalación de privilegios y alteración de funciones de licencia |
| **Respaldo** | Los datos solo persisten en localStorage — es tu responsabilidad exportarlos periódicamente |
| **Borrado** | Podés eliminar todos los datos desde el botón Reset (admin) o limpiando localStorage del navegador |

### 40.1 Responsabilidad profesional
Es responsabilidad del profesional de la salud la custodia, protección y manejo ético de los datos clínicos de los pacientes según las regulaciones de protección de datos aplicables en tu jurisdicción (ej: Ley de Protección de Datos Personales, habeas data, HIPAA u otras normativas locales).

---

## 41. Flujo completo — Paso a paso

### Escenario: Ecocardiograma transtorácico en Modo Pro

1. **Abrir la app** → El asistente de sesión aparece
2. **Seleccionar lugar de trabajo:** "Sanatorio San Martín"
3. **Seleccionar profesional:** "Dr. Roberto Gómez"
4. **Grabar audio:** 🎙️ Grabar → dictar hallazgos del ecocardiograma → ⏹️ Detener
5. **Transcribir + Estructurar:** Pulsar el botón arcoíris ✨
6. La app:
   - Envía a Whisper → transcribe el audio
   - Detecta automáticamente → "Ecocardiograma transtorácico"
   - Muestra toast de confirmación de plantilla
   - Envía a LLaMA 3.3 → estructura en secciones (dimensiones, función, válvulas, etc.)
7. **Revisar informe:** El texto aparece estructurado en el editor
8. **Completar campos vacíos:** Click en [No especificado] → chips de sugerencias (ej: "Función conservada") → guardar
9. **Completar datos del paciente:** Nombre, DNI, etc.
10. **Configurar impresión** (si es la primera vez): Logo, firma, encabezado
11. **Vista previa:** 👁️ → verificar cómo se ve
12. **Descargar PDF:** ⬇️ → PDF profesional con firma y QR
13. El informe se guarda automáticamente en el **historial**
14. El paciente se guarda en el **registro**

---

## 42. Solución de problemas (FAQ)

### "No transcribe / se queda cargando"
- Verificá tu conexión a internet
- Verificá que la API Key esté activa (indicador 🟢 en la sidebar)
- Si hay error de rate limit (429), esperá unos segundos y reintentá
- Si persiste, pulsá 📡 Diagnóstico y contactá a soporte

### "La plantilla detectada no es la correcta"
- Pulsá **Cambiar** en el toast de detección
- Seleccioná manualmente la plantilla correcta
- Pulsá **Ctrl+Shift+R** para re-estructurar

### "El informe estructurado tiene datos incorrectos"
- Editá directamente en el editor (es totalmente editable)
- Usá ✏️ en cada campo para editarlo con sugerencias
- Re-estructurá con Ctrl+Shift+R si necesitás que la IA vuelva a procesar

### "El PDF no muestra el logo o la firma"
- Abrí 🖨️ **Configurar Impresión**
- Subí el logo como imagen PNG
- Subí la firma como PNG con **fondo transparente**
- Guardá y previsualizá de nuevo

### "Se perdió mi trabajo"
- La app guarda automáticamente cada 30 segundos
- Al reabrir: pulsá **♻️ Restaurar sesión** si aparece el botón
- Usá el botón **🕒 Versiones** para restaurar un snapshot anterior
- Última opción: buscá en 🕒 **Historial de informes**

### "La app no funciona sin internet"
- La transcripción y la estructuración **requieren internet** (usan IA en la nube)
- El editor, la configuración, la exportación y el registro de pacientes sí funcionan offline
- Instalá la app como PWA para la mejor experiencia offline

### "¿Cómo cambio mis datos profesionales?"
- Abrí 🖨️ **Configurar Impresión** → sección "Datos del Profesional"
- O desde ⚙️ **Configuración** → Lugar de trabajo

### "¿Dónde se guardan mis datos?"
- Todo en el **localStorage** del navegador — local, en tu dispositivo
- No se guardan datos de pacientes en servidores
- Si borrás datos del navegador o cambiás de dispositivo, se pierden
- **Exportá periódicamente** desde Registro y Historial

### "¿Puedo usar en celular / tablet?"
- Sí, la app es responsive
- Instalala como PWA para mejor experiencia
- En iOS: Safari → Compartir → "Agregar a pantalla de inicio"

### "¿Cuántas plantillas hay?"
- **37 plantillas** organizadas por especialidad
- Se actualizan con cada versión de la app
- Para solicitar nuevas: usá ✉️ **Contacto**

### "¿Puedo trabajar con múltiples consultorios?"
- Sí, creá múltiples **Perfiles de salida** y **Lugares de trabajo**
- Cada uno con su logo, dirección, firma diferente
- Cambiá con el selector rápido en la barra de herramientas

### "La app se ve rara / los colores están mal"
- Probá cambiar entre tema claro y oscuro (🌙/☀️)
- Limpiá la caché: Ctrl+Shift+Delete → Imágenes y archivos en caché
- Cerrá y reabrí

### "Dice 'Licencia expirada'"
- Tu período de prueba o suscripción venció
- Contactá a tu administrador para renovar
- Usá ✉️ **Contacto** o el botón "Contactar soporte" en el overlay

### "Alcancé el límite de dispositivos"
- Tu plan tiene un límite de dispositivos simultáneos
- Contactá al administrador para liberar dispositivos o ampliar el plan

---

## 43. Glosario técnico

| Término | Definición |
|---------|------------|
| **PWA** | Progressive Web App — aplicación web que se puede instalar como app nativa |
| **Whisper** | Modelo de IA de OpenAI para reconocimiento de voz, ejecutado vía Groq |
| **LLaMA 3.3** | Modelo de lenguaje de Meta, usado para estructurar informes |
| **Groq** | Plataforma de IA que ejecuta los modelos Whisper y LLaMA |
| **API Key** | Credencial de acceso a los servicios de IA |
| **localStorage** | Almacenamiento del navegador (local, no en la nube) |
| **WYSIWYG** | "What You See Is What You Get" — editor visual |
| **RTF** | Rich Text Format — formato compatible con Word |
| **QR** | Código de respuesta rápida, incluido opcionalmente en el PDF |
| **Snapshot** | Fotografía del estado del editor en un momento dado |
| **Pipeline** | Flujo automático completo: audio → texto → detección → estructura |
| **s/p** | "Sin particularidades" — hallazgo normal en terminología médica |
| **Toast** | Notificación breve que aparece en un rincón de la pantalla |
| **Service Worker** | Tecnología que permite la funcionalidad offline de la PWA |
| **Backend** | Servidor de Google Apps Script que gestiona licencias y métricas |
| **Device ID** | Identificador único de cada navegador/dispositivo |
| **Terser** | Herramienta de minificación/ofuscación del código JavaScript |

---

*Transcriptor Médico Pro v2.0 — Manual Profesional*  
*Documento generado el 27/02/2026*  
*© TranscriptorPro — Todos los derechos reservados*
