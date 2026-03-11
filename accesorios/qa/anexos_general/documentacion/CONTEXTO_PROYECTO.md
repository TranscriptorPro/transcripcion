# Contexto del Proyecto: Transcriptor Médico Pro

**ESTE ARCHIVO SIRVE COMO CONTEXTO PARA CUALQUIER AGENTE O MODELO DE IA QUE TRABAJE EN ESTE PROYECTO.**

---

## 🎯 Resumen del proyecto

**Transcriptor Médico Pro** es una aplicación web *Single Page Application* (SPA) contenida en un único archivo `index.html`. Permite a médicos y profesionales de la salud:

1. Grabar o subir audios de dictados médicos.
2. Transcribir el audio con IA (Groq / Whisper large-v3).
3. Estructurar el texto transcrito en un informe médico profesional usando IA (LLaMA 3.3 70B).
4. Editar el informe con un editor WYSIWYG completo.
5. Exportar el informe como PDF o Word con encabezado, datos del paciente y firma.

La app opera **100 % en el navegador** (excepto las llamadas a la API de Groq). No requiere instalación ni servidor propio. Se distribuye vía GitHub Pages.

---

## ✅ Estado actual — lo que ya está implementado

### PRs mergeados (#1 a #16)

| PR | Descripción |
|----|-------------|
| #1 | Estructura inicial del proyecto, index.html base |
| #2 | Integración Groq API (Whisper) para transcripción |
| #3 | Editor WYSIWYG (negrita, cursiva, subrayado, listas) |
| #4 | Exportación a PDF con jsPDF |
| #5 | Exportación a Word (.docx) |
| #6 | Configuración de encabezado PDF (logo, nombre, matrícula) |
| #7 | Modo Pro: 32+ plantillas médicas especializadas |
| #8 | Estructuración automática con LLaMA 3.3 70B |
| #9 | Detección automática del tipo de estudio |
| #10 | Limpieza total del repositorio, corrección de bugs críticos |
| #11 | Historial de pacientes (últimos 50), auto-completado desde audio |
| #12 | Firma digital (imagen PNG) en informes |
| #13 | QR de verificación en informes PDF |
| #14 | Perfiles de lugar de trabajo (múltiples consultorios) |
| #15 | Numeración correlativa de informes |
| #16 | Actualización README y documentación del proyecto |

### Funcionalidades implementadas

#### Modo Normal
- Grabación de audio en vivo (micrófono)
- Subida de archivos de audio (MP3, WAV, OGG, M4A, WebM)
- Normalización y reducción de ruido del audio
- Unir múltiples audios en una sola transcripción
- Editor WYSIWYG completo (negrita, cursiva, listas, tablas, etc.)
- Exportar informe a PDF y Word
- Configuración del PDF: encabezado, datos del paciente, tipo de estudio, firma
- Vista previa de impresión A4
- Perfiles de lugar de trabajo (múltiples consultorios)
- Numeración correlativa de informes

#### Modo Pro (IA avanzada)
- 32+ plantillas médicas especializadas por especialidad
- Detección automática del tipo de estudio desde el audio
- Estructuración automática del informe con IA (LLaMA 3.3 70B)
- Historial de pacientes (últimos 50 registros)
- Auto-completado de datos del paciente desde el audio
- Firma digital (carga de imagen PNG)
- QR de verificación en informes

#### Especialidades cubiertas
- 🫁 Neumología: Espirometría, Test Marcha 6min, Pletismografía, Oximetría Nocturna
- 👁️ Oftalmología: Campimetría, OCT Retinal, Topografía Corneal, Fondo de Ojo
- 📷 Imágenes: TAC, RMN, Mamografía, Densitometría, PET-CT, Radiografía, Ecografía
- 🔬 Endoscopía: Gastroscopía, Colonoscopía, Broncoscopía, Laringoscopía
- ❤️ Cardiología: Gammagrafía, Holter, MAPA, Cinecoronariografía, ECG, Eco-Stress
- 🩺 Ginecología: PAP, Colposcopía
- 🧠 Neurología: EMG/Potenciales Evocados, Polisomnografía
- 👂 ORL: Videonasofibrolaringoscopía, Endoscopía Otológica
- 🔪 Quirúrgico: Protocolo Quirúrgico

---

## 🗺️ Hoja de ruta — PRs pendientes

