# PROMPT — Transcriptor Médico Pro: Plan de trabajo sesión 28/02/2026

## REGLAS ABSOLUTAS
1. **No dañes nada.** No borres funcionalidad existente.
2. **No inventes.** No agregues features que no se piden.
3. **No supongas.** Si algo no está claro, preguntá antes de actuar.
4. **No mientas.** Si algo no funciona o no sabés, decilo.
5. Después de cada cambio funcional, corré `npm test` y verificá que los 287+ tests pasen.
6. **Bump de versión:** al cerrar cada commit, incrementá `CACHE_NAME` en `sw.js` (línea 6, formato `transcriptor-pro-vXX`) y `APP_VERSION` en `index.html` (línea 12, formato `'vXX'`). Ambos siempre iguales.
7. **Commits frecuentes.** Un commit+push por cada tarea completada. Mensaje descriptivo. Branch: `main`. Remote: `origin`.

---

## CONTEXTO DEL PROYECTO

**Qué es:** PWA de transcripción médica por voz. Audio → texto → estructurado por IA (Groq API) → PDF profesional. Versión actual: **v54**.

**Stack:** HTML/CSS/JS vanilla (sin frameworks). jsPDF para PDFs. Service Worker para offline. Google Apps Script como backend (Google Sheets como DB). Playwright para tests.

**Estructura clave:**
```
index.html              — App principal (~2455 líneas)
sw.js                   — Service Worker (v54)
src/js/config/config.js — CLIENT_CONFIG, _loadDynamicConfig(), GROQ_API_URL
src/js/config/templates.js — 36+ plantillas médicas
src/js/features/business.js — Factory de clones, PWA install, workplaces (~1204 líneas)
src/js/features/pdfMaker.js — Generación PDF con jsPDF, firma, QR (~660 líneas)
src/js/features/pdfPreview.js — Vista previa, generateQRCode, validateBeforeDownload
src/js/features/pricingCart.js — Definición de planes y precios (276 líneas)
src/js/features/editor.js — Editor de texto, downloadFile(format), downloadPDF/RTF/TXT/HTML
src/js/utils/ui.js      — UI handlers, preview download dropdown logic (~1457 líneas)
recursos/admin.html     — Panel admin, wizard GIFT de 4 pasos (~6030 líneas)
tests/run_tests.js      — Tests automatizados Node.js (287 tests)
```

**Sistema de licencias (CLIENT_CONFIG):**
```js
window.CLIENT_CONFIG = {
    type: 'ADMIN',      // ADMIN | TRIAL | NORMAL | PRO | GIFT | CLINIC
    hasProMode: true,    // Modo Pro (IA estructuración)
    hasDashboard: true,
    canGenerateApps: true,
    allowedTemplates: [] // [] = todas
};
```

**Planes actuales (pricingCart.js):**
- Trial: Gratis, 15 días, todas las plantillas, exportar TXT
- Normal: $15 USD/mes, plantillas estáticas, TXT + PDF básico
- Pro: $25 USD/mes, modo Pro IA, todas las plantillas, PDF profesional con firma
- Clínica: Consultar, multi-profesional, multi-dispositivo

**Fábrica de clones (business.js L450-650):** Admin genera link `?id=MED001` → el cliente lo abre → `_handleFactorySetup(medicoId)` → valida contra backend Google Apps Script → configura CLIENT_CONFIG + prof_data + workplaces + firma + logo + color del tema → guarda en localStorage + IndexedDB.

---

## TAREAS A REALIZAR (en este orden)

### TAREA 1: Firma digital no se aplica en el PDF
**Problema:** La firma digital (imagen PNG base64) se carga durante `_handleFactorySetup` (business.js L609-637) desde `regDatos` pero no aparece en el PDF generado.
**Archivos:** `src/js/features/pdfMaker.js` (L555-600, función `drawSignature()`), `src/js/features/business.js` (L609-637).
**Investigar:**
- En `pdfMaker.js` L61-62: la firma se lee de `activeProfessional` o de `appDB.get('pdf_signature')`. Verificar que `_handleFactorySetup` guarde la firma en la misma key que `pdfMaker` lee.
- La firma se guarda como `profConfig.signature` (objeto con `{data, type}`) y también se intenta guardar en `appDB` como `pdf_signature`. Confirmar que el formato base64 es correcto y que incluye el prefijo `data:image/png;base64,`.
- `drawSignature()` en L562 dibuja la firma solo si `sigB64` existe. Trazar la cadena completa: `_handleFactorySetup → localStorage/appDB → pdfMaker.drawSignature()`.

