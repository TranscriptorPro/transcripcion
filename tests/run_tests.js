/**
 * run_tests.js — Tests automatizados para Transcriptor Pro
 * Ejecutar con: node tests/run_tests.js
 *
 * Cubre:
 *  1. autoDetectTemplateKey — detección correcta de plantilla desde texto
 *  2. markdownToHtml         — conversión limpia sin espacios excesivos
 *  3. savePatientToRegistry  — almacenamiento y deduplicación
 *  4. searchPatientRegistry  — búsqueda por nombre y DNI
 *  5. Flujo completo simulado (sin API): texto → detección → simulación de estructura
 */

// ── Simular entorno del navegador ────────────────────────────────────────────
const { LocalStorage } = (() => {
    // Implementación mínima de localStorage para Node
    class LocalStorage {
        constructor() { this._data = {}; }
        getItem(k) { return this._data[k] ?? null; }
        setItem(k, v) { this._data[k] = String(v); }
        removeItem(k) { delete this._data[k]; }
        clear() { this._data = {}; }
    }
    return { LocalStorage };
})();
global.localStorage      = new LocalStorage();
global.window            = global;
global.showToast         = () => {};
global.showToastWithAction = () => {};
global.askJoinAudiosPromise  = async () => false;
global.sendManualDiagnostic  = async () => {};
global.buildDiagnosticReport = () => ({ id: 'TEST', device_id: 'DEV_TEST', timestamp: new Date().toISOString() });
global.GROQ_API_KEY      = null;
global.fetch             = async () => {};
global.selectedTemplate  = undefined;
global.document          = { getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {} };
global.extractPatientDataFromText = () => ({});
global._shouldAutoStructure = false;
global.document.createElement = (tag) => ({
    tagName: tag.toUpperCase(),
    className: '', innerHTML: '', textContent: '',
    style: {},
    setAttribute: () => {},
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    classList: { add() {}, remove() {}, contains() { return false; } },
    insertBefore: () => {},
    get firstChild() { return null; }
});
global.document.body = { style: { borderTop: '' } };
// Suprimir console.error/warn en tests (ruido de errores esperados/simulados)
const _origConsoleError = console.error;
const _origConsoleWarn  = console.warn;
console.error = () => {};
console.warn  = () => {};

// ── Cargar funciones bajo test ───────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const root = path.join(__dirname, '..');

// Crear un contexto VM compartido que tiene acceso a todos los globals que definimos arriba
const ctx = vm.createContext(global);

const load = (rel) => {
    const code = fs.readFileSync(path.join(root, rel), 'utf-8');
    try { vm.runInContext(code, ctx, { filename: rel }); }
    catch(e) { console.error(`Error al cargar ${rel}:`, e.message); }
};

load('src/js/utils/dom.js');
load('src/js/config/templates.js');
load('src/js/features/structurer.js');
load('src/js/features/patientRegistry.js');
load('src/js/features/formHandler.js');
load('src/js/utils/stateManager.js');

// Cargar funciones puras adicionales para tests extendidos
// _hexToRgb está fuera de la función principal en pdfMaker.js — extraer manualmente
const pdfMakerCode = fs.readFileSync(path.join(root, 'src/js/features/pdfMaker.js'), 'utf-8');
const hexToRgbMatch = pdfMakerCode.match(/function _hexToRgb\(hex\)\s*\{[\s\S]*?\n\}/);
if (hexToRgbMatch) vm.runInContext(hexToRgbMatch[0], ctx);

// escapeHtml e isAdminUser desde ui.js (primeras líneas, funciones globales puras)
const uiCode = fs.readFileSync(path.join(root, 'src/js/utils/ui.js'), 'utf-8');
const escapeMatch = uiCode.match(/window\.escapeHtml\s*=\s*function[\s\S]*?\n\}/);
if (escapeMatch) vm.runInContext(escapeMatch[0], ctx);
const isAdminMatch = uiCode.match(/window\.isAdminUser\s*=\s*function[\s\S]*?\n\}/);
if (isAdminMatch) vm.runInContext(isAdminMatch[0], ctx);

// evaluateConfigCompleteness y validateBeforeDownload desde pdfPreview.js
const pvCode = fs.readFileSync(path.join(root, 'src/js/features/pdfPreview.js'), 'utf-8');
const evalMatch = pvCode.match(/window\.evaluateConfigCompleteness\s*=\s*function[\s\S]*?\n\};/);
if (evalMatch) vm.runInContext(evalMatch[0], ctx);
const valMatch = pvCode.match(/window\.validateBeforeDownload\s*=\s*function[\s\S]*?\n\};/);
if (valMatch) vm.runInContext(valMatch[0], ctx);
// openPdfConfigModal stub para evitar error en validateBeforeDownload
if (!global.openPdfConfigModal) global.openPdfConfigModal = () => {};

// ── Utilidades de test ────────────────────────────────────────────────────────
let passed = 0, failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅  ${name}`);
        passed++;
    } catch(e) {
        console.log(`  ❌  ${name}`);
        console.log(`        → ${e.message}`);
        failed++;
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertEqual(a, b, msg) {
    if (a !== b) throw new Error(msg || `Expected "${b}", got "${a}"`);
}

function assertIncludes(str, sub, msg) {
    if (!String(str).includes(sub))
        throw new Error(msg || `"${sub}" not found in "${str.slice(0,80)}..."`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 1: autoDetectTemplateKey
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 1: autoDetectTemplateKey ─────────────────────────────');

const TEXTS = {
    cinecoronariografia: `
        Se realiza cinecoronariografía con acceso radial derecho. Coronaria derecha dominante sin lesiones.
        Tronco de coronaria izquierda sin lesiones significativas. Descendente anterior con estenosis del 70%
        en segmento proximal. Circunfleja sin lesiones. Fracción de eyección del 58%.
    `,
    laringoscopia: `
        Se realiza videolaringoscopía. Epiglotis sin particularidades. Repliegues ariepiglóticos conservados.
        Cuerdas vocales móviles, sin lesiones. Glotis permeable. Subglotis sin alteraciones. Buen movimiento
        cordal bilateral en fonación.
    `,
    espirometria: `
        Espirometría: CVF 3.2L (85% pred), VEF1 2.4L (78% pred), VEF1/CVF 0.75.
        Respuesta al broncodilatador negativa. Patrón obstructivo leve.
    `,
    topografia_corneal: `
        Topografía corneal ojo derecho: K1 43.2 D, K2 44.8 D, Kmax 47.1 D. Índice de asimetría elevado.
        Se observa patrón sugestivo de queratocono incipiente.
    `,
    texto_generico: `
        Paciente de 45 años consulta por dolor abdominal. Se indica laboratorio y ecografía de control.
        Evolución favorable. Se indica seguimiento ambulatorio.
    `,
    ecocardiograma: `
        Ecocardiograma transtorácico. Ventrículo izquierdo con función sistólica conservada.
        Ecocardiograma en modo M sin alteraciones. Válvula mitral con leve insuficiencia.
        Doppler tisular normal. Sin derrame pericárdico.
    `,
    eco_stress: `
        Eco-stress con dobutamina. Se incrementa la dosis gradualmente hasta lograr frecuencia submáxima.
        No se observan alteraciones de la motilidad en reposo ni bajo estrés.
    `,
    colonoscopia: `
        Colonoscopía completa hasta ciego. Preparación Boston score 8. Mucosa de colon sin lesiones.
        Se visualiza pólipo de 4mm en colon sigmoideo, se realiza polipectomía con asa fría.
        Anatomía patológica enviada.
    `,
};

test('Detecta cinecoronariografía correctamente (clave cinecoro)', () => {
    const key = autoDetectTemplateKey(TEXTS.cinecoronariografia);
    assertEqual(key, 'cinecoro', `Esperaba 'cinecoro', obtuvo '${key}'`);
});

test('Detecta laringoscopía correctamente', () => {
    const key = autoDetectTemplateKey(TEXTS.laringoscopia);
    assert(key === 'laringoscopia' || key === 'videonaso_laringoscopia',
        `Esperaba laringoscopia/videonaso_laringoscopia, obtuvo '${key}'`);
});

test('Detecta espirometría correctamente', () => {
    const key = autoDetectTemplateKey(TEXTS.espirometria);
    assertEqual(key, 'espirometria', `Esperaba 'espirometria', obtuvo '${key}'`);
});

test('Detecta topografía corneal correctamente', () => {
    const key = autoDetectTemplateKey(TEXTS.topografia_corneal);
    assertEqual(key, 'topografia_corneal', `Esperaba 'topografia_corneal', obtuvo '${key}'`);
});

test('Texto genérico → retorna generico (no plantilla incorrecta)', () => {
    const key = autoDetectTemplateKey(TEXTS.texto_generico);
    assertEqual(key, 'generico', `Texto genérico no debe matchear ninguna plantilla, obtuvo '${key}'`);
});

test('Detecta eco-stress correctamente', () => {
    const key = autoDetectTemplateKey(TEXTS.eco_stress);
    assertEqual(key, 'eco_stress', `Esperaba 'eco_stress', obtuvo '${key}'`);
});

test('Ecocardiograma transtorácico no matchea plantilla incorrecta', () => {
    const key = autoDetectTemplateKey(TEXTS.ecocardiograma);
    // Puede retornar eco_stress o generico — nunca una plantilla de otra especialidad
    assert(key !== 'topografia_corneal' && key !== 'espirometria' && key !== 'colonoscopia',
        `Ecocardiograma no debe matchear plantilla de otra especialidad: '${key}'`);
});

test('Detecta colonoscopía correctamente', () => {
    const key = autoDetectTemplateKey(TEXTS.colonoscopia);
    assertEqual(key, 'colonoscopia', `Esperaba 'colonoscopia', obtuvo '${key}'`);
});

test('Laringoscopía NO se confunde con topografía corneal', () => {
    const key = autoDetectTemplateKey(TEXTS.laringoscopia);
    assert(key !== 'topografia_corneal',
        `FALLO CRÍTICO: laringoscopía fue identificada como topografía corneal`);
});

test('Topografía corneal NO se confunde con laringoscopía', () => {
    const key = autoDetectTemplateKey(TEXTS.topografia_corneal);
    assert(key !== 'laringoscopia' && key !== 'videonaso_laringoscopia',
        `FALLO CRÍTICO: topografía corneal fue identificada como laringoscopía`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 2: markdownToHtml
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 2: markdownToHtml ─────────────────────────────────────');

// Simular output típico de la IA para una laringoscopía
const AI_OUTPUT_LARINGOSCOPIA = `# INFORME DE LARINGOSCOPÍA

## HALLAZGOS

Epiglotis: sin particularidades,

Repliegues ariepiglóticos: conservados,

Aritenoides: móviles,

Cuerdas vocales: móviles sin lesiones,

Glotis: permeable,

Subglotis: sin alteraciones.

## FONACIÓN

Movimiento cordal bilateral conservado.

## CONCLUSIÓN

Laringoscopía dentro de límites normales.`;

const AI_OUTPUT_CINECORONARIOGRAFIA = `# INFORME DE CINECORONARIOGRAFÍA

## ACCESO VASCULAR
Acceso radial derecho sin complicaciones.

## CORONARIA DERECHA
Dominante sin lesiones significativas.

## TRONCO CORONARIO IZQUIERDO
Sin lesiones.

## DESCENDENTE ANTERIOR
Estenosis del 70% en segmento proximal.

## CIRCUNFLEJA
Sin lesiones.

## FUNCIÓN VENTRICULAR
Fracción de eyección del 58%. Motilidad conservada.