| PR | Descripción | Prioridad |
|----|-------------|-----------|
| #17 | Sistema de licencias online (validación por device ID vía Google Sheets) | Alta |
| #18 | Panel ADMIN web para gestionar usuarios y licencias | Alta |
| #19 | Onboarding mejorado: wizard paso a paso para nuevos usuarios | Media |
| #20 | Modo oscuro / temas visuales | Baja |
| #21 | Soporte multiidioma (español neutro / regional) | Media |
| #22 | Sincronización de historial de pacientes vía Google Drive | Media |
| #23 | Plantillas personalizadas por usuario | Media |
| #24 | Estadísticas de uso (informes por día, por especialidad) | Baja |

---

## 💰 Modelo de negocio

| Concepto | Precio |
|----------|--------|
| App personalizada (pago único, setup incluido) | $200 USD |
| Suscripción Normal (grabación + transcripción + PDF) | $15 USD/mes |
| Suscripción Pro (todo Normal + plantillas IA + firma + QR) | $25 USD/mes |

- El precio de $200 USD es por cliente, incluye la app configurada con sus datos.
- Las suscripciones dan acceso continuo a las funcionalidades según el plan.
- Control de acceso y dispositivos via sistema ADMIN.

---

## 🏗️ Arquitectura técnica

```
index.html (SPA única)
    ├── HTML: estructura de la app
    ├── CSS: estilos inline (sin frameworks externos)
    └── JavaScript: toda la lógica

APIs externas (Groq, llamadas desde el navegador):
    ├── Whisper large-v3  → transcripción de audio a texto
    └── LLaMA 3.3 70B     → estructuración del informe médico

Backend (Google Apps Script):
    └── google_apps_script.js → gestión de usuarios en Google Sheets

Librerías (cargadas vía CDN):
    ├── jsPDF       → generación de PDF en el navegador
    ├── docx        → generación de Word en el navegador
    └── qrcode.js   → generación de QR de verificación

Almacenamiento:
    └── localStorage del navegador (API keys, configuración, historial de pacientes)
```

### Decisiones de arquitectura
- **Sin frameworks JS:** Vanilla JavaScript para mantener el archivo liviano y sin dependencias de build.
- **Single file:** Todo en `index.html` para facilitar la distribución (descarga ZIP, GitHub Pages).
- **Sin backend propio:** Google Apps Script + Google Sheets como backend gratuito.
- **API keys en cliente:** Las claves de Groq se guardan en localStorage encriptadas; el usuario las provee.

---

## 🔐 Sistema ADMIN

El sistema ADMIN permite al administrador (dueño del producto) gestionar los usuarios:

- **Acceso:** Contraseña de administrador configurada en la app.
- **Funciones:**
  - Activar / desactivar usuarios
  - Ver dispositivos registrados por usuario
  - Cambiar plan (Normal / Pro)
  - Ver fecha de vencimiento de suscripción
- **Implementación:** Google Apps Script conectado a Google Sheets actúa como base de datos de usuarios.
- **Datos guardados por usuario:** nombre, email, device ID, plan, fecha de vencimiento, estado (activo/inactivo).
- **Anti-piratería:** Los datos del profesional (nombre, matrícula) se bloquean en los informes generados para evitar compartir la app configurada.

---

## 🧩 Decisiones de diseño tomadas

1. **SPA en un solo archivo:** Facilita la distribución y el uso offline. El usuario descarga un ZIP y abre `index.html`.
2. **Groq API (cloud) en lugar de modelos locales:** Se migró desde Transformers.js + Whisper local a Groq API para mejor velocidad y precisión sin penalizar el tamaño del archivo.
3. **LLaMA 3.3 70B para estructuración:** Elegido por su capacidad de seguir instrucciones de formato médico complejo en español.
4. **jsPDF para PDF:** Generación en el navegador, sin servidor.
5. **Google Sheets como base de datos:** Sin costo, fácil de administrar para el dueño del producto.
6. **localStorage para datos locales:** Historial de pacientes, configuración y API key guardados localmente en el navegador del usuario.
7. **Plantillas por especialidad:** Permiten estructurar informes con los campos exactos requeridos por cada tipo de estudio.
8. **Numeración correlativa:** Cada consultorio (perfil de lugar de trabajo) tiene su propio contador de informes.

---

## 📁 Estructura del repositorio

```
transcripcion/
├── index.html                    # App principal (HTML + CSS + JS en un solo archivo)
├── README.md                     # Documentación pública del proyecto
├── backend/
│   └── google_apps_script.js     # Backend para Google Sheets (control de usuarios)
└── documentacion/
    └── CONTEXTO_PROYECTO.md      # Este archivo — contexto para agentes IA
```
