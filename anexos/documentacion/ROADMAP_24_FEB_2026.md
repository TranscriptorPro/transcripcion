# 🗓️ Roadmap — 24 de febrero de 2026

> Plan de trabajo para la sesión de mañana.  
> Estimación total: 6–8 horas de desarrollo efectivo.

---

## 📊 Estado actual del proyecto (al cierre del 23/02)

| Métrica | Valor |
|---------|-------|
| Tests automatizados | **95/95** pasando |
| Último commit | `6956d43` — dark mode exhaustive audit |
| Plantillas médicas | 36+ |
| Bugs conocidos de UI | **0** (todos los de dark mode, tabs, PDF resueltos hoy) |
| Bugs críticos de backend | **7** (B1–B7, ver Etapa 1 y 2 abajo) |

### Commits de hoy (23/02) — lo que se hizo
1. `7abf90e` — Fix tabs (`.active` class)
2. `f3655d7` — Tab close styling + editor dark mode + sync UI↔dashboard
3. `69605e3` — Dashboard dark mode icon swap
4. `49b94b4` — Dashboard table UX overhaul
5. `b766b38` — PDF logo/firma persistence fix
6. `6956d43` — Dark mode exhaustive audit (modals, hover, hardcoded colors)

---

## 🎯 Objetivos para mañana (24/02)

Tres grandes bloques, en orden de prioridad:

```
┌─────────────────────────────────────────────────────────┐
│  BLOQUE 1 — App Factory (backend → app principal)       │  ~3h
│  BLOQUE 2 — Guía de usuario paso a paso                 │  ~2h
│  BLOQUE 3 — Manual de usuario completo + FAQ            │  ~2h
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 BLOQUE 1 — App Factory: conectar dashboard → app cliente

**Meta:** Que cuando el admin crea un usuario en el dashboard, pueda generar una versión de la app ya configurada con los datos de ese cliente.

### Tarea 1.1 — Reparar endpoints faltantes en Apps Script
**Archivo:** `backend/google_apps_script.js`  
**Tiempo estimado:** 45 min

| Bug | Qué falta | Qué hacer |
|-----|-----------|-----------|
| B1 | `admin_login` no existe | Implementar validación contra Script Properties (`ADMIN_USER` + `ADMIN_PASS`) |
| B2 | `admin_create_user` no existe | Implementar: recibe JSON del usuario, crea fila en Sheet |
| B3 | `admin_update_user` llamado como GET | Cambiar `admin.html` para usar POST, o re-implementar como GET |

**Decisiones previas necesarias:**
- [ ] ¿Login admin usa Script Properties (1 admin) o tabla `Admins` en el Sheet?
- [ ] ¿Cuál de las 2 deploy URLs del script es la activa?

### Tarea 1.2 — Unificar URLs y adminKey
**Archivos:** `admin.html`, `login.html`, `admin_config.json`, `DEPLOYMENT_INFO.md`  
**Tiempo estimado:** 20 min

- Elegir UNA URL de deploy y actualizarla en todos los archivos
- Actualizar `GOOGLE_SHEET_SETUP.md` con columnas faltantes (Telefono, Lugares_Trabajo, Estudios_JSON)
- Verificar que `ADMIN_KEY` en Script Properties sea distinta a `ADMIN_SECRET_2026`

### Tarea 1.3 — Generar app personalizada desde el dashboard
**Archivos:** `recursos/admin.html` (nuevo botón), nuevo `backend/app_factory.js` o lógica en admin  
**Tiempo estimado:** 1.5h

**Flujo propuesto:**
1. Admin crea usuario en dashboard (ya tiene nombre, matrícula, api key, plan, etc.)
2. Botón **"📦 Generar App"** en la fila del usuario
3. El sistema:
   - Toma `index.html` como template base
   - Inyecta en `config.js` los datos del cliente:
     - `CLIENT_CONFIG.name`, `.matricula`, `.type` (NORMAL/PRO)
     - `CLIENT_CONFIG.apiKey` (o la carga el usuario desde onboarding)
     - `CLIENT_CONFIG.idMedico` (para futuro validate contra Sheet)
   - Genera un ZIP descargable: `index.html` + `src/` + `manifest.json` + `sw.js` + assets
4. Admin envía el ZIP al cliente

**Alternativa más simple (sin ZIP):**
- Generar solo un `config.js` personalizado que el admin pega en el deploy de cada cliente
- Si la app se sirve desde GitHub Pages con query params: `?id=MED001&name=Dr.+García`

### Tarea 1.4 — Validar licencia al iniciar la app (Etapa 3 de la hoja de ruta)
**Archivos:** `src/js/config/config.js`, `src/js/features/business.js`  
**Tiempo estimado:** 45 min

**Flujo:**
1. Al abrir la app → generar `device_id` único si no existe en localStorage
2. Llamar `GET ?action=validate&id={ID_Medico}&deviceId={device_id}`
3. Si respuesta `Estado === 'active'` o `'trial'` → continuar. Guardar validación con timestamp
4. Si `Estado === 'expired'` o `'banned'` → `showBlocker()` con mensaje
5. Si sin internet → usar última validación guardada (gracia offline de 7 días)
6. Tras cada transcripción exitosa → `POST update_usage`

---

## 📖 BLOQUE 2 — Guía de usuario paso a paso

**Meta:** Crear una guía visual/interactiva que el usuario nuevo pueda seguir para aprender a usar la app.

### Tarea 2.1 — Guía interactiva in-app (tour guiado)
**Archivos:** nuevo `src/js/features/userGuide.js` + CSS  
**Tiempo estimado:** 1.5h

**Opción A — Modal con pasos numerados:**
- Modal con screenshots/iconos que explica cada paso:
  1. "Grabá o subí tu audio" (con GIF o icono del micrófono)
  2. "La app transcribe automáticamente"
  3. "El informe se estructura con IA según el tipo de estudio"
  4. "Completá los campos vacíos tocando el botón ✏️"
  5. "Exportá como PDF o Word"
- Botón "No volver a mostrar" → guarda en localStorage
- Accesible desde menú ❓ en el header

**Opción B — Tooltips secuenciales (spotlight):**
- Al primer uso, resaltar cada elemento clave con un tooltip flotante
- Paso 1: spotlight en el botón "Grabar" → "Empezá grabando tu dictado"
- Paso 2: spotlight en el editor → "Acá aparece tu informe"
- Paso 3: spotlight en botones PDF → "Exportá cuando esté listo"

**Recomendación:** Opción A es más simple de implementar y mantener. Opción B es más elegante pero requiere más trabajo de posicionamiento CSS.

### Tarea 2.2 — Sección "Ayuda" en la app
**Archivo:** `index.html` (sección existente de ayuda o nuevo modal)  
**Tiempo estimado:** 30 min

- Agregar ícono ❓ en el header
- Al click → abre modal con:
  - Guía rápida (los 5 pasos)
  - FAQ resumido (3–5 preguntas clave)
  - Botón "Contacto" (ya existe: modal K3)
  - Link al manual completo (si existe como PDF/HTML)

---

## 📘 BLOQUE 3 — Manual de usuario completo + FAQ

**Meta:** Documento en español, completo, descargable, que cubra todas las funcionalidades.

### Tarea 3.1 — Crear manual de usuario (MD → PDF)
**Archivo:** nuevo `documentacion/MANUAL_USUARIO.md`  
**Tiempo estimado:** 1.5h

**Estructura sugerida:**

```markdown
# Manual de Usuario — Transcriptor Médico Pro