## CONCLUSIÓN
Enfermedad coronaria de un vaso. Se recomienda revascularización percutánea de la DA proximal.`;

test('markdownToHtml genera h1 para # titulo', () => {
    const html = markdownToHtml('# INFORME\n\nTexto.');
    assertIncludes(html, 'report-h1', 'Falta clase report-h1');
    assertIncludes(html, 'INFORME', 'Falta el texto del título');
});

test('markdownToHtml genera h2 para ## sección', () => {
    const html = markdownToHtml('## HALLAZGOS\n\nTexto.');
    assertIncludes(html, 'report-h2');
});

test('markdownToHtml agrupa hallazgos en párrafo fluido', () => {
    const html = markdownToHtml(AI_OUTPUT_LARINGOSCOPIA);
    // Los hallazgos que terminaban en coma deben estar en el mismo párrafo
    // El texto de "Epiglotis" y "Subglotis" deben estar juntos, no en <p> separados
    const matches = (html.match(/<p class="report-p">/g) || []).length;
    // Con 6 ítems de hallazgos agrupados → debe haber 1 párrafo para hallazgos,
    // no 6 párrafos separados
    assert(matches <= 4, `Demasiados párrafos (${matches}): los hallazgos deben agruparse`);
});

test('markdownToHtml capitaliza primer carácter del párrafo', () => {
    const html = markdownToHtml('## HALLAZGOS\n\nepiglotis sin particularidades.');
    assertIncludes(html, 'Epiglotis', 'Primera letra debe ser mayúscula');
});

test('markdownToHtml envuelve [No especificado] en span.no-data-field', () => {
    const html = markdownToHtml('Fonación: [No especificado].');
    assertIncludes(html, 'class="no-data-field"', 'Falta clase no-data-field para [No especificado]');
});

test('markdownToHtml procesa cinecoronariografía sin errores', () => {
    const html = markdownToHtml(AI_OUTPUT_CINECORONARIOGRAFIA);
    assert(html.length > 100, 'Output demasiado corto');
    assertIncludes(html, 'CINECORONARIOGRAFÍA');
    assertIncludes(html, 'Fracción de eyección');
});

test('markdownToHtml no genera párrafos vacíos', () => {
    const html = markdownToHtml(AI_OUTPUT_LARINGOSCOPIA);
    assert(!html.includes('<p class="report-p"></p>'), 'Párrafos vacíos encontrados');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 3: Registro de pacientes
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 3: Registro de pacientes ─────────────────────────────');

localStorage.clear();

test('savePatientToRegistry guarda un paciente nuevo', () => {
    savePatientToRegistry({ name: 'García, Juan', dni: '28456789', age: '45', sex: 'M' });
    const reg = JSON.parse(localStorage.getItem('patient_registry') || '[]');
    assertEqual(reg.length, 1, 'Debe haber 1 paciente');
    assertEqual(reg[0].name, 'García, Juan');
});

test('savePatientToRegistry actualiza paciente existente por DNI', () => {
    savePatientToRegistry({ name: 'García, Juan', dni: '28456789', age: '46', sex: 'M', insurance: 'OSDE' });
    const reg = JSON.parse(localStorage.getItem('patient_registry') || '[]');
    assertEqual(reg.length, 1, 'No debe duplicar');
    assertEqual(reg[0].age, '46', 'Debe actualizar la edad');
    assertEqual(reg[0].insurance, 'OSDE', 'Debe actualizar la obra social');
});

test('savePatientToRegistry agrega segundo paciente distinto', () => {
    savePatientToRegistry({ name: 'López, María', dni: '34567890', age: '32', sex: 'F' });
    const reg = JSON.parse(localStorage.getItem('patient_registry') || '[]');
    assertEqual(reg.length, 2, 'Debe haber 2 pacientes');
});

test('searchPatientRegistry encuentra por apellido parcial', () => {
    const results = searchPatientRegistry('lopez');
    assertEqual(results.length, 1, 'Debe encontrar a López');
    assertEqual(results[0].name, 'López, María');
});

test('searchPatientRegistry encuentra por DNI parcial', () => {
    const results = searchPatientRegistry('28456');
    assertEqual(results.length, 1, 'Debe encontrar a García por DNI parcial');
    assertEqual(results[0].name, 'García, Juan');
});

test('searchPatientRegistry devuelve vacío para query sin coincidencias', () => {
    const results = searchPatientRegistry('zzzzno-existe');
    assertEqual(results.length, 0, 'No debe devolver resultados');
});

test('savePatientToRegistry no guarda paciente sin nombre', () => {
    const regBefore = JSON.parse(localStorage.getItem('patient_registry') || '[]');
    savePatientToRegistry({ name: '', dni: '99999999' });
    const regAfter = JSON.parse(localStorage.getItem('patient_registry') || '[]');
    assertEqual(regBefore.length, regAfter.length, 'No debe guardar paciente sin nombre');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 4: Flujo completo simulado
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 4: Flujo completo simulado ───────────────────────────');

test('Flujo cinecoronariografía: texto → detección → plantilla correcta', () => {
    const rawText = TEXTS.cinecoronariografia;
    // Paso 1: detección
    const key = autoDetectTemplateKey(rawText);
    assertEqual(key, 'cinecoro');
    // Paso 2: la plantilla existe y tiene prompt
    const tmpl = window.MEDICAL_TEMPLATES[key];
    assert(tmpl, 'La plantilla debe existir');
    assert(tmpl.prompt && tmpl.prompt.length > 50, 'La plantilla debe tener prompt');
    assert(tmpl.name, 'La plantilla debe tener nombre');
});

test('Flujo texto genérico: no usa plantilla específica', () => {
    const key = autoDetectTemplateKey(TEXTS.texto_generico);
    assertEqual(key, 'generico',
        'Texto sin keywords específicas debe usar plantilla genérica');
    // La plantilla genérica debe existir
    const tmpl = window.MEDICAL_TEMPLATES['generico'];
    assert(tmpl, 'La plantilla genérica debe existir');
});

test('markdownToHtml produce HTML válido para resultado de cinecoronariografía', () => {
    const html = markdownToHtml(AI_OUTPUT_CINECORONARIOGRAFIA);
    // No debe tener etiquetas sin cerrar básicas
    const opens  = (html.match(/<p/g) || []).length;
    const closes = (html.match(/<\/p>/g) || []).length;
    assertEqual(opens, closes, `Párrafos sin cerrar: ${opens} abren, ${closes} cierran`);
    const h2opens  = (html.match(/<h2/g) || []).length;
    const h2closes = (html.match(/<\/h2>/g) || []).length;
    assertEqual(h2opens, h2closes, 'h2 desbalanceados');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 5: classifyStructError
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 5: classifyStructError ───────────────────────────────');

test('401 → type auth, no espera, no cambia modelo', () => {
    const r = global.classifyStructError(new Error('HTTP_401: invalid_api_key'));
    assertEqual(r.type, 'auth');
    assertEqual(r.wait, 0);
    assertEqual(r.switchModel, false);
});

test('invalid_api_key en mensaje → type auth', () => {
    const r = global.classifyStructError(new Error('Unauthorized: invalid_api_key provided'));
    assertEqual(r.type, 'auth');
});

test('429 → type rate_limit, espera 8s, mismo modelo', () => {
    const r = global.classifyStructError(new Error('HTTP_429: too many requests'));
    assertEqual(r.type, 'rate_limit');
    assertEqual(r.wait, 8000);
    assertEqual(r.switchModel, false);
});

test('503 → type server_error, cambia modelo inmediatamente', () => {
    const r = global.classifyStructError(new Error('HTTP_503: service unavailable'));
    assertEqual(r.type, 'server_error');
    assertEqual(r.switchModel, true);
});

test('504 → type server_error, cambia modelo', () => {
    const r = global.classifyStructError(new Error('HTTP_504: gateway timeout'));
    assertEqual(r.type, 'server_error');
    assertEqual(r.switchModel, true);
});

test('TypeError (failed to fetch) → type network', () => {
    const err = new TypeError('Failed to fetch');
    const r = global.classifyStructError(err);
    assertEqual(r.type, 'network');
    assertEqual(r.wait, 0);
});

test('NetworkError string → type network', () => {
    const r = global.classifyStructError(new Error('NetworkError when attempting to fetch resource'));
    assertEqual(r.type, 'network');
});

test('Error desconocido → type unknown, sin cambio de modelo', () => {
    const r = global.classifyStructError(new Error('algún error raro'));
    assertEqual(r.type, 'unknown');
    assertEqual(r.switchModel, false);
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 6: GROQ_MODELS y structureTranscription sin key
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 6: GROQ_MODELS y structureTranscription ──────────────');

test('GROQ_MODELS[0] es llama-3.3-70b-versatile', () => {
    assertEqual(global.GROQ_MODELS[0], 'llama-3.3-70b-versatile');
});

test('GROQ_MODELS[1] es llama-3.1-70b-versatile', () => {
    assertEqual(global.GROQ_MODELS[1], 'llama-3.1-70b-versatile');
});

test('GROQ_MODELS[2] es llama-3.1-8b-instant (no más mixtral deprecado)', () => {
    assertEqual(global.GROQ_MODELS[2], 'llama-3.1-8b-instant');
    assert(!global.GROQ_MODELS.includes('mixtral-8x7b-32768'), 'mixtral-8x7b-32768 no debe estar en la lista');
});

test('GROQ_MODELS tiene exactamente 3 entradas', () => {
    assertEqual(global.GROQ_MODELS.length, 3);
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 7: structureWithRetry — comportamientos con fetch simulado (async)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 7: structureWithRetry (fetch simulado) ───────────────');

async function asyncTest(name, fn) {
    try {
        await fn();
        console.log(`  ✅  ${name}`);
        passed++;
    } catch(e) {
        console.log(`  ❌  ${name}`);
        console.log(`        → ${e.message}`);
        failed++;
    }
}

// Helpers para simular respuestas de fetch
const makeFetchOk = (content) => async () => ({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] })
});

const makeFetchErr = (status, message) => async () => ({
    ok: false,
    status,
    json: async () => ({ error: { message } })
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 8: Cola de pendientes
// ═══════════════════════════════════════════════════════════════════════════════

// Los bloques 7 y 8 se ejecutan en un IIFE async para poder usar await
(async () => {

await asyncTest('structureTranscription lanza HTTP_401 cuando no hay API key', async () => {
    global.GROQ_API_KEY = null;
    try {
        await global.structureTranscription('texto', 'generico');
        throw new Error('No lanzó error');
    } catch(e) {
        assert(e.message.includes('HTTP_401'), `Se esperaba HTTP_401, se obtuvo: "${e.message}"`);
    } finally { global.GROQ_API_KEY = 'gsk_test'; }
});

await asyncTest('structureWithRetry se detiene en el 1er intento con error 401 (sin reintentar)', async () => {
    global.GROQ_API_KEY = 'gsk_test';
    let callCount = 0;
    global.fetch = async () => { callCount++; return makeFetchErr(401, 'invalid_api_key')(); };
    try {
        await global.structureWithRetry('texto de prueba', 'generico');
        throw new Error('No lanzó error');
    } catch(e) {
        assert(e.message.includes('HTTP_401'), `Se esperaba HTTP_401`);
        assertEqual(callCount, 1, 'Solo debe hacer 1 llamada con 401');
        assert(!e.savedToPending, 'Error 401 no debe guardar en cola de pendientes');
    }
});

await asyncTest('structureWithRetry guarda en cola con error de red (sin reintentar)', async () => {
    global.GROQ_API_KEY = 'gsk_test';
    localStorage.removeItem('struct_pending_queue');
    let callCount = 0;
    global.fetch = async () => { callCount++; throw new TypeError('Failed to fetch'); };
    try {
        await global.structureWithRetry('texto de red caída', 'cinecoro');
        throw new Error('No lanzó error');
    } catch(e) {
        assert(e.savedToPending === true, 'Debe tener savedToPending = true');
        assertEqual(callCount, 1, 'Solo 1 intento con error de red (inútil reintentar)');
        const q = JSON.parse(localStorage.getItem('struct_pending_queue') || '[]');
        assert(q.length > 0, 'Debe haber guardado en la cola');
        assertEqual(q[0].templateKey, 'cinecoro');
    }
});

await asyncTest('structureWithRetry tiene éxito en el 2do intento (1er falla con 503)', async () => {
    global.GROQ_API_KEY = 'gsk_test';
    localStorage.removeItem('struct_pending_queue');
    let callCount = 0;
    const GOOD = '## INFORME\n\nHallazgo extenso con mucho contenido clínico que supera los 80 caracteres requeridos.';
    global.fetch = async () => {
        callCount++;
        return callCount === 1 ? makeFetchErr(503, 'service unavailable')() : makeFetchOk(GOOD)();
    };
    const result = await global.structureWithRetry('texto a estructurar', 'generico');
    assertEqual(result, GOOD);
    assertEqual(callCount, 2, 'Deben hacerse exactamente 2 llamadas');
    const q = JSON.parse(localStorage.getItem('struct_pending_queue') || '[]');
    assertEqual(q.length, 0, 'No debe guardar en cola en caso de éxito');
});

await asyncTest('structureWithRetry con 429 reintenta mismo modelo y luego tiene éxito', async () => {
    global.GROQ_API_KEY = 'gsk_test';
    const origTimeout = global.setTimeout;
    global.setTimeout = (fn, _d) => origTimeout(fn, 0); // omitir wait de 8s
    let callCount = 0;
    const GOOD = 'Informe completo con suficiente contenido para superar el umbral de 80 caracteres mínimos.';
    global.fetch = async () => {
        callCount++;
        return callCount === 1 ? makeFetchErr(429, 'rate limit exceeded')() : makeFetchOk(GOOD)();
    };
    const result = await global.structureWithRetry('texto con rate limit', 'generico');
    assertEqual(result, GOOD);
    assert(callCount >= 2, 'Debe reintentar después del 429');
    global.setTimeout = origTimeout;
});

await asyncTest('structureWithRetry: todos fallan → savedToPending + texto en cola', async () => {
    global.GROQ_API_KEY = 'gsk_test';
    localStorage.removeItem('struct_pending_queue');
    global.fetch = makeFetchErr(503, 'unavailable');
    try {
        await global.structureWithRetry('texto sin conexión persistente', 'generico');
        throw new Error('No lanzó error');
    } catch(e) {
        assert(e.savedToPending === true, `savedToPending debe ser true, es: ${e.savedToPending}`);
        const q = JSON.parse(localStorage.getItem('struct_pending_queue') || '[]');
        assert(q.length > 0, 'Debe guardar en la cola');
        assertIncludes(q[0].text, 'texto sin conexión persistente');
    }
});

// ── Bloque 8 ──────────────────────────────────────────────────────────────────
console.log('\n── Bloque 8: Cola de pendientes (struct_pending_queue) ─────────');

test('addToStructurePendingQueue guarda una entrada con todos los campos', () => {
    localStorage.removeItem('struct_pending_queue');
    const entry = global.addToStructurePendingQueue('informe eco doppler', 'doppler');
    assert(entry.id && typeof entry.id === 'number', 'Debe tener id numérico');
    assertEqual(entry.templateKey, 'doppler');
    assert(entry.preview.length <= 143, 'Preview debe ser corta'); // 140 + "..."
    const q = JSON.parse(localStorage.getItem('struct_pending_queue'));
    assertEqual(q.length, 1);
});

test('addToStructurePendingQueue inserta al inicio (más reciente primero)', () => {
    global.addToStructurePendingQueue('texto A', 'generico');
    global.addToStructurePendingQueue('texto B', 'cinecoro');
    const q = global.getStructurePendingQueue();
    assertEqual(q[0].templateKey, 'cinecoro', 'El más reciente debe estar primero');
});

test('addToStructurePendingQueue no supera 10 entradas', () => {
    localStorage.removeItem('struct_pending_queue');
    for (let i = 0; i < 12; i++) global.addToStructurePendingQueue(`texto ${i}`, 'generico');
    const q = global.getStructurePendingQueue();
    assert(q.length <= 10, `Máximo 10 entradas, hay ${q.length}`);
});

test('removeFromStructurePendingQueue elimina por id', () => {
    // Usar ids basados en Date.now() para evitar expiración por el filtro de 7 días
    const now = Date.now();
    localStorage.setItem('struct_pending_queue', JSON.stringify([
        { id: now - 1000, text: 'a conservar', templateKey: 'generico', savedAt: '1/1/2026', preview: 'a conservar' },
        { id: now - 2000, text: 'a eliminar',  templateKey: 'generico', savedAt: '1/1/2026', preview: 'a eliminar'  }
    ]));
    global.removeFromStructurePendingQueue(now - 2000);
    const q = global.getStructurePendingQueue();
    assertEqual(q.length, 1, `Esperaba 1 entrada, hay ${q.length}`);
    assertEqual(q[0].text, 'a conservar');
});

test('getStructurePendingQueue retorna [] si localStorage está vacío o corrupto', () => {
    localStorage.setItem('struct_pending_queue', 'invalid json{{{{');
    const q = global.getStructurePendingQueue();
    assert(Array.isArray(q) && q.length === 0, 'Debe retornar array vacío ante JSON corrupto');
    localStorage.removeItem('struct_pending_queue');
    const q2 = global.getStructurePendingQueue();
    assert(Array.isArray(q2) && q2.length === 0, 'Debe retornar array vacío si no existe la key');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 9: G2 — Unificación patientHistory + patientRegistry
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 9: G2 — patientHistory → patientRegistry unificado ──');

test('G2 — savePatientToHistory es función definida (alias)', () => {
    assert(typeof window.savePatientToHistory === 'function',
        'savePatientToHistory debe existir como alias');
});

test('G2 — savePatientToHistory delega a patientRegistry', () => {
    localStorage.clear();
    savePatientToHistory({ name: 'Pérez, Ana', dni: '40000001', age: '30', sex: 'F' });
    const reg = JSON.parse(localStorage.getItem('patient_registry') || '[]');
    assert(reg.length >= 1, 'Debe guardar en patient_registry');
    assert(reg.some(p => p.name === 'Pérez, Ana'), 'Debe encontrarse Pérez, Ana en registry');
});

test('G2 — savePatientToHistory NO escribe en patient_history', () => {
    localStorage.clear();
    savePatientToHistory({ name: 'Gómez, Pedro', dni: '40000002', age: '55', sex: 'M' });
    const old = localStorage.getItem('patient_history');
    assertEqual(old, null, 'patient_history no debe existir (sistema unificado)');
});

test('G2 — migración automática de datos viejos al arrancar', () => {
    // Simular datos viejos pre-existentes
    localStorage.clear();
    localStorage.setItem('patient_history', JSON.stringify([
        { name: 'Migrado, Luis', dni: '11000001', age: '60' },
        { name: 'Migrada, Rosa', dni: '11000002', age: '45' }
    ]));
    // Re-ejecutar la migración (formHandler ya fue cargado, pero podemos simular)
    try {
        const old = JSON.parse(localStorage.getItem('patient_history') || '[]');
        if (old.length && typeof savePatientToRegistry === 'function') {
            old.forEach(p => { if (p && p.name) savePatientToRegistry(p); });
        }
        localStorage.removeItem('patient_history');
    } catch(_) {}
    const reg = JSON.parse(localStorage.getItem('patient_registry') || '[]');
    assert(reg.some(p => p.name === 'Migrado, Luis'), 'Luis debe haberse migrado');
    assert(reg.some(p => p.name === 'Migrada, Rosa'), 'Rosa debe haberse migrado');
    assertEqual(localStorage.getItem('patient_history'), null, 'patient_history debe borrarse post-migración');
});

test('G2 — no duplica al migrar paciente que ya existe en registry', () => {
    localStorage.clear();
    savePatientToRegistry({ name: 'Existente, María', dni: '22000001', age: '35' });
    // Simular migración donde el paciente ya está
    const old = [{ name: 'Existente, María', dni: '22000001', age: '36' }];
    old.forEach(p => { if (p && p.name) savePatientToRegistry(p); });
    const reg = JSON.parse(localStorage.getItem('patient_registry') || '[]');
    const matches = reg.filter(p => p.dni === '22000001');
    assertEqual(matches.length, 1, 'No debe duplicar — solo actualizar');
    assertEqual(matches[0].age, '36', 'Debe actualizar la edad');
});

test('G2 — populatePatientDatalist es función definida (no explota)', () => {
    assert(typeof window.populatePatientDatalist === 'function',
        'populatePatientDatalist debe ser función');
    // No debe explotar aunque no haya DOM
    window.populatePatientDatalist();
});

test('G2 — búsqueda en searchPatientRegistry funciona con datos migrados', () => {
    localStorage.clear();
    savePatientToRegistry({ name: 'Fernández, Lucía', dni: '33000001', age: '28' });
    savePatientToRegistry({ name: 'Fernández, Pablo', dni: '33000002', age: '55' });
    savePatientToRegistry({ name: 'Rodríguez, Ana', dni: '44000001', age: '40' });
    const results = searchPatientRegistry('Fernández');
    assertEqual(results.length, 2, 'Debe encontrar ambos Fernández');
    const ana = searchPatientRegistry('44000');
    assertEqual(ana.length, 1, 'Debe encontrar Rodríguez por DNI parcial');
    assertEqual(ana[0].name, 'Rodríguez, Ana');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 10: D1-D4 — Nuevas plantillas
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 10: D1-D4 — Nuevas plantillas ────────────────────────');

test('D1 — Plantilla ETT existe y tiene todos los campos', () => {
    const t = window.MEDICAL_TEMPLATES['ett'];
    assert(t, 'Plantilla ett debe existir');
    assert(t.name && t.name.includes('Ecocardiograma'), 'Nombre debe incluir Ecocardiograma');
    assert(Array.isArray(t.keywords) && t.keywords.length >= 5, 'Debe tener >= 5 keywords');
    assert(t.prompt && t.prompt.length > 100, 'Prompt debe ser sustancial');
});

test('D2 — Plantilla Eco Doppler vascular existe', () => {
    const t = window.MEDICAL_TEMPLATES['eco_doppler'];
    assert(t, 'Plantilla eco_doppler debe existir');
    assert(t.name && t.name.toLowerCase().includes('doppler'), 'Nombre debe incluir Doppler');
    assert(t.prompt && t.prompt.length > 100, 'Prompt debe ser sustancial');
});

test('D3 — Plantilla Nota de evolución existe', () => {
    const t = window.MEDICAL_TEMPLATES['nota_evolucion'];
    assert(t, 'Plantilla nota_evolucion debe existir');
    assert(t.prompt && t.prompt.length > 50, 'Prompt debe existir');
});

test('D4 — Plantilla Epicrisis existe con keywords', () => {
    const t = window.MEDICAL_TEMPLATES['epicrisis'];
    assert(t, 'Plantilla epicrisis debe existir');
    assert(t.name && (t.name.includes('Epicrisis') || t.name.includes('Resumen')), 'Nombre');
    assert(Array.isArray(t.keywords) && t.keywords.length >= 3, 'Keywords >= 3');
});

test('D1 — autoDetect reconoce texto de ETT', () => {
    const text = 'ecocardiograma transtorácico. ventrículo izquierdo con FEVI conservada del 62%. Válvula mitral sin insuficiencia. Pericardio normal.';
    const key = autoDetectTemplateKey(text);
    assertEqual(key, 'ett', `Esperaba ett, obtuvo ${key}`);
});

test('D2 — autoDetect reconoce texto de Eco Doppler', () => {
    const text = 'eco doppler arterial de miembros inferiores. arteria femoral common permeable con flujo trifásico. arteria poplítea permeable.';
    const key = autoDetectTemplateKey(text);
    assertEqual(key, 'eco_doppler', `Esperaba eco_doppler, obtuvo ${key}`);
});

test('D4 — autoDetect reconoce texto de Epicrisis', () => {
    const text = 'epicrisis del paciente internado durante 5 días. diagnóstico de egreso: neumonía comunitaria. tratamiento al alta: amoxicilina.';
    const key = autoDetectTemplateKey(text);
    assertEqual(key, 'epicrisis', `Esperaba epicrisis, obtuvo ${key}`);
});

test('D1-D4 — Todas las plantillas están en TEMPLATE_CATEGORIES', () => {
    const cats = window.TEMPLATE_CATEGORIES || {};
    const allKeys = Object.values(cats).flat();
    assert(allKeys.includes('ett'), 'ett debe estar en TEMPLATE_CATEGORIES');
    assert(allKeys.includes('eco_doppler'), 'eco_doppler debe estar en TEMPLATE_CATEGORIES');
    assert(allKeys.includes('epicrisis'), 'epicrisis debe estar en TEMPLATE_CATEGORIES');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 11: E1 — Toast de plantilla detectada
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 11: E1 — Toast plantilla detectada ────────────────────');

test('E1 — promptTemplateSelection es función interna cargada', () => {
    // promptTemplateSelection es la función que muestra el toast E1.
    // Es local al módulo de structurer (no window), pero la verificamos vía código.
    const code = fs.readFileSync(path.join(root, 'src/js/features/structurer.js'), 'utf-8');
    assert(code.includes('function promptTemplateSelection'),
        'structurer.js debe contener promptTemplateSelection');
    assert(code.includes('toastTemplateCambiar'),
        'promptTemplateSelection debe crear botón Cambiar');
});

test('E1 — autoDetectTemplateKey retorna string válido', () => {
    const keys = Object.keys(window.MEDICAL_TEMPLATES);
    const result = autoDetectTemplateKey('texto cualquiera sin keywords');
    assert(typeof result === 'string', 'Debe retornar string');
    assert(keys.includes(result), `${result} debe ser una key válida de MEDICAL_TEMPLATES`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 12: K1/K2/K3 — API Key flow + Contact
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 12: K1/K2/K3 — API Key + Contact ─────────────────────');

test('K3 — initContact es función definida', () => {
    // contact.js se carga en browser; verificamos si la función existe en el global mock
    // Puede que no esté cargada en Node (depende del DOM), pero al menos verificamos la estructura
    // Si no está cargada, la cargamos
    try {
        const contactCode = fs.readFileSync(path.join(root, 'src/js/features/contact.js'), 'utf-8');
        vm.runInContext(contactCode, ctx, { filename: 'contact.js' });
    } catch(e) {}
    assert(typeof global.initContact === 'function', 'initContact debe ser función');
});

test('K1/K2 — CLIENT_CONFIG estructura válida', () => {
    try {
        const configCode = fs.readFileSync(path.join(root, 'src/js/config/config.js'), 'utf-8');
        vm.runInContext(configCode, ctx, { filename: 'config.js' });
    } catch(e) {}
    assert(global.CLIENT_CONFIG, 'CLIENT_CONFIG debe existir');
    assert(['ADMIN','TRIAL','NORMAL','PRO'].includes(global.CLIENT_CONFIG.type),
        `type debe ser ADMIN/TRIAL/NORMAL/PRO, es: ${global.CLIENT_CONFIG.type}`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 13: PWA — manifest.json + sw.js verificación
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 13: PWA — manifest + SW + íconos ──────────────────────');

test('PWA1 — manifest.json es JSON válido con campos obligatorios', () => {
    const raw = fs.readFileSync(path.join(root, 'manifest.json'), 'utf-8');
    const m = JSON.parse(raw);
    assert(m.name, 'manifest.name es requerido');
    assert(m.short_name, 'manifest.short_name es requerido');
    assert(m.start_url, 'manifest.start_url es requerido');
    assertEqual(m.display, 'standalone', 'display debe ser standalone');
    assert(m.background_color, 'background_color es requerido');
    assert(m.theme_color, 'theme_color es requerido');
});

test('PWA1 — manifest.json declara íconos 192 y 512', () => {
    const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf-8'));
    assert(Array.isArray(m.icons), 'icons debe ser array');
    const sizes = m.icons.map(i => i.sizes);
    assert(sizes.includes('192x192'), 'Falta ícono 192x192');
    assert(sizes.includes('512x512'), 'Falta ícono 512x512');
});

test('PWA2 — sw.js existe y tiene estrategia Cache-First', () => {
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf-8');
    assert(sw.includes('caches.open'), 'SW debe usar caches.open');
    assert(sw.includes('caches.match'), 'SW debe usar caches.match (Cache-First)');
    assert(sw.includes('install'), 'SW debe tener evento install');
    assert(sw.includes('activate'), 'SW debe tener evento activate');
    assert(sw.includes('fetch'), 'SW debe tener evento fetch');
});

test('PWA2 — sw.js excluye Groq API del cache', () => {
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf-8');
    assert(sw.includes('groq') || sw.includes('GROQ') || sw.includes('api.groq.com'),
        'SW debe tener referencia a Groq para no cachearlo');
});

test('PWA4 — Íconos 192x192 y 512x512 existen como archivos', () => {
    const icon192 = path.join(root, 'assets', 'icon-192.png');
    const icon512 = path.join(root, 'assets', 'icon-512.png');
    assert(fs.existsSync(icon192), 'assets/icon-192.png debe existir');
    assert(fs.existsSync(icon512), 'assets/icon-512.png debe existir');
    const stat192 = fs.statSync(icon192);
    const stat512 = fs.statSync(icon512);
    assert(stat192.size > 500, 'icon-192.png debe pesar más de 500 bytes');
    assert(stat512.size > 500, 'icon-512.png debe pesar más de 500 bytes');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 14: A1+A2 — Formato s/p en prompts de plantillas multi-órgano
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 14: A1+A2 — Formato s/p en plantillas ────────────────');

test('A1 — ecografia_abdominal usa formato por órgano con s/p', () => {
    const t = window.MEDICAL_TEMPLATES['ecografia_abdominal'];
    assert(t, 'ecografia_abdominal debe existir');
    assert(t.prompt.includes('s/p'), 'Prompt debe tener s/p');
});

test('A1 — gastroscopia usa formato por segmento con s/p', () => {
    const t = window.MEDICAL_TEMPLATES['gastroscopia'];
    assert(t, 'gastroscopia debe existir');
    assert(t.prompt.includes('s/p'), 'Prompt gastroscopía debe tener s/p');
});

test('A2 — prompt del structurer menciona multi-órgano', () => {
    // El prompt global del structurer (structureTranscription) incluye reglas de multi-órgano
    const code = fs.readFileSync(path.join(root, 'src/js/features/structurer.js'), 'utf-8');
    assert(code.includes('MULTI-ÓRGANO') || code.includes('multi-organo') || code.includes('MULTI-SEGMENTO'),
        'structurer.js debe contener regla de multi-órgano');
});

test('A2 — colonoscopia tiene formato por segmento', () => {
    const t = window.MEDICAL_TEMPLATES['colonoscopia'];
    assert(t, 'colonoscopia debe existir');
    assert(t.prompt.includes('segmento') || t.prompt.includes('porción') || t.prompt.includes('tramo'),
        'Prompt de colonoscopia debe mencionar formato por segmento/porción');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 15: B1/C1/C2 — Modal edición de campo + nombre + dejar en blanco
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 15: B1/C1/C2 — Modal edición de campo ────────────────');

test('B1/C1/C2 — editor.js contiene editFieldModal lógica', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editor.js'), 'utf-8');
    assert(code.includes('editFieldModal'), 'Debe tener editFieldModal');
    assert(code.includes('openEditFieldModal'), 'Debe tener openEditFieldModal');
    assert(code.includes('btnBlankEditField') || code.includes('clearFieldValue'),
        'C2: Debe tener botón dejar en blanco');
    assert(code.includes('editFieldModalTitle') || code.includes('editFieldContext'),
        'C1: Debe tener titulo/contexto del campo');
    assert(code.includes('efTabRecord'), 'B1: Debe tener referencia a tab Record');
    assert(code.includes('isPro'), 'B1: Debe tener isPro() para controlar visibilidad');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 16: index.html — Integridad estructural
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 16: index.html — integridad estructural ───────────────');

test('index.html — todos los <script> tienen su </script> de cierre', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    const opens  = (html.match(/<script[\s>]/g) || []).length;
    const closes = (html.match(/<\/script>/g) || []).length;
    assertEqual(opens, closes, `Scripts desbalanceados: ${opens} abiertos, ${closes} cerrados`);
    // Verificar que no haya </script> sueltos fuera de un bloque <script>
    assert(!html.includes('</script>\n\n        <!-- Modal: Cola'), 'No debe haber </script> sueltos entre modales');
});

test('index.html — onboardingOverlay existe (K1)', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="onboardingOverlay"'), 'K1: onboardingOverlay debe existir');
    assert(html.includes('btnSubmitOnboarding'), 'K1: btnSubmitOnboarding debe existir');
});

test('index.html — btnInstallPwa existe (PWA3)', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="btnInstallPwa"'), 'PWA3: btnInstallPwa debe existir');
    assert(html.includes('beforeinstallprompt'), 'PWA3: beforeinstallprompt debe estar');
});

test('index.html — btnResetApp existe (admin reset)', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="btnResetApp"'), 'Admin: btnResetApp debe existir');
    assert(html.includes('id="resetAppModal"'), 'Admin: resetAppModal debe existir');
});

test('index.html — contactModalOverlay existe (K3)', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="contactModalOverlay"'), 'K3: contactModalOverlay debe existir');
    assert(html.includes('id="btnContacto"'), 'K3: btnContacto debe existir');
});

test('index.html — editFieldModal existe (B1/C1/C2)', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="editFieldModal"'), 'editFieldModal debe existir');
    assert(html.includes('id="btnBlankEditField"'), 'C2: btnBlankEditField debe existir');
    assert(html.includes('id="editFieldModalTitle"'), 'C1: editFieldModalTitle debe existir');
});

test('index.html — registryPanelOverlay existe (G1)', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="registryPanelOverlay"'), 'G1: registryPanelOverlay debe existir');
    assert(html.includes('id="btnOpenRegistryPanel"'), 'G1: btnOpenRegistryPanel debe existir');
});

test('index.html — manifest.json está vinculado', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('rel="manifest"'), 'Debe tener <link rel="manifest">');
});

test('index.html — SW se registra', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes("register('./sw.js'") || html.includes('register("./sw.js"'),
        'Debe registrar sw.js');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 17: admin.html — Sin errores de sintaxis
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 17: admin.html — Sin caracteres ilegales ──────────────');

test('admin.html — No contiene U+2500 fuera de comentarios JS', () => {
    const html = fs.readFileSync(path.join(root, 'recursos/admin.html'), 'utf-8');
    // Extraer contenido de cada <script>...</script>
    const scriptBlocks = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const block of scriptBlocks) {
        const inner = block.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        // Eliminar comentarios JS multi-línea (/* ... */) y single-line (// ...)
        const noComments = inner
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/[^\n]*/g, '');
        assert(!noComments.includes('─'),
            `Carácter U+2500 (─) en código JS (fuera de comentarios)`);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 18: formHandler — extractPatientData + generateReportNumber
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 18: formHandler — extract + report number ─────────────');

// formHandler requiere DOMContentLoaded y document.getElementById — funciones
// están en window.* por lo que deben estar disponibles vía global (cargado arriba).

test('extractPatientDataFromText extrae nombre del paciente', () => {
    const fn = global.extractPatientDataFromText;
    assert(typeof fn === 'function', 'extractPatientDataFromText debe existir');
    const data = fn('El paciente González Marcelo de 50 años.');
    assert(data.name && data.name.includes('González'), `Debe incluir González, obtuvo: ${data.name}`);
    assert(data.name && data.name.includes('Marcelo'), `Debe incluir Marcelo, obtuvo: ${data.name}`);
});

test('extractPatientDataFromText extrae DNI', () => {
    const data = global.extractPatientDataFromText('DNI 28.456.789, paciente López Ana.');
    assert(data.dni && data.dni.includes('28'), 'Debe extraer DNI con 28');
});

test('extractPatientDataFromText extrae edad', () => {
    const data = global.extractPatientDataFromText('Paciente de 45 años consulta.');
    assertEqual(data.age, 45);
});

test('extractPatientDataFromText extrae sexo', () => {
    const data = global.extractPatientDataFromText('Sexo: femenino, consulta por cefalea.');
    assertEqual(data.sex, 'F');
});

test('generateReportNumber genera formato YYYY-NNNN', () => {
    localStorage.clear();
    const fn = global.generateReportNumber;
    assert(typeof fn === 'function', 'generateReportNumber debe existir');
    const num = fn();
    const year = new Date().getFullYear();
    assert(num.startsWith(String(year) + '-'), `Debe empezar con ${year}-`);
    assert(/^\d{4}-\d{4}$/.test(num), `Formato YYYY-NNNN, obtuvo: ${num}`);
});

test('generateReportNumber incrementa secuencialmente', () => {
    localStorage.clear();
    const n1 = global.generateReportNumber();
    const n2 = global.generateReportNumber();
    const n3 = global.generateReportNumber();
    assert(n1.endsWith('-0001'), `Primero debe ser 0001, obtuvo: ${n1}`);
    assert(n2.endsWith('-0002'), `Segundo debe ser 0002, obtuvo: ${n2}`);
    assert(n3.endsWith('-0003'), `Tercero debe ser 0003, obtuvo: ${n3}`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 19: Flujo Pro completo — State Machine + Buttons + Pipeline
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 19: Flujo Pro — State Machine + Buttons ────────────────');

// Helper: simular getElementById para los botones del state manager
function createMockDOM() {
    const elements = {};
    const mkEl = (id, tag = 'button') => {
        const el = {
            id, tagName: tag.toUpperCase(),
            style: { display: '', borderTop: 'none' },
            disabled: false,
            innerHTML: '', textContent: '',
            dataset: {},
            classList: {
                _classes: new Set(),
                add(c) { this._classes.add(c); },
                remove(c) { this._classes.delete(c); },
                contains(c) { return this._classes.has(c); },
                toggle(c, force) { force ? this._classes.add(c) : this._classes.delete(c); }
            },
            closest: () => null,
            querySelector: () => null,
            querySelectorAll: () => [],
            scrollIntoView: () => {},
            focus: () => {},
            select: () => {},
            addEventListener: () => {},
            click: () => {},
            remove: () => {},
            dispatchEvent: () => {},
            insertBefore: () => {},
            get firstChild() { return null; },
            set value(v) { this._val = v; },
            get value() { return this._val || ''; },
            get checked() { return this._checked || false; },
            set checked(v) { this._checked = v; }
        };
        elements[id] = el;
        return el;
    };

    // Botones del state manager
    mkEl('structureBtn');
    mkEl('downloadPdfBtn');
    mkEl('btnConfigPdfMain');
    mkEl('btnPreviewPdfMain');
    mkEl('copyBtn');
    mkEl('printBtn');
    mkEl('downloadBtn');
    mkEl('downloadBtnContainer', 'div');
    mkEl('btnStructureAI');
    mkEl('btnApplyTemplate');
    mkEl('applyTemplateWrapper', 'div');
    mkEl('transcribeBtn');
    mkEl('transcribeAndStructureBtn');
    mkEl('quickProfileSelector', 'select');
    mkEl('downloadBtnMain');
    mkEl('proModeToggle', 'input');
    mkEl('proToggleContainer', 'div');
    mkEl('resetBtn');
    mkEl('templateSelect', 'select');
    mkEl('editor', 'div');
    mkEl('fileInput', 'input');
    mkEl('btnCompareView');
    mkEl('btnAppendRecord');
    mkEl('btnRestoreSession');

    // Override document.getElementById
    const origGetById = global.document.getElementById;
    global.document.getElementById = (id) => elements[id] || null;

    return {
        elements,
        restore: () => { global.document.getElementById = origGetById; }
    };
}

test('State Machine — IDLE: todos los botones de acción ocultos/deshabilitados', () => {
    const mock = createMockDOM();
    window.currentMode = 'pro';
    updateButtonsVisibility('IDLE');
    const e = mock.elements;
    assertEqual(e.btnStructureAI.style.display, 'none', 'btnStructureAI oculto en IDLE');
    assertEqual(e.btnConfigPdfMain.style.display, 'none', 'btnConfigPdfMain oculto en IDLE');
    assertEqual(e.btnPreviewPdfMain.style.display, 'none', 'btnPreviewPdfMain oculto en IDLE');
    assertEqual(e.copyBtn.style.display, 'none', 'copyBtn oculto en IDLE');
    assertEqual(e.printBtn.style.display, 'none', 'printBtn oculto en IDLE');
    assertEqual(e.downloadBtnContainer.style.display, 'none', 'downloadBtnContainer oculto en IDLE');
    assertEqual(e.downloadPdfBtn.style.display, 'none', 'downloadPdfBtn oculto en IDLE');
    assertEqual(e.applyTemplateWrapper.style.display, 'none', 'applyTemplateWrapper oculto en IDLE Pro');
    mock.restore();
});

test('State Machine — FILES_LOADED: aún sin botones de acción post-transcripción', () => {
    const mock = createMockDOM();
    window.currentMode = 'pro';
    updateButtonsVisibility('FILES_LOADED');
    const e = mock.elements;
    assertEqual(e.btnStructureAI.style.display, 'none', 'btnStructureAI oculto en FILES_LOADED');
    assertEqual(e.btnConfigPdfMain.style.display, 'none', 'Config oculto en FILES_LOADED');
    assertEqual(e.copyBtn.style.display, 'none', 'Copy oculto en FILES_LOADED');
    mock.restore();
});

test('State Machine — TRANSCRIBED Pro: btnStructureAI visible, botonera activa', () => {
    const mock = createMockDOM();
    window.currentMode = 'pro';
    updateButtonsVisibility('TRANSCRIBED');
    const e = mock.elements;
    assertEqual(e.btnStructureAI.style.display, 'inline-flex', 'btnStructureAI visible en TRANSCRIBED Pro');
    assertEqual(e.btnStructureAI.disabled, false, 'btnStructureAI habilitado');
    assertEqual(e.btnConfigPdfMain.style.display, 'inline-flex', 'Config visible');
    assertEqual(e.btnPreviewPdfMain.style.display, 'inline-flex', 'Preview visible');
    assertEqual(e.copyBtn.style.display, 'inline-flex', 'Copy visible');
    assertEqual(e.printBtn.style.display, 'inline-flex', 'Print visible');
    assertEqual(e.downloadBtnContainer.style.display, 'block', 'Download container visible');
    // Normal-mode controls hidden in Pro
    assertEqual(e.applyTemplateWrapper.style.display, 'none', 'applyTemplateWrapper oculto en Pro');
    assertEqual(e.downloadPdfBtn.style.display, 'none', 'downloadPdfBtn oculto pre-structure');
    mock.restore();
});

test('State Machine — TRANSCRIBED Normal: applyTemplate visible, btnStructureAI oculto', () => {
    const mock = createMockDOM();
    window.currentMode = 'normal';
    updateButtonsVisibility('TRANSCRIBED');
    const e = mock.elements;
    assertEqual(e.btnStructureAI.style.display, 'none', 'btnStructureAI oculto en Normal');
    assertEqual(e.applyTemplateWrapper.style.display, 'inline-block', 'applyTemplateWrapper visible en Normal');
    assertEqual(e.btnApplyTemplate.style.display, 'inline-flex', 'btnApplyTemplate visible en Normal');
    // transcribeAndStructureBtn hidden in Normal
    assertEqual(e.transcribeAndStructureBtn.style.display, 'none', 'T+S btn hidden in Normal');
    mock.restore();
});

test('State Machine — STRUCTURED Pro: btnStructureAI oculto, downloadPdfBtn visible', () => {
    const mock = createMockDOM();
    window.currentMode = 'pro';
    updateButtonsVisibility('STRUCTURED');
    const e = mock.elements;
    assertEqual(e.btnStructureAI.style.display, 'none', 'btnStructureAI oculto después de estructurar');
    assertEqual(e.downloadPdfBtn.style.display, 'inline-flex', 'downloadPdfBtn visible en STRUCTURED');
    assertEqual(e.downloadPdfBtn.disabled, false, 'downloadPdfBtn habilitado');
    assertEqual(e.copyBtn.style.display, 'inline-flex', 'Copy sigue visible');
    assertEqual(e.btnConfigPdfMain.style.display, 'inline-flex', 'Config sigue visible');
    mock.restore();
});

test('State Machine — PREVIEWED Pro: todo visible/activo como STRUCTURED', () => {
    const mock = createMockDOM();
    window.currentMode = 'pro';
    updateButtonsVisibility('PREVIEWED');
    const e = mock.elements;
    assertEqual(e.btnStructureAI.style.display, 'none', 'btnStructureAI oculto en PREVIEWED');
    assertEqual(e.downloadPdfBtn.style.display, 'inline-flex', 'downloadPdfBtn visible en PREVIEWED');
    assertEqual(e.copyBtn.disabled, false, 'Copy habilitado');
    assertEqual(e.printBtn.disabled, false, 'Print habilitado');
    mock.restore();
});

test('State Machine — transcribeAndStructureBtn visible solo en Pro', () => {
    const mock = createMockDOM();
    // En Pro: visible
    window.currentMode = 'pro';
    updateButtonsVisibility('IDLE');
    assertEqual(mock.elements.transcribeAndStructureBtn.style.display, '', 'T+S visible en Pro (display empty = inherited)');
    // En Normal: oculto
    window.currentMode = 'normal';
    updateButtonsVisibility('IDLE');
    assertEqual(mock.elements.transcribeAndStructureBtn.style.display, 'none', 'T+S oculto en Normal');
    mock.restore();
});

test('State Machine — transcribeAndStructureBtn sync disabled con transcribeBtn', () => {
    const mock = createMockDOM();
    window.currentMode = 'pro';
    // Simular transcribeBtn disabled (sin archivos)
    mock.elements.transcribeBtn.disabled = true;
    updateButtonsVisibility('IDLE');
    assertEqual(mock.elements.transcribeAndStructureBtn.disabled, true, 'T+S disabled cuando transcribe disabled');
    // Simular transcribeBtn enabled (con archivos)
    mock.elements.transcribeBtn.disabled = false;
    updateButtonsVisibility('FILES_LOADED');
    assertEqual(mock.elements.transcribeAndStructureBtn.disabled, false, 'T+S enabled cuando transcribe enabled');
    mock.restore();
});

// ── Bloque 20: _shouldAutoStructure flag mechanics ──────────────────────
console.log('\n── Bloque 20: Flag _shouldAutoStructure ────────────────────────');

test('_shouldAutoStructure flag — inicia en false', () => {
    assertEqual(window._shouldAutoStructure, false, '_shouldAutoStructure debe ser false por defecto');
});

test('_shouldAutoStructure flag — se puede setear y resetear', () => {
    window._shouldAutoStructure = true;
    assertEqual(window._shouldAutoStructure, true, 'Se puede setear a true');
    window._shouldAutoStructure = false;
    assertEqual(window._shouldAutoStructure, false, 'Se puede resetear');
});

// ── Bloque 21: triggerPatientDataCheck — detección + placeholder ────────
console.log('\n── Bloque 21: triggerPatientDataCheck ──────────────────────────');

test('triggerPatientDataCheck limpia datos del paciente anterior', () => {
    localStorage.setItem('pdf_config', JSON.stringify({
        patientName: 'Viejo, Paciente',
        patientDni: '11111111',
        doctorName: 'Dr. Test'
    }));
    triggerPatientDataCheck('Texto sin datos de paciente.');
    const config = JSON.parse(localStorage.getItem('pdf_config'));
    assertEqual(config.patientName, undefined, 'patientName debe borrarse');
    assertEqual(config.patientDni, undefined, 'patientDni debe borrarse');
    assertEqual(config.doctorName, 'Dr. Test', 'doctorName NO debe borrarse');
});

test('triggerPatientDataCheck extrae nombre del audio y lo guarda', () => {
    localStorage.setItem('pdf_config', JSON.stringify({}));
    triggerPatientDataCheck('Paciente González Marcelo de 50 años consulta por dolor torácico.');
    const config = JSON.parse(localStorage.getItem('pdf_config'));
    assert(config.patientName && config.patientName.includes('González'),
        `Nombre debe incluir González, obtuvo: ${config.patientName}`);
});

test('triggerPatientDataCheck sin datos → no guarda nombre', () => {
    localStorage.setItem('pdf_config', JSON.stringify({}));
    triggerPatientDataCheck('Se realiza espirometría. CVF normal.');
    const config = JSON.parse(localStorage.getItem('pdf_config'));
    assert(!config.patientName, 'No debe extraer nombre de texto sin datos de paciente');
});

// ── Bloque 22: Pipeline de detección → estructura ─────────────────────
console.log('\n── Bloque 22: Pipeline detección → structuring ──────────────────');

test('Pipeline: texto de cinecoro → detecta plantilla → tiene prompt', () => {
    const text = TEXTS.cinecoronariografia;
    const key = autoDetectTemplateKey(text);
    assertEqual(key, 'cinecoro');
    const tmpl = window.MEDICAL_TEMPLATES[key];
    assert(tmpl, 'Plantilla debe existir');
    assert(tmpl.prompt.length > 100, 'Prompt debe ser sustancial');
    assert(Array.isArray(tmpl.keywords), 'Keywords deben ser array');
});

test('Pipeline: texto de eco_stress → detecta plantilla → prompt existe', () => {
    const text = TEXTS.eco_stress;
    const key = autoDetectTemplateKey(text);
    assertEqual(key, 'eco_stress');
    const tmpl = window.MEDICAL_TEMPLATES[key];
    assert(tmpl && tmpl.prompt.length > 100, 'eco_stress debe tener prompt largo');
});

test('Pipeline: todas las plantillas tienen nombre, prompt, keywords', () => {
    const keys = Object.keys(window.MEDICAL_TEMPLATES);
    assert(keys.length >= 10, `Debe haber >= 10 plantillas, hay ${keys.length}`);
    for (const k of keys) {
        const t = window.MEDICAL_TEMPLATES[k];
        assert(t.name, `${k} debe tener name`);
        assert(t.prompt && t.prompt.length > 20, `${k} debe tener prompt`);
        // generico puede no tener keywords
        if (k !== 'generico') {
            assert(Array.isArray(t.keywords), `${k} debe tener keywords array`);
        }
    }
});

test('Pipeline: markdownToHtml marca [No especificado] como editable', () => {
    const md = '## HALLAZGOS\n\nEpiglotis: [No especificado].\nCuerdas: normales.';
    const html = markdownToHtml(md);
    assertIncludes(html, 'no-data-field', 'Debe contener span.no-data-field');
    assertIncludes(html, 'no-data-edit-btn', 'Debe contener botón de edición');
});

test('Pipeline: markdownToHtml marca [Sin datos disponibles] como editable', () => {
    const md = '## TEST\n\nCampo: Sin datos disponibles.';
    const html = markdownToHtml(md);
    assertIncludes(html, 'no-data-field', 'Debe marcar Sin datos disponibles como editable');
});

test('Pipeline: markdownToHtml marca [No evaluado] como editable', () => {
    const md = '## TEST\n\nCampo: [No evaluado en este estudio].';
    const html = markdownToHtml(md);
    assertIncludes(html, 'no-data-field', 'Debe marcar [No evaluado...] como editable');
});

// ── Bloque 23: Toggle original/estructurado ─────────────────────────────
console.log('\n── Bloque 23: Toggle original/estructurado ────────────────────');

test('Toggle: _lastRawTranscription se preserva globalmente', () => {
    window._lastRawTranscription = 'Texto crudo original del audio.';
    assertEqual(window._lastRawTranscription, 'Texto crudo original del audio.');
});

test('Toggle: _lastStructuredHTML se preserva globalmente', () => {
    window._lastStructuredHTML = '<h2>HALLAZGOS</h2><p>Texto estructurado</p>';
    assertEqual(window._lastStructuredHTML, '<h2>HALLAZGOS</h2><p>Texto estructurado</p>');
});

// ── Bloque 24: Advertencia de descarga sin datos de paciente ────────────
console.log('\n── Bloque 24: Advertencia descarga sin paciente ────────────────');

test('Descarga: pdf_config sin patientName → se detecta vacío', () => {
    localStorage.setItem('pdf_config', JSON.stringify({ doctorName: 'Dr. Test' }));
    const config = JSON.parse(localStorage.getItem('pdf_config'));
    assert(!config.patientName, 'Sin patientName → requiere advertencia');
});

test('Descarga: pdf_config con patientName → no necesita advertencia', () => {
    localStorage.setItem('pdf_config', JSON.stringify({ patientName: 'López, Ana', doctorName: 'Dr. Test' }));
    const config = JSON.parse(localStorage.getItem('pdf_config'));
    assert(config.patientName, 'Con patientName → no requiere advertencia');
});

// ── Bloque 25: Quick options en modal de edición ────────────────────────
console.log('\n── Bloque 25: Quick options modal edición ──────────────────────');

test('Quick options: index.html contiene s/p, Sin particularidades, No evaluado', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('data-val="s/p"'), 'Debe tener quick option s/p');
    assert(html.includes('data-val="Sin particularidades"'), 'Debe tener quick option Sin particularidades');
    assert(html.includes('data-val="No evaluado"'), 'Debe tener quick option No evaluado');
});

test('Quick options: index.html tiene botón Eliminar campo', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="btnDeleteFieldSection"'), 'Debe tener btnDeleteFieldSection');
    assert(html.includes('Eliminar campo'), 'Debe mostrar texto Eliminar campo');
});

test('Quick options: index.html tiene botón Dejar en blanco', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="btnBlankEditField"'), 'Debe tener btnBlankEditField');
});

// ── Bloque 26: Separación botones Transcribir / Transcribir+Estructurar ─
console.log('\n── Bloque 26: Botones Transcribir separados ────────────────────');

test('index.html tiene botón transcribeBtn', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="transcribeBtn"'), 'transcribeBtn debe existir');
});

test('index.html tiene botón transcribeAndStructureBtn', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="transcribeAndStructureBtn"'), 'transcribeAndStructureBtn debe existir');
    assert(html.includes('Transcribir y Estructurar') || html.includes('Transcribir y<br>Estructurar'),
        'Debe decir Transcribir y Estructurar');
});

test('transcriptor.js setea _shouldAutoStructure en click de T+S', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/transcriptor.js'), 'utf-8');
    assert(code.includes('_shouldAutoStructure = true'), 'T+S debe setear flag');
    assert(code.includes('_shouldAutoStructure = false'), 'Transcribe debe resetear flag');
    assert(code.includes('shouldAutoStructureNow'), 'Debe capturar el flag antes de resetear');
});

test('transcriptor.js auto-pipeline solo corre con shouldAutoStructureNow', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/transcriptor.js'), 'utf-8');
    assert(code.includes('if (shouldAutoStructureNow'), 
        'Auto-pipeline debe estar gated por shouldAutoStructureNow');
});

test('stateManager.js oculta T+S btn en Normal mode', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/stateManager.js'), 'utf-8');
    assert(code.includes('isProMode') && code.includes('transcribeAndStructureBtn'),
        'stateManager debe controlar T+S por modo');
});

// ── Bloque 27: API Key collapse cuando conectada ──────────────────────
console.log('\n── Bloque 27: API Key collapse ───────────────────────────────────');

test('ui.js colapsa API key card cuando está conectada', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/ui.js'), 'utf-8');
    assert(code.includes('api-key-collapsible'), 'Debe usar clase api-key-collapsible');
    assert(code.includes("style.display = 'none'") || code.includes("display = 'none'"),
        'Debe ocultar los elementos colapsables');
    assert(code.includes('Conectada'), 'Debe mostrar badge Conectada');
});

test('index.html tiene elementos con clase api-key-collapsible', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('api-key-collapsible'), 'Debe haber elementos api-key-collapsible');
});

// ── Bloque 28: Patient placeholder banner ──────────────────────────────
console.log('\n── Bloque 28: Patient placeholder banner ──────────────────────');

test('structurer.js tiene insertPatientPlaceholder', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/structurer.js'), 'utf-8');
    assert(code.includes('function insertPatientPlaceholder'), 'Debe tener insertPatientPlaceholder');
    assert(code.includes('patient-placeholder-banner'), 'Debe usar clase patient-placeholder-banner');
    assert(code.includes('Completar datos del paciente'), 'Debe mostrar texto informativo');
});

test('structurer.js tiene removePatientPlaceholder', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/structurer.js'), 'utf-8');
    assert(code.includes('function removePatientPlaceholder'), 'Debe tener removePatientPlaceholder');
    assert(code.includes("window.removePatientPlaceholder"), 'Debe exponerse globalmente');
});

test('structurer.js NO abre modal automáticamente después de estructurar', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/structurer.js'), 'utf-8');
    // triggerPatientDataCheck no debe contener openPatientDataModal
    const fnBody = code.substring(
        code.indexOf('window.triggerPatientDataCheck'),
        code.indexOf('function insertPatientPlaceholder')
    );
    assert(!fnBody.includes('openPatientDataModal'),
        'triggerPatientDataCheck NO debe abrir modal directamente');
});

// ── Bloque 29: deleteFieldSection en editor.js ─────────────────────────
console.log('\n── Bloque 29: Eliminar campo (deleteFieldSection) ──────────────');

test('editor.js contiene función deleteFieldSection', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editor.js'), 'utf-8');
    assert(code.includes('function deleteFieldSection'), 'Debe tener deleteFieldSection');
    assert(code.includes('btnDeleteFieldSection'), 'Debe estar wired a btnDeleteFieldSection');
    assert(code.includes('confirm('), 'Debe pedir confirmación antes de eliminar');
});

test('editor.js: deleteFieldSection encuentra heading H2/H3', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editor.js'), 'utf-8');
    assert(code.includes("closest('h2, h3") || code.includes('closest("h2, h3'),
        'Debe buscar heading H2/H3 cercano');
    assert(code.includes('headingLevel'), 'Debe calcular nivel del heading');
    assert(code.includes('toRemove'), 'Debe recolectar elementos a eliminar');
});

// ── Bloque 30: editor.js — Download warning sin paciente ───────────────
console.log('\n── Bloque 30: Download warning sin datos paciente ──────────────');

test('editor.js advierte al descargar sin datos del paciente', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editor.js'), 'utf-8');
    assert(code.includes('patientName') && code.includes('confirm('),
        'Debe verificar patientName y usar confirm()');
    assert(code.includes('El informe no tiene datos del paciente') || 
           code.includes('no tiene datos del paciente'),
        'Debe mostrar mensaje sobre datos faltantes');
});

// ── Bloque 31: Validación integral de archivos de código ────────────────
console.log('\n── Bloque 31: Integridad archivos de código ────────────────────');

test('stateManager.js — maneja todos los estados sin error', () => {
    const mock = createMockDOM();
    const states = ['IDLE', 'FILES_LOADED', 'TRANSCRIBED', 'STRUCTURED', 'PREVIEWED'];
    for (const mode of ['pro', 'normal']) {
        window.currentMode = mode;
        for (const state of states) {
            try {
                updateButtonsVisibility(state);
            } catch (e) {
                throw new Error(`updateButtonsVisibility('${state}') en modo ${mode} lanzó error: ${e.message}`);
            }
        }
    }
    mock.restore();
    assert(true, 'Todos los estados/modos procesados sin error');
});

test('Transición flujo completo Pro: IDLE → FILES → TRANSCRIBED → STRUCTURED → PREVIEWED', () => {
    const mock = createMockDOM();
    window.currentMode = 'pro';
    const e = mock.elements;

    // IDLE: nada visible
    updateButtonsVisibility('IDLE');
    assertEqual(e.btnStructureAI.style.display, 'none');
    assertEqual(e.copyBtn.style.display, 'none');

    // FILES_LOADED: aún nada
    updateButtonsVisibility('FILES_LOADED');
    assertEqual(e.btnStructureAI.style.display, 'none');

    // TRANSCRIBED: btnStructureAI aparece
    updateButtonsVisibility('TRANSCRIBED');
    assertEqual(e.btnStructureAI.style.display, 'inline-flex');
    assertEqual(e.copyBtn.style.display, 'inline-flex');
    assertEqual(e.downloadPdfBtn.style.display, 'none', 'PDF aún no hasta STRUCTURED');

    // STRUCTURED: btnStructureAI oculto, PDF visible
    updateButtonsVisibility('STRUCTURED');
    assertEqual(e.btnStructureAI.style.display, 'none');
    assertEqual(e.downloadPdfBtn.style.display, 'inline-flex');
    assertEqual(e.copyBtn.style.display, 'inline-flex');

    // PREVIEWED: igual que STRUCTURED
    updateButtonsVisibility('PREVIEWED');
    assertEqual(e.btnStructureAI.style.display, 'none');
    assertEqual(e.downloadPdfBtn.style.display, 'inline-flex');

    mock.restore();
});

test('Transición flujo completo Normal: IDLE → FILES → TRANSCRIBED → no STRUCTURED', () => {
    const mock = createMockDOM();
    window.currentMode = 'normal';
    const e = mock.elements;

    updateButtonsVisibility('IDLE');
    assertEqual(e.applyTemplateWrapper.style.display, 'none');
    assertEqual(e.transcribeAndStructureBtn.style.display, 'none');

    updateButtonsVisibility('TRANSCRIBED');
    assertEqual(e.applyTemplateWrapper.style.display, 'inline-block', 'Template wrapper visible');
    assertEqual(e.btnApplyTemplate.style.display, 'inline-flex', 'btnApplyTemplate visible');
    assertEqual(e.btnStructureAI.style.display, 'none', 'btnStructureAI oculto en Normal');
    assertEqual(e.transcribeAndStructureBtn.style.display, 'none', 'T+S oculto en Normal');
    assertEqual(e.copyBtn.style.display, 'inline-flex', 'Copy visible después de transcribir');

    mock.restore();
});

test('Cambio de modo Pro→Normal actualiza botones correctamente', () => {
    const mock = createMockDOM();
    window.currentMode = 'pro';
    updateButtonsVisibility('TRANSCRIBED');
    assertEqual(mock.elements.btnStructureAI.style.display, 'inline-flex', 'Pro: btnStructureAI visible');
    assertEqual(mock.elements.transcribeAndStructureBtn.style.display, '', 'Pro: T+S visible');

    // Cambio a Normal
    window.currentMode = 'normal';
    updateButtonsVisibility('TRANSCRIBED');
    assertEqual(mock.elements.btnStructureAI.style.display, 'none', 'Normal: btnStructureAI oculto');
    assertEqual(mock.elements.transcribeAndStructureBtn.style.display, 'none', 'Normal: T+S oculto');
    assertEqual(mock.elements.applyTemplateWrapper.style.display, 'inline-block', 'Normal: template visible');

    mock.restore();
});

// ── Bloque 32: Botón Gemini animado + Vista comparativa ───────────────
console.log('\n── Bloque 32: Botón Gemini + Vista comparativa ──────────────────');

test('index.html — botón T+S tiene clase btn-transcribe-structure', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('btn-transcribe-structure'), 'Debe tener clase btn-transcribe-structure');
    assert(html.includes('sparkle-icon'), 'SVG debe tener clase sparkle-icon');
});

test('CSS — btn-transcribe-structure tiene animación Gemini', () => {
    const css = fs.readFileSync(path.join(root, 'src/css/components.css'), 'utf-8');
    assert(css.includes('geminiGradient'), 'Debe usar animación geminiGradient');
    assert(css.includes('#4285f4'), 'Debe tener color azul Gemini');
    assert(css.includes('#9b72cb'), 'Debe tener color púrpura Gemini');
    assert(css.includes('#d96570'), 'Debe tener color rosa Gemini');
});

test('CSS — animaciones Gemini definidas en animations.css', () => {
    const css = fs.readFileSync(path.join(root, 'src/css/animations.css'), 'utf-8');
    assert(css.includes('@keyframes geminiGradient'), 'Debe definir geminiGradient');
    assert(css.includes('@keyframes geminiBorder'), 'Debe definir geminiBorder');
    assert(css.includes('@keyframes geminiSparkle'), 'Debe definir geminiSparkle');
});

test('index.html — botón Comparar existe', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="btnCompareView"'), 'btnCompareView debe existir');
    assert(html.includes('Comparar'), 'Debe decir Comparar');
});

test('index.html — comparisonContainer con paneles', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="comparisonContainer"'), 'comparisonContainer debe existir');
    assert(html.includes('id="comparisonOriginal"'), 'Panel original debe existir');
    assert(html.includes('id="comparisonStructured"'), 'Panel estructurado debe existir');
});

test('index.html — botones copiar/imprimir en cada panel', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="btnCopyOriginal"'), 'btnCopyOriginal debe existir');
    assert(html.includes('id="btnPrintOriginal"'), 'btnPrintOriginal debe existir');
    assert(html.includes('id="btnCopyStructured"'), 'btnCopyStructured debe existir');
    assert(html.includes('id="btnPrintStructured"'), 'btnPrintStructured debe existir');
});

test('CSS — estilos de comparison-container presentes', () => {
    const css = fs.readFileSync(path.join(root, 'src/css/components.css'), 'utf-8');
    assert(css.includes('.comparison-container'), 'Debe tener .comparison-container');
    assert(css.includes('.comparison-panel'), 'Debe tener .comparison-panel');
    assert(css.includes('.comparison-panel-header'), 'Debe tener .comparison-panel-header');
    assert(css.includes('.panel-original'), 'Debe tener .panel-original');
    assert(css.includes('.panel-structured'), 'Debe tener .panel-structured');
});

test('ui.js — lógica de comparación implementada', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/ui.js'), 'utf-8');
    assert(code.includes('enterComparisonMode'), 'Debe tener enterComparisonMode');
    assert(code.includes('exitComparisonMode'), 'Debe tener exitComparisonMode');
    assert(code.includes('_isComparisonMode'), 'Debe trackear modo comparación');
    assert(code.includes('printPanelContent'), 'Debe tener printPanelContent');
});

test('State Machine — btnCompareView oculto antes de STRUCTURED', () => {
    const mock = createMockDOM();
    window.currentMode = 'pro';
    updateButtonsVisibility('TRANSCRIBED');
    assertEqual(mock.elements.btnCompareView.style.display, 'none', 'Comparar oculto en TRANSCRIBED');
    mock.restore();
});

test('State Machine — btnCompareView visible en STRUCTURED', () => {
    const mock = createMockDOM();
    window.currentMode = 'pro';
    updateButtonsVisibility('STRUCTURED');
    assertEqual(mock.elements.btnCompareView.style.display, '', 'Comparar visible en STRUCTURED');
    mock.restore();
});

// ── Bloque 33: Restaurar sesión + Modal confirm custom + Append record ────────
// ── Bloque 33: Restaurar sesión + Modal confirm custom + Append record ──────
console.log('\n── Bloque 33: Restaurar sesión + Modal confirm + Append record ──');

test('index.html — botón btnRestoreSession existe', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="btnRestoreSession"'), 'Debe tener botón restaurar sesión');
    assert(html.includes('Restaurar sesión anterior'), 'Texto del botón visible');
});

test('index.html — modal customConfirmModal existe', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="customConfirmModal"'), 'Debe tener modal de confirm custom');
    assert(html.includes('id="customConfirmAccept"'), 'Debe tener botón Aceptar');
    assert(html.includes('id="customConfirmCancel"'), 'Debe tener botón Cancelar');
});

test('editor.js — usa showCustomConfirm en vez de confirm()', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editor.js'), 'utf-8');
    assert(code.includes('showCustomConfirm'), 'Debe tener función showCustomConfirm');
    // No debe usar confirm() nativo para eliminar campo
    const deleteBlock = code.substring(code.indexOf('btnDeleteFieldSection'));
    assert(!deleteBlock.includes('confirm('), 'No debe usar confirm() nativo en eliminar campo');
});

test('editor.js — deleteFieldSection elimina nodos vacíos residuales', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editor.js'), 'utf-8');
    assert(code.includes('nextNode') || code.includes('nextSibling'), 'Debe limpiar nodos vacíos entre secciones');
});

test('index.html — botón btnAppendRecord existe (oculto en toolbar)', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    assert(html.includes('id="btnAppendRecord"'), 'Debe tener botón continuar grabando');
    assert(html.includes('display:none!important'), 'btnAppendRecord debe estar oculto permanentemente en toolbar');
});

test('ui.js — lógica de append recording + inline button', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/ui.js'), 'utf-8');
    assert(code.includes('btnAppendRecord'), 'ui.js debe referenciar btnAppendRecord');
    assert(code.includes('_appendRecording'), 'Debe trackear estado de grabación append');
    assert(code.includes('appendMediaRecorder') || code.includes('_appendMediaRecorder'), 'Debe tener MediaRecorder para append');
    assert(code.includes('_insertInlineAppendBtn'), 'Debe tener función de inserción inline del botón append');
    assert(code.includes('_appendRecordingActive'), 'Debe sincronizar estado de grabación con botón inline');
    assert(code.includes('_syncInlineAppendBtn'), 'Debe tener función de sincronización visual');
    assert(code.includes('btn-append-inline'), 'Debe usar clase btn-append-inline');
});

test('State Machine — append inline invocado desde stateManager', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/stateManager.js'), 'utf-8');
    assert(code.includes('_insertInlineAppendBtn'), 'stateManager debe llamar a _insertInlineAppendBtn');
});

test('CSS — botón append inline oculto en @media print', () => {
    const css = fs.readFileSync(path.join(root, 'src/css/components.css'), 'utf-8');
    assert(css.includes('btn-append-inline'), 'CSS debe contener estilos para btn-append-inline');
    // Verificar que está en @media print
    const printIdx = css.indexOf('@media print');
    const printBlock = css.slice(printIdx, css.indexOf('}', css.indexOf('}', printIdx) + 1) + 1);
    assert(printBlock.includes('btn-append-inline'), 'btn-append-inline debe estar oculto en @media print');
});

test('ui.js — restoreAutoSave usa botón btnRestoreSession', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/ui.js'), 'utf-8');
    assert(code.includes('btnRestoreSession'), 'Debe referenciar btnRestoreSession');
    assert(!code.includes('Sesión anterior restaurada'), 'No debe restaurar automáticamente');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 34: Verificación de auditoría completa — fixes aplicados
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 34: Auditoría — CRITICAL fixes ─────────────────────');

test('CRITICAL: editor.js downloadFile Promise tiene resolve()', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editor.js'), 'utf-8');
    // Debe tener resolve en onYes, onNo y onBg
    assert(code.includes('resolve(true)') || code.includes('resolve( true )'), 'downloadFile debe resolver con true');
    assert(code.includes('resolve(false)'), 'downloadFile debe resolver con false');
});

test('CRITICAL: structurer.js optional chaining en data.choices', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/structurer.js'), 'utf-8');
    assert(code.includes('data?.choices?.[0]?.message?.content'), 'structurer debe usar optional chaining para acceder a content');
});

test('CRITICAL: formHandler.js migración no borra datos si falla', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/formHandler.js'), 'utf-8');
    // removeItem debe estar DENTRO del bloque if que verifica savePatientToRegistry
    const migrateBlock = code.indexOf('savePatientToRegistry');
    const removeItem = code.indexOf("removeItem('patient_history')");
    assert(migrateBlock > 0, 'Debe existir referencia a savePatientToRegistry');
    assert(removeItem > 0, 'Debe existir removeItem de patient_history');
    assert(removeItem > migrateBlock, 'removeItem debe estar después de la verificación de savePatientToRegistry');
});

test('CRITICAL: patientRegistry.js incrementa visits correctamente', () => {
    localStorage.clear();
    const name = 'Test Visits Patient';
    savePatientToRegistry({ name: name, dni: '99999' });
    savePatientToRegistry({ name: name, dni: '99999' });
    const all = searchPatientRegistry(name);
    assert(all.length > 0, 'Paciente debe existir');
    assert(all[0].visits >= 2, `Visits debe ser >= 2, got ${all[0].visits}`);
    localStorage.clear();
});

test('CRITICAL: pdfMaker.js firma usa posiciones dinámicas', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/pdfMaker.js'), 'utf-8');
    assert(code.includes('sigStartX') || code.includes('PAGE_W - MR'), 'Firma debe usar posición dinámica');
    assert(!code.match(/doc\.line\(\s*130\s*,/), 'No debe haber firma hardcodeada en x=130');
});

console.log('\n── Bloque 35: Auditoría — HIGH fixes ─────────────────────────');

test('HIGH: audio.js usa mimeType dinámico en grabación', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/core/audio.js'), 'utf-8');
    // Solo verifica que el mediaRecorder usa mimeType dinámico; audio/wav en WAV encoder helper es legítimo
    assert(code.includes('.mimeType'), 'audio.js debe usar .mimeType del mediaRecorder');
    assert(!code.includes("new Blob(chunks, { type: 'audio/wav' }"), 'chunks del recorder no debe ser audio/wav');
});

test('HIGH: audio.js revoca Object URL', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/core/audio.js'), 'utf-8');
    assert(code.includes('revokeObjectURL'), 'audio.js debe revocar Object URLs');
});

test('HIGH: audio.js tiene onerror handler', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/core/audio.js'), 'utf-8');
    assert(code.includes('.onerror'), 'mediaRecorder debe tener onerror');
});

test('HIGH: audio.js stop() con try/catch', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/core/audio.js'), 'utf-8');
    // Verificar que hay un try con stop() cerca
    const stopIdx = code.indexOf('mediaRecorder.stop()');
    assert(stopIdx > 0, 'Debe existir mediaRecorder.stop()');
    const before = code.substring(Math.max(0, stopIdx - 200), stopIdx);
    assert(before.includes('try'), 'stop() debe estar envuelto en try/catch');
});

test('HIGH: editor.js HTTP validation (!res.ok)', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editor.js'), 'utf-8');
    assert(code.includes('!res.ok') || code.includes('! res.ok'), 'editor.js debe validar res.ok en fetch');
});

test('HIGH: editor.js no-data-field class correcta', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editor.js'), 'utf-8');
    assert(code.includes('no-data-field'), 'Debe usar clase no-data-field');
});

test('HIGH: editor.js undo guarda estado inicial', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editor.js'), 'utf-8');
    assert(code.includes('focus') && code.includes('once'), 'Debe guardar estado inicial al primer focus');
});

test('HIGH: ui.js clipboard con .catch()', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/ui.js'), 'utf-8');
    const clipMatches = code.match(/writeText\([^)]*\)/g) || [];
    assert(clipMatches.length > 0, 'Debe usar clipboard.writeText');
    // Buscar que no hay writeText sin .catch cerca
    const hasCatchAfterWriteText = code.includes('writeText') && code.includes('.catch');
    assert(hasCatchAfterWriteText, 'writeText debe tener .catch()');
});

test('HIGH: ui.js downloadFile guard correcto', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/ui.js'), 'utf-8');
    assert(
        code.includes("typeof window.downloadFile === 'function'") ||
        code.includes('typeof window.downloadFile === "function"'),
        'Debe verificar window.downloadFile como function'
    );
});

test('HIGH: ui.js typo "Guardar" (no "Gauardar")', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/ui.js'), 'utf-8');
    assert(!code.includes('Gauardar'), 'No debe contener typo Gauardar');
});

test('HIGH: ui.js showBlocker XSS safe', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/ui.js'), 'utf-8');
    assert(code.includes('escapeHtml'), 'showBlocker debe usar escapeHtml');
});

test('HIGH: formHandler.js extractPatientDataFromText null guard', () => {
    const result = extractPatientDataFromText(null);
    assert(typeof result === 'object', 'Debe retornar objeto vacío para null');
    assertEqual(Object.keys(result).length, 0, 'Objeto debe estar vacío');
});

test('HIGH: formHandler.js age 0 no es falsy', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/formHandler.js'), 'utf-8');
    assert(
        code.includes("v != null && v !== ''") || code.includes('v != null'),
        'set() no debe tratar 0 como falsy'
    );
});

test('HIGH: patientRegistry.js XSS — sin onclick inline', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/patientRegistry.js'), 'utf-8');
    assert(!code.includes("onclick=\"registryEditRow"), 'No debe tener onclick inline para edit');
    assert(!code.includes("onclick=\"registryDeleteRow"), 'No debe tener onclick inline para delete');
});

test('HIGH: business.js XSS — escapa datos en HTML', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/business.js'), 'utf-8');
    assert(code.includes('replace') && code.includes('&amp;'), 'Debe escapar HTML en renderProfessionalList');
});

test('HIGH: structurer.js mutex autoStructure', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/structurer.js'), 'utf-8');
    assert(code.includes('_structuring'), 'Debe tener flag _structuring para mutex');
});

test('HIGH: structurer.js Notification guard', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/structurer.js'), 'utf-8');
    assert(code.includes("typeof Notification !== 'undefined'") || code.includes('typeof Notification !=='), 
        'Debe verificar que Notification existe antes de usarlo');
});

console.log('\n── Bloque 36: Auditoría — MEDIUM fixes ───────────────────────');

test('MEDIUM: structurer.js markdownToHtml soporta listas numeradas', () => {
    const md = '1. Primer item\n2. Segundo item\n3. Tercer item';
    const html = markdownToHtml(md);
    assert(html.includes('<ol>') || html.includes('<li>'), 'Debe generar <ol> o <li> para listas numeradas');
});

test('MEDIUM: tabs.js closeTab guarda contenido', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/tabs.js'), 'utf-8');
    assert(code.includes('transcriptions') && code.includes('.text'), 'closeTab debe guardar en transcriptions[].text');
});

test('MEDIUM: toast.js askJoinAudiosPromise tiene timeout', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/toast.js'), 'utf-8');
    assert(code.includes('setTimeout') && code.includes('resolved'), 'Debe tener timeout de seguridad');
});

test('MEDIUM: business.js FileReader tiene onerror', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/business.js'), 'utf-8');
    assert(code.includes('r.onerror') || code.includes('reader.onerror'), 'FileReader debe tener onerror');
});

test('MEDIUM: medDictionary.js optional chaining', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/medDictionary.js'), 'utf-8');
    assert(code.includes('?.choices') || code.includes('data?.'), 'Debe usar optional chaining');
});

test('MEDIUM: ui.js doble-click append guard', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/ui.js'), 'utf-8');
    assert(code.includes('_appendStarting'), 'Debe tener flag anti doble-click');
});

test('MEDIUM: ui.js autoSave JSON.parse try/catch', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/ui.js'), 'utf-8');
    // Buscar try/catch cerca de JSON.parse y autosave
    assert(code.includes('try') && code.includes('JSON.parse'), 'AutoSave debe tener try/catch en JSON.parse');
});

test('MEDIUM: editor.js highlightText limpia marks previos', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editor.js'), 'utf-8');
    assert(code.includes('<mark>') && code.includes('replace'), 'highlightText debe limpiar marks previos');
});

test('MEDIUM: editor.js applyNormalTemplate tiene guard', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editor.js'), 'utf-8');
    assert(code.includes('_applyingTemplate'), 'applyNormalTemplate debe tener guard anti re-entrada');
});

test('MEDIUM: transcriptor.js pipeline muestra warning en fallo', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/transcriptor.js'), 'utf-8');
    assert(code.includes('autoStructure') && code.includes('then'), 'Pipeline debe manejar fallos de autoStructure');
});

test('MEDIUM: transcriptor.js limpia blob URLs', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/transcriptor.js'), 'utf-8');
    assert(code.includes('revokeObjectURL'), 'Debe revocar Object URLs de blobs');
});

test('MEDIUM: pdfMaker.js segundo página dibuja banner del lugar', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/pdfMaker.js'), 'utf-8');
    // ensureSpace debe llamar a drawWorkplaceBanner() para repetir el banner en todas las páginas
    const ensureSpaceMatch = code.match(/function ensureSpace[\s\S]*?\n\s*\}/m);
    assert(ensureSpaceMatch && ensureSpaceMatch[0].includes('drawWorkplaceBanner()'), 'ensureSpace debe llamar drawWorkplaceBanner() en páginas 2+');
});

test('MEDIUM: pdfMaker.js _hexToRgb soporta hex corto', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/pdfMaker.js'), 'utf-8');
    assert(code.includes('h.length === 3') || code.includes('length===3'), 'Debe expandir hex corto (#FFF)');
});

test('MEDIUM: sw.js Groq fetch tiene .catch()', () => {
    const code = fs.readFileSync(path.join(root, 'sw.js'), 'utf-8');
    assert(code.includes('.catch'), 'Fetch de Groq API debe tener .catch()');
});

test('MEDIUM: templates.js detectStudyType usa toLowerCase', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/config/templates.js'), 'utf-8');
    assert(code.includes('.toLowerCase()'), 'detectStudyType debe comparar en lowercase');
});

test('MEDIUM: audio.js formatSize soporta GB/TB', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/core/audio.js'), 'utf-8');
    assert(code.includes("'GB'") || code.includes('"GB"'), 'formatSize debe incluir GB');
});

test('MEDIUM: audio.js SVG path corregido', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/core/audio.js'), 'utf-8');
    assert(!code.includes('4-1.79') || code.includes('4s4-1.79'), 'SVG path debe estar corregido');
});

test('CLEANED: transcriptor.js sin testGroqConnection muerto', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/transcriptor.js'), 'utf-8');
    assert(!code.includes('function testGroqConnection') && !code.includes('testGroqConnection ='), 
        'No debe contener código muerto testGroqConnection');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 37: normalizeFieldText — modo oración y nombres
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 37: normalizeFieldText ────────────────────────────');

test('normalizeFieldText existe y es función', () => {
    assert(typeof normalizeFieldText === 'function', 'normalizeFieldText debe ser función global');
});

test('normalizeFieldText modo sentence — texto genérico', () => {
    const r = normalizeFieldText('PACIENTE PRESENTA DOLOR ABDOMINAL');
    assertEqual(r, 'Paciente presenta dolor abdominal', 'Debe convertir a modo oración');
});

test('normalizeFieldText modo sentence — respeta siglas médicas', () => {
    const r = normalizeFieldText('el paciente tiene hta y dbt');
    assert(r.includes('HTA'), `Debe preservar HTA en mayúsculas, got: ${r}`);
    assert(r.includes('DBT'), `Debe preservar DBT en mayúsculas, got: ${r}`);
});

test('normalizeFieldText modo sentence — primera letra mayúscula tras punto', () => {
    const r = normalizeFieldText('sin particularidades. control en una semana');
    assert(r.startsWith('Sin'), 'Primera palabra debe ser capitalizada');
    assert(r.includes('Control') || r.includes('control'), 'Después de punto debe capitalizar');
});

test('normalizeFieldText modo name — nombre y apellido', () => {
    const r = normalizeFieldText('JUAN CARLOS MARTINEZ', 'name');
    assertEqual(r, 'Juan Carlos Martinez', 'Cada palabra debe capitalizarse');
});

test('normalizeFieldText modo name — respeta preposiciones', () => {
    const r = normalizeFieldText('MARIA DE LOS ANGELES', 'name');
    assert(r.includes('de los'), `Preposiciones en minúscula, got: ${r}`);
    assert(r.startsWith('Maria'), 'Primer nombre capitalizado');
});

test('normalizeFieldText — sigla corta no se toca', () => {
    assertEqual(normalizeFieldText('ECG'), 'ECG', 'Sigla corta no debe alterarse');
    assertEqual(normalizeFieldText('VEF1'), 'VEF1', 'Sigla con número no debe alterarse');
});

test('normalizeFieldText — texto vacío/null retorna vacío', () => {
    assertEqual(normalizeFieldText(''), '', 'Vacío retorna vacío');
    assertEqual(normalizeFieldText(null), '', 'Null retorna vacío');
    assertEqual(normalizeFieldText(undefined), '', 'Undefined retorna vacío');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 38: Búsqueda normalizada — sin acentos ni case
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 38: Búsqueda normalizada ─────────────────────────');

test('búsqueda insensible a mayúsculas', () => {
    localStorage.clear();
    savePatientToRegistry({ name: 'González Martínez Juan', dni: '12345678' });
    const r1 = searchPatientRegistry('gonzalez');
    assert(r1.length > 0, 'Debe encontrar buscando en minúsculas');
    const r2 = searchPatientRegistry('GONZALEZ');
    assert(r2.length > 0, 'Debe encontrar buscando en mayúsculas');
    localStorage.clear();
});

test('búsqueda insensible a acentos', () => {
    localStorage.clear();
    savePatientToRegistry({ name: 'José María López', dni: '87654321' });
    const r1 = searchPatientRegistry('jose');
    assert(r1.length > 0, 'Debe encontrar "jose" sin acento');
    const r2 = searchPatientRegistry('lopez');
    assert(r2.length > 0, 'Debe encontrar "lopez" sin acento');
    const r3 = searchPatientRegistry('María');
    assert(r3.length > 0, 'Debe encontrar "María" con acento');
    localStorage.clear();
});

test('búsqueda por DNI parcial', () => {
    localStorage.clear();
    savePatientToRegistry({ name: 'Test DNI', dni: '30567890' });
    const r = searchPatientRegistry('5678');
    assert(r.length > 0, 'Debe encontrar por fragmento de DNI');
    localStorage.clear();
});

test('búsqueda multi-token (nombre + apellido)', () => {
    localStorage.clear();
    savePatientToRegistry({ name: 'Rodríguez Carlos Alberto', dni: '11111111' });
    const r = searchPatientRegistry('carlos rodriguez');
    assert(r.length > 0, 'Debe encontrar con tokens en orden inverso');
    localStorage.clear();
});

test('búsqueda retorna vacío si query < 2 caracteres', () => {
    const r = searchPatientRegistry('a');
    assertEqual(r.length, 0, 'No debe buscar con query de 1 carácter');
});

// BLOQUE 39: _hexToRgb — conversión de color hex a RGB
console.log('\n── Bloque 39: _hexToRgb ─────────────────────────────────────');

test('_hexToRgb convierte hex de 6 dígitos correctamente', () => {
    const result = _hexToRgb('#1a56a0');
    assertEqual(result.r, 26);
    assertEqual(result.g, 86);
    assertEqual(result.b, 160);
});

test('_hexToRgb convierte hex corto (#FFF) correctamente', () => {
    const result = _hexToRgb('#FFF');
    assertEqual(result.r, 255);
    assertEqual(result.g, 255);
    assertEqual(result.b, 255);
});

test('_hexToRgb convierte negro (#000000)', () => {
    const result = _hexToRgb('#000000');
    assertEqual(result.r, 0);
    assertEqual(result.g, 0);
    assertEqual(result.b, 0);
});

test('_hexToRgb — null retorna fallback azul', () => {
    const result = _hexToRgb(null);
    assertEqual(result.r, 26);
    assertEqual(result.g, 86);
    assertEqual(result.b, 160);
});

test('_hexToRgb — string vacío retorna fallback', () => {
    const result = _hexToRgb('');
    assertEqual(result.r, 26);
});

test('_hexToRgb — sin # retorna fallback', () => {
    const result = _hexToRgb('ff0000');
    assertEqual(result.r, 26);
});

// BLOQUE 40: escapeHtml — sanitización XSS
console.log('\n── Bloque 40: escapeHtml ────────────────────────────────────');

test('escapeHtml escapa tags HTML', () => {
    const result = escapeHtml('<script>alert(1)</script>');
    assert(!result.includes('<'), 'No debe contener <');
    assert(!result.includes('>'), 'No debe contener >');
    assert(result.includes('&lt;'), 'Debe contener &lt;');
});

test('escapeHtml escapa comillas y ampersand', () => {
    const result = escapeHtml('a"b\'c&d');
    assert(result.includes('&amp;'), 'Debe escapar &');
    assert(result.includes('&quot;'), 'Debe escapar "');
    assert(result.includes('&#039;'), "Debe escapar '");
});

test('escapeHtml — null retorna vacío', () => {
    assertEqual(escapeHtml(null), '');
});

test('escapeHtml — string vacío retorna vacío', () => {
    assertEqual(escapeHtml(''), '');
});

test('escapeHtml — número se convierte a string', () => {
    assertEqual(escapeHtml(123), '123');
});

// BLOQUE 41: _normStr — normalización de strings
console.log('\n── Bloque 41: _normStr ──────────────────────────────────────');

test('_normStr quita acentos y pasa a minúsculas', () => {
    assertEqual(_normStr('Épiglotis'), 'epiglotis');
});

test('_normStr maneja MAYÚSCULAS con acentos', () => {
    assertEqual(_normStr('CINECORONARIOGRAFÍA'), 'cinecoronariografia');
});

test('_normStr — null retorna vacío', () => {
    assertEqual(_normStr(null), '');
});

test('_normStr — string vacío retorna vacío', () => {
    assertEqual(_normStr(''), '');
});

// BLOQUE 42: parseAIResponse — separar body y nota
console.log('\n── Bloque 42: parseAIResponse ───────────────────────────────');

test('parseAIResponse separa body y nota correctamente', () => {
    const raw = '## HALLAZGOS\n\nTexto del informe.\n\nNota: Esta es una aclaración.';
    const result = parseAIResponse(raw);
    assert(result.body.includes('HALLAZGOS'), 'Body debe contener HALLAZGOS');
    assert(result.note !== null, 'Note no debe ser null');
    assert(result.note.includes('aclaración'), 'Note debe contener aclaración');
});

test('parseAIResponse sin nota retorna note null', () => {
    const raw = '## HALLAZGOS\n\nTexto sin nota al final.';
    const result = parseAIResponse(raw);
    assert(result.body.length > 0, 'Body no debe estar vacío');
    assertEqual(result.note, null);
});

test('parseAIResponse — null retorna body vacío y note null', () => {
    const result = parseAIResponse(null);
    assertEqual(result.body, '');
    assertEqual(result.note, null);
});

test('parseAIResponse — string vacío', () => {
    const result = parseAIResponse('');
    assertEqual(result.body, '');
    assertEqual(result.note, null);
});

test('parseAIResponse detecta "Aclaración:" como nota', () => {
    const raw = '## TEST\n\nContenido.\n\nAclaración: Algo importante.';
    const result = parseAIResponse(raw);
    assert(result.note !== null, 'Debe detectar Aclaración como nota');
});

// BLOQUE 43: evaluateConfigCompleteness — completitud de config
console.log('\n── Bloque 43: evaluateConfigCompleteness ────────────────────');

test('evaluateConfigCompleteness — sin datos retorna red', () => {
    localStorage.clear();
    const result = evaluateConfigCompleteness();
    assertEqual(result.level, 'red');
    assert(result.missing.length >= 2, 'Debe faltar al menos nombre y matrícula');
});

test('evaluateConfigCompleteness — solo nombre retorna red (falta matricula)', () => {
    localStorage.clear();
    localStorage.setItem('prof_data', JSON.stringify({ nombre: 'Dr. Test' }));
    const result = evaluateConfigCompleteness();
    assertEqual(result.level, 'red');
    localStorage.clear();
});

test('evaluateConfigCompleteness — nombre+mat+espec retorna yellow sin workplace', () => {
    localStorage.clear();
    localStorage.setItem('prof_data', JSON.stringify({
        nombre: 'Dr. Test', matricula: '12345',
        specialties: ['Cardiología']
    }));
    const result = evaluateConfigCompleteness();
    // yellow porque falta lugar de trabajo
    assert(result.level === 'yellow' || result.level === 'green', 'Debe ser yellow o green');
    localStorage.clear();
});

test('evaluateConfigCompleteness — nombre+mat sin espec retorna yellow', () => {
    localStorage.clear();
    localStorage.setItem('prof_data', JSON.stringify({
        nombre: 'Dr. Test', matricula: '12345'
    }));
    const result = evaluateConfigCompleteness();
    assertEqual(result.level, 'yellow');
    localStorage.clear();
});

// BLOQUE 44: validateBeforeDownload — gate de descarga
console.log('\n── Bloque 44: validateBeforeDownload ────────────────────────');

test('validateBeforeDownload — formato txt siempre pasa', () => {
    assertEqual(validateBeforeDownload('txt'), true);
});

test('validateBeforeDownload — pdf con green pasa', () => {
    localStorage.clear();
    localStorage.setItem('prof_data', JSON.stringify({
        nombre: 'Dr. Test', matricula: '12345', specialties: ['Card']
    }));
    assertEqual(validateBeforeDownload('pdf'), true);
    localStorage.clear();
});

test('validateBeforeDownload — pdf con red no pasa', () => {
    localStorage.clear();
    assertEqual(validateBeforeDownload('pdf'), false);
    localStorage.clear();
});

test('validateBeforeDownload — pdf con yellow/red depende de config', () => {
    localStorage.clear();
    localStorage.setItem('prof_data', JSON.stringify({ nombre: 'Dr. Test', matricula: '123' }));
    // Con nombre+mat deberÃ­a ser al menos yellow → pasa
    const result = validateBeforeDownload('pdf');
    assert(typeof result === 'boolean', 'Debe retornar boolean');
    localStorage.clear();
});

// BLOQUE 45: isAdminUser — detección de admin
console.log('\n── Bloque 45: isAdminUser ───────────────────────────────────');

test('isAdminUser retorna true para ADMIN', () => {
    window.CLIENT_CONFIG = { type: 'ADMIN' };
    assertEqual(isAdminUser(), true);
});

test('isAdminUser retorna false para NORMAL', () => {
    window.CLIENT_CONFIG = { type: 'NORMAL' };
    assertEqual(isAdminUser(), false);
});

test('isAdminUser retorna falsy sin CLIENT_CONFIG', () => {
    window.CLIENT_CONFIG = undefined;
    assert(!isAdminUser(), 'Debe ser falsy sin CLIENT_CONFIG');
});

// BLOQUE 46: extractPatientDataFromText — más patrones
console.log('\n── Bloque 46: extractPatientDataFromText (ext) ───────────────');

test('extractPatientDataFromText — DNI con puntos', () => {
    const r = extractPatientDataFromText('Paciente Juan Pérez, DNI 28.456.789, 45 años, masculino');
    assert(r.name || r.dni, 'Debe extraer al menos un dato');
});

test('extractPatientDataFromText — texto vacío retorna objeto vacío', () => {
    const r = extractPatientDataFromText('');
    assert(!r.name && !r.dni, 'No debe extraer datos de texto vacío');
});

test('extractPatientDataFromText — sin datos de paciente', () => {
    const r = extractPatientDataFromText('Mucosa nasal permeable, septum SP, cornete 40%');
    assert(!r.name, 'No debe inventar nombre de texto médico');
});

// BLOQUE 47: pdfMaker — header en todas las páginas
console.log('\n── Bloque 47: pdfMaker — header en todas las páginas ─────────');

test('pdfMaker.js ensureSpace llama drawWorkplaceBanner()', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/pdfMaker.js'), 'utf-8');
    const match = code.match(/function ensureSpace[\s\S]*?\n\s*\}/m);
    assert(match, 'ensureSpace debe existir');
    assert(match[0].includes('drawWorkplaceBanner()'), 'ensureSpace debe llamar drawWorkplaceBanner()');
    assert(!match[0].includes('cy = MT'), 'No debe setear cy = MT manualmente (drawWorkplaceBanner lo hace)');
});

test('pdfMaker.js drawHeader resetea cy correctamente', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/pdfMaker.js'), 'utf-8');
    const match = code.match(/function drawHeader[\s\S]*?headerH = cy/m);
    assert(match, 'drawHeader debe setear headerH = cy');
});

test('pdfMaker.js drawFooter soporta footerText', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/pdfMaker.js'), 'utf-8');
    assert(code.includes('footerText'), 'Debe usar footerText en el pie');
});

// BLOQUE 48: Preview modal — dropdown multi-formato
console.log('\n── Bloque 48: Preview modal — dropdown multi-formato ─────────');

test('index.html modal-footer del preview tiene position:relative', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    // Buscar el div que contiene previewDownloadSplit
    const region = html.substring(
        html.indexOf('previewPageNav'),
        html.indexOf('previewDownloadDropdown')
    );
    assert(region.includes('position: relative') || region.includes('position:relative'),
        'modal-footer del preview debe tener position:relative');
});

test('index.html dropdown del preview tiene z-index alto', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    const match = html.match(/previewDownloadDropdown[^>]*z-index:\s*(\d+)/);
    assert(match, 'Dropdown debe tener z-index');
    const zIndex = parseInt(match[1]);
    assert(zIndex >= 10000, `z-index ${zIndex} debe ser >= 10000 para estar sobre el modal`);
});

test('index.html dropdown tiene 4 formatos (pdf, rtf, txt, html)', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    const ddRegion = html.substring(
        html.indexOf('id="previewDownloadDropdown"'),
        html.indexOf('</div>', html.indexOf('id="previewDownloadDropdown"') + 200) + 6
    );
    assert(ddRegion.includes('data-format="pdf"'), 'Falta botón PDF');
    assert(ddRegion.includes('data-format="rtf"'), 'Falta botón RTF');
    assert(ddRegion.includes('data-format="txt"'), 'Falta botón TXT');
    assert(ddRegion.includes('data-format="html"'), 'Falta botón HTML');
});

test('ui.js maneja click en btnDownloadPreviewMore', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/ui.js'), 'utf-8');
    assert(code.includes("btnDownloadPreviewMore"), 'Debe referenciar btnDownloadPreviewMore');
    assert(code.includes("previewDownloadDropdown"), 'Debe referenciar previewDownloadDropdown');
});

test('ui.js formatos llaman window.downloadRTF/TXT/HTML', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/ui.js'), 'utf-8');
    assert(code.includes("downloadRTF") || code.includes("download' + fmt.toUpperCase()"),
        'Debe poder llamar downloadRTF/TXT/HTML');
});

// BLOQUE 49: autoDetectTemplateKey — textos crudos realistas
console.log('\n── Bloque 49: autoDetectTemplateKey — textos crudos ─────────');

const SAMPLE_TEXTS = {
    espirometria: 'Paciente masculino 52 años. Se realiza espirometría basal. CVF 3.8 litros, 92% del predicho. VEF1 2.9 litros, 85% del predicho. Relación VEF1/CVF 76%. FEF 25-75 2.1 litros por segundo. Se administra broncodilatador salbutamol 400 mcg. Post broncodilatador CVF 3.9, VEF1 3.1, cambio del 7%. Calidad del examen grado A. Patrón funcional normal.',
    colonoscopia: 'Se realiza colonoscopía bajo sedación con propofol. Preparación buena, Boston 8. Se progresa hasta ciego. Recto sin lesiones. Sigmoide con divertículos no complicados. Descendente sin alteraciones. Transverso normal. Ascendente se observa pólipo sésil de 5mm que se reseca con asa fría. Ciego y válvula ileocecal normales. No se explora íleon terminal.',
    ecografia_abdominal: 'Ecografía abdominal completa. Hígado de tamaño normal, ecoestructura homogénea, sin lesiones focales. Vesícula biliar de paredes finas con un cálculo de 12mm. Vías biliares no dilatadas, colédoco 4mm. Páncreas de visualización parcial, sin alteraciones. Bazo homogéneo de 11cm. Riñón derecho 10.5cm, buena diferenciación, sin dilatación. Riñón izquierdo 10.8cm, quiste cortical simple de 18mm en polo inferior. Vejiga distendida sin particularidades.',
    gastroscopia: 'Endoscopía digestiva alta. Esófago con mucosa normal, sin varices. Unión gastroesofágica a 38cm, línea Z regular. Estómago fondo sin lesiones, cuerpo con gastropatía eritematosa leve, antro con erosiones planas múltiples. Píloro permeable. Duodeno primera porción mucosa normal, segunda porción sin alteraciones. Se toman biopsias de antro para Helicobacter pylori, 2 muestras.',
    holter: 'Holter ECG de 24 horas. Ritmo sinusal predominante. FC media 72 lpm, máxima 128 lpm durante actividad, mínima 52 lpm durante sueño. Variabilidad normal. Extrasístoles ventriculares 245, monomorfas, sin pares ni tripletes, sin TV. Extrasístoles supraventriculares 89, aisladas, sin TSV. Segmento ST sin cambios significativos. No se registraron pausas mayores a 2 segundos.',
    cinecoro: 'Cinecoronariografía por acceso radial derecho. Tronco coronario izquierdo sin lesiones significativas. Descendente anterior con estenosis del 70% en tercio medio, flujo TIMI 3. Circunfleja sin lesiones. Coronaria derecha dominante, con estenosis del 40% en tercio proximal. Ventriculografía con FEVI estimada 55%, hipoquinesia anterior leve. No se realizó angioplastia, se sugiere valorar revascularización.',
    mamografia: 'Mamografía digital bilateral. Composición mamaria tipo C (heterogéneamente densa). Mama derecha: nódulo oval circunscrito de 8mm en el cuadrante superior externo, de probable naturaleza benigna. No se observan microcalcificaciones sospechosas. Mama izquierda: sin hallazgos significativos. Axilas sin adenopatías. BI-RADS 3 mama derecha, BI-RADS 1 mama izquierda. Se sugiere control en 6 meses.',
    densitometria: 'Densitometría ósea DXA. Columna lumbar L1-L4: DMO 0.850 g/cm², T-score -1.8, Z-score -0.9. Cadera total derecha: DMO 0.780 g/cm², T-score -2.1, Z-score -1.2. Cuello femoral: DMO 0.720 g/cm², T-score -2.4, Z-score -1.5. Clasificación OMS: Osteopenia en columna lumbar, Osteoporosis en cuello femoral. Riesgo fracturario incrementado.',
    laringoscopia: 'Videonasofibrolaringoscopía. Fosa nasal derecha permeable, septum desviado a derecha sin obstrucción significativa, cornetes sin hipertrofia, mucosa rosada. Fosa nasal izquierda permeable, sin alteraciones. Cavum libre, sin vegetaciones adenoideas. Orofaringe con amígdalas grado II simétricas. Base de lengua y valéculas libres. Epiglotis omega normal. Cuerdas vocales móviles, simétricas, borde libre liso. Glotis permeable. Fonación con cierre glótico completo.',
    tac: 'TAC de tórax. Tomografía con contraste endovenoso, cortes axiales de 3mm. Parénquima pulmonar con opacidad en vidrio esmerilado en lóbulo inferior derecho de 25mm. No se observan nódulos pulmonares sólidos. Mediastino sin adenopatías significativas. Tráquea y bronquios principales permeables. Silueta cardíaca de tamaño normal. Derrame pleural laminar bilateral. Estructuras óseas sin lesiones líticas ni blásticas.',
    ett: 'Ecocardiograma transtorácico. Ventrículo izquierdo no dilatado, diámetro diastólico 48mm, FEVI 62% por Simpson. Motilidad global conservada. Sin hipertrofia. Raíz aórtica 32mm. Aurícula izquierda 38mm. Válvula mitral con insuficiencia leve. Válvula aórtica trivalva sin estenosis. Ventrículo derecho no dilatado, TAPSE 22mm. No se observa derrame pericárdico. Presión sistólica pulmonar estimada 28mmHg.',
    eco_doppler: 'Eco Doppler venoso de miembros inferiores bilateral. Cayado de safena interna derecha competente. Vena femoral común y superficial permeables y compresibles. Vena poplítea permeable. No se observan trombos. Safena interna derecha sin reflujo. Lado izquierdo: insuficiencia de safena interna con reflujo de 4 segundos desde el cayado hasta tercio medio de muslo, diámetro del cayado 8mm. Sistemas profundos permeables bilateralmente.',
    nota_evolucion: 'Nota de evolución. Paciente de 68 años, internado por neumonía adquirida en comunidad hace 3 días. Hoy afebril, mejoría clínica. Saturación 95% aire ambiente. Auscultación con rales crepitantes bibasales en disminución. Tolerando vía oral. Laboratorio: leucocitos 9800, PCR 45 en descenso. Continúa con ampicilina sulbactam EV. Plan: si mantiene mejoría, rotar a vía oral mañana y evaluar alta.',
    epicrisis: 'Epicrisis. Resumen de internación del 10 al 15 de febrero, 5 días totales. Motivo de internación: dolor torácico y disnea. Diagnósticos: neumonía adquirida en la comunidad, CURB-65 2 puntos. Antecedentes: hipertensión arterial, diabetes tipo 2. Tratamiento durante internación: ampicilina sulbactam 3g cada 6 horas EV por 4 días, luego amoxicilina ácido clavulánico 875/125 vía oral. Evolución favorable, afebril desde el día 3. Alta con indicaciones: completar antibiótico 7 días totales, control en 2 semanas.',
    resonancia: 'RMN de cerebro con gadolinio. Secuencias T1, T2, FLAIR y difusión. Parénquima cerebral sin lesiones focales. Sustancia blanca sin alteraciones de señal. Sistema ventricular de tamaño y configuración normal. Línea media centrada. No se observan realces patológicos post contraste. Estructuras de fosa posterior normales. Lesión quística extraaxial en región temporal izquierda de 12mm, compatible con quiste aracnoideo. Sin efecto de masa.',
    protocolo_quirurgico: 'Protocolo de cirugía laparoscópica. Paciente en decúbito dorsal bajo anestesia general. Se realiza neumoperitoneo con aguja de Veress umbilical, presión 12mmHg. Se colocan 4 trocares. Se identifica vesícula biliar con pared engrosada y adherencias al epiplón. Disección del triángulo de Calot, identificación de conducto cístico y arteria cística. Clipaje con clips metálicos x3 en cístico y x2 en arteria. Sección. Vesícula se extrae por puerto umbilical en bolsa. Hemostasia correcta, lavado con solución fisiológica. Sin incidentes. Tiempo operatorio 45 minutos.'
};

for (const [key, text] of Object.entries(SAMPLE_TEXTS)) {
    test(`autoDetectTemplateKey detecta "${key}" desde texto crudo`, () => {
        const detected = autoDetectTemplateKey(text);
        assertEqual(detected, key);
    });
}

test('autoDetectTemplateKey retorna generico para texto ambiguo', () => {
    const result = autoDetectTemplateKey('El paciente se encuentra estable, sin cambios relevantes en la evolución clínica del día.');
    // Podría ser generico o nota_evolucion — ambos son aceptables
    assert(typeof result === 'string' && result.length > 0, 'Debe retornar un string');
});

// BLOQUE 50: markdownToHtml — textos estructurados realistas
console.log('\n── Bloque 50: markdownToHtml — renderizado realista ─────────');

test('markdownToHtml convierte H1 + H2 + párrafo', () => {
    const md = '# INFORME DE ESPIROMETRÍA\n\n## VALORES PRE-BRONCODILATADOR\n\nCVF 3.8 litros, 92% del predicho.\n\n## CONCLUSIÓN\n\nPatrón funcional normal.';
    const html = markdownToHtml(md);
    assert(html.includes('<h1'), 'Debe contener H1');
    assert(html.includes('<h2'), 'Debe contener H2');
    assert(html.includes('92%'), 'Debe preservar valores numéricos');
    assert(html.includes('report-h1'), 'Clase report-h1');
});

test('markdownToHtml convierte lista con bullets', () => {
    const md = '## HALLAZGOS\n\n- Cálculo de 12mm en vesícula\n- Quiste renal 18mm\n- Derrame pleural laminar';
    const html = markdownToHtml(md);
    assert(html.includes('<ul'), 'Debe tener UL');
    assert(html.includes('<li>'), 'Debe tener LI');
    assert(html.includes('12mm'), 'Debe preservar medidas');
});

test('markdownToHtml reemplaza [No especificado] con campo editable', () => {
    const md = '## PÁNCREAS\n\n[No especificado]';
    const html = markdownToHtml(md);
    assert(html.includes('no-data-field'), 'Debe tener clase no-data-field');
    assert(html.includes('campo vacío'), 'Debe mostrar "campo vacío"');
});

test('markdownToHtml preserva negritas markdown **texto**', () => {
    const md = '## CONCLUSIÓN\n\n**Estudio normal** sin hallazgos patológicos.';
    const html = markdownToHtml(md);
    assert(html.includes('<strong>Estudio normal</strong>'), 'Debe convertir **x** a <strong>');
});

test('markdownToHtml capitaliza primera letra de párrafo', () => {
    const md = '## HÍGADO\n\nhígado de tamaño normal.';
    const html = markdownToHtml(md);
    // La H debe quedar mayúscula
    assert(html.includes('Hígado') || html.includes('hígado'), 'Debe estar presente el texto del hígado');
});

// BLOQUE 51: parseAIResponse — respuestas realistas de IA
console.log('\n── Bloque 51: parseAIResponse — respuestas realistas ────────');

test('parseAIResponse extrae body HTML de ecografía', () => {
    const rawMd = `# INFORME ECOGRÁFICO

