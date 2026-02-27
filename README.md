# 🏥 Transcriptor Médico Pro

**Aplicación web para transcripción de audio médico con inteligencia artificial.**

Convierte dictados médicos en informes profesionales estructurados usando IA (Whisper + LLaMA 3.3 70B).

## ✨ Características

### Modo Normal
- 🎙️ Grabación de audio en vivo
- 📂 Subida de archivos de audio (MP3, WAV, OGG, M4A, WebM)
- 🔊 Normalización y reducción de ruido
- 🔗 Unir múltiples audios en una transcripción
- ✏️ Editor WYSIWYG completo (negrita, cursiva, listas, tablas, etc.)
- 📄 Exportar a PDF y Word
- ⚙️ Configuración completa del PDF (encabezado, paciente, estudio, firma)
- 👁️ Vista previa de impresión (A4)
- 🏥 Perfiles de lugar de trabajo (múltiples consultorios)
- 🔢 Numeración correlativa de informes

### Modo Pro (IA avanzada)
- 📋 32+ plantillas médicas especializadas por especialidad
- 🤖 Detección automática del tipo de estudio
- ✨ Estructuración automática con IA (LLaMA 3.3 70B)
- 👤 Historial de pacientes (últimos 50)
- 📝 Auto-completado de datos del paciente desde el audio
- ✍️ Firma digital (imagen PNG)
- 📱 QR de verificación en informes

### Especialidades cubiertas
| Categoría | Plantillas |
|-----------|------------|
| 🫁 Neumología | Espirometría, Test Marcha 6min, Pletismografía, Oximetría Nocturna |
| 👁️ Oftalmología | Campimetría, OCT Retinal, Topografía Corneal, Fondo de Ojo |
| 📷 Imágenes | TAC, RMN, Mamografía, Densitometría, PET-CT, Radiografía, Ecografía |
| 🔬 Endoscopía | Gastroscopía, Colonoscopía, Broncoscopía, Laringoscopía |
| ❤️ Cardiología | Gammagrafía, Holter, MAPA, Cinecoronariografía, ECG, Eco-Stress |
| 🩺 Ginecología | PAP, Colposcopía |
| 🧠 Neurología | EMG/Potenciales Evocados, Polisomnografía |
| 👂 ORL | Videonasofibrolaringoscopía, Endoscopía Otológica |
| 🔪 Quirúrgico | Protocolo Quirúrgico |

## 🚀 Instalación

### Opción 1: Usar directamente (GitHub Pages)
Abrir en el navegador:
```
https://transcriptorpro.github.io/transcripcion/
```

### Opción 2: Descargar ZIP para uso local
1. Ir a: https://github.com/TranscriptorPro/transcripcion
2. Click en **Code** → **Download ZIP**
3. Descomprimir en cualquier carpeta
4. Abrir `index.html` en el navegador

### Opción 3: Clonar con Git
```bash
git clone https://github.com/TranscriptorPro/transcripcion.git
cd transcripcion
# Abrir index.html en el navegador
```

## 🔧 Configuración inicial

1. **Abrir la app** → Aparece el onboarding
2. **Configurar API Key de Groq** (necesaria para transcripción)
   - Obtener gratis en: https://console.groq.com/
   - Pegar la key en la configuración
3. **Completar datos profesionales** (nombre, matrícula, especialidad)
4. **¡Listo!** Ya podés transcribir

## 📁 Estructura del proyecto

```
transcripcion/
├── index.html                        # App principal
├── README.md
├── package.json
├── .gitignore
├── src/
│   └── js/
│       ├── config/
│       │   └── config.js             # Configuración global y CLIENT_CONFIG
│       ├── core/
│       │   └── audio.js              # Grabación, manejo de archivos y procesamiento de audio
│       ├── features/
│       │   ├── transcriptor.js       # Transcripción con Groq Whisper
│       │   ├── structurer.js         # Estructuración con LLaMA 3.3 70B
│       │   └── business.js           # Inicialización, workplaces y suite de negocio
│       └── utils/
│           ├── ui.js                 # Gestión de UI, API Key, temas y modales
│           └── stateManager.js       # Modo Pro/Normal, templates y estado global
├── recursos/
│   ├── admin.html                    # Panel de administración
│   └── login.html                   # Login del panel admin
├── backend/
│   ├── google_apps_script.js         # Backend Google Apps Script (control de usuarios)
│   └── GOOGLE_SHEET_SETUP.md        # Instrucciones de configuración del Sheet
├── tests/
│   └── audit_diagnostic.js          # Script de auditoría con Playwright
└── documentacion/
    └── CONTEXTO_PROYECTO.md         # Visión y contexto del proyecto
```

## 🛠️ Tecnologías utilizadas

- **Frontend:** HTML5, CSS3, JavaScript (vanilla, sin frameworks)
- **Transcripción:** Groq API (Whisper large-v3)
- **Estructuración IA:** Groq API (LLaMA 3.3 70B Versatile)
- **PDF:** jsPDF (generación de PDF en el navegador)
- **Backend:** Google Apps Script + Google Sheets
- **Hosting:** GitHub Pages (gratis)

## 💰 Modelo de negocio

| Concepto | Precio |
|----------|--------|
| App personalizada (pago único) | $200 USD |
| Suscripción Normal | $15 USD/mes |
| Suscripción Pro | $25 USD/mes |

## 🔒 Seguridad

- Datos del profesional bloqueados en informes (anti-piratería)
- Contraseña para acceso admin
- Control de dispositivos
- Sin almacenamiento en servidor (todo en localStorage del navegador)
- API keys encriptadas en localStorage

## 📞 Soporte

Para soporte técnico o consultas comerciales, contactar al administrador.

## 📄 Licencia

Proyecto privado. Todos los derechos reservados.