## 1. Introducción
   - Qué es la app
   - Requisitos (navegador moderno, micrófono, conexión a internet)
   - Cómo instalar (PWA / acceso web)

## 2. Primer uso
   - Pantalla de bienvenida (onboarding)
   - Aceptar términos y condiciones
   - Verificar datos del profesional

## 3. Grabación de audio
   - Grabar en vivo (botón micrófono)
   - Subir archivo de audio (MP3, WAV, M4A, WebM, OGG)
   - Subir múltiples archivos (unir o separar en pestañas)
   - Consejos para mejor calidad de audio

## 4. Transcripción
   - Cómo funciona (Whisper IA)
   - Tiempo estimado por minuto de audio
   - Qué hacer si la transcripción tiene errores

## 5. Estructuración del informe
   - Detección automática del tipo de estudio
   - Cómo cambiar la plantilla detectada
   - Lista de plantillas disponibles por especialidad
   - El formato: secciones, hallazgos, conclusión

## 6. Edición del informe
   - Editor de texto (negrita, cursiva, listas, tablas)
   - Campos vacíos [No especificado]: cómo completarlos
   - Botón "Dejar en blanco" para omitir campos
   - Deshacer/rehacer cambios

## 7. Datos del paciente
   - Completar nombre, DNI, edad, sexo, obra social
   - Autocompletado desde el registro de pacientes
   - Registro de pacientes: buscar, editar, exportar

## 8. Exportación
   - PDF con encabezado profesional
   - Configurar logo, firma, datos del consultorio
   - Vista previa de impresión
   - Exportar como Word (.docx)

## 9. Configuración
   - Modo oscuro / claro
   - Perfiles de lugar de trabajo (múltiples consultorios)
   - Diccionario médico personalizado
   - Instalar como app (PWA)

## 10. Modo Normal vs Modo Pro
   - Qué incluye cada plan
   - Funciones exclusivas del Modo Pro

## 11. Solución de problemas (FAQ)
   - "No se escucha la grabación"
   - "La transcripción es incorrecta"
   - "La plantilla detectada no es la correcta"
   - "El PDF no muestra el logo/firma"
   - "La app no funciona sin internet"
   - "¿Cómo cambio mis datos profesionales?"
   - "¿Dónde se guardan mis datos?"