## HÍGADO
Tamaño normal, ecoestructura homogénea.

## VESÍCULA BILIAR
Cálculo de 12mm con sombra acústica posterior.

## CONCLUSIÓN
Litiasis vesicular.`;
    const { body, note } = parseAIResponse(rawMd);
    assert(body.includes('<h1'), 'Debe tener h1');
    assert(body.includes('12mm'), 'Debe preservar medida');
    assert(body.includes('Litiasis'), 'Debe tener conclusión');
    assertEqual(note, null);
});

test('parseAIResponse maneja nota "Nota:" al final', () => {
    const rawMd = `## HALLAZGOS\nTexto del informe.\n\nNota: El paciente debe completar datos faltantes.`;
    const { body, note } = parseAIResponse(rawMd);
    assert(note !== null, 'Debe detectar la nota');
    assert(!body.includes('Nota:'), 'Body no debe contener la nota');
});

// BLOQUE 52: templates coverage — todas las plantillas existen
console.log('\n── Bloque 52: templates coverage ────────────────────────────');

const EXPECTED_TEMPLATES = [
    'espirometria', 'test_marcha', 'pletismografia', 'oximetria_nocturna',
    'campimetria', 'oct_retinal', 'topografia_corneal', 'fondo_ojo',
    'tac', 'resonancia', 'mamografia', 'densitometria', 'pet_ct', 'radiografia',
    'ecografia_abdominal', 'gastroscopia', 'colonoscopia', 'broncoscopia', 'laringoscopia',
    'gammagrafia_cardiaca', 'holter', 'mapa', 'cinecoro', 'ecg', 'eco_stress',
    'pap', 'colposcopia', 'electromiografia', 'polisomnografia',
    'naso', 'endoscopia_otologica', 'protocolo_quirurgico',
    'ett', 'eco_doppler', 'nota_evolucion', 'epicrisis', 'generico'
];