### TAREA 2: Botón PWA Install no aparece para gift users
**Problema:** El botón/banner de instalación PWA no se muestra para usuarios tipo GIFT.
**Archivos:** `src/js/features/business.js` (L1095-1204).
**Código actual:**
- `_tryPwaInstall(maxRetries)` L1108 — hace polling de `window._pwaInstallPrompt`
- `_showPwaInstallBanner()` L1128 — muestra banner fijo bottom
- En `index.html` L1, el listener de `beforeinstallprompt` captura `window._pwaInstallPrompt`
**Verificar:** ¿Se llama a `_tryPwaInstall()` en el flujo de gift users? Puede que solo se invoque para ADMIN. Buscar dónde se llama `_tryPwaInstall` y asegurar que se ejecute para TODOS los tipos de usuario.

### TAREA 3: Logo posicionamiento en PDF
**Problema:** El logo de la institución debe ir en el encabezado del PDF donde está el nombre de la institución. El logo/foto del profesional debe ir al lado izquierdo del nombre del profesional.
**Archivos:** `src/js/features/pdfMaker.js` (L80-150 zona de header del PDF).
**Contexto:** Actualmente hay dos logos posibles: `pdf_logo` (institución) y el logo del profesional activo. Verificar posicionamiento actual y corregir si están invertidos o mal ubicados.

### TAREA 4: Editor de planes desde panel admin
**Problema:** Los valores de planes ($15 USD Normal, $25 USD Pro, etc.) están hardcodeados en `pricingCart.js`. El admin debe poder cambiar precios, features, devices default y duración de cada plan desde `admin.html` sin tocar código.
**Archivos:** `recursos/admin.html`, `src/js/features/pricingCart.js`.
**Implementar:**
- Nueva sección en admin.html: "Gestión de Planes" con un formulario por cada plan (Trial, Normal, Pro, Clínica) donde se pueda editar: precio, período, features (lista editable), max devices default, duración default, si incluye modo Pro.
- Los valores editados se guardan en Google Sheets (nueva pestaña "Config_Planes" o similar) o en un JSON en localStorage que `pricingCart.js` lea al inicializar.
- `pricingCart.js` debe intentar leer configuración dinámica primero, y usar los hardcodeados como fallback.

### TAREA 5: QR funcional
**Problema:** El QR del PDF actualmente codifica un texto estático `TPRO-{timestamp}` que no lleva a ningún lado. Debe ser verificable.
**Archivos:** `src/js/features/pdfMaker.js` (L617-639), `src/js/features/pdfPreview.js` (L430-458, L9-19 `generateQRCode()`).
**Implementar:**
- El QR debe codificar una URL o un texto que permita verificar la autenticidad del informe.
- Opción sugerida: `https://{dominio}/verificar?id=TPRO-{timestamp}&doc={hash}` — pero como no hay servidor de verificación aún, al menos que el QR contenga datos del informe (número, fecha, profesional, paciente) codificados en un formato parseable.
- Alternativamente: el QR puede llevar a una URL que el admin configure (ej: su sitio web o un Google Form de verificación), con parámetros del informe en la URL.
- Preguntarle al usuario cuál prefiere antes de implementar.

### TAREA 6: API key persiste / no se re-pide
**Problema:** Posible race condition: al abrir con `?id=`, la app a veces re-pide la API key aunque ya fue guardada por `_handleFactorySetup`.
**Archivos:** `src/js/config/config.js`, `src/js/features/business.js` (L543-553 y el onboarding).
**Verificar:** En `_showClientOnboarding()` se chequea `localStorage.getItem('groq_api_key')`. Si el factory setup guarda la key con otra clave o en otro momento, puede que el onboarding la pida de nuevo. Probar en incógnito: `?id=TEST` → ¿pide API key?

### TAREA 7: Conversión USD → Pesos Argentinos
**Problema:** Los precios están en USD pero algunos usuarios necesitan ver en ARS.
**Archivos:** `src/js/features/pricingCart.js`.
**Implementar:**
- Agregar selector de moneda (USD/ARS) en el modal de pricing.
- Tipo de cambio configurable (hardcoded con fallback, idealmente desde la config del admin).
- Cuando está en ARS, mostrar precios convertidos con el símbolo $ y la leyenda "ARS/mes".
- No afectar la lógica interna — solo es display.

