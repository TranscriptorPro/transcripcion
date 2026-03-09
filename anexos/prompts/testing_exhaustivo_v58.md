# Prompt: Testing exhaustivo v58

## Contexto del proyecto

Proyecto: Transcriptor-pro — PWA de transcripción médica con IA
Ruta: c:\Users\kengy\Desktop\Transcriptor-pro
Versión actual: v58
GitHub: TranscriptorPro/transcripcion (branch main)
Deploy: automático via GitHub Actions (.github/workflows/deploy.yml) — cada push a main ejecuta `node build.js` y despliega `dist/` a GitHub Pages.

## Stack técnico
- Frontend puro: HTML + CSS + JS vanilla (sin frameworks)
- Build: `node build.js` → concatena/minifica JS en `app.*.min.js`, CSS en `app.*.min.css`, output en `dist/`
- Tests unitarios: `npm test` (ejecuta `node tests/run_tests.js`) — actualmente 397/397 passing
- Tests E2E manuales: archivos `tests/test-*.html` (se abren en navegador)
- API: Groq (transcripción de audio con Whisper + estructurado con LLM)
- Almacenamiento: localStorage + IndexedDB (para audio)
- Licencias: sistema propio con device ID, tipos ADMIN/USER/GIFT
- PDF: jsPDF
- PWA: manifest.json + sw.js (service worker con cache-first)

## Archivos clave de referencia
- `tests/run_tests.js` — runner de tests unitarios
- `tests/test-gift-e2e.html` — test E2E del flujo gift existente
- `tests/test-k1k2-primer-uso.html` — test primer uso / API key
- `tests/test-backend-connection.html` — test conexión backend
- `tests/test-structurer-e2e.html` — test estructurador E2E
- `src/js/features/business.js` — lógica de negocio (pricing, gift, suscripciones)
- `src/js/features/licenseManager.js` — gestión de licencias
- `src/js/config/config.js` — configuración y API keys
- `src/js/features/contact.js` — formulario de contacto
- `src/js/features/formHandler.js` — manejo de formularios
- `src/js/features/structurer.js` — estructurador de transcripciones
- `src/js/features/themeManager.js` — skins/temas (recién corregido en build)
- `src/js/core/audio.js` — grabación y transcripción de audio
- `backend/google_apps_script.js` — backend en Google Apps Script
- `build.js` — script de build de producción

## Tarea: Testing exhaustivo en 3 fases

### FASE 1: Tests automatizados (que vos podés ejecutar solo)
1. Ejecutar `npm test` y reportar resultado (deben pasar 397/397)
2. Revisar TODOS los archivos `tests/test-*.html` existentes para entender qué ya está cubierto
3. Analizar el código fuente de TODOS los módulos en `src/js/` para identificar funcionalidades NO cubiertas por tests
4. Crear tests unitarios NUEVOS en `tests/run_tests.js` para cubrir todo lo que falte:
   - themeManager.js (apply, getCurrent, getRegistry, injectSelectorUI)
   - Todas las funciones de business.js (pricing, cart, gift codes, clone generation)
   - licenseManager.js (validación, tipos de licencia, device binding)
   - contact.js (validación de formulario, envío)
   - patientRegistry.js (CRUD completo)
   - reportHistory.js (guardado, búsqueda, exportación)
   - outputProfiles.js (perfiles de salida)
   - pdfMaker.js / pdfPreview.js (generación de PDF)
   - editor.js (edición de campos)
   - medDictionary.js (diccionario médico)
   - formHandler.js (manejo de datos de paciente)
   - templates.js (todas las plantillas médicas)
   - studyTerminology.js (terminología por estudio)
   - config.js (getConfig, setConfig, API key management)
   - diagnostic.js (diagnósticos del sistema)
   - sessionAssistant.js (asistente de sesión)
   - state.js (gestión de estado)
   - Todos los utils (ui.js, helpers, etc.)
5. Ejecutar los tests nuevos y asegurar que TODOS pasen
6. Si algún test falla, investigar si es bug en el código o en el test, y corregir

### FASE 2: HTML de pruebas manuales con API keys
Crear UN SOLO archivo `tests/test-manual-completo.html` que yo pueda abrir en el navegador para probar TODO lo que requiere interacción real o API keys:

Secciones del HTML de pruebas:

1. **Conexión API Groq**: Test de conexión con la API key, verificar respuesta
2. **Transcripción de audio**: Grabar 10 segundos → enviar a Whisper → verificar texto devuelto
3. **Estructurado con LLM**: Enviar texto de muestra → verificar JSON estructurado devuelto
4. **Auto-detección de plantilla**: Enviar texto médico → verificar que detecta la plantilla correcta
5. **Generación de PDF**: Generar PDF con datos de muestra → verificar que se descarga
6. **Flujo Gift completo**:
   a. Generar código gift desde el pricing cart
   b. Simular redención del código
   c. Verificar que se crea la licencia correcta
   d. Verificar restricciones según tipo de suscripción
7. **Flujo de alta de usuario nuevo**:
   a. Simular primer uso (sin API key en localStorage)
   b. Ingresar API key
   c. Verificar que se guarda y no se vuelve a pedir
   d. Verificar UI de usuario vs admin
8. **Backend Google Apps Script**:
   a. Test de registro de usuario
   b. Test de validación de licencia
   c. Test de contacto/soporte
9. **PWA**:
   a. Verificar manifest.json cargado
   b. Verificar service worker registrado
   c. Verificar cache de app shell
   d. Test de instalación (beforeinstallprompt)
10. **Skins/Temas**:
    a. Aplicar cada skin y verificar que los CSS se cargan
    b. Verificar persistencia en localStorage
    c. Verificar "Más skins" abre pricing cart
11. **Perfiles de salida**: Verificar cada formato de salida
12. **Registro de pacientes**: CRUD completo en la UI
13. **Historial de informes**: Guardar, buscar, exportar

Cada sección debe tener:
- Botón "Ejecutar test"
- Indicador visual de resultado (✅/❌)
- Log detallado de cada paso
- Datos de prueba precargados donde sea posible
- Campo para ingresar API key (una sola vez, se comparte entre tests)

### FASE 3: Documentar resultados
- NO crear archivos markdown de documentación
- Solo reportarme en el chat: qué tests pasaron, cuáles fallaron, y qué bugs encontraste

## Reglas importantes
- No dañes nada, no inventes, no mientas, no supongas
- Si no estás seguro de algo, preguntame primero
- Ejecutá los tests unitarios ANTES de crear tests nuevos (para tener la baseline)
- Los tests nuevos deben ser ADITIVOS (no borrar ni modificar los 397 existentes)
- El HTML de pruebas manuales debe funcionar tanto en desarrollo (abriendo index.html local) como apuntando a producción
- Usá datos médicos de ejemplo realistas para las pruebas