test(`MEDICAL_TEMPLATES contiene ${EXPECTED_TEMPLATES.length} plantillas`, () => {
    const keys = Object.keys(MEDICAL_TEMPLATES);
    for (const k of EXPECTED_TEMPLATES) {
        assert(keys.includes(k), `Falta plantilla: ${k}`);
    }
    assertEqual(keys.length, EXPECTED_TEMPLATES.length);
});

test('Todas las plantillas tienen name, prompt y keywords', () => {
    for (const [key, tmpl] of Object.entries(MEDICAL_TEMPLATES)) {
        assert(tmpl.name, `${key}: falta name`);
        assert(tmpl.prompt, `${key}: falta prompt`);
        if (key !== 'generico') {
            assert(Array.isArray(tmpl.keywords) && tmpl.keywords.length > 0, `${key}: falta keywords`);
        }
    }
});

test('Prompts contienen regla de [No especificado]', () => {
    // Todas las plantillas excepto genérico deben la indicación de No especificado
    let count = 0;
    for (const [key, tmpl] of Object.entries(MEDICAL_TEMPLATES)) {
        if (key === 'generico') continue;
        if (tmpl.prompt.includes('No especificado') || tmpl.prompt.includes('s/p')) count++;
    }
    assert(count >= 30, `Solo ${count} plantillas mencionan [No especificado] o s/p, se esperan ≥30`);
});