### TAREA 8: Botón Descargar en vista previa — mostrar opciones según suscripción
**Problema:** El botón "Descargar PDF" del modal de preview no muestra las opciones de formato (PDF/RTF/TXT/HTML). Solo descarga PDF directamente.
**Archivos:** `src/js/utils/ui.js` (L417-478), `index.html` (L1146-1160).
**Código actual del dropdown en preview:**
```html
<button id="btnDownloadFromPreview">📥 Descargar PDF</button>
<button id="btnDownloadPreviewMore" title="Más formatos">▾</button>
<div id="previewDownloadDropdown" style="display:none;">
    <button data-format="pdf">📄 PDF Profesional</button>
    <button data-format="rtf">📝 Word (RTF)</button>
    <button data-format="txt">🗒️ Texto Simple</button>
    <button data-format="html">🌐 HTML</button>
</div>
```
**Event handler en ui.js L445-478:** El chevron (`btnDownloadPreviewMore`) togglea el dropdown. Los botones `data-format` llaman a `window['download'+FMT]()`.
**Verificar:**
1. ¿El chevron `▾` es visible y clickeable? Puede estar oculto por CSS.
2. Los formatos disponibles deben depender del plan: Trial/Normal solo TXT, Pro/Admin todos los formatos.
3. Si el plan no permite PDF, el botón principal debería decir "Descargar TXT" en vez de "Descargar PDF".

### TAREA 9: Auditoría completa de la fábrica de clones + tests automatizados
**Problema:** Antes de producción, necesitamos asegurar que el flujo de creación de usuarios funciona correctamente de punta a punta.
**Archivos:** `src/js/features/business.js` (L450-650), `src/js/config/config.js`, `tests/run_tests.js`, `recursos/admin.html`.
**Qué hacer:**
1. **Análisis detallado:** Documentar paso a paso todo el flujo: admin.html genera link → usuario abre → config.js detecta `?id=` → business.js `_handleFactorySetup()` → backend validate → configura cliente. Identificar cada punto de fallo posible.
2. **Tests automatizados nuevos en `run_tests.js`:**
   - Test: `_handleFactorySetup` con respuesta exitosa del backend (mock fetch).
   - Test: `_handleFactorySetup` con backend caído (timeout/error).
   - Test: Mapeo correcto de cada plan (TRIAL→trial, NORMAL→normal, PRO→pro, GIFT→pro+override, CLINIC→clinic).
   - Test: `device_id` se genera una sola vez y persiste.
   - Test: `client_config_stored` se guarda correctamente con todos los campos.
   - Test: `prof_data` se genera con nombre, matrícula, especialidad.
   - Test: Firma base64 se guarda en la key correcta.
   - Test: Color del tema (`customPrimaryColor`) se aplica desde `regDatos.headerColor`.
   - Test: API key se guarda y no se re-pide en el onboarding.
   - Test: `wasAdmin` flag funciona correctamente (no false positive para nuevos gift users).
3. **Reportar** cuántos tests se agregaron y si todos pasan.

### TAREA 10: Logo sin círculo (PENDIENTE — requiere imagen)
**Estado:** El círculo es parte del PNG (`recursos/logo-superhero.png`), no de CSS. Necesitamos una nueva imagen sin el círculo. **No hacer nada hasta recibir la imagen.** Solo dejarlo anotado.

---

## NOTAS TÉCNICAS IMPORTANTES

- **Anti-FOUC:** `index.html`, `admin.html` y `login.html` tienen un `<script>` inline en `<head>` que aplica tema/color antes del primer paint. No tocar.
- **Auto-purge:** Al cambiar `APP_VERSION`, la app purga caches automáticamente al abrir. Así se fuerza la actualización.
- **appDB:** Wrapper de IndexedDB en `src/js/utils/db.js`. API: `appDB.get(key)`, `appDB.set(key, value)`, `appDB.delete(key)`. Retorna Promises.
- **Biblioteca QR:** `qrcode-generator v1.4.4` cargada desde CDN en index.html L101. Función global: `window.generateQRCode(text)` en pdfPreview.js L9-19.
- **Tests:** `npm test` corre `tests/run_tests.js`. Framework propio: funciones `test(name, fn)` y `assert(cond, msg)`. Mocks de localStorage/document/fetch. Carga módulos con `vm.runInContext`.
- **El toolbar de descarga tiene DOS instancias:** una en el editor principal (index.html L1899-1920, con `onclick` inline) y otra en el modal de preview (index.html L1146-1160, con event handlers en ui.js L417-478). Ambas deben funcionar correctamente.
- **Validación pre-descarga:** `validateBeforeDownload(format)` en pdfPreview.js — solo bloquea PDF si faltan datos profesionales (semáforo rojo). Otros formatos pasan siempre.

---

## FLUJO DE TRABAJO

1. Leé los archivos relevantes antes de cada tarea.
2. Hacé los cambios.
3. Corré `npm test` y verificá que todo pase.
4. Commiteá con mensaje descriptivo.
5. Pusheá a `origin main`.
6. Pasá a la siguiente tarea.

**Al terminar todas las tareas**, dame un resumen de:
- Qué se implementó
- Qué tests se agregaron (cantidad)
- Qué quedó pendiente y por qué
- Versión final (vXX)