## 12. Contacto y soporte
   - Cómo usar el botón Contacto
   - Horario de atención
```

### Tarea 3.2 — Sección FAQ ampliada
**Incluir en el manual, sección 11**  
**Tiempo estimado:** 30 min

| Pregunta | Respuesta clave |
|----------|----------------|
| ¿Necesito internet? | Sí para transcribir y estructurar. El editor y PDF funcionan offline |
| ¿Se guardan mis audios? | No. El audio se procesa y descarta. Solo queda el texto |
| ¿Puedo usar en celular? | Sí, instalar como PWA desde el botón "Instalar app" |
| ¿Cuántas plantillas hay? | 36+ plantillas por especialidad |
| ¿Puedo agregar plantillas? | Actualmente no. Contactá soporte para solicitar nuevas |
| ¿Es seguro? | Los datos se procesan en tu navegador y se guardan solo en tu dispositivo |
| ¿Cómo actualizo? | Si usás PWA, cierra y reabrí. Si usás web, recargá la página |

---

## 💡 Sugerencias adicionales (no urgentes, para futuras sesiones)

### Mejoras de producto
| ID | Sugerencia | Impacto | Complejidad |
|----|-----------|---------|-------------|
| S1 | **Autocompletado de campos frecuentes** — chips con valores habituales (sexo, preparación, acceso) al editar campos vacíos | Alto | Media |
| S2 | **Historial de informes por paciente** — guardar últimos N informes en localStorage, accesibles desde el registro | Alto | Media |
| S3 | **Versionado del editor** — snapshots automáticos (texto crudo → estructurado → editado) con comparar | Medio | Alta |
| S4 | **s/p discreto en PDF** — campos "sin particularidades" en gris claro/tamaño menor | Bajo | Baja |
| S5 | **Idioma del informe** — selector español/inglés/portugués | Medio | Media |

### Mejoras técnicas
| ID | Sugerencia | Impacto | Complejidad |
|----|-----------|---------|-------------|
| T1 | **Migrar CSS inline a archivos** — ya tenemos `src/css/` pero `index.html` aún tiene mucho inline | Medio | Media |
| T2 | **Eliminar estilos inline en HTML** — reemplazar los 20+ `style="..."` restantes por clases CSS | Medio | Baja |
| T3 | **E2E tests con Playwright** — tests de integración reales en navegador | Alto | Alta |
| T4 | **CI/CD con GitHub Actions** — correr `run_tests.js` automáticamente en cada push | Medio | Baja |
| T5 | **Lazy loading de plantillas** — cargar templates.js de forma diferida para mejorar tiempo de carga | Bajo | Baja |

### Mejoras del dashboard admin
| ID | Sugerencia | Impacto | Complejidad |
|----|-----------|---------|-------------|
| A1 | **Métricas reales desde el Sheet** — reemplazar datos simulados en tab Métricas | Alto | Media |
| A2 | **Tabla de Logs real** — crear hoja `Logs` en Sheet, registrar acciones admin | Medio | Media |
| A3 | **Notificaciones por email** — al crear usuario, al acercarse vencimiento | Medio | Media |
| A4 | **Multi-admin** — hoja `Admins` en Sheet con roles (superadmin / viewer) | Bajo | Media |

---

## ⏰ Distribución sugerida del tiempo

```
09:00 - 09:15   Revisar este roadmap, decidir prioridades finales
09:15 - 10:00   Tarea 1.1 — Reparar endpoints Apps Script
10:00 - 10:20   Tarea 1.2 — Unificar URLs y adminKey
10:20 - 11:50   Tarea 1.3 — App Factory (generar app personalizada)
11:50 - 12:30   Tarea 1.4 — Validar licencia al iniciar

---- PAUSA ----

13:30 - 15:00   Tarea 2.1 — Guía interactiva in-app
15:00 - 15:30   Tarea 2.2 — Sección Ayuda en la app

---- PAUSA ----

16:00 - 17:30   Tarea 3.1 — Manual de usuario completo
17:30 - 18:00   Tarea 3.2 — FAQ ampliado
18:00 - 18:30   Testing final, commit y push
```

---

## ✅ Checklist de cierre de sesión mañana

- [ ] Apps Script tiene endpoints `admin_login`, `admin_create_user` funcionando
- [ ] URLs unificadas en todos los archivos
- [ ] App Factory genera config personalizado desde dashboard
- [ ] Validación de licencia funciona al abrir la app
- [ ] Guía de primer uso implementada (modal o tour)
- [ ] Sección Ayuda (❓) en el header
- [ ] Manual de usuario completo en `documentacion/MANUAL_USUARIO.md`
- [ ] FAQ con 10+ preguntas frecuentes
- [ ] 95/95+ tests pasando
- [ ] Commit y push a main

---

*Documento generado el 23/02/2026. Para uso interno de planificación.*