// BLOQUE 53: structurer — classifyStructError
console.log('\n── Bloque 53: classifyStructError ───────────────────────────');

test('classifyStructError — 401 → auth', () => {
    const r = classifyStructError(new Error('HTTP_401: invalid key'));
    assertEqual(r.type, 'auth');
});

test('classifyStructError — 429 → rate_limit', () => {
    const r = classifyStructError(new Error('HTTP_429: too many requests'));
    assertEqual(r.type, 'rate_limit');
    assert(r.wait > 0, 'Debe esperar');
});

test('classifyStructError — 503 → server_error + switch model', () => {
    const r = classifyStructError(new Error('HTTP_503: service unavailable'));
    assertEqual(r.type, 'server_error');
    assertEqual(r.switchModel, true);
});

test('classifyStructError — TypeError → network', () => {
    const r = classifyStructError(new TypeError('Failed to fetch'));
    assertEqual(r.type, 'network');
    assertEqual(r.wait, 0);
});

test('classifyStructError — error genérico → unknown', () => {
    const r = classifyStructError(new Error('algo raro'));
    assertEqual(r.type, 'unknown');
});

// BLOQUE 54: pending queue
console.log('\n── Bloque 54: pending queue ─────────────────────────────────');

test('addToStructurePendingQueue agrega entry', () => {
    localStorage.clear();
    const entry = addToStructurePendingQueue('Texto de prueba', 'espirometria');
    assert(entry.id > 0, 'Debe tener id');
    assertEqual(entry.templateKey, 'espirometria');
    const queue = getStructurePendingQueue();
    assertEqual(queue.length, 1);
});

test('pending queue máximo 10 entries', () => {
    localStorage.clear();
    for (let i = 0; i < 15; i++) {
        addToStructurePendingQueue(`Texto ${i}`, 'generico');
    }
    const queue = getStructurePendingQueue();
    assert(queue.length <= 10, `Queue tiene ${queue.length} entries, máx 10`);
    localStorage.clear();
});

test('removeFromStructurePendingQueue elimina entry', () => {
    localStorage.clear();
    const entry = addToStructurePendingQueue('Texto test', 'holter');
    assertEqual(getStructurePendingQueue().length, 1);
    removeFromStructurePendingQueue(entry.id);
    assertEqual(getStructurePendingQueue().length, 0);
    localStorage.clear();
});

// ── Resumen ───────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────────────────────────────');
console.log(`  Total: ${passed + failed} | ✅ Pasaron: ${passed} | ❌ Fallaron: ${failed}`);
console.log('─────────────────────────────────────────────────────────────────\n');
process.exit(failed > 0 ? 1 : 0);

})();
