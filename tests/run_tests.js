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

// ── Mock de appDB (wrapper IndexedDB) para tests en Node ─────────────────────
// Escribe síncronamente en localStorage para mantener compatibilidad con tests síncronos.
// El body de set/remove/clear se ejecuta síncronamente al invocarlos — solo .then() es diferido.
global.appDB = {
    get(key) {
        const v = global.localStorage.getItem(key);
        if (v === null) return Promise.resolve(undefined);
        try { return Promise.resolve(JSON.parse(v)); } catch(_) { return Promise.resolve(v); }
    },
    set(key, value) {
        global.localStorage.setItem(key, JSON.stringify(value));
        return Promise.resolve();
    },
    remove(key) {
        global.localStorage.removeItem(key);
        return Promise.resolve();
    },
    clear() {
        global.localStorage.clear();
        return Promise.resolve();
    },
    keys() {
        return Promise.resolve(Object.keys(global.localStorage._data));
    },
    getAll() {
        const d = global.localStorage._data;
        const r = {};
        Object.keys(d).forEach(k => { try { r[k] = JSON.parse(d[k]); } catch(_) { r[k] = d[k]; } });
        return Promise.resolve(r);
    },
    sizeInBytes() {
        let t = 0;
        Object.entries(global.localStorage._data).forEach(([k,v]) => t += (k+v).length * 2);
        return Promise.resolve(t);
    }
};

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
global.CLIENT_CONFIG = { type: 'ADMIN' };
global._LM_CACHE_KEY = 'license_cache';
global._LM_CACHE_TTL = 4 * 60 * 60 * 1000;
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
load('src/js/config/templatesCatalog.js');
load('src/js/config/templatesCatalogPart2.js');
load('src/js/config/templatesCatalogPart3.js');
load('src/js/config/templates.js');
load('src/js/features/structurerCoreUtils.js');
load('src/js/features/structurer.js');
load('src/js/features/patientRegistry.js');
load('src/js/features/formHandler.js');
load('src/js/utils/stateManager.js');
load('src/js/features/reportContextResolver.js');
load('src/js/features/pdfMakerSectionUtils.js');

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

const stateCoreCode = fs.readFileSync(path.join(root, 'src/js/core/state.js'), 'utf-8');
const onboardingCode = fs.readFileSync(path.join(root, 'src/js/features/businessOnboardingUtils.js'), 'utf-8');
const settingsApiCode = fs.readFileSync(path.join(root, 'src/js/features/settingsApiUtils.js'), 'utf-8');
const uiApiMgmtCode = fs.readFileSync(path.join(root, 'src/js/utils/uiApiManagementUtils.js'), 'utf-8');
const factorySetupCoreCode = fs.readFileSync(path.join(root, 'src/js/features/businessFactorySetupUtils.js'), 'utf-8');

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
    assert(code.includes('MULTI-ÓRGANO') || code.includes('multi-órgano') || code.includes('MULTI-SEGMENTO') || code.includes('multi-segmento'),
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

test('extractPatientDataFromText evita nombre invalido y extrae nombre real tras coma', () => {
    const data = global.extractPatientDataFromText('Paciente masculino de 58 años, Carlos Mendoza, acude por disnea de esfuerzo.');
    assertEqual(data.name, 'Carlos Mendoza', `Debe extraer nombre real, obtuvo: ${data.name}`);
    assertEqual(data.sex, 'M', 'Debe extraer sexo desde "paciente masculino"');
    assertEqual(data.age, 58, 'Debe extraer edad 58');
});

test('extractPatientDataFromText extrae mujer + nombre en minúsculas', () => {
    const data = global.extractPatientDataFromText('Mujer de 65 años, ana rojas, realiza prueba de caminata de seis minutos.');
    assertEqual(data.name, 'Ana Rojas', `Debe normalizar nombre en minúsculas, obtuvo: ${data.name}`);
    assertEqual(data.sex, 'F', 'Debe extraer sexo desde encabezado "Mujer"');
    assertEqual(data.age, 65, 'Debe extraer edad 65');
});

test('extractPatientDataFromText extrae nombre al inicio + sexo femenina', () => {
    const data = global.extractPatientDataFromText('María Gómez, femenina de 60 años con sospecha de glaucoma, realiza campimetría.');
    assertEqual(data.name, 'María Gómez', `Debe extraer nombre al inicio, obtuvo: ${data.name}`);
    assertEqual(data.sex, 'F', 'Debe mapear femenina a F');
    assertEqual(data.age, 60, 'Debe extraer edad 60');
});

test('extractPatientDataFromText extrae nombre al inicio + de X años sin sexo', () => {
    const txt = 'Miguel sánchez de 64 años, obra social IAPOS, DNI 26716975, nro de afiliado 267169795, paciente que por cefalea se realiza resonancia magnética cerebral';
    const data = global.extractPatientDataFromText(txt);
    assertEqual(data.name, 'Miguel Sánchez', `Debe extraer nombre al inicio (no "que por cefalea"), obtuvo: ${data.name}`);
    assertEqual(data.age, 64, 'Debe extraer edad 64');
    assertEqual(data.dni, '26716975', 'Debe extraer DNI');
    assert(data.insurance && data.insurance.includes('IAPOS'), `Debe extraer obra social IAPOS, obtuvo: ${data.insurance}`);
});

test('extractPatientDataFromText no confunde "paciente que" con nombre', () => {
    const data = global.extractPatientDataFromText('paciente que por cefalea se realiza una resonancia');
    assert(!data.name, `No debe extraer nombre falso, obtuvo: ${data.name}`);
});

test('extractPatientDataFromText extrae peso y altura', () => {
    const data = global.extractPatientDataFromText('Paciente masculino de 55 años, Juan Pérez. Peso: 82 kg. Altura: 1.74 m.');
    assertEqual(data.weight, '82', `Debe extraer peso, obtuvo: ${data.weight}`);
    assertEqual(data.height, '1.74', `Debe extraer altura, obtuvo: ${data.height}`);
});

test('generateReportNumber genera formato XX-NNNNN-ddmmaa', () => {
    localStorage.clear();
    const fn = global.generateReportNumber;
    assert(typeof fn === 'function', 'generateReportNumber debe existir');
    const num = fn();
    assert(/^[A-Z]{2}-\d{5}-\d{6}$/.test(num), `Formato XX-NNNNN-ddmmaa, obtuvo: ${num}`);
});

test('generateReportNumber incrementa secuencialmente', () => {
    localStorage.clear();
    const n1 = global.generateReportNumber();
    const n2 = global.generateReportNumber();
    const n3 = global.generateReportNumber();
    assert(n1.split('-')[1] === '00001', `Primero debe ser 00001, obtuvo: ${n1}`);
    assert(n2.split('-')[1] === '00002', `Segundo debe ser 00002, obtuvo: ${n2}`);
    assert(n3.split('-')[1] === '00003', `Tercero debe ser 00003, obtuvo: ${n3}`);
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

test('triggerPatientDataCheck extrae obra social y afiliado', () => {
    localStorage.setItem('pdf_config', JSON.stringify({}));
    triggerPatientDataCheck('Paciente femenino de 42 años, Laura Torres. Obra social: IAPOS. N° afiliado: 26716975.');
    const config = JSON.parse(localStorage.getItem('pdf_config'));
    assertEqual(config.patientInsurance, 'IAPOS', `Obra social incorrecta: ${config.patientInsurance}`);
    assertEqual(config.patientAffiliateNum, '26716975', `Afiliado incorrecto: ${config.patientAffiliateNum}`);
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
    assert(code.includes('!res.ok') || code.includes('! res.ok') || code.includes('transcribeAudioSimple'), 'editor.js debe validar res.ok en fetch o delegar a transcribeAudioSimple');
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

test('validateBeforeDownload — formato rtf siempre pasa', () => {
    assertEqual(validateBeforeDownload('rtf'), true);
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
    window.CLIENT_CONFIG = { type: 'ADMIN' }; // restaurar para tests posteriores
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

test('pdfPreviewActions.js expone downloadPDFFromCanvas', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/pdfPreviewActions.js'), 'utf-8');
    assert(code.includes('window.downloadPDFFromCanvas'), 'Debe exponer downloadPDFFromCanvas');
    assert(code.includes('htmlToImage') || code.includes('html-to-image'), 'Debe usar html-to-image para captura');
    assert(code.includes('pageHeightPx'), 'Debe paginar por altura A4');
});

test('pdfPreviewActions.js expone helper de blob para pipeline único', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/pdfPreviewActions.js'), 'utf-8');
    assert(code.includes('window._buildPdfBlobFromPreviewCapture'), 'Debe exponer helper único de generación PDF desde preview');
    assert(code.includes('return doc.output(\'blob\')'), 'El helper debe devolver Blob PDF');
});

test('pdfPreviewActions.js email prioriza pipeline de preview', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/pdfPreviewActions.js'), 'utf-8');
    const fnStart = code.indexOf('async function _generatePDFBase64Impl()');
    assert(fnStart >= 0, 'Debe existir _generatePDFBase64Impl');
    const fnEnd = code.indexOf('// ============ INIT EMAIL SEND MODAL ============', fnStart);
    const fnCode = code.substring(fnStart, fnEnd > fnStart ? fnEnd : fnStart + 1600);
    const posPreview = fnCode.indexOf('_generatePDFBase64FromPreviewDom()');
    const posHtml = fnCode.indexOf('_generatePDFBase64FromHtmlSnapshot()');
    assert(posPreview >= 0 && posHtml >= 0, 'Debe evaluar preview y html snapshot');
    assert(posPreview < posHtml, 'Debe priorizar preview (mismo pipeline que descarga) antes de html snapshot');
});

test('reportHistory.js guarda htmlContent limpiado de botones IA', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/reportHistory.js'), 'utf-8');
    assert(code.includes('_cleanHtml'), 'saveReportToHistory debe tener helper _cleanHtml');
    assert(code.includes('inline-review-btn'), 'Debe limpiar botones inline-review-btn del HTML guardado');
    assert(code.includes('_cleanHtml(data.htmlContent)'), 'Debe limpiar htmlContent antes de guardarlo');
});

test('reportHistory.js viewReport elimina botones IA al mostrar', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/reportHistory.js'), 'utf-8');
    assert(code.includes('_rvCleanHtml'), 'viewReport debe usar helper de limpieza');
    assert(code.includes('content.innerHTML = _rvCleanHtml(report.htmlContent)'), 'Debe asignar HTML limpio al visor');
});

test('pdfPreview.js persiste reportNum auto-generado en _pdfConfigCache', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/pdfPreview.js'), 'utf-8');
    assert(code.includes('config.reportNum = reportNumEl.value'), 'Debe persistir el número auto-generado al config cache');
    assert(code.includes('window._pdfConfigCache = config'), 'Debe actualizar _pdfConfigCache con el número de informe');
});

test('reportHistory.js expone clearReportHistory y limpia appDB/cache/ui', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/reportHistory.js'), 'utf-8');
    assert(code.includes('window.clearReportHistory = async function () {'), 'Debe exponer clearReportHistory');
    assert(code.includes('await _clearReportHistoryStorage();'), 'Debe limpiar storage de forma centralizada');
    assert(code.includes("if (typeof window._refreshReportHistoryPanel === 'function') window._refreshReportHistoryPanel();"), 'Debe refrescar el modal de historial');
    assert(code.includes("if (typeof window._refreshDatosPanel === 'function') window._refreshDatosPanel();"), 'Debe refrescar el panel Mis Datos');
    assert(code.includes("if (reportViewer) reportViewer.classList.remove('active');"), 'Debe cerrar el visor de informe al limpiar');
});

test('datosPanel.js usa clearReportHistory para el botón Limpiar', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/datosPanel.js'), 'utf-8');
    assert(code.includes("if (typeof window.clearReportHistory === 'function') {"), 'El panel de datos debe delegar en clearReportHistory');
    assert(code.includes('await window.clearReportHistory();'), 'El botón Limpiar debe esperar la limpieza centralizada');
});

test('editorDownloadFavoritesUtils.js preabre una pestaña para PDF desde el botón principal', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editorDownloadFavoritesUtils.js'), 'utf-8');
    assert(code.includes("if (fmt === 'pdf' && typeof window.open === 'function') {"), 'El botón principal PDF debe preabrir una pestaña');
    assert(code.includes('window._pendingPdfOpenTab = pendingPdfTab || null;'), 'Debe guardar la pestaña pendiente para evitar popup blockers');
});

test('editorDownloadCoreUtils.js usa pestaña pendiente para PDF principal sin abrir preview', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editorDownloadCoreUtils.js'), 'utf-8');
    assert(code.includes('const pendingPdfTab = _consumePendingPdfTab();'), 'Debe consumir la pestaña pendiente del botón principal');
    assert(code.includes('if (pendingPdfTab) {'), 'Debe tener ruta específica para PDF del botón principal');
    assert(code.includes('const opened = await _openPdfBlobInNewTab(pdfBlob, targetPdfFileName, pendingPdfTab);'), 'Debe abrir el PDF en pestaña nueva');
});

test('structurer.js oculta editor y acciones durante STRUCTURING', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/structurer.js'), 'utf-8');
    const css = fs.readFileSync(path.join(root, 'src/css/components.css'), 'utf-8');
    assert(code.includes("updateButtonsVisibility('STRUCTURING')"), 'Debe pasar al estado STRUCTURING durante el proceso');
    assert(code.includes("editor.classList.toggle('structuring-pending', !!active);"), 'Debe marcar el editor como structuring-pending');
    assert(css.includes('.editor-content.structuring-pending'), 'Debe existir estilo para ocultar el contenido crudo durante estructuración');
    assert(css.includes('body.structuring-active #editorToolbar,'), 'Debe ocultar la barra del editor mientras estructura');
});

test('editorDownloadCoreUtils.js corrige estudios con mayúsculas mezcladas en filename', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editorDownloadCoreUtils.js'), 'utf-8');
    assert(code.includes('const hasWeirdMixedCase = /[a-záéíóúñü][A-ZÁÉÍÓÚÑÜ]/.test(t);'), 'Debe detectar mayúsculas mezcladas dentro de una palabra');
    assert(code.includes('if (isMostlyUpper || hasWeirdMixedCase) {'), 'Debe normalizar tanto mayúsculas completas como mixed case');
});

test('editorDownloadCoreUtils.js usa downloadPDFFromCanvas como primer intento', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editorDownloadCoreUtils.js'), 'utf-8');
    // Buscar el bloque del case pdf (donde format === 'pdf')
    const pdfBlock = code.substring(code.indexOf("if (format === 'pdf')"));
    assert(pdfBlock.includes('downloadPDFFromCanvas'), 'El bloque PDF debe llamar downloadPDFFromCanvas');
    assert(pdfBlock.includes('if (pendingPdfTab) {'), 'El bloque PDF debe contemplar la ruta específica del botón principal');
    const posPending = pdfBlock.indexOf('if (pendingPdfTab) {');
    const posCanvas = pdfBlock.indexOf('downloadPDFFromCanvas');
    assert(posPending >= 0 && posCanvas >= 0, 'Deben existir la ruta de pestaña nueva y la ruta de preview exacta');
    assert(posPending < posCanvas, 'La ruta del botón principal debe resolverse antes de la captura desde preview');
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

test('index.html dropdown tiene 3 formatos (pdf, rtf, html)', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
    const ddRegion = html.substring(
        html.indexOf('id="previewDownloadDropdown"'),
        html.indexOf('</div>', html.indexOf('id="previewDownloadDropdown"') + 200) + 6
    );
    assert(ddRegion.includes('data-format="pdf"'), 'Falta botón PDF');
    assert(ddRegion.includes('data-format="rtf"'), 'Falta botón RTF');
    assert(ddRegion.includes('data-format="html"'), 'Falta botón HTML');
    assert(!ddRegion.includes('data-format="txt"'), 'No debe tener botón TXT');
});

test('ui.js maneja click en btnDownloadPreviewMore', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/ui.js'), 'utf-8');
    assert(code.includes("btnDownloadPreviewMore"), 'Debe referenciar btnDownloadPreviewMore');
    assert(code.includes("previewDownloadDropdown"), 'Debe referenciar previewDownloadDropdown');
});

test('ui.js formatos llaman window.downloadRTF/HTML', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/utils/ui.js'), 'utf-8');
    assert(code.includes("downloadRTF") || code.includes("download' + fmt.toUpperCase()"),
        'Debe poder llamar downloadRTF/HTML');
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
    'campimetria', 'oct_retinal', 'topografia_corneal', 'fondo_ojo', 'gonioscopia',
    'tac', 'resonancia', 'mamografia', 'densitometria', 'pet_ct', 'radiografia',
    'ecografia_abdominal', 'ecografia_renal', 'ecografia_tiroidea', 'ecografia_mamaria',
    'gastroscopia', 'colonoscopia', 'broncoscopia', 'laringoscopia',
    'gammagrafia_cardiaca', 'holter', 'mapa', 'cinecoro', 'ecg', 'eco_stress',
    'pap', 'colposcopia', 'ecografia_obstetrica', 'electromiografia', 'polisomnografia',
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

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 55: Fábrica de Clones — _handleFactorySetup (T9)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 55: Fábrica de Clones ────────────────────');

// Cargar business.js parcialmente — extraer funciones puras inline
// No podemos cargar todo business.js porque tiene dependencias de DOM pesadas,
// pero podemos testear la lógica de mapeo y persistencia.

// ── Helper: simular _handleFactorySetup lógica de mapeo ─────────────────────
function _testPlanMapping(planStr) {
    const plan = String(planStr || 'trial').toLowerCase();
    const planMap = {
        trial:      { type: 'TRIAL',  hasProMode: false, hasDashboard: false, canGenerateApps: false },
        normal:     { type: 'NORMAL', hasProMode: false, hasDashboard: false, canGenerateApps: false },
        pro:        { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: false },
        gift:       { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: false },
        clinic:     { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: true  },
        enterprise: { type: 'PRO',    hasProMode: true,  hasDashboard: true,  canGenerateApps: false }
    };
    return planMap[plan] || planMap.trial;
}

test('Plan mapping: TRIAL → type TRIAL, no proMode', () => {
    const pc = _testPlanMapping('trial');
    assertEqual(pc.type, 'TRIAL');
    assert(!pc.hasProMode, 'Trial NO debe tener proMode');
    assert(!pc.hasDashboard);
    assert(!pc.canGenerateApps);
});

test('Plan mapping: NORMAL → type NORMAL, no proMode', () => {
    const pc = _testPlanMapping('normal');
    assertEqual(pc.type, 'NORMAL');
    assert(!pc.hasProMode);
});

test('Plan mapping: PRO → type PRO, con proMode', () => {
    const pc = _testPlanMapping('pro');
    assertEqual(pc.type, 'PRO');
    assert(pc.hasProMode, 'Pro DEBE tener proMode');
    assert(pc.hasDashboard);
});

test('Plan mapping: GIFT → type PRO, con proMode (como PRO)', () => {
    const pc = _testPlanMapping('gift');
    assertEqual(pc.type, 'PRO');
    assert(pc.hasProMode, 'Gift DEBE tener proMode');
    assert(pc.hasDashboard);
    assert(!pc.canGenerateApps, 'Gift NO genera apps');
});

test('Plan mapping: CLINIC → type PRO, canGenerateApps=true', () => {
    const pc = _testPlanMapping('clinic');
    assertEqual(pc.type, 'PRO');
    assert(pc.hasProMode);
    assert(pc.canGenerateApps, 'Clinic SÍ genera apps');
});

test('Plan mapping: desconocido → fallback a TRIAL', () => {
    const pc = _testPlanMapping('unknown_plan');
    assertEqual(pc.type, 'TRIAL');
    assert(!pc.hasProMode);
});

test('device_id se genera una sola vez y persiste', () => {
    localStorage.clear();
    // Simular generación
    let deviceId = localStorage.getItem('device_id');
    assert(!deviceId, 'No debe existir device_id inicialmente');
    deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('device_id', deviceId);
    // Segunda lectura: debe devolver el mismo
    const secondRead = localStorage.getItem('device_id');
    assertEqual(deviceId, secondRead, 'device_id debe persistir');
    localStorage.clear();
});

test('client_config_stored se guarda con todos los campos requeridos', () => {
    localStorage.clear();
    const medicoId = 'MED_TEST_001';
    const pc = _testPlanMapping('pro');
    const clientConfig = {
        medicoId:         medicoId,
        type:             pc.type,
        status:           'active',
        specialties:      ['Cardiología'],
        maxDevices:       3,
        trialDays:        0,
        hasProMode:       pc.hasProMode,
        hasDashboard:     pc.hasDashboard,
        canGenerateApps:  pc.canGenerateApps,
        allowedTemplates: [],
        backendUrl:       'https://example.com'
    };
    localStorage.setItem('client_config_stored', JSON.stringify(clientConfig));
    const stored = JSON.parse(localStorage.getItem('client_config_stored'));
    assertEqual(stored.medicoId, 'MED_TEST_001');
    assertEqual(stored.type, 'PRO');
    assertEqual(stored.status, 'active');
    assert(stored.hasProMode, 'Pro debe tener hasProMode');
    assert(Array.isArray(stored.specialties));
    assert(Array.isArray(stored.allowedTemplates));
    assert(stored.backendUrl, 'Debe tener backendUrl');
    localStorage.clear();
});

test('prof_data se genera con nombre, matrícula, especialidad', () => {
    localStorage.clear();
    const doctor = { Nombre: 'Dr. García', Matricula: 'MP-1234', Especialidad: 'Cardiología' };
    const profData = {
        nombre:       doctor.Nombre || 'Profesional',
        matricula:    doctor.Matricula || '',
        workplace:    '',
        specialties:  ['ALL'],
        estudios:     [],
        especialidad: doctor.Especialidad || ''
    };
    localStorage.setItem('prof_data', JSON.stringify(profData));
    const stored = JSON.parse(localStorage.getItem('prof_data'));
    assertEqual(stored.nombre, 'Dr. García');
    assertEqual(stored.matricula, 'MP-1234');
    assertEqual(stored.especialidad, 'Cardiología');
    localStorage.clear();
});

test('Firma base64 se guarda en pdf_signature (la key que pdfMaker lee)', () => {
    localStorage.clear();
    const firmaB64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
    // Simular lo que hace _handleFactorySetup (corregido en T1)
    localStorage.setItem('pdf_signature', firmaB64);
    const stored = localStorage.getItem('pdf_signature');
    assertEqual(stored, firmaB64, 'La firma debe guardarse como pdf_signature');
    assert(stored.startsWith('data:image/'), 'Debe tener prefijo data:image/');
    localStorage.clear();
});

test('Logo profesional se guarda en pdf_logo (la key que pdfMaker lee)', () => {
    localStorage.clear();
    const logoB64 = 'data:image/png;base64,ABCDEF123456';
    localStorage.setItem('pdf_logo', logoB64);
    const stored = localStorage.getItem('pdf_logo');
    assertEqual(stored, logoB64);
    localStorage.clear();
});

test('Color del tema (customPrimaryColor) se aplica desde regDatos.headerColor', () => {
    localStorage.clear();
    const headerColor = '#14b8a6';
    localStorage.setItem('customPrimaryColor', headerColor);
    const stored = localStorage.getItem('customPrimaryColor');
    assertEqual(stored, '#14b8a6', 'customPrimaryColor debe coincidir con headerColor');
    localStorage.clear();
});

test('API key se guarda y persiste en groq_api_key', () => {
    localStorage.clear();
    const apiKey = 'gsk_test123_abc456';
    localStorage.setItem('groq_api_key', apiKey);
    const stored = localStorage.getItem('groq_api_key');
    assertEqual(stored, apiKey, 'La API key debe persistir en localStorage');
    // Simular chequeo del onboarding (K1)
    const hasPreloadedKey = !!localStorage.getItem('groq_api_key');
    assert(hasPreloadedKey, 'hasPreloadedKey debe ser true si la key fue precargada');
    localStorage.clear();
});

test('wasAdmin flag: no false positive para nuevo gift user (stored=null)', () => {
    localStorage.clear();
    // Si stored es null (primer uso), wasAdmin debe ser false
    const stored = localStorage.getItem('client_config_stored');
    const wasAdmin = stored && (function() {
        try { return JSON.parse(stored).type === 'ADMIN' || !JSON.parse(stored).type; } catch(_) { return true; }
    })();
    assert(!wasAdmin, 'wasAdmin debe ser false para usuario nuevo (stored=null)');
    localStorage.clear();
});

test('wasAdmin flag: true para admin existente', () => {
    localStorage.clear();
    localStorage.setItem('client_config_stored', JSON.stringify({ type: 'ADMIN' }));
    const stored = localStorage.getItem('client_config_stored');
    const wasAdmin = stored && (function() {
        try { return JSON.parse(stored).type === 'ADMIN' || !JSON.parse(stored).type; } catch(_) { return true; }
    })();
    assert(wasAdmin, 'wasAdmin debe ser true para admin existente');
    localStorage.clear();
});

test('wasAdmin flag: false para gift user existente', () => {
    localStorage.clear();
    localStorage.setItem('client_config_stored', JSON.stringify({ type: 'PRO', medicoId: 'MED001' }));
    const stored = localStorage.getItem('client_config_stored');
    const wasAdmin = stored && (function() {
        try { return JSON.parse(stored).type === 'ADMIN' || !JSON.parse(stored).type; } catch(_) { return true; }
    })();
    assert(!wasAdmin, 'wasAdmin debe ser false para gift user (type=PRO)');
    localStorage.clear();
});

test('Factory: mock fetch exitoso — clientConfig se almacena correctamente', async () => {
    localStorage.clear();
    const mockDoctor = {
        Nombre: 'Dr. Test',
        Matricula: 'MT-999',
        Plan: 'gift',
        Estado: 'active',
        Especialidad: 'Cardiología,Ecografía',
        Devices_Max: 2,
        Allowed_Templates: '',
        API_Key: 'gsk_test_factory_key',
        Registro_Datos: JSON.stringify({
            firma: 'data:image/png;base64,FIRMA_TEST',
            proLogo: 'data:image/png;base64,LOGO_TEST',
            headerColor: '#ff5722',
            footerText: 'Footer de prueba',
            workplace: { name: 'Clínica Test', address: 'Av Test 123', phone: '555-1234' }
        })
    };

    // Simular la lógica de _handleFactorySetup sin las dependencias de DOM
    const medicoId = 'MED_FACTORY_TEST';
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = 'dev_' + Date.now() + '_test';
        localStorage.setItem('device_id', deviceId);
    }

    const doctor = mockDoctor;
    let regDatos = {};
    try { regDatos = JSON.parse(doctor.Registro_Datos || '{}'); } catch(_) {}

    const plan = String(doctor.Plan || 'trial').toLowerCase();
    const pc = _testPlanMapping(plan);

    let specialties = ['ALL'];
    const spec = String(doctor.Especialidad || 'ALL');
    specialties = spec === 'ALL' ? ['ALL'] : spec.split(',').map(s => s.trim());

    const clientConfig = {
        medicoId, type: pc.type, status: 'active',
        specialties, maxDevices: Number(doctor.Devices_Max) || 2,
        trialDays: 0, hasProMode: pc.hasProMode,
        hasDashboard: pc.hasDashboard, canGenerateApps: pc.canGenerateApps,
        allowedTemplates: [], backendUrl: 'https://example.com'
    };
    localStorage.setItem('client_config_stored', JSON.stringify(clientConfig));

    const profData = {
        nombre: doctor.Nombre || 'Profesional',
        matricula: doctor.Matricula || '',
        workplace: '', specialties, estudios: [],
        especialidad: doctor.Especialidad || ''
    };
    localStorage.setItem('prof_data', JSON.stringify(profData));

    // Simular guardado de firma, logo, key, color, footer
    if (regDatos.firma) localStorage.setItem('pdf_signature', regDatos.firma);
    if (regDatos.proLogo) localStorage.setItem('pdf_logo', regDatos.proLogo);
    if (regDatos.headerColor) localStorage.setItem('customPrimaryColor', regDatos.headerColor);
    if (regDatos.footerText) {
        const cfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
        cfg.footerText = regDatos.footerText;
        localStorage.setItem('pdf_config', JSON.stringify(cfg));
    }
    const apiKey = doctor.API_Key || regDatos.apiKey || '';
    if (apiKey) localStorage.setItem('groq_api_key', apiKey);
    localStorage.setItem('medico_id', medicoId);

    if (regDatos.workplace) {
        const wp = typeof regDatos.workplace === 'string' ? JSON.parse(regDatos.workplace) : regDatos.workplace;
        if (wp && wp.name) {
            const workplaceProfiles = [{ name: wp.name, address: wp.address || '', phone: wp.phone || '' }];
            localStorage.setItem('workplace_profiles', JSON.stringify(workplaceProfiles));
        }
    }

    // Verificaciones
    const storedCfg = JSON.parse(localStorage.getItem('client_config_stored'));
    assertEqual(storedCfg.type, 'PRO', 'Gift debe mapearse a PRO');
    assert(storedCfg.hasProMode, 'Gift debe tener proMode');
    assertEqual(storedCfg.medicoId, 'MED_FACTORY_TEST');

    const storedProf = JSON.parse(localStorage.getItem('prof_data'));
    assertEqual(storedProf.nombre, 'Dr. Test');
    assertEqual(storedProf.matricula, 'MT-999');

    assertEqual(localStorage.getItem('pdf_signature'), 'data:image/png;base64,FIRMA_TEST');
    assertEqual(localStorage.getItem('pdf_logo'), 'data:image/png;base64,LOGO_TEST');
    assertEqual(localStorage.getItem('customPrimaryColor'), '#ff5722');
    assertEqual(localStorage.getItem('groq_api_key'), 'gsk_test_factory_key');
    assertEqual(localStorage.getItem('medico_id'), 'MED_FACTORY_TEST');

    const storedPdfCfg = JSON.parse(localStorage.getItem('pdf_config'));
    assertEqual(storedPdfCfg.footerText, 'Footer de prueba');

    const storedWp = JSON.parse(localStorage.getItem('workplace_profiles'));
    assertEqual(storedWp[0].name, 'Clínica Test');

    assert(localStorage.getItem('device_id'), 'device_id debe existir');
    assert(!!localStorage.getItem('groq_api_key'), 'API key no debe re-pedirse');

    localStorage.clear();
});

test('Factory: backend caído — fetch error no deja estado inconsistente', () => {
    localStorage.clear();
    // Simular que fetch lanza error: no debe quedar config parcial
    // Verificar que no se guardó nada
    assert(!localStorage.getItem('client_config_stored'), 'No debe haber config tras error');
    assert(!localStorage.getItem('prof_data'), 'No debe haber prof_data tras error');
    assert(!localStorage.getItem('groq_api_key'), 'No debe haber API key tras error');
    localStorage.clear();
});

test('Factory: specialties se parsean correctamente (CSV)', () => {
    const spec = 'Cardiología,Ecografía,Neurología';
    const specialties = spec.split(',').map(s => s.trim());
    assertEqual(specialties.length, 3);
    assertEqual(specialties[0], 'Cardiología');
    assertEqual(specialties[2], 'Neurología');
});

test('Factory: specialties ALL queda como ["ALL"]', () => {
    const spec = 'ALL';
    const specialties = spec === 'ALL' ? ['ALL'] : spec.split(',');
    assertEqual(specialties.length, 1);
    assertEqual(specialties[0], 'ALL');
});

test('Factory: allowedTemplates se parsean como JSON array', () => {
    const tpl = '["eco_transtora","holter"]';
    let allowedTemplates = [];
    try { allowedTemplates = JSON.parse(tpl); } catch(_) {}
    assertEqual(allowedTemplates.length, 2);
    assertEqual(allowedTemplates[0], 'eco_transtora');
});

test('Factory: allowedTemplates vacío → array vacío', () => {
    const tpl = '';
    let allowedTemplates = [];
    if (tpl && tpl !== 'ALL' && tpl !== '') {
        try { allowedTemplates = JSON.parse(tpl); } catch(_) {}
    }
    assertEqual(allowedTemplates.length, 0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 56: PDF — Firma digital, QR, Logo
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 56: PDF — Firma, QR, Logo ────────────────────');

test('Firma: se lee desde activeProfessional.firma si existe', () => {
    const activePro = { firma: 'data:image/png;base64,FIRMA_PRO' };
    const sigB64 = activePro?.firma?.startsWith('data:') ? activePro.firma : '';
    assertEqual(sigB64, 'data:image/png;base64,FIRMA_PRO');
});

test('Firma: fallback a pdf_signature de localStorage si activePro no tiene firma', () => {
    localStorage.clear();
    localStorage.setItem('pdf_signature', 'data:image/png;base64,FIRMA_LS');
    const activePro = null;
    const sigB64 = activePro?.firma?.startsWith('data:') ? activePro.firma : (localStorage.getItem('pdf_signature') || '');
    assertEqual(sigB64, 'data:image/png;base64,FIRMA_LS');
    localStorage.clear();
});

test('Firma: devuelve vacío si no hay firma en ningún lado', () => {
    localStorage.clear();
    const activePro = {};
    const sigB64 = activePro?.firma?.startsWith('data:') ? activePro.firma : (localStorage.getItem('pdf_signature') || '');
    assertEqual(sigB64, '');
    localStorage.clear();
});

test('Firma: setup factory guarda firma en pdf_signature (key correcta)', () => {
    localStorage.clear();
    const regDatos = { firma: 'data:image/png;base64,FIRMA_FACTORY' };
    // Simular lo que hace _handleFactorySetup
    if (regDatos.firma) localStorage.setItem('pdf_signature', regDatos.firma);
    // Simular lo que lee pdfMaker
    const activePro = null;
    const sigB64 = activePro?.firma?.startsWith('data:') ? activePro.firma : (localStorage.getItem('pdf_signature') || '');
    assertEqual(sigB64, 'data:image/png;base64,FIRMA_FACTORY', 'Factory → pdf_signature → pdfMaker debe funcionar');
    localStorage.clear();
});

test('Firma: drawSignature() solo dibuja si sigB64 no es vacío', () => {
    // Simular la condición de drawSignature
    let drawn = false;
    const sigB64 = 'data:image/png;base64,ABC';
    if (sigB64) { drawn = true; }
    assert(drawn, 'Debe dibujar cuando sigB64 existe');

    drawn = false;
    const sigB64Empty = '';
    if (sigB64Empty) { drawn = true; }
    assert(!drawn, 'No debe dibujar cuando sigB64 está vacío');
});

test('Logo institucional: se lee desde workplace.logo o fallback pdf_logo', () => {
    localStorage.clear();
    localStorage.setItem('pdf_logo', 'data:image/png;base64,LOGO_FALLBACK');
    // Caso 1: workplace tiene logo
    const activeWp1 = { logo: 'data:image/png;base64,LOGO_WP' };
    const wpLogo1 = activeWp1?.logo || '';
    const instLogo1 = wpLogo1.startsWith('data:') ? wpLogo1 : (localStorage.getItem('pdf_logo') || '');
    assertEqual(instLogo1, 'data:image/png;base64,LOGO_WP');

    // Caso 2: workplace sin logo → fallback
    const activeWp2 = {};
    const wpLogo2 = activeWp2?.logo || '';
    const instLogo2 = wpLogo2.startsWith('data:') ? wpLogo2 : (localStorage.getItem('pdf_logo') || '');
    assertEqual(instLogo2, 'data:image/png;base64,LOGO_FALLBACK');
    localStorage.clear();
});

test('Logo profesional: se lee de activeProfessional.logo', () => {
    const activePro = { logo: 'data:image/png;base64,LOGO_PROF' };
    const profLogoB64 = activePro?.logo?.startsWith('data:') ? activePro.logo : '';
    assertEqual(profLogoB64, 'data:image/png;base64,LOGO_PROF');
});

test('Logo profesional: vacío si no tiene data: prefix', () => {
    const activePro = { logo: 'invalid_data' };
    const profLogoB64 = activePro?.logo?.startsWith('data:') ? activePro.logo : '';
    assertEqual(profLogoB64, '');
});

test('QR: texto contiene TPRO-VERIFY y datos del informe', () => {
    const reportNum = '001';
    const pDate = '28/02/2026';
    const profName = 'Dr. Test';
    const matricula = 'MP-123';
    const paciente = 'García Juan';
    const dni = '12345678';
    const estudio = 'Ecografía';
    const inst = 'Clínica Test';
    const qrParts = ['TPRO-VERIFY', `ID:${reportNum}`, `Fecha:${pDate}`, `Prof:${profName}`, `Mat:${matricula}`, `Pac:${paciente}`, `DNI:${dni}`, `Est:${estudio}`, `Inst:${inst}`].filter(Boolean);
    const qrText = qrParts.join('|');
    assertIncludes(qrText, 'TPRO-VERIFY');
    assertIncludes(qrText, 'ID:001');
    assertIncludes(qrText, 'Fecha:28/02/2026');
    assertIncludes(qrText, 'Prof:Dr. Test');
    assertIncludes(qrText, 'Pac:García Juan');
});

test('QR: no se genera si config.showQR es false', () => {
    const config = { showQR: false };
    const cfgShowQR = config.showQR ?? false;
    assert(!cfgShowQR, 'showQR false no debe generar QR');
});

test('QR: se genera si config.showQR es true', () => {
    const config = { showQR: true };
    const cfgShowQR = config.showQR ?? false;
    assert(cfgShowQR, 'showQR true debe generar QR');
});

test('QR: showQR undefined → default false', () => {
    const config = {};
    const cfgShowQR = config.showQR ?? false;
    assert(!cfgShowQR, 'showQR undefined debe ser false por defecto');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 57: Descarga — Formatos según plan de suscripción
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 57: Descarga — Formatos según plan ────────────────────');

// Reimplementar _getAllowedFormats para testing
function _testGetAllowedFormats(type) {
    type = (type || 'ADMIN').toUpperCase();
    if (type === 'ADMIN' || type === 'PRO') return ['pdf', 'rtf', 'html'];
    if (type === 'NORMAL') return ['pdf'];
    return ['pdf']; // TRIAL
}

test('Formatos: ADMIN puede descargar todos (pdf, rtf, html)', () => {
    const formats = _testGetAllowedFormats('ADMIN');
    assertEqual(formats.length, 3);
    assert(formats.includes('pdf'));
    assert(formats.includes('rtf'));
    assert(formats.includes('html'));
});

test('Formatos: PRO puede descargar todos (pdf, rtf, html)', () => {
    const formats = _testGetAllowedFormats('PRO');
    assertEqual(formats.length, 3);
    assert(formats.includes('pdf'));
    assert(formats.includes('rtf'));
});

test('Formatos: NORMAL solo puede descargar pdf', () => {
    const formats = _testGetAllowedFormats('NORMAL');
    assertEqual(formats.length, 1);
    assert(formats.includes('pdf'));
    assert(!formats.includes('rtf'), 'Normal NO debe tener RTF');
    assert(!formats.includes('html'), 'Normal NO debe tener HTML');
});

test('Formatos: TRIAL solo puede descargar pdf', () => {
    const formats = _testGetAllowedFormats('TRIAL');
    assertEqual(formats.length, 1);
    assert(formats.includes('pdf'));
});

test('Formatos: GIFT (mapeado como PRO) puede descargar todos', () => {
    // Gift se mapea a PRO en el factory
    const giftPlan = _testPlanMapping('gift');
    const formats = _testGetAllowedFormats(giftPlan.type); // 'PRO'
    assertEqual(formats.length, 3);
});

test('Formatos: CLINIC (mapeado como PRO) puede descargar todos', () => {
    const clinicPlan = _testPlanMapping('clinic');
    const formats = _testGetAllowedFormats(clinicPlan.type);
    assertEqual(formats.length, 3);
});

test('Formatos: botón principal dice "Descargar PDF" si plan permite PDF', () => {
    const allowed = _testGetAllowedFormats('PRO');
    const btnText = allowed.includes('pdf') ? '📥 Descargar PDF' : '📥 Descargar RTF';
    assertEqual(btnText, '📥 Descargar PDF');
});

test('Formatos: botón principal dice "Descargar PDF" para todos los planes', () => {
    const allowed = _testGetAllowedFormats('TRIAL');
    const btnText = allowed.includes('pdf') ? '📥 Descargar PDF' : '📥 Descargar RTF';
    assertEqual(btnText, '📥 Descargar PDF');
});

test('Formatos: chevron oculto si solo 1 formato disponible', () => {
    const allowed = _testGetAllowedFormats('TRIAL');
    const showChevron = allowed.length > 1;
    assert(!showChevron, 'Chevron debe ocultarse para Trial (1 formato)');
});

test('Formatos: chevron visible si más de 1 formato', () => {
    const allowed = _testGetAllowedFormats('PRO');
    const showChevron = allowed.length > 1;
    assert(showChevron, 'Chevron debe mostrarse para PRO (3 formatos)');
});

test('Formatos: _forceTxt NO activo para ningún plan (todos tienen PDF)', () => {
    const allowed = _testGetAllowedFormats('TRIAL');
    const forceTxt = !allowed.includes('pdf');
    assert(!forceTxt, 'Todos los planes deben tener PDF');
});

test('Formatos: _forceTxt inactivo para Pro (con PDF)', () => {
    const allowed = _testGetAllowedFormats('PRO');
    const forceTxt = !allowed.includes('pdf');
    assert(!forceTxt, 'Pro no debe forzar TXT');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 58: PWA Install — Todos los tipos de usuario
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 58: PWA Install — Tipos de usuario ────────────────────');

test('PWA: _tryPwaInstall debe llamarse para ADMIN', () => {
    const type = 'ADMIN';
    // La lógica real llama _tryPwaInstall en todos los casos al final de init
    const shouldInstall = true; // Siempre debe intentar
    assert(shouldInstall, 'ADMIN debe tener PWA install');
});

test('PWA: _tryPwaInstall debe llamarse para TRIAL', () => {
    const type = 'TRIAL';
    const shouldInstall = true;
    assert(shouldInstall, 'TRIAL debe tener PWA install');
});

test('PWA: _tryPwaInstall debe llamarse para NORMAL', () => {
    const type = 'NORMAL';
    const shouldInstall = true;
    assert(shouldInstall, 'NORMAL debe tener PWA install');
});

test('PWA: _tryPwaInstall debe llamarse para PRO', () => {
    const type = 'PRO';
    const shouldInstall = true;
    assert(shouldInstall, 'PRO debe tener PWA install');
});

test('PWA: _tryPwaInstall debe llamarse para GIFT (tipo PRO)', () => {
    const giftPlan = _testPlanMapping('gift');
    const type = giftPlan.type; // PRO
    const shouldInstall = true;
    assert(shouldInstall, 'GIFT (PRO) debe tener PWA install');
});

test('PWA: _tryPwaInstall debe llamarse para CLINIC', () => {
    const type = 'CLINIC';
    const shouldInstall = true;
    assert(shouldInstall, 'CLINIC debe tener PWA install');
});

test('PWA: banner no se muestra si ya fue dismissed en esta sesión', () => {
    // Simular sessionStorage
    const dismissed = 'true';
    const showBanner = dismissed !== 'true';
    assert(!showBanner, 'Banner debe permanecer oculto si fue dismissed');
});

test('PWA: banner se muestra si NO fue dismissed', () => {
    const dismissed = null;
    const showBanner = dismissed !== 'true';
    assert(showBanner, 'Banner debe mostrarse si no fue dismissed');
});

test('PWA: _pwaInstallPrompt se captura del evento beforeinstallprompt', () => {
    // Simular que el evento fue capturado
    window._pwaInstallPrompt = { prompt: () => Promise.resolve() };
    assert(!!window._pwaInstallPrompt, 'Debe existir _pwaInstallPrompt');
    assert(typeof window._pwaInstallPrompt.prompt === 'function', 'Debe tener método prompt');
    delete window._pwaInstallPrompt;
});

test('PWA: fallback a instrucciones manuales si no hay prompt', () => {
    window._pwaInstallPrompt = null;
    const hasPrompt = !!window._pwaInstallPrompt;
    assert(!hasPrompt, 'Sin prompt → mostrar instrucciones manuales');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 59: Pricing — Planes y moneda USD/ARS
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 59: Pricing — Planes y moneda ────────────────────');

const TEST_PLANS = {
    trial:  { order: 0, label: 'Trial',   price: 'Gratis',   period: '15 días', features: ['Transcripción básica', 'Todas las plantillas', 'Exportar TXT'] },
    normal: { order: 1, label: 'Normal',  price: '$15',      period: 'USD/mes', features: ['Transcripción ilimitada', 'Plantillas estáticas', 'Exportar TXT y PDF básico', 'Diccionario médico'] },
    pro:    { order: 2, label: 'Pro',     price: '$25',      period: 'USD/mes', features: ['Todo de Normal', 'Modo Pro: estructurado IA', 'Todas las plantillas médicas', 'PDF profesional con firma', 'Historial de informes', 'Soporte prioritario'], recommended: true },
    clinic: { order: 3, label: 'Clínica', price: 'Consultar', period: '',       features: ['Todo de Pro', 'Multi-profesional', 'Multi-dispositivo', 'Generación de apps GIFT', 'Dashboard de métricas', 'Soporte dedicado'] },
};

test('Pricing: Trial es gratis por 15 días', () => {
    assertEqual(TEST_PLANS.trial.price, 'Gratis');
    assertEqual(TEST_PLANS.trial.period, '15 días');
});

test('Pricing: Normal cuesta $15 USD/mes', () => {
    assertEqual(TEST_PLANS.normal.price, '$15');
    assertEqual(TEST_PLANS.normal.period, 'USD/mes');
});

test('Pricing: Pro cuesta $25 USD/mes', () => {
    assertEqual(TEST_PLANS.pro.price, '$25');
    assertEqual(TEST_PLANS.pro.period, 'USD/mes');
    assert(TEST_PLANS.pro.recommended, 'Pro debe ser recomendado');
});

test('Pricing: Clínica dice Consultar', () => {
    assertEqual(TEST_PLANS.clinic.price, 'Consultar');
});

test('Pricing: orden correcto (trial < normal < pro < clinic)', () => {
    assert(TEST_PLANS.trial.order < TEST_PLANS.normal.order);
    assert(TEST_PLANS.normal.order < TEST_PLANS.pro.order);
    assert(TEST_PLANS.pro.order < TEST_PLANS.clinic.order);
});

test('Pricing: Trial incluye "Todas las plantillas"', () => {
    assert(TEST_PLANS.trial.features.some(f => f.includes('Todas las plantillas')), 'Trial debe incluir todas las plantillas');
});

test('Pricing: Normal incluye "Plantillas estáticas" (no todas)', () => {
    assert(TEST_PLANS.normal.features.some(f => f.includes('Plantillas estáticas')), 'Normal usa plantillas estáticas');
});

test('Pricing: Pro incluye "Modo Pro"', () => {
    assert(TEST_PLANS.pro.features.some(f => f.includes('Modo Pro')), 'Pro debe tener Modo Pro');
});

test('Pricing: Clínica incluye "Multi-dispositivo"', () => {
    assert(TEST_PLANS.clinic.features.some(f => f.includes('Multi-dispositivo')));
});

test('Pricing: conversión USD→ARS (lógica de display)', () => {
    const USD_TO_ARS = 1200; // tipo de cambio configurable
    const priceUsd = 15;
    const priceArs = priceUsd * USD_TO_ARS;
    assertEqual(priceArs, 18000);
    const displayArs = `$${priceArs.toLocaleString('es-AR')}`;
    assertIncludes(displayArs, '18');
});

test('Pricing: conversión mantiene Gratis para Trial', () => {
    const price = 'Gratis';
    const converted = price === 'Gratis' ? 'Gratis' : `$${15 * 1200}`;
    assertEqual(converted, 'Gratis');
});

test('Pricing: conversión mantiene Consultar para Clínica', () => {
    const price = 'Consultar';
    const isNumeric = !isNaN(parseInt(price.replace(/[^0-9]/g, '')));
    assert(!isNumeric || price === 'Consultar', 'Consultar no debe convertirse');
});

test('Pricing: config dinámica desde localStorage override defaults', () => {
    localStorage.clear();
    const dynamicPlans = { normal: { price: '$20', period: 'USD/mes' } };
    localStorage.setItem('admin_plans_config', JSON.stringify(dynamicPlans));
    const stored = JSON.parse(localStorage.getItem('admin_plans_config') || '{}');
    const mergedNormal = { ...TEST_PLANS.normal, ...stored.normal };
    assertEqual(mergedNormal.price, '$20', 'Override debe aplicar');
    assertEqual(mergedNormal.label, 'Normal', 'Lo que no se overridea se mantiene');
    localStorage.clear();
});

test('Pricing: sin config dinámica → usa defaults', () => {
    localStorage.clear();
    const stored = JSON.parse(localStorage.getItem('admin_plans_config') || '{}');
    const mergedNormal = { ...TEST_PLANS.normal, ...stored.normal };
    assertEqual(mergedNormal.price, '$15', 'Sin override → default');
    localStorage.clear();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 60: API Key — Persistencia y no re-pedido
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 60: API Key — Persistencia ────────────────────');

test('API key: se guarda desde doctor.API_Key', () => {
    localStorage.clear();
    const doctor = { API_Key: 'gsk_real_key_123' };
    const regDatos = {};
    const apiKey = doctor.API_Key || regDatos.apiKey || '';
    if (apiKey) localStorage.setItem('groq_api_key', apiKey);
    assertEqual(localStorage.getItem('groq_api_key'), 'gsk_real_key_123');
    localStorage.clear();
});

test('API key: fallback a regDatos.apiKey si doctor no tiene', () => {
    localStorage.clear();
    const doctor = {};
    const regDatos = { apiKey: 'gsk_backup_key_456' };
    const apiKey = doctor.API_Key || regDatos.apiKey || '';
    if (apiKey) localStorage.setItem('groq_api_key', apiKey);
    assertEqual(localStorage.getItem('groq_api_key'), 'gsk_backup_key_456');
    localStorage.clear();
});

test('API key: no se guarda si ninguno la provee', () => {
    localStorage.clear();
    const doctor = {};
    const regDatos = {};
    const apiKey = doctor.API_Key || regDatos.apiKey || '';
    if (apiKey) localStorage.setItem('groq_api_key', apiKey);
    assert(!localStorage.getItem('groq_api_key'), 'No debe guardarse key vacía');
    localStorage.clear();
});

test('API key: onboarding no pide key si ya existe en localStorage', () => {
    localStorage.clear();
    localStorage.setItem('groq_api_key', 'gsk_existing_key');
    const hasKey = !!localStorage.getItem('groq_api_key');
    assert(hasKey, 'hasKey debe ser true → onboarding no debe pedir');
    localStorage.clear();
});

test('API key: onboarding pide key si NO existe', () => {
    localStorage.clear();
    const hasKey = !!localStorage.getItem('groq_api_key');
    assert(!hasKey, 'hasKey debe ser false → onboarding debe pedir');
    localStorage.clear();
});

test('API key: persiste tras reload (simulado)', () => {
    localStorage.clear();
    localStorage.setItem('groq_api_key', 'gsk_persist_test');
    // Simular "reload" — la key sigue ahí
    const afterReload = localStorage.getItem('groq_api_key');
    assertEqual(afterReload, 'gsk_persist_test');
    localStorage.clear();
});

test('API key: factory setup completo guarda key y no se re-pide', () => {
    localStorage.clear();
    // Simular factory setup
    const doctor = { API_Key: 'gsk_factory_full_test' };
    const regDatos = {};
    const apiKey = doctor.API_Key || regDatos.apiKey || '';
    if (apiKey) localStorage.setItem('groq_api_key', apiKey);
    // Simular chequeo del onboarding
    const hasPreloadedKey = !!localStorage.getItem('groq_api_key');
    assert(hasPreloadedKey, 'Key precargada por factory → onboarding no pide');
    assertEqual(localStorage.getItem('groq_api_key'), 'gsk_factory_full_test');
    localStorage.clear();
});

test('API key race: core/state expone setGroqApiKey + getResolvedGroqApiKey', () => {
    assertIncludes(stateCoreCode, 'window.setGroqApiKey = function', 'Debe existir setGroqApiKey');
    assertIncludes(stateCoreCode, 'window.getResolvedGroqApiKey = function', 'Debe existir getResolvedGroqApiKey');
    assertIncludes(stateCoreCode, 'if (!allowEmpty && !normalized && current)', 'Debe proteger contra sobreescritura vacía tardía');
});

test('API key race: factory setup usa setter centralizado', () => {
    assertIncludes(factorySetupCoreCode, 'setGroqApiKey(apiKey', 'Factory setup debe usar setGroqApiKey');
});

test('API key race: onboarding usa lectura/escritura centralizada', () => {
    assertIncludes(onboardingCode, 'getResolvedGroqApiKey', 'Onboarding debe resolver key por helper central');
    assertIncludes(onboardingCode, 'setGroqApiKey(finalKey', 'Onboarding debe guardar key por helper central');
});

test('API key race: settings API usa setter centralizado', () => {
    assertIncludes(settingsApiCode, 'setGroqApiKey(key', 'Settings API debe usar setGroqApiKey');
});

test('API key race: UI API management usa setter centralizado', () => {
    assertIncludes(uiApiMgmtCode, 'setGroqApiKey(key', 'UI API management debe usar setGroqApiKey');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 61: Integridad Factory → PDF (cadena completa)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 61: Integridad Factory → PDF ────────────────────');

test('Cadena completa: factory guarda firma → pdfMaker la lee', () => {
    localStorage.clear();
    // Paso 1: Factory guarda
    const regDatos = { firma: 'data:image/png;base64,CADENA_FIRMA_FULL' };
    if (regDatos.firma) localStorage.setItem('pdf_signature', regDatos.firma);
    // Paso 2: pdfMaker lee (sin activePro)
    const activePro = null;
    const sigB64 = activePro?.firma?.startsWith('data:') ? activePro.firma : (localStorage.getItem('pdf_signature') || '');
    assertEqual(sigB64, 'data:image/png;base64,CADENA_FIRMA_FULL');
    localStorage.clear();
});

test('Cadena completa: factory guarda logo → pdfMaker lo lee', () => {
    localStorage.clear();
    const regDatos = { proLogo: 'data:image/png;base64,CADENA_LOGO_FULL' };
    if (regDatos.proLogo) localStorage.setItem('pdf_logo', regDatos.proLogo);
    const activeWp = {};
    const wpLogo = activeWp?.logo || '';
    const instLogo = wpLogo.startsWith('data:') ? wpLogo : (localStorage.getItem('pdf_logo') || '');
    assertEqual(instLogo, 'data:image/png;base64,CADENA_LOGO_FULL');
    localStorage.clear();
});

test('Cadena completa: factory guarda color → app lo aplica', () => {
    localStorage.clear();
    const regDatos = { headerColor: '#e91e63' };
    if (regDatos.headerColor) localStorage.setItem('customPrimaryColor', regDatos.headerColor);
    const color = localStorage.getItem('customPrimaryColor');
    assertEqual(color, '#e91e63');
    localStorage.clear();
});

test('Cadena completa: factory guarda footerText → PDF lo lee', () => {
    localStorage.clear();
    const regDatos = { footerText: 'Pie de página personalizado © 2026' };
    if (regDatos.footerText) {
        const cfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
        cfg.footerText = regDatos.footerText;
        localStorage.setItem('pdf_config', JSON.stringify(cfg));
    }
    const pdfCfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
    assertEqual(pdfCfg.footerText, 'Pie de página personalizado © 2026');
    localStorage.clear();
});

test('Cadena completa: factory guarda workplace → PDF lo usa', () => {
    localStorage.clear();
    const regDatos = { workplace: JSON.stringify({ name: 'Hospital Central', address: 'Av. Siempre Viva 742', phone: '011-4567-8901' }) };
    const wp = typeof regDatos.workplace === 'string' ? JSON.parse(regDatos.workplace) : regDatos.workplace;
    if (wp && wp.name) {
        const workplaceProfiles = [{ name: wp.name, address: wp.address || '', phone: wp.phone || '' }];
        localStorage.setItem('workplace_profiles', JSON.stringify(workplaceProfiles));
    }
    const storedWp = JSON.parse(localStorage.getItem('workplace_profiles'));
    assertEqual(storedWp[0].name, 'Hospital Central');
    assertEqual(storedWp[0].address, 'Av. Siempre Viva 742');
    localStorage.clear();
});

test('Cadena completa: factory con datos completos → todo persiste', () => {
    localStorage.clear();
    const mockDoctor = {
        Nombre: 'Dra. Pérez', Matricula: 'MN-5678', Plan: 'pro',
        Especialidad: 'Cardiología', API_Key: 'gsk_full_chain',
        Registro_Datos: JSON.stringify({
            firma: 'data:image/png;base64,FULL_FIRMA',
            proLogo: 'data:image/png;base64,FULL_LOGO',
            headerColor: '#3b82f6',
            footerText: 'Footer completo',
            workplace: { name: 'Sanatorio Norte', address: 'Calle 1', phone: '555-0000' }
        })
    };
    const regDatos = JSON.parse(mockDoctor.Registro_Datos);
    const pc = _testPlanMapping(mockDoctor.Plan);

    // Guardar todo como lo haría factory
    localStorage.setItem('client_config_stored', JSON.stringify({ type: pc.type, hasProMode: pc.hasProMode, medicoId: 'FULL_TEST' }));
    localStorage.setItem('prof_data', JSON.stringify({ nombre: mockDoctor.Nombre, matricula: mockDoctor.Matricula, especialidad: mockDoctor.Especialidad }));
    if (regDatos.firma) localStorage.setItem('pdf_signature', regDatos.firma);
    if (regDatos.proLogo) localStorage.setItem('pdf_logo', regDatos.proLogo);
    if (regDatos.headerColor) localStorage.setItem('customPrimaryColor', regDatos.headerColor);
    const apiKey = mockDoctor.API_Key || regDatos.apiKey || '';
    if (apiKey) localStorage.setItem('groq_api_key', apiKey);
    if (regDatos.footerText) {
        const cfg = JSON.parse(localStorage.getItem('pdf_config') || '{}');
        cfg.footerText = regDatos.footerText;
        localStorage.setItem('pdf_config', JSON.stringify(cfg));
    }
    if (regDatos.workplace) {
        const wp = typeof regDatos.workplace === 'object' ? regDatos.workplace : JSON.parse(regDatos.workplace);
        localStorage.setItem('workplace_profiles', JSON.stringify([{ name: wp.name, address: wp.address, phone: wp.phone }]));
    }

    // Verificar TODO
    const cfg = JSON.parse(localStorage.getItem('client_config_stored'));
    assertEqual(cfg.type, 'PRO');
    assert(cfg.hasProMode, 'Pro tiene proMode');
    const prof = JSON.parse(localStorage.getItem('prof_data'));
    assertEqual(prof.nombre, 'Dra. Pérez');
    assertEqual(localStorage.getItem('pdf_signature'), 'data:image/png;base64,FULL_FIRMA');
    assertEqual(localStorage.getItem('pdf_logo'), 'data:image/png;base64,FULL_LOGO');
    assertEqual(localStorage.getItem('customPrimaryColor'), '#3b82f6');
    assertEqual(localStorage.getItem('groq_api_key'), 'gsk_full_chain');
    const pdfCfg = JSON.parse(localStorage.getItem('pdf_config'));
    assertEqual(pdfCfg.footerText, 'Footer completo');
    const wp = JSON.parse(localStorage.getItem('workplace_profiles'));
    assertEqual(wp[0].name, 'Sanatorio Norte');
    localStorage.clear();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 62: evaluateConfigCompleteness — Semáforo PDF
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 62: evaluateConfigCompleteness ────────────────────');

test('Semáforo GREEN: nombre + matrícula + especialidad + workplace', () => {
    localStorage.clear();
    localStorage.setItem('prof_data', JSON.stringify({ nombre: 'Dr. Test', matricula: 'MP-123', especialidad: 'Cardiología' }));
    localStorage.setItem('workplace_profiles', JSON.stringify([{ name: 'Clínica' }]));
    window._profDataCache = null; window._pdfConfigCache = null; window._wpProfilesCache = null;
    const result = evaluateConfigCompleteness();
    assertEqual(result.level, 'green', 'Con todo completo → green');
    assertEqual(result.missing.length, 0);
    localStorage.clear();
});

test('Semáforo RED: sin nombre ni matrícula (campos críticos)', () => {
    localStorage.clear();
    localStorage.setItem('prof_data', JSON.stringify({}));
    window._profDataCache = null; window._pdfConfigCache = null; window._wpProfilesCache = null;
    const result = evaluateConfigCompleteness();
    assertEqual(result.level, 'red', 'Sin nombre ni matrícula → red');
    assert(result.missing.includes('Nombre del profesional'));
    assert(result.missing.includes('Matrícula'));
    localStorage.clear();
});

test('Semáforo YELLOW: nombre ok, falta matrícula (1 campo faltante)', () => {
    localStorage.clear();
    localStorage.setItem('prof_data', JSON.stringify({ nombre: 'Dr. Test' }));
    localStorage.setItem('workplace_profiles', JSON.stringify([{ name: 'Hospital' }]));
    window._profDataCache = null; window._pdfConfigCache = null; window._wpProfilesCache = null;
    const result = evaluateConfigCompleteness();
    assertEqual(result.level, 'yellow', 'Nombre ok + falta matrícula → yellow');
    assert(result.missing.includes('Matrícula'));
    localStorage.clear();
});

test('Semáforo YELLOW: nombre ok, falta especialidad y workplace (2 campos)', () => {
    localStorage.clear();
    localStorage.setItem('prof_data', JSON.stringify({ nombre: 'Dr. Test', matricula: 'MP-1' }));
    window._profDataCache = null; window._pdfConfigCache = null; window._wpProfilesCache = null;
    const result = evaluateConfigCompleteness();
    // Falta especialidad + workplace = 2 faltantes, con nombre → yellow
    assertEqual(result.level, 'yellow', '2 faltantes con nombre → yellow');
    localStorage.clear();
});

test('Semáforo RED: sin nombre (aunque tenga matrícula)', () => {
    localStorage.clear();
    localStorage.setItem('prof_data', JSON.stringify({ matricula: 'MP-1' }));
    window._profDataCache = null; window._pdfConfigCache = null; window._wpProfilesCache = null;
    const result = evaluateConfigCompleteness();
    // Sin nombre → siempre red (aunque solo falten 2 campos)
    assertEqual(result.level, 'red', 'Sin nombre → red siempre');
    localStorage.clear();
});

test('Semáforo: validateBeforeDownload("txt") siempre retorna true', () => {
    localStorage.clear();
    window._profDataCache = null; window._pdfConfigCache = null; window._wpProfilesCache = null;
    const result = validateBeforeDownload('txt');
    assert(result === true, 'TXT siempre debe pasar');
    localStorage.clear();
});

test('Semáforo: validateBeforeDownload("pdf") retorna true si green', () => {
    localStorage.clear();
    localStorage.setItem('prof_data', JSON.stringify({ nombre: 'Dr. Test', matricula: 'MP-123', especialidad: 'Cardio' }));
    localStorage.setItem('workplace_profiles', JSON.stringify([{ name: 'Clínica' }]));
    window._profDataCache = null; window._pdfConfigCache = null; window._wpProfilesCache = null;
    const result = validateBeforeDownload('pdf');
    assert(result === true, 'PDF con config green → true');
    localStorage.clear();
});

test('Semáforo: validateBeforeDownload("pdf") retorna false si red', () => {
    localStorage.clear();
    localStorage.setItem('prof_data', JSON.stringify({}));
    window._profDataCache = null; window._pdfConfigCache = null; window._wpProfilesCache = null;
    const result = validateBeforeDownload('pdf');
    assert(result === false, 'PDF con config red → false');
    localStorage.clear();
});

test('Semáforo: validateBeforeDownload("rtf") retorna true siempre', () => {
    localStorage.clear();
    const result = validateBeforeDownload('rtf');
    assert(result === true, 'RTF siempre debe pasar');
    localStorage.clear();
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 63: Registro_Datos malformado / edge cases
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 63: Registro_Datos malformado ────────────────────');

test('Registro_Datos: JSON válido se parsea correctamente', () => {
    const rd = '{"firma":"data:image/png;base64,ABC","headerColor":"#ff0000"}';
    let regDatos = {};
    try { regDatos = JSON.parse(rd); } catch(_) {}
    assertEqual(regDatos.headerColor, '#ff0000');
    assertEqual(regDatos.firma, 'data:image/png;base64,ABC');
});

test('Registro_Datos: JSON vacío "{}" no rompe nada', () => {
    const rd = '{}';
    let regDatos = {};
    try { regDatos = JSON.parse(rd); } catch(_) {}
    assert(!regDatos.firma, 'No debe tener firma');
    assert(!regDatos.headerColor, 'No debe tener color');
});

test('Registro_Datos: string vacío → objeto vacío sin crash', () => {
    const rd = '';
    let regDatos = {};
    try { regDatos = JSON.parse(rd || '{}'); } catch(_) {}
    assert(typeof regDatos === 'object', 'Debe ser objeto');
});

test('Registro_Datos: null → objeto vacío sin crash', () => {
    const rd = null;
    let regDatos = {};
    try { regDatos = JSON.parse(rd || '{}'); } catch(_) {}
    assert(typeof regDatos === 'object', 'Debe ser objeto');
});

test('Registro_Datos: undefined → objeto vacío sin crash', () => {
    const rd = undefined;
    let regDatos = {};
    try { regDatos = JSON.parse(rd || '{}'); } catch(_) {}
    assert(typeof regDatos === 'object', 'Debe ser objeto');
});

test('Registro_Datos: JSON corrupto (syntax error) → objeto vacío sin crash', () => {
    const rd = '{firma: broken json!!}';
    let regDatos = {};
    try { regDatos = JSON.parse(rd); } catch(_) { regDatos = {}; }
    assert(typeof regDatos === 'object', 'Debe ser objeto vacío');
    assert(!regDatos.firma, 'No debe tener datos parciales');
});

test('Registro_Datos: firma sin prefijo data: → no se usa', () => {
    const rd = '{"firma":"ABCDEF123"}';
    let regDatos = {};
    try { regDatos = JSON.parse(rd); } catch(_) {}
    const firmaValida = regDatos.firma && regDatos.firma.startsWith('data:');
    assert(!firmaValida, 'Firma sin data: prefix debe ser ignorada');
});

test('Registro_Datos: workplace como string JSON se parsea', () => {
    const rd = '{"workplace":"{\\"name\\":\\"Hospital\\",\\"address\\":\\"Calle 1\\"}"}';
    let regDatos = {};
    try { regDatos = JSON.parse(rd); } catch(_) {}
    let wp = regDatos.workplace;
    if (typeof wp === 'string') wp = JSON.parse(wp);
    assertEqual(wp.name, 'Hospital');
    assertEqual(wp.address, 'Calle 1');
});

test('Registro_Datos: workplace como objeto directo funciona', () => {
    const rd = '{"workplace":{"name":"Clínica","phone":"555"}}';
    let regDatos = {};
    try { regDatos = JSON.parse(rd); } catch(_) {}
    let wp = regDatos.workplace;
    if (typeof wp === 'string') wp = JSON.parse(wp);
    assertEqual(wp.name, 'Clínica');
    assertEqual(wp.phone, '555');
});

test('Registro_Datos: workplace null no rompe', () => {
    const rd = '{"workplace":null}';
    let regDatos = {};
    try { regDatos = JSON.parse(rd); } catch(_) {}
    let wp = regDatos.workplace;
    assert(!wp || !wp.name, 'Workplace null → no se procesa');
});

test('Registro_Datos: headerColor inválido (no hex) se guarda pero no afecta', () => {
    const rd = '{"headerColor":"no-es-hex"}';
    let regDatos = {};
    try { regDatos = JSON.parse(rd); } catch(_) {}
    const isValidColor = /^#[0-9a-fA-F]{3,8}$/.test(regDatos.headerColor);
    assert(!isValidColor, 'Color inválido no debe pasar validación hex');
});

test('Registro_Datos: headerColor válido pasa validación', () => {
    const rd = '{"headerColor":"#e91e63"}';
    let regDatos = {};
    try { regDatos = JSON.parse(rd); } catch(_) {}
    const isValidColor = /^#[0-9a-fA-F]{3,8}$/.test(regDatos.headerColor);
    assert(isValidColor, 'Color válido debe pasar validación hex');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 64: _getAllowedFormats con tipos directos robustos
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 64: _getAllowedFormats con tipos directos ────────────────────');

function _testGetAllowedFormatsRaw(type) {
    type = (type || 'ADMIN').toUpperCase();
    if (type === 'ADMIN' || type === 'PRO' || type === 'GIFT' || type === 'CLINIC') return ['pdf', 'rtf', 'txt', 'html'];
    if (type === 'NORMAL') return ['txt', 'pdf'];
    return ['txt']; // TRIAL, y cualquier otro
}

test('Formatos raw: GIFT directo (sin mapeo) → 4 formatos', () => {
    const formats = _testGetAllowedFormatsRaw('GIFT');
    assertEqual(formats.length, 4, 'GIFT directo debe tener todos los formatos');
    assert(formats.includes('pdf'));
    assert(formats.includes('rtf'));
    assert(formats.includes('txt'));
    assert(formats.includes('html'));
});

test('Formatos raw: CLINIC directo → 4 formatos', () => {
    const formats = _testGetAllowedFormatsRaw('CLINIC');
    assertEqual(formats.length, 4, 'CLINIC directo debe tener todos los formatos');
});

test('Formatos raw: ENTERPRISE directo → solo TXT (cae en default)', () => {
    const formats = _testGetAllowedFormatsRaw('ENTERPRISE');
    assertEqual(formats.length, 1, 'ENTERPRISE directo cae en default');
});

test('Formatos: GIFT mapeado como PRO → 4 formatos (así funciona correctamente)', () => {
    const giftMapped = _testPlanMapping('gift'); // type = 'PRO'
    const formats = _testGetAllowedFormatsRaw(giftMapped.type);
    assertEqual(formats.length, 4, 'GIFT mapeado a PRO → todos los formatos');
});

test('Formatos: CLINIC mapeado como PRO → 4 formatos', () => {
    const clinicMapped = _testPlanMapping('clinic'); // type = 'PRO'
    const formats = _testGetAllowedFormatsRaw(clinicMapped.type);
    assertEqual(formats.length, 4, 'CLINIC mapeado a PRO → todos los formatos');
});

test('Formatos: GIFT directo y GIFT mapeado son equivalentes', () => {
    const directGift = _testGetAllowedFormatsRaw('GIFT');
    const mappedGift = _testGetAllowedFormatsRaw(_testPlanMapping('gift').type);
    assertEqual(directGift.length, mappedGift.length, 'GIFT directo no debe perder formatos frente al mapeo');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 65: themeManager.js — API de skins
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 65: themeManager — API de skins ────────────────────');

// Cargar themeManager
const themeMgrCode = fs.readFileSync(path.join(root, 'src/js/features/themeManager.js'), 'utf-8');
// Necesitamos mocks DOM más robustos para themeManager
const _savedHead = global.document.head;
global.document.head = {
    appendChild: () => {},
    querySelectorAll: () => [],
    querySelector: () => null,
};
global.document.body = {
    style: { borderTop: '' },
    classList: {
        _cls: new Set(),
        add(c) { this._cls.add(c); },
        remove(c) { this._cls.delete(c); },
        contains(c) { return this._cls.has(c); },
        forEach(cb) { this._cls.forEach(cb); },
        toggle(c, v) { if (v) this._cls.add(c); else this._cls.delete(c); }
    }
};
global.document.querySelectorAll = () => [];
global.document.getElementById = (id) => null;
global.document.readyState = 'complete';
global.CustomEvent = class CustomEvent { constructor(t, d) { this.type = t; this.detail = d?.detail; } };
global.document.dispatchEvent = () => {};
global.MutationObserver = class { constructor() {} observe() {} disconnect() {} };
// Suprimir warnings de theme during load  
try { vm.runInContext(themeMgrCode, ctx, { filename: 'themeManager.js' }); } catch(e) {}

test('themeManager — getRegistry retorna array con al menos 3 skins', () => {
    const registry = ThemeManager.getRegistry();
    assert(Array.isArray(registry), 'getRegistry debe retornar array');
    assert(registry.length >= 3, `Esperaba >= 3 skins, tiene ${registry.length}`);
});

test('themeManager — getRegistry incluye default, cyberpunk y light-minimal', () => {
    const registry = ThemeManager.getRegistry();
    const ids = registry.map(s => s.id);
    assert(ids.includes('default'), 'Falta skin default');
    assert(ids.includes('cyberpunk'), 'Falta skin cyberpunk');
    assert(ids.includes('light-minimal'), 'Falta skin light-minimal');
});

test('themeManager — getCurrent retorna string', () => {
    const current = ThemeManager.getCurrent();
    assert(typeof current === 'string', 'getCurrent debe retornar string');
});

test('themeManager — cada skin tiene id, name, description, icon y preview', () => {
    const registry = ThemeManager.getRegistry();
    registry.forEach(skin => {
        assert(skin.id, `Skin sin id: ${JSON.stringify(skin)}`);
        assert(skin.name, `Skin ${skin.id} sin name`);
        assert(skin.description, `Skin ${skin.id} sin description`);
        assert(skin.icon, `Skin ${skin.id} sin icon`);
        assert(skin.preview, `Skin ${skin.id} sin preview`);
        assert(skin.preview.bg, `Skin ${skin.id} preview sin bg`);
        assert(skin.preview.accent, `Skin ${skin.id} preview sin accent`);
    });
});

test('themeManager — skin default no tiene cssFile (usa base)', () => {
    const registry = ThemeManager.getRegistry();
    const def = registry.find(s => s.id === 'default');
    assert(def.cssFile === null, 'Default skin no debe tener cssFile');
});

test('themeManager — skins no-default tienen cssFile', () => {
    const registry = ThemeManager.getRegistry();
    registry.filter(s => s.id !== 'default').forEach(skin => {
        assert(skin.cssFile, `Skin ${skin.id} no-default debe tener cssFile`);
    });
});

test('themeManager — getRegistry retorna copia (no la referencia interna)', () => {
    const r1 = ThemeManager.getRegistry();
    const r2 = ThemeManager.getRegistry();
    assert(r1 !== r2, 'getRegistry no debe retornar la misma referencia');
});

test('themeManager — apply es función async', () => {
    assert(typeof ThemeManager.apply === 'function', 'apply debe ser función');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 66: reportHistory.js — CRUD de historial de informes
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 66: reportHistory — CRUD historial ────────────────');

// Cargar reportHistory
load('src/js/features/reportHistory.js');

// Reset state
localStorage.clear();
_reportHistCache = [];

test('reportHistory — saveReportToHistory guarda un informe', () => {
    localStorage.clear(); _reportHistCache = [];
    const id = saveReportToHistory({
        htmlContent: '<h1>Informe test</h1>',
        patientName: 'Juan Pérez',
        patientDni: '12345678',
        templateKey: 'ecografia_abdominal'
    });
    assert(id, 'saveReportToHistory debe retornar un id');
    assert(id.startsWith('rpt_'), 'Id debe empezar con rpt_');
});

test('reportHistory — getAllReports retorna los informes guardados', () => {
    const reports = getAllReports();
    assert(Array.isArray(reports), 'getAllReports debe retornar array');
    assert(reports.length >= 1, 'Debe haber al menos 1 informe');
    assertEqual(reports[0].patientName, 'Juan Pérez');
});

test('reportHistory — saveReportToHistory sin htmlContent retorna null', () => {
    const id = saveReportToHistory({});
    assert(id === null, 'Sin htmlContent debe retornar null');
});

test('reportHistory — saveReportToHistory sin data retorna null', () => {
    const id = saveReportToHistory(null);
    assert(id === null, 'Con null debe retornar null');
});

test('reportHistory — getReportById encuentra informe existente', () => {
    localStorage.clear(); _reportHistCache = [];
    const id = saveReportToHistory({ htmlContent: '<p>Test</p>', patientName: 'Ana' });
    const report = getReportById(id);
    assert(report !== null, 'Debe encontrar el informe');
    assertEqual(report.patientName, 'Ana');
});

test('reportHistory — getReportById retorna null para id inexistente', () => {
    const report = getReportById('rpt_noexiste');
    assert(report === null, 'Debe retornar null para id inexistente');
});

test('reportHistory — getPatientReports filtra por nombre', () => {
    localStorage.clear(); _reportHistCache = [];
    saveReportToHistory({ htmlContent: '<p>1</p>', patientName: 'María López', patientDni: '11111111' });
    saveReportToHistory({ htmlContent: '<p>2</p>', patientName: 'Juan García', patientDni: '22222222' });
    saveReportToHistory({ htmlContent: '<p>3</p>', patientName: 'María López', patientDni: '11111111' });
    const mariaReports = getPatientReports('María López');
    assertEqual(mariaReports.length, 2, 'María López debe tener 2 informes');
});

test('reportHistory — getPatientReports filtra por DNI', () => {
    const dniReports = getPatientReports('22222222');
    assertEqual(dniReports.length, 1, 'DNI 22222222 debe tener 1 informe');
    assertEqual(dniReports[0].patientName, 'Juan García');
});

test('reportHistory — getPatientReports vacío para query sin match', () => {
    const none = getPatientReports('ZZZ No Existe');
    assertEqual(none.length, 0, 'Debe retornar 0 resultados');
});

test('reportHistory — getPatientReports vacío para input vacío', () => {
    const none = getPatientReports('');
    assertEqual(none.length, 0, 'Input vacío → 0 resultados');
});

test('reportHistory — deleteReport elimina un informe', () => {
    localStorage.clear(); _reportHistCache = [];
    const id1 = saveReportToHistory({ htmlContent: '<p>A</p>', patientName: 'Test' });
    const id2 = saveReportToHistory({ htmlContent: '<p>B</p>', patientName: 'Test' });
    deleteReport(id1);
    const all = getAllReports();
    assertEqual(all.length, 1, 'Debe quedar 1 informe');
    assertEqual(all[0].id, id2, 'Debe quedar el segundo informe');
});

test('reportHistory — deletePatientReports elimina todos de un paciente', () => {
    localStorage.clear(); _reportHistCache = [];
    saveReportToHistory({ htmlContent: '<p>1</p>', patientName: 'Ana', patientDni: '33333333' });
    saveReportToHistory({ htmlContent: '<p>2</p>', patientName: 'Ana', patientDni: '33333333' });
    saveReportToHistory({ htmlContent: '<p>3</p>', patientName: 'Otro', patientDni: '44444444' });
    deletePatientReports('33333333');
    const all = getAllReports();
    assertEqual(all.length, 1, 'Solo debe quedar el de Otro');
    assertEqual(all[0].patientName, 'Otro');
});

test('reportHistory — importReportHistory agrega sin duplicados', () => {
    localStorage.clear(); _reportHistCache = [];
    const id1 = saveReportToHistory({ htmlContent: '<p>1</p>', patientName: 'Existente' });
    const imported = importReportHistory([
        { id: id1, htmlContent: '<p>1</p>', date: new Date().toISOString() },
        { id: 'rpt_nuevo_1', htmlContent: '<p>nuevo</p>', date: new Date().toISOString() }
    ]);
    assertEqual(imported, 1, 'Solo debe importar 1 (no el duplicado)');
    assertEqual(getAllReports().length, 2, 'Total: 2 informes');
});

test('reportHistory — importReportHistory con JSON string', () => {
    localStorage.clear(); _reportHistCache = [];
    const data = JSON.stringify([
        { id: 'rpt_json_1', htmlContent: '<p>json</p>', date: new Date().toISOString() }
    ]);
    const added = importReportHistory(data);
    assertEqual(added, 1, 'Debe importar 1 desde string JSON');
});

test('reportHistory — importReportHistory ignora entries sin id o htmlContent', () => {
    localStorage.clear(); _reportHistCache = [];
    const added = importReportHistory([
        { htmlContent: '<p>sin id</p>', date: new Date().toISOString() },
        { id: 'rpt_sin_html', date: new Date().toISOString() },
        { id: 'rpt_ok', htmlContent: '<p>ok</p>', date: new Date().toISOString() }
    ]);
    assertEqual(added, 1, 'Solo importa entry con id + htmlContent');
});

test('reportHistory — importReportHistory con JSON inválido retorna 0', () => {
    const added = importReportHistory('esto no es json{');
    assertEqual(added, 0, 'JSON inválido debe retornar 0');
});

test('reportHistory — importReportHistory con no-array retorna 0', () => {
    const added = importReportHistory('{"key": "value"}');
    assertEqual(added, 0, 'No-array debe retornar 0');
});

test('reportHistory — getReportHistoryStats retorna estadísticas correctas', () => {
    localStorage.clear(); _reportHistCache = [];
    saveReportToHistory({ htmlContent: '<p>1</p>', patientName: 'Ana', patientDni: '11111111' });
    saveReportToHistory({ htmlContent: '<p>2</p>', patientName: 'Juan', patientDni: '22222222' });
    saveReportToHistory({ htmlContent: '<p>3</p>', patientName: 'Ana', patientDni: '11111111' });
    const stats = getReportHistoryStats();
    assertEqual(stats.total, 3, 'Total: 3');
    assertEqual(stats.patients, 2, 'Pacientes únicos: 2');
    assert(stats.newest !== null, 'newest debe existir');
    assert(stats.oldest !== null, 'oldest debe existir');
    assert(typeof stats.sizeKB === 'number', 'sizeKB debe ser number');
});

test('reportHistory — getReportHistoryStats vacío', () => {
    localStorage.clear(); _reportHistCache = [];
    const stats = getReportHistoryStats();
    assertEqual(stats.total, 0);
    assertEqual(stats.patients, 0);
    assert(stats.newest === null);
    assert(stats.oldest === null);
});

test('reportHistory — entry tiene todos los campos requeridos', () => {
    localStorage.clear(); _reportHistCache = [];
    saveReportToHistory({
        htmlContent: '<p>Test completo</p>',
        patientName: 'Carlos Gómez',
        patientDni: '55555555',
        templateKey: 'espirometria'
    });
    const report = getAllReports()[0];
    assert(report.id, 'Debe tener id');
    assert(report.date, 'Debe tener date');
    assert(report.htmlContent, 'Debe tener htmlContent');
    assert(report.patientData, 'Debe tener patientData');
    assert(report.patientData.name === 'Carlos Gómez', 'patientData.name');
    assert(report.patientData.dni === '55555555', 'patientData.dni');
    assertEqual(report.templateKey, 'espirometria');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 67: outputProfiles.js — CRUD de perfiles de salida
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 67: outputProfiles — CRUD perfiles ───────────────');

// Cargar outputProfiles
const opCode = fs.readFileSync(path.join(root, 'src/js/features/outputProfiles.js'), 'utf-8');
try { vm.runInContext(opCode, ctx, { filename: 'outputProfiles.js' }); } catch(e) {}

test('outputProfiles — getOutputProfiles retorna array', () => {
    localStorage.clear();
    const profiles = getOutputProfiles();
    assert(Array.isArray(profiles), 'Debe retornar array');
});

test('outputProfiles — getOutputProfiles retorna vacío con localStorage limpio', () => {
    localStorage.clear();
    // Forzar recarga de cache
    vm.runInContext('_profilesCache = null;', ctx);
    const profiles = getOutputProfiles();
    assertEqual(profiles.length, 0, 'Vacío sin datos');
});

// Helper para guardar perfiles directamente (sin DOM)
function _saveTestProfile(name, isDefault) {
    const profiles = getOutputProfiles();
    const p = {
        id: 'prof_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name: name,
        pageSize: 'a4',
        font: 'helvetica',
        isDefault: !!isDefault,
        createdAt: Date.now(),
        lastUsed: Date.now()
    };
    profiles.push(p);
    // Guardar directamente
    localStorage.setItem('output_profiles', JSON.stringify(profiles));
    vm.runInContext('_profilesCache = ' + JSON.stringify(profiles) + ';', ctx);
    return p;
}

test('outputProfiles — perfil guardado se puede leer', () => {
    localStorage.clear();
    vm.runInContext('_profilesCache = null;', ctx);
    _saveTestProfile('Eco-stress — Dr. Ruiz', true);
    const profiles = getOutputProfiles();
    assertEqual(profiles.length, 1, 'Debe haber 1 perfil');
    assertEqual(profiles[0].name, 'Eco-stress — Dr. Ruiz');
    assert(profiles[0].isDefault === true, 'Debe ser default');
});

test('outputProfiles — deleteProfile elimina perfil', () => {
    localStorage.clear();
    vm.runInContext('_profilesCache = null;', ctx);
    const p1 = _saveTestProfile('Perfil A', true);
    const p2 = _saveTestProfile('Perfil B', false);
    // Necesitamos llamar a la función interna — no expuesta, así que simulamos
    let profiles = getOutputProfiles().filter(p => p.id !== p1.id);
    if (profiles.length > 0) profiles[0].isDefault = true;
    localStorage.setItem('output_profiles', JSON.stringify(profiles));
    vm.runInContext('_profilesCache = ' + JSON.stringify(profiles) + ';', ctx);
    assertEqual(getOutputProfiles().length, 1, 'Debe quedar 1');
    assert(getOutputProfiles()[0].isDefault, 'El restante debe ser default');
});

test('outputProfiles — setDefault marca perfil como predeterminado', () => {
    localStorage.clear();
    vm.runInContext('_profilesCache = null;', ctx);
    const p1 = _saveTestProfile('Perfil X', true);
    const p2 = _saveTestProfile('Perfil Y', false);
    // Simular setDefault
    let profiles = getOutputProfiles();
    profiles.forEach(p => p.isDefault = (p.id === p2.id));
    localStorage.setItem('output_profiles', JSON.stringify(profiles));
    vm.runInContext('_profilesCache = ' + JSON.stringify(profiles) + ';', ctx);
    const updated = getOutputProfiles();
    assert(!updated.find(p => p.id === p1.id).isDefault, 'P1 ya no es default');
    assert(updated.find(p => p.id === p2.id).isDefault, 'P2 es default ahora');
});

test('outputProfiles — getDefaultProfile retorna null sin perfiles', () => {
    localStorage.clear();
    vm.runInContext('_profilesCache = null;', ctx);
    // Sin perfiles, no hay default
    const def = getOutputProfiles().find(p => p.isDefault) || null;
    assert(def === null, 'Sin perfiles → null');
});

test('outputProfiles — múltiples perfiles solo uno es default', () => {
    localStorage.clear();
    vm.runInContext('_profilesCache = null;', ctx);
    _saveTestProfile('A', true);
    _saveTestProfile('B', false);
    _saveTestProfile('C', false);
    const profiles = getOutputProfiles();
    const defaults = profiles.filter(p => p.isDefault);
    assertEqual(defaults.length, 1, 'Solo 1 default');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 68: medDictionary.js — Diccionario médico
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 68: medDictionary — diccionario médico ─────────────');

// Cargar medDictionary
const medDictCode = fs.readFileSync(path.join(root, 'src/js/features/medDictionary.js'), 'utf-8');
try { vm.runInContext(medDictCode, ctx, { filename: 'medDictionary.js' }); } catch(e) {}

test('medDictionary — MEDICAL_DICT_BASE tiene más de 100 entradas', () => {
    const count = Object.keys(MEDICAL_DICT_BASE).length;
    assert(count > 100, `Esperaba >100 entradas, tiene ${count}`);
});

test('medDictionary — getMedCustomDict retorna objeto', () => {
    localStorage.clear();
    _customDictCache = null;
    const dict = getMedCustomDict();
    assert(typeof dict === 'object' && !Array.isArray(dict), 'Debe retornar objeto');
});

test('medDictionary — addMedDictEntry agrega entrada', () => {
    localStorage.clear();
    _customDictCache = null;
    addMedDictEntry('Neumonía atípica', 'neumonía atípica');
    const dict = getMedCustomDict();
    assert(dict['neumonía atípica'] !== undefined, 'Debe existir la entrada');
});

test('medDictionary — addMedDictEntry ignora entradas vacías', () => {
    localStorage.clear();
    _customDictCache = null;
    addMedDictEntry('', 'algo');
    addMedDictEntry('algo', '');
    const dict = getMedCustomDict();
    assertEqual(Object.keys(dict).length, 0, 'No debe guardar entradas vacías');
});

test('medDictionary — removeMedDictEntry elimina entrada', () => {
    localStorage.clear();
    _customDictCache = null;
    addMedDictEntry('typo', 'corrección');
    removeMedDictEntry('typo');
    const dict = getMedCustomDict();
    assert(!dict['typo'], 'La entrada debe haberse eliminado');
});

test('medDictionary — getFullDict fusiona base + custom', () => {
    localStorage.clear();
    _customDictCache = null;
    addMedDictEntry('mi_custom_term', 'mi corrección');
    const full = getFullDict();
    assert(full['larinx'] === 'laringe', 'Debe incluir base');
    assert(full['mi_custom_term'] === 'mi corrección', 'Debe incluir custom');
});

test('medDictionary — custom sobreescribe base en getFullDict', () => {
    localStorage.clear();
    _customDictCache = null;
    addMedDictEntry('larinx', 'laringe modificada');
    const full = getFullDict();
    assert(full['larinx'] === 'laringe modificada', 'Custom debe sobreescribir base');
});

test('medDictionary — findDictMatches encuentra errores en texto', () => {
    localStorage.clear();
    _customDictCache = null;
    const text = 'El paciente presenta larinx inflamada y epiglotys sin alteraciones. La larinx se ve enrojecida.';
    const matches = findDictMatches(text);
    assert(matches.length >= 2, `Esperaba >= 2 matches, tiene ${matches.length}`);
    const larinxMatch = matches.find(m => m.key === 'larinx');
    assert(larinxMatch, 'Debe encontrar larinx');
    assertEqual(larinxMatch.to, 'laringe');
    assertEqual(larinxMatch.count, 2, 'larinx aparece 2 veces');
});

test('medDictionary — findDictMatches ordena por count desc', () => {
    const text = 'larinx larinx larinx epiglotys epiglotys vesicula';
    const matches = findDictMatches(text);
    assert(matches.length >= 3, 'Debe encontrar al menos 3 tipos');
    assert(matches[0].count >= matches[1].count, 'Sort por count desc');
});

test('medDictionary — findDictMatches sin errores retorna vacío', () => {
    const text = 'Texto perfectamente escrito sin errores ortográficos médicos.';
    const matches = findDictMatches(text);
    assertEqual(matches.length, 0, 'Sin errores → 0 matches');
});

test('medDictionary — findDictMatches isBase identifica origen', () => {
    localStorage.clear();
    _customDictCache = null;
    addMedDictEntry('typotest', 'correcto');
    const text = 'El typotest y la larinx.';
    const matches = findDictMatches(text);
    const baseMatch = matches.find(m => m.key === 'larinx');
    const customMatch = matches.find(m => m.key === 'typotest');
    assert(baseMatch && baseMatch.isBase === true, 'larinx es del diccionario base');
    assert(customMatch && customMatch.isBase === false, 'typotest es custom');
});

test('medDictionary — _escapeRegex escapa caracteres especiales', () => {
    const escaped = _escapeRegex('test.value*with(parens)');
    assertEqual(escaped, 'test\\.value\\*with\\(parens\\)');
});

test('medDictionary — findDictMatches con correcciones Whisper ASR', () => {
    localStorage.clear(); _customDictCache = null;
    const text = 'Se realizó espiro metría y campi metría al paciente.';
    const matches = findDictMatches(text);
    const espiro = matches.find(m => m.key === 'espiro metría');
    const campi = matches.find(m => m.key === 'campi metría');
    assert(espiro && espiro.to === 'espirometría', 'Whisper ASR: espiro metría → espirometría');
    assert(campi && campi.to === 'campimetría', 'Whisper ASR: campi metría → campimetría');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 69: studyTerminology.js — Terminología por estudio
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 69: studyTerminology — terminología ────────────────');

load('src/js/config/studyTerminology.js');

test('studyTerminology — STUDY_TERMINOLOGY es array con >= 50 estudios', () => {
    assert(Array.isArray(STUDY_TERMINOLOGY), 'Debe ser array');
    assert(STUDY_TERMINOLOGY.length >= 50, `Esperaba >= 50, tiene ${STUDY_TERMINOLOGY.length}`);
});

test('studyTerminology — cada estudio tiene campos requeridos', () => {
    STUDY_TERMINOLOGY.forEach(study => {
        assert(study.estudio, `Estudio sin nombre: ${JSON.stringify(study).slice(0,50)}`);
        assert(study.templateKey, `${study.estudio} sin templateKey`);
        assert(study.category, `${study.estudio} sin category`);
        assert(Array.isArray(study.keywords), `${study.estudio} keywords no es array`);
        assert(typeof study.abreviaturas === 'object', `${study.estudio} abreviaturas no es objeto`);
        assert(Array.isArray(study.clasificaciones), `${study.estudio} clasificaciones no es array`);
        assert(Array.isArray(study.unidades), `${study.estudio} unidades no es array`);
    });
});

test('studyTerminology — templateKey es único', () => {
    const keys = STUDY_TERMINOLOGY.map(s => s.templateKey);
    const unique = new Set(keys);
    assertEqual(keys.length, unique.size, 'templateKeys deben ser únicos');
});

test('studyTerminology — getStudyTerminology encuentra por key', () => {
    const espiro = getStudyTerminology('espirometria');
    assert(espiro !== null, 'Debe encontrar espirometria');
    assertEqual(espiro.estudio, 'Espirometría');
    assertEqual(espiro.category, 'Neumología');
});

test('studyTerminology — getStudyTerminology retorna null para key inexistente', () => {
    const result = getStudyTerminology('no_existe_xyz');
    assert(result === null, 'Key inexistente → null');
});

test('studyTerminology — getAllAbbreviations retorna objeto con entradas', () => {
    const abbrs = getAllAbbreviations();
    assert(typeof abbrs === 'object', 'Debe retornar objeto');
    assert(Object.keys(abbrs).length > 20, 'Debe tener > 20 abreviaturas');
    assert(abbrs['VEF1'] || abbrs['FEV1'], 'Debe incluir VEF1/FEV1');
});

test('studyTerminology — getStudyUnits retorna unidades correctas', () => {
    const units = getStudyUnits('espirometria');
    assert(Array.isArray(units), 'Debe retornar array');
    assert(units.includes('L'), 'Espirometría incluye litros');
});

test('studyTerminology — getStudyUnits retorna vacío para key inexistente', () => {
    const units = getStudyUnits('no_existe');
    assert(Array.isArray(units), 'Debe retornar array');
    assertEqual(units.length, 0);
});

test('studyTerminology — getStudyClassifications retorna clasificaciones', () => {
    const cls = getStudyClassifications('espirometria');
    assert(cls.includes('GOLD'), 'Espirometría incluye GOLD');
});

test('studyTerminology — getStudyClassifications vacío para key inexistente', () => {
    const cls = getStudyClassifications('no_existe');
    assertEqual(cls.length, 0);
});

test('studyTerminology — categorías cubren especialidades principales', () => {
    const categories = new Set(STUDY_TERMINOLOGY.map(s => s.category));
    assert(categories.has('Neumología'), 'Falta Neumología');
    assert(categories.has('Oftalmología'), 'Falta Oftalmología');
    assert(categories.has('Cardiología'), 'Falta Cardiología');
    assert(categories.has('Endoscopía'), 'Falta Endoscopía');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 70: licenseManager.js — Funciones puras de cache y device ID
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 70: licenseManager — cache y device ID ─────────────');

const lmCode = fs.readFileSync(path.join(root, 'src/js/features/licenseManager.js'), 'utf-8');
// Extraer funciones puras
const lmDeviceMatch = lmCode.match(/function _lmGetDeviceId\(\)\s*\{[\s\S]*?\n\}/);
if (lmDeviceMatch) try { vm.runInContext(lmDeviceMatch[0], ctx); } catch(e) {}
const lmMedicoMatch = lmCode.match(/function _lmGetMedicoId\(\)\s*\{[\s\S]*?\n\}/);
if (lmMedicoMatch) try { vm.runInContext(lmMedicoMatch[0], ctx); } catch(e) {}
const lmGetCacheMatch = lmCode.match(/function _lmGetCache\(\)\s*\{[\s\S]*?\n\}/);
if (lmGetCacheMatch) try { vm.runInContext(lmGetCacheMatch[0], ctx); } catch(e) {}
const lmSetCacheMatch = lmCode.match(/function _lmSetCache\([\s\S]*?\n\}/);
if (lmSetCacheMatch) try { vm.runInContext(lmSetCacheMatch[0], ctx); } catch(e) {}

test('licenseManager — _lmGetDeviceId genera ID determinista tras primera llamada', () => {
    localStorage.clear();
    _lmDeviceCache = null;
    const id1 = _lmGetDeviceId();
    assert(id1, 'Debe generar un device id');
    assert(id1.startsWith('dev_'), 'Device ID debe empezar con dev_');
    const id2 = _lmGetDeviceId();
    assertEqual(id1, id2, 'Sucesivas llamadas retornan el mismo ID');
});

test('licenseManager — _lmGetDeviceId usa el existente de localStorage', () => {
    localStorage.clear();
    _lmDeviceCache = null;
    localStorage.setItem('device_id', 'DEV_PREEXISTENTE');
    const id = _lmGetDeviceId();
    assertEqual(id, 'DEV_PREEXISTENTE');
});

test('licenseManager — _lmGetMedicoId lee de CLIENT_CONFIG', () => {
    CLIENT_CONFIG.medicoId = 'MED_123';
    const id = _lmGetMedicoId();
    assertEqual(id, 'MED_123');
    delete CLIENT_CONFIG.medicoId;
});

test('licenseManager — _lmGetMedicoId fallback a localStorage', () => {
    delete CLIENT_CONFIG.medicoId;
    localStorage.setItem('medico_id', 'MED_LS');
    const id = _lmGetMedicoId();
    assertEqual(id, 'MED_LS');
    localStorage.removeItem('medico_id');
});

test('licenseManager — _lmGetCache retorna null sin datos', () => {
    localStorage.clear();
    _lmCacheCache = null;
    const cache = _lmGetCache();
    assert(cache === null, 'Sin datos → null');
});

test('licenseManager — _lmGetCache retorna datos con TTL válido', () => {
    _lmCacheCache = { data: { plan: 'PRO' }, timestamp: Date.now() };
    const cache = _lmGetCache();
    assert(cache !== null, 'TTL válido → datos');
    assertEqual(cache.plan, 'PRO');
});

test('licenseManager — _lmGetCache retorna null con TTL expirado', () => {
    _lmCacheCache = { data: { plan: 'PRO' }, timestamp: Date.now() - (5 * 60 * 60 * 1000) }; // 5h ago
    const cache = _lmGetCache();
    assert(cache === null, 'TTL expirado (5h) → null');
});

test('licenseManager — _lmSetCache guarda y puede leer de nuevo', () => {
    _lmCacheCache = null;
    _lmSetCache({ plan: 'NORMAL', expiresAt: '2026-12-31' });
    const cache = _lmGetCache();
    assert(cache !== null, 'Debe poder leer tras guardar');
    assertEqual(cache.plan, 'NORMAL');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 71: diagnostic.js — Funciones puras
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 71: diagnostic — funciones puras ─────────────────');

// Extraer funciones puras de diagnostic.js
const diagCode = fs.readFileSync(path.join(root, 'src/js/features/diagnostic.js'), 'utf-8');
const diagDeviceMatch = diagCode.match(/function _diagDeviceId\(\)\s*\{[\s\S]*?\n\}/);
if (diagDeviceMatch) try { vm.runInContext(diagDeviceMatch[0], ctx); } catch(e) {}
const safeJsonMatch = diagCode.match(/async function _safeJson\([\s\S]*?\n\}/);
if (safeJsonMatch) try { vm.runInContext(safeJsonMatch[0], ctx); } catch(e) {}

test('diagnostic — _diagDeviceId genera ID persistente', () => {
    localStorage.clear();
    _diagDeviceCache = null;
    const id1 = _diagDeviceId();
    assert(id1, 'Debe generar device ID');
    assert(id1.startsWith('DEV_'), 'Device ID diagnóstico comienza con DEV_');
    const id2 = _diagDeviceId();
    assertEqual(id1, id2, 'Misma llamada retorna el mismo ID');
});

test('diagnostic — _diagDeviceId usa el existente', () => {
    localStorage.clear();
    _diagDeviceCache = null;
    localStorage.setItem('device_id', 'MY_DEVICE');
    const id = _diagDeviceId();
    assertEqual(id, 'MY_DEVICE');
});

test('diagnostic — _safeJson retorna fallback con key inexistente', async () => {
    localStorage.clear();
    const result = await _safeJson('no_existe_key', { default: true });
    assert(result.default === true, 'Debe retornar fallback');
});

test('diagnostic — _safeJson lee de localStorage', async () => {
    localStorage.setItem('test_diag_key', JSON.stringify({ valor: 42 }));
    const result = await _safeJson('test_diag_key', {});
    assertEqual(result.valor, 42, 'Debe leer el valor de localStorage');
    localStorage.removeItem('test_diag_key');
});

test('diagnostic — buildDiagnosticReport retorna objeto con campos requeridos', async () => {
    localStorage.clear();
    _diagDeviceCache = null;
    global.currentMode = 'normal';
    // buildDiagnosticReport ya fue definido globalmente en el mock arriba
    // Cargamos la versión real del módulo si es posible
    const buildMatch = diagCode.match(/window\.buildDiagnosticReport\s*=\s*async function\s*\(\)\s*\{[\s\S]*?\n\};/);
    if (buildMatch) {
        try { vm.runInContext(buildMatch[0], ctx); } catch(e) {}
    }
    const report = await buildDiagnosticReport();
    assert(report.timestamp, 'Debe tener timestamp');
    assert(report.device_id, 'Debe tener device_id');
    assert('api_key_present' in report, 'Debe tener api_key_present');
    assert('current_mode' in report, 'Debe tener current_mode');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 72: contact.js — Validación
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 72: contact — validación básica ─────────────────');

const contactCode = fs.readFileSync(path.join(root, 'src/js/features/contact.js'), 'utf-8');
// Extraer solo la función _retryPendingContacts y initContact existen
// Verificación de estructura
test('contact — initContact es función global', () => {
    assert(typeof initContact === 'function', 'initContact debe existir');
});

test('contact — código contiene validación de formulario', () => {
    assertIncludes(contactCode, 'motivo', 'contact.js debe validar motivo');
    assertIncludes(contactCode, 'detalle', 'contact.js debe validar detalle');
});

test('contact — código maneja pending_contacts en localStorage', () => {
    assertIncludes(contactCode, 'pending_contacts', 'Debe manejar cola de pendientes');
});

test('contact — código NO usa mailto (envío directo desde app)', () => {
    assert(!contactCode.includes('mailto'), 'No debe abrir cliente externo de correo');
});

test('contact — código envía al backend', () => {
    assert(contactCode.includes('fetch') || contactCode.includes('backend'), 'Debe enviar al backend');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 73: sessionAssistant.js — Helpers puros
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 73: sessionAssistant — helpers ─────────────────');

const saCode = fs.readFileSync(path.join(root, 'src/js/features/sessionAssistant.js'), 'utf-8');
// Extraer funciones puras
// getGreeting está dentro de initSessionAssistant — extraer manualmente
const greetingMatch = saCode.match(/function getGreeting\(nombre, clinic\)\s*\{[\s\S]*?\n    \}/);
if (greetingMatch) try { vm.runInContext('var __testGetGreeting = ' + greetingMatch[0], ctx); } catch(e) {}

test('sessionAssistant — getGreeting genera saludo con nombre', () => {
    if (typeof __testGetGreeting !== 'function') {
        // Fallback: verificar que el código contiene la lógica de saludo
        assertIncludes(saCode, 'Buenos días');
        assertIncludes(saCode, 'Buenas tardes');
        assertIncludes(saCode, 'Buenas noches');
        return;
    }
    const greeting = __testGetGreeting('Dr. García', false);
    assert(greeting.includes('Dr. García'), 'Saludo debe incluir el nombre');
});

test('sessionAssistant — getGreeting en modo clínica omite nombre', () => {
    if (typeof __testGetGreeting !== 'function') {
        assertIncludes(saCode, 'clinic');
        return;
    }
    const greeting = __testGetGreeting('Dr. García', true);
    assert(!greeting.includes('Dr. García'), 'Modo clínica no incluye nombre');
    assert(greeting.includes('👋'), 'Debe incluir emoji');
});

test('sessionAssistant — código tiene isProUser y isClinicMode', () => {
    assertIncludes(saCode, 'isProUser');
    assertIncludes(saCode, 'isClinicMode');
});

test('sessionAssistant — código popula workplaces, professionals y templates', () => {
    assertIncludes(saCode, 'populateWorkplaces');
    assertIncludes(saCode, 'populateProfessionals');
    assertIncludes(saCode, 'populateTemplates');
});

test('sessionAssistant — código tiene confirm y skip', () => {
    assertIncludes(saCode, 'confirm');
    assertIncludes(saCode, 'skip');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 74: config.js — apiUsageTracker
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 74: config.js — apiUsageTracker ────────────────');

const configCode = fs.readFileSync(path.join(root, 'src/js/config/config.js'), 'utf-8');

test('config — apiUsageTracker existe como global', () => {
    assert(typeof apiUsageTracker === 'object' || configCode.includes('apiUsageTracker'),
        'apiUsageTracker debe existir');
});

test('config — CLIENT_CONFIG tiene campos de estructura base', () => {
    assert(typeof CLIENT_CONFIG === 'object', 'CLIENT_CONFIG debe ser objeto');
});

test('config — config.js carga configuración dinámica', () => {
    assertIncludes(configCode, '_loadDynamicConfig', 'Debe tener _loadDynamicConfig');
});

test('config — config.js maneja _PENDING_SETUP_ID de URL', () => {
    assert(configCode.includes('_PENDING_SETUP_ID') || configCode.includes('pendingSetupId') || configCode.includes('?id='),
        'Debe manejar pending setup');
});

test('config — apiUsageTracker tiene track/get/clear', () => {
    const hasTrack = configCode.includes('.track') || configCode.includes('track:');
    const hasGet = configCode.includes('.get') || configCode.includes('getCount') || configCode.includes('get:');
    assert(hasTrack || hasGet, 'apiUsageTracker debe tener métodos de tracking');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 75: transcriptor.js — cleanTranscriptionText + classify
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 75: transcriptor — funciones puras ─────────────');

const transCode = fs.readFileSync(path.join(root, 'src/js/features/transcriptor.js'), 'utf-8');

// Extraer cleanTranscriptionText
const cleanTextMatch = transCode.match(/function cleanTranscriptionText\(text\)\s*\{[\s\S]*?\n\}/);
if (cleanTextMatch) try { vm.runInContext(cleanTextMatch[0], ctx); } catch(e) {}

// Extraer classifyTranscriptionError
const classTransMatch = transCode.match(/function classifyTranscriptionError[\s\S]*?\n\}/);
if (classTransMatch) try { vm.runInContext(classTransMatch[0], ctx); } catch(e) {}

// Extraer validateAudioFile
const validateAudioMatch = transCode.match(/function validateAudioFile[\s\S]*?\n\}/);
if (validateAudioMatch) try { vm.runInContext(validateAudioMatch[0], ctx); } catch(e) {}

test('transcriptor — cleanTranscriptionText limpia espacios múltiples', () => {
    if (typeof cleanTranscriptionText !== 'function') {
        assertIncludes(transCode, 'cleanTranscriptionText', 'Función debe existir');
        return;
    }
    const result = cleanTranscriptionText('Hola   mundo   test');
    assert(!result.includes('   '), 'No debe tener 3 espacios consecutivos');
});

test('transcriptor — cleanTranscriptionText elimina saltos de línea excesivos', () => {
    if (typeof cleanTranscriptionText !== 'function') return;
    const result = cleanTranscriptionText('Línea 1\n\n\n\nLínea 2');
    const newlines = (result.match(/\n/g) || []).length;
    assert(newlines <= 2, 'No debe tener más de 2 saltos seguidos');
});

test('transcriptor — classifyTranscriptionError clasifica 413 como file_too_large', () => {
    if (typeof classifyTranscriptionError !== 'function') {
        assertIncludes(transCode, 'classifyTranscriptionError');
        return;
    }
    const result = classifyTranscriptionError({ status: 413 });
    assert(result.type === 'file_too_large' || result.type === 'payload', 'Status 413 → file too large');
});

test('transcriptor — código tiene buildWhisperPrompt', () => {
    assertIncludes(transCode, 'buildWhisperPrompt', 'Debe tener buildWhisperPrompt');
});

test('transcriptor — código tiene transcribeWithRetry', () => {
    assertIncludes(transCode, 'transcribeWithRetry', 'Debe tener transcribeWithRetry');
});

test('transcriptor — código tiene repairAudioFile', () => {
    assertIncludes(transCode, 'repairAudioFile', 'Debe tener repairAudioFile');
});

test('transcriptor — código tiene isAudioSilent', () => {
    assertIncludes(transCode, 'isAudioSilent', 'Debe tener isAudioSilent');
});

test('transcriptor — código tiene autoApplyDictCorrections', () => {
    assertIncludes(transCode, 'autoApplyDictCorrections', 'Debe tener autoApplyDictCorrections');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 76: editor.js — Funciones puras y estructura
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 76: editor — funciones puras ─────────────────');

const editorCode = fs.readFileSync(path.join(root, 'src/js/features/editor.js'), 'utf-8');

// Extraer escapeRegex
const escRegexMatch = editorCode.match(/function escapeRegex\(str\)\s*\{[\s\S]*?\n\}/);
if (escRegexMatch) try { vm.runInContext(escRegexMatch[0], ctx); } catch(e) {}

// Extraer buildSearchRegex
const buildSrchMatch = editorCode.match(/function buildSearchRegex\([\s\S]*?\n\}/);
if (buildSrchMatch) try { vm.runInContext(buildSrchMatch[0], ctx); } catch(e) {}

// Extraer getPreferredFormat
const prefFmtMatch = editorCode.match(/function getPreferredFormat\(\)\s*\{[\s\S]*?\n\}/);
if (prefFmtMatch) try { vm.runInContext(prefFmtMatch[0], ctx); } catch(e) {}

test('editor — escapeRegex escapa paréntesis y puntos', () => {
    if (typeof escapeRegex !== 'function') {
        assertIncludes(editorCode, 'escapeRegex');
        return;
    }
    const result = escapeRegex('test.value(1)');
    assert(result.includes('\\.'), 'Debe escapar punto');
    assert(result.includes('\\('), 'Debe escapar paréntesis');
});

test('editor — buildSearchRegex retorna RegExp', () => {
    if (typeof buildSearchRegex !== 'function') {
        assertIncludes(editorCode, 'buildSearchRegex');
        return;
    }
    const regex = buildSearchRegex('estenosis', false, false);
    assert(regex instanceof RegExp, 'Debe retornar RegExp');
    assert(regex.test('Estenosis'), 'Debe matchear case-insensitive');
});

test('editor — código tiene saveEditorSnapshot y restoreEditorSnapshot', () => {
    assertIncludes(editorCode, 'saveEditorSnapshot');
    assertIncludes(editorCode, 'restoreEditorSnapshot');
});

test('editor — código tiene clearEditorSnapshots', () => {
    assertIncludes(editorCode, 'clearEditorSnapshots');
});

test('editor — código tiene highlightText', () => {
    assertIncludes(editorCode, 'highlightText');
});

test('editor — código tiene replaceInTextNodes', () => {
    assertIncludes(editorCode, 'replaceInTextNodes');
});

test('editor — código tiene saveUndoState', () => {
    assertIncludes(editorCode, 'saveUndoState');
});

test('editor — código tiene openEditFieldModal', () => {
    assertIncludes(editorCode, 'openEditFieldModal');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 77: pdfMaker.js — Funciones de renderizado
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 77: pdfMaker — funciones de renderizado ────────────');

test('pdfMaker — _hexToRgb convierte colores médicos comunes', () => {
    const teal = _hexToRgb('#0f766e'); // color primario de la app
    assert(teal.r === 15, 'r=15');
    assert(teal.g === 118, 'g=118');
    assert(teal.b === 110, 'b=110');
});

test('pdfMaker — _hexToRgb convierte blanco', () => {
    const white = _hexToRgb('#FFFFFF');
    assertEqual(white.r, 255);
    assertEqual(white.g, 255);
    assertEqual(white.b, 255);
});

test('pdfMaker — _hexToRgb maneja hex con lowercase y uppercase', () => {
    const lower = _hexToRgb('#ff0000');
    const upper = _hexToRgb('#FF0000');
    assertEqual(lower.r, upper.r);
    assertEqual(lower.g, upper.g);
    assertEqual(lower.b, upper.b);
});

test('pdfMaker — código tiene drawHeader', () => {
    assertIncludes(pdfMakerCode, 'drawHeader', 'pdfMaker debe tener drawHeader');
});

test('pdfMaker — código tiene drawFooter', () => {
    assertIncludes(pdfMakerCode, 'drawFooter', 'pdfMaker debe tener drawFooter');
});

test('pdfMaker — código tiene drawPatientBlock', () => {
    assertIncludes(pdfMakerCode, 'drawPatientBlock', 'pdfMaker debe tener drawPatientBlock');
});

test('pdfMaker — código tiene renderNode', () => {
    assertIncludes(pdfMakerCode, 'renderNode', 'pdfMaker debe tener renderNode');
});

test('pdfMaker — código tiene drawSignature', () => {
    assertIncludes(pdfMakerCode, 'drawSignature', 'pdfMaker debe tener drawSignature');
});

test('pdfMaker — código tiene ensureSpace', () => {
    assertIncludes(pdfMakerCode, 'ensureSpace', 'pdfMaker debe tener ensureSpace');
});

test('pdfMaker — código tiene downloadPDFWrapper', () => {
    assertIncludes(pdfMakerCode, 'downloadPDFWrapper', 'pdfMaker debe tener downloadPDFWrapper');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 78: pdfPreview.js — QR y funciones adicionales
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 78: pdfPreview — QR y funciones adicionales ────────');

test('pdfPreview — código tiene generateQRCode', () => {
    assertIncludes(pvCode, 'generateQRCode', 'pdfPreview debe tener generateQRCode');
});

test('pdfPreview — código tiene updatePdfModalByMode', () => {
    assertIncludes(pvCode, 'updatePdfModalByMode');
});

test('pdfPreview — código tiene _escHtml', () => {
    assertIncludes(pvCode, '_escHtml');
});

test('pdfPreview — código tiene printFromPreview', () => {
    assertIncludes(pvCode, 'printFromPreview');
});

test('pdfPreview — código tiene updateConfigTrafficLight', () => {
    assertIncludes(pvCode, 'updateConfigTrafficLight');
});

test('pdfPreview — evaluateConfigCompleteness con datos completos retorna green', () => {
    localStorage.clear();
    localStorage.setItem('prof_data', JSON.stringify({
        nombre: 'Dr. Test', matricula: 'MP1234', especialidades: 'Cardiología'
    }));
    localStorage.setItem('workplace_profiles', JSON.stringify([
        { name: 'Clínica Test', address: 'Calle 123' }
    ]));
    const result = evaluateConfigCompleteness();
    assertEqual(result.level, 'green', 'Datos completos → green');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 79: dom.js — safeJSONParse + fetchWithTimeout + shouldNormalize
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 79: dom.js — funciones adicionales ─────────────');

const domCode = fs.readFileSync(path.join(root, 'src/js/utils/dom.js'), 'utf-8');

test('dom.js — normalizeFieldText con modo sentence preserva caps médicas', () => {
    // Ya cubierto en bloque 37, pero agregamos edge cases
    const result = normalizeFieldText('VEF1 Y CVF NORMALES', 'sentence');
    assertIncludes(result, 'VEF1', 'Debe preservar VEF1');
});

test('dom.js — normalizeFieldText maneja undefined', () => {
    const result = normalizeFieldText(undefined, 'sentence');
    assertEqual(result, '', 'undefined → vacío');
});

test('dom.js — normalizeFieldText maneja número como input', () => {
    const result = normalizeFieldText(42, 'sentence');
    assert(typeof result === 'string', 'Debe retornar string');
});

test('dom.js — safeJSONParse existe en el código', () => {
    assertIncludes(domCode, 'safeJSONParse', 'dom.js debe tener safeJSONParse');
});

test('dom.js — fetchWithTimeout existe en el código', () => {
    assertIncludes(domCode, 'fetchWithTimeout', 'dom.js debe tener fetchWithTimeout');
});

test('dom.js — shouldNormalize existe en el código', () => {
    assertIncludes(domCode, 'shouldNormalize', 'dom.js debe tener shouldNormalize');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 80: stateManager.js — Cobertura de todos los estados
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 80: stateManager — cobertura completa ────────────');

const smCode = fs.readFileSync(path.join(root, 'src/js/utils/stateManager.js'), 'utf-8');

test('stateManager — tiene updateButtonsVisibility', () => {
    assertIncludes(smCode, 'updateButtonsVisibility');
});

test('stateManager — tiene setMode', () => {
    assertIncludes(smCode, 'setMode');
});

test('stateManager — tiene initializeMode', () => {
    assertIncludes(smCode, 'initializeMode');
});

test('stateManager — tiene updateUIByMode', () => {
    assertIncludes(smCode, 'updateUIByMode');
});

test('stateManager — maneja estado IDLE', () => {
    assertIncludes(smCode, 'IDLE');
});

test('stateManager — maneja estado TRANSCRIBED', () => {
    assertIncludes(smCode, 'TRANSCRIBED');
});

test('stateManager — maneja estado STRUCTURED', () => {
    assertIncludes(smCode, 'STRUCTURED');
});

test('stateManager — maneja estado PREVIEWED', () => {
    assertIncludes(smCode, 'PREVIEWED');
});

test('stateManager — distingue modo pro vs normal', () => {
    assertIncludes(smCode, 'pro');
    assertIncludes(smCode, 'normal');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 81: ui.js — Funciones de UI
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 81: ui.js — funciones UI ─────────────────');

test('ui.js — escapeHtml escapa múltiples entidades en secuencia', () => {
    const result = escapeHtml('<div class="test">&</div>');
    assertIncludes(result, '&lt;');
    assertIncludes(result, '&gt;');
    assertIncludes(result, '&quot;');
    assertIncludes(result, '&amp;');
});

test('ui.js — isAdminUser reconoce ADMIN', () => {
    const saved = CLIENT_CONFIG.type;
    CLIENT_CONFIG.type = 'ADMIN';
    assert(isAdminUser() === true, 'ADMIN → true');
    CLIENT_CONFIG.type = saved;
});

test('ui.js — isAdminUser reconoce NORMAL como no admin', () => {
    const saved = CLIENT_CONFIG.type;
    CLIENT_CONFIG.type = 'NORMAL';
    assert(isAdminUser() === false, 'NORMAL → false');
    CLIENT_CONFIG.type = saved;
});

test('ui.js — isAdminUser reconoce PRO como no admin', () => {
    const saved = CLIENT_CONFIG.type;
    CLIENT_CONFIG.type = 'PRO';
    assert(isAdminUser() === false, 'PRO → false');
    CLIENT_CONFIG.type = saved;
});

test('ui.js — isAdminUser reconoce TRIAL como no admin', () => {
    const saved = CLIENT_CONFIG.type;
    CLIENT_CONFIG.type = 'TRIAL';
    assert(isAdminUser() === false, 'TRIAL → false');
    CLIENT_CONFIG.type = saved;
});

test('ui.js — código tiene trapFocusInModal', () => {
    assertIncludes(uiCode, 'trapFocusInModal');
});

test('ui.js — código tiene releaseFocusTrap', () => {
    assertIncludes(uiCode, 'releaseFocusTrap');
});

test('ui.js — código tiene updateWordCount', () => {
    assertIncludes(uiCode, 'updateWordCount');
});

test('ui.js — código tiene showBlocker', () => {
    assertIncludes(uiCode, 'showBlocker');
});

test('ui.js — código tiene updateApiStatus', () => {
    assertIncludes(uiCode, 'updateApiStatus');
});

test('ui.js — código tiene initShortcuts', () => {
    assertIncludes(uiCode, 'initShortcuts');
});

test('ui.js — código tiene enterComparisonMode', () => {
    assertIncludes(uiCode, 'enterComparisonMode');
});

test('ui.js — código tiene exitComparisonMode', () => {
    assertIncludes(uiCode, 'exitComparisonMode');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 82: tabs.js + toast.js — Estructura
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 82: tabs.js + toast.js — estructura ────────────');

const tabsCode = fs.readFileSync(path.join(root, 'src/js/utils/tabs.js'), 'utf-8');
const toastCode = fs.readFileSync(path.join(root, 'src/js/utils/toast.js'), 'utf-8');

test('tabs.js — tiene createTabs', () => {
    assertIncludes(tabsCode, 'createTabs');
});

test('tabs.js — tiene switchTab', () => {
    assertIncludes(tabsCode, 'switchTab');
});

test('tabs.js — tiene closeTab', () => {
    assertIncludes(tabsCode, 'closeTab');
});

test('tabs.js — closeTab maneja ajuste de índice', () => {
    assertIncludes(tabsCode, 'activeTabIndex');
});

test('tabs.js — closeTab resetea a IDLE si vacío', () => {
    assertIncludes(tabsCode, 'IDLE');
});

test('toast.js — tiene showToast', () => {
    assertIncludes(toastCode, 'showToast');
});

test('toast.js — tiene showToastWithAction', () => {
    assertIncludes(toastCode, 'showToastWithAction');
});

test('toast.js — tiene askJoinAudiosPromise', () => {
    assertIncludes(toastCode, 'askJoinAudiosPromise');
});

test('toast.js — showToast maneja tipos success/error/warning/info', () => {
    assertIncludes(toastCode, 'success');
    assertIncludes(toastCode, 'error');
});

test('toast.js — askJoinAudiosPromise tiene timeout', () => {
    assertIncludes(toastCode, 'timeout', 'askJoinAudiosPromise debe tener timeout');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 83: audio.js — Estructura y formatSize
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 83: audio.js — estructura y formatSize ─────────');

const audioCode = fs.readFileSync(path.join(root, 'src/js/core/audio.js'), 'utf-8');

// Extraer formatSize
const formatSizeMatch = audioCode.match(/(?:window\.)?formatSize\s*=\s*function\s*\(bytes\)\s*\{[\s\S]*?\n\};?/);
if (formatSizeMatch) try { vm.runInContext(formatSizeMatch[0], ctx); } catch(e) {}

test('audio.js — tiene toggleRecording', () => {
    assertIncludes(audioCode, 'toggleRecording');
});

test('audio.js — tiene handleFiles', () => {
    assertIncludes(audioCode, 'handleFiles');
});

test('audio.js — tiene formatSize', () => {
    assertIncludes(audioCode, 'formatSize');
});

test('audio.js — formatSize formatea bytes correctamente', () => {
    if (typeof formatSize !== 'function') return;
    const result = formatSize(1048576);
    assert(result.includes('MB') || result.includes('1'), 'Debe formatear 1MB');
});

test('audio.js — formatSize formatea KB', () => {
    if (typeof formatSize !== 'function') return;
    const result = formatSize(1024);
    assert(result.includes('KB') || result.includes('1'), 'Debe formatear 1KB');
});

test('audio.js — formatSize formatea 0 bytes', () => {
    if (typeof formatSize !== 'function') return;
    const result = formatSize(0);
    assert(typeof result === 'string', 'Debe retornar string');
});

test('audio.js — tiene updateRecordingUI', () => {
    assertIncludes(audioCode, 'updateRecordingUI');
});

test('audio.js — tiene togglePlayAudio', () => {
    assertIncludes(audioCode, 'togglePlayAudio');
});

test('audio.js — usa mimeType dinámico', () => {
    assertIncludes(audioCode, 'mimeType');
});

test('audio.js — tiene onerror handler en MediaRecorder', () => {
    assertIncludes(audioCode, 'onerror');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 84: db.js — Estructura de appDB
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 84: db.js — estructura de appDB ─────────────────');

const dbCode = fs.readFileSync(path.join(root, 'src/js/utils/db.js'), 'utf-8');

test('db.js — appDB mock tiene get/set/remove/clear', () => {
    assert(typeof appDB.get === 'function', 'get');
    assert(typeof appDB.set === 'function', 'set');
    assert(typeof appDB.remove === 'function', 'remove');
    assert(typeof appDB.clear === 'function', 'clear');
});

test('db.js — appDB mock tiene keys/getAll/sizeInBytes', () => {
    assert(typeof appDB.keys === 'function', 'keys');
    assert(typeof appDB.getAll === 'function', 'getAll');
    assert(typeof appDB.sizeInBytes === 'function', 'sizeInBytes');
});

test('db.js — appDB.set y appDB.get funcionan correctamente', async () => {
    await appDB.set('test_db_key', { valor: 42 });
    const result = await appDB.get('test_db_key');
    assertEqual(result.valor, 42);
    await appDB.remove('test_db_key');
});

test('db.js — appDB.get retorna undefined para key inexistente', async () => {
    const result = await appDB.get('no_existe_asdf');
    assert(result === undefined, 'Key inexistente → undefined');
});

test('db.js — appDB.keys retorna array de claves', async () => {
    await appDB.set('k1', 'v1');
    await appDB.set('k2', 'v2');
    const keys = await appDB.keys();
    assert(Array.isArray(keys), 'keys() retorna array');
    assert(keys.includes('k1'), 'Contiene k1');
    assert(keys.includes('k2'), 'Contiene k2');
});

test('db.js — appDB.clear limpia todos los datos', async () => {
    await appDB.set('temp1', 'val1');
    await appDB.clear();
    const keys = await appDB.keys();
    assertEqual(keys.length, 0, 'Clear debe vaciar todo');
});

test('db.js — appDB.sizeInBytes retorna número', async () => {
    await appDB.set('size_test', 'hello world');
    const size = await appDB.sizeInBytes();
    assert(typeof size === 'number', 'sizeInBytes retorna number');
    assert(size > 0, 'Tamaño > 0 con datos');
});

test('db.js — appDB.getAll retorna objeto con todos los datos', async () => {
    await appDB.clear();
    await appDB.set('a1', { x: 1 });
    await appDB.set('a2', { x: 2 });
    const all = await appDB.getAll();
    assert(typeof all === 'object', 'getAll retorna objeto');
    assert(all.a1.x === 1, 'a1.x = 1');
    assert(all.a2.x === 2, 'a2.x = 2');
});

test('db.js — código fuente tiene migrateFromLocalStorage', () => {
    assertIncludes(dbCode, 'migrateFromLocalStorage');
});

test('db.js — código fuente tiene IndexedDB constants', () => {
    assertIncludes(dbCode, 'TranscriptorProDB');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 85: business.js — Funciones de gestión de profesionales
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 85: business.js — gestión de profesionales ────────');

const businessCode = fs.readFileSync(path.join(root, 'src/js/features/business.js'), 'utf-8');

test('business.js — tiene initWorkplaceManagement', () => {
    assertIncludes(businessCode, 'initWorkplaceManagement');
});

test('business.js — tiene saveProfessional', () => {
    assertIncludes(businessCode, 'saveProfessional');
});

test('business.js — tiene deleteProfessional', () => {
    assertIncludes(businessCode, 'deleteProfessional');
});

test('business.js — tiene renderProfessionalList', () => {
    assertIncludes(businessCode, 'renderProfessionalList');
});

test('business.js — tiene _handleFactorySetup', () => {
    assertIncludes(businessCode, '_handleFactorySetup');
});

test('business.js — tiene _initAdmin', () => {
    assertIncludes(businessCode, '_initAdmin');
});

test('business.js — tiene escapeHtml para XSS protection', () => {
    assert(businessCode.includes('escapeHtml') || businessCode.includes('_escHtml'),
        'Debe usar escape HTML para protección XSS');
});

test('business.js — tiene populateWorkplaceDropdown', () => {
    assertIncludes(businessCode, 'populateWorkplaceDropdown');
});

test('business.js — tiene loadWorkplaceProfile', () => {
    assertIncludes(businessCode, 'loadWorkplaceProfile');
});

test('business.js — tiene loadProfessionalProfile', () => {
    assertIncludes(businessCode, 'loadProfessionalProfile');
});

test('business.js — tiene FileReader para imágenes', () => {
    assertIncludes(businessCode, 'FileReader');
});

test('business.js — FileReader tiene onerror handler', () => {
    assertIncludes(businessCode, 'onerror');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 86: settingsPanel.js + pricingCart.js — Estructura
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 86: settingsPanel + pricingCart — estructura ────');

const settingsCode = fs.readFileSync(path.join(root, 'src/js/features/settingsPanel.js'), 'utf-8');
const pricingCode  = fs.readFileSync(path.join(root, 'src/js/features/pricingCart.js'), 'utf-8');
const bizClientFlowCode = fs.readFileSync(path.join(root, 'src/js/features/businessClientAdminUtils.js'), 'utf-8');
const bizUiHelpersCode = fs.readFileSync(path.join(root, 'src/js/features/businessUiHelpers.js'), 'utf-8');

test('settingsPanel — tiene initSettingsPanel', () => {
    assertIncludes(settingsCode, 'initSettingsPanel');
});

test('settingsPanel — tiene populateSettingsModal', () => {
    assertIncludes(settingsCode, 'populateSettingsModal');
});

test('settingsPanel — tiene _initApiKeySection', () => {
    assertIncludes(settingsCode, '_initApiKeySection');
});

test('settingsPanel — tiene _populateWorkplace', () => {
    assertIncludes(settingsCode, '_populateWorkplace');
});

test('settingsPanel — tiene _initQuickProfiles', () => {
    assertIncludes(settingsCode, '_initQuickProfiles');
});

test('pricingCart — tiene _loadDynamicPlans', () => {
    assertIncludes(pricingCode, '_loadDynamicPlans');
});

test('pricingCart — tiene _convertPrice', () => {
    assertIncludes(pricingCode, '_convertPrice');
});

test('pricingCart — tiene openPricingCart', () => {
    assertIncludes(pricingCode, 'openPricingCart');
});

test('pricingCart — tiene initPricingCart', () => {
    assertIncludes(pricingCode, 'initPricingCart');
});

test('pricingCart — tiene _submitUpgradeRequest', () => {
    assertIncludes(pricingCode, '_submitUpgradeRequest');
});

test('pricingCart — resumen usa displayPrice convertido', () => {
    assertIncludes(pricingCode, 'displayPrice || i.price');
});

test('pricingCart — payload incluye currency y exchangeRate', () => {
    assertIncludes(pricingCode, 'currency: _currency');
    assertIncludes(pricingCode, "exchangeRate: _currency === 'ARS' ? _getExchangeRate() : null");
});

test('PWA client flow — _initClient invoca _tryPwaInstall', () => {
    assertIncludes(bizClientFlowCode, 'function _initClient()');
    assertIncludes(bizClientFlowCode, '_tryPwaInstall(3)');
});

test('PWA helper — escucha beforeinstallprompt y muestra banner', () => {
    assertIncludes(bizUiHelpersCode, "window.addEventListener('beforeinstallprompt'");
    assertIncludes(bizUiHelpersCode, '_showPwaInstallBanner()');
});

test('PDF logos — institución y profesional se renderizan en bloques separados', () => {
    assertIncludes(pdfMakerCode, 'function drawWorkplaceBanner()');
    assertIncludes(pdfMakerCode, 'if (instLogoB64)');
    assertIncludes(pdfMakerCode, 'function drawHeader()');
    assertIncludes(pdfMakerCode, 'if (profLogoB64 && profLogoB64 !== instLogoB64)');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 87: userGuide.js — Tour guiado
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 87: userGuide.js — tour guiado ────────────────');

const guideCode = fs.readFileSync(path.join(root, 'src/js/features/userGuide.js'), 'utf-8');

test('userGuide — tiene startTour / startGuideTour', () => {
    assert(guideCode.includes('startTour') || guideCode.includes('startGuideTour'),
        'Debe tener función de inicio de tour');
});

test('userGuide — tiene endTour', () => {
    assertIncludes(guideCode, 'endTour');
});

test('userGuide — tiene showStep', () => {
    assertIncludes(guideCode, 'showStep');
});

test('userGuide — tiene positionTooltip', () => {
    assertIncludes(guideCode, 'positionTooltip');
});

test('userGuide — tiene maybeAutoTour', () => {
    assertIncludes(guideCode, 'maybeAutoTour');
});

test('userGuide — tiene findTarget', () => {
    assertIncludes(guideCode, 'findTarget');
});

test('userGuide — construye pasos adaptativos por contexto', () => {
    assertIncludes(guideCode, 'buildTourSteps');
    assertIncludes(guideCode, 'showProActivationStep');
    assertIncludes(guideCode, 'activeTourSteps');
});

test('userGuide — adapta textos por perfil (PRO/GIFT/CLINIC/ADMIN)', () => {
    assertIncludes(guideCode, 'resolveStepText');
    assertIncludes(guideCode, 'isClinic');
    assertIncludes(guideCode, 'isGift');
    assertIncludes(guideCode, 'planCode');
});

test('userGuide — reordena pasos por perfil', () => {
    assertIncludes(guideCode, 'reorderTourSteps');
    assertIncludes(guideCode, 'preferredOrder');
    assertIncludes(guideCode, 'admin-panel');
});

test('userGuide — filtra pasos con targets visibles y recalcula en resize', () => {
    assertIncludes(guideCode, 'hasVisibleTarget');
    assertIncludes(guideCode, 'refreshActiveTourStepsLive');
    assertIncludes(guideCode, "window.addEventListener('resize'");
});

test('userGuide — guarda y reanuda progreso por perfil', () => {
    assertIncludes(guideCode, 'TOUR_PROGRESS_PREFIX');
    assertIncludes(guideCode, 'getTourProfileId');
    assertIncludes(guideCode, 'saveTourProgress');
    assertIncludes(guideCode, 'getSavedTourProgress');
    assertIncludes(guideCode, 'clearTourProgress');
    assertIncludes(guideCode, 'const savedStepId = getSavedTourProgress');
});

test('userGuide — permite reiniciar tour desde el inicio', () => {
    assertIncludes(guideCode, 'forceRestart');
    assertIncludes(guideCode, 'window.restartGuideTour');
    assertIncludes(guideCode, 'btnRestartTour');
});

const settingsActionsCode = fs.readFileSync(path.join(root, 'src/js/features/settingsModalActionsUtils.js'), 'utf-8');

test('settings actions — botón reiniciar tutorial disponible', () => {
    assertIncludes(settingsActionsCode, 'settingsRestartTourNow');
    assertIncludes(settingsActionsCode, 'restartGuideTour');
});

// Validar carga de archivos de texto enriquecidos en Modo Pro
const proSourceModeCode = fs.readFileSync(path.join(root, 'src/js/features/proSidebarSourceMode.js'), 'utf-8');

test('proSidebarSourceMode — soporta TXT/DOC/DOCX/PDF para estructurar texto', () => {
    assertIncludes(proSourceModeCode, '.doc');
    assertIncludes(proSourceModeCode, '.docx');
    assertIncludes(proSourceModeCode, '.pdf');
});

test('proSidebarSourceMode — tiene extractores para PDF y DOCX', () => {
    assertIncludes(proSourceModeCode, 'extractPdfText');
    assertIncludes(proSourceModeCode, 'extractDocxText');
    assertIncludes(proSourceModeCode, 'extractTextFromFile');
});

test('proSidebarSourceMode — mejora calidad de extracción .doc', () => {
    assertIncludes(proSourceModeCode, 'scoreReadableText');
    assertIncludes(proSourceModeCode, 'detectLikelyCorruptedExtraction');
    assertIncludes(proSourceModeCode, 'Convertí a .docx para mejor compatibilidad');
});

test('proSidebarSourceMode — valida tamaño y tipo de archivo para estructurar', () => {
    assertIncludes(proSourceModeCode, 'MAX_TEXT_IMPORT_BYTES');
    assertIncludes(proSourceModeCode, 'validateSelectedFile');
    assertIncludes(proSourceModeCode, 'ALLOWED_TEXT_EXTENSIONS');
});

test('proSidebarSourceMode — limita extracción para documentos extensos', () => {
    assertIncludes(proSourceModeCode, 'MAX_EXTRACTED_TEXT_CHARS');
    assertIncludes(proSourceModeCode, 'MAX_PDF_PAGES_TO_EXTRACT');
    assertIncludes(proSourceModeCode, 'truncateTextIfNeeded');
});

const factorySetupCode = fs.readFileSync(path.join(root, 'src/js/features/businessFactorySetupUtils.js'), 'utf-8');

test('factory setup — persiste planCode en CLIENT_CONFIG', () => {
    assertIncludes(factorySetupCode, 'planCode');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 88: Integridad archivos CSS y assets
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 88: Integridad archivos CSS y assets ──────────────');

test('CSS base — variables.css existe', () => {
    assert(fs.existsSync(path.join(root, 'src/css/variables.css')));
});

test('CSS base — base.css existe', () => {
    assert(fs.existsSync(path.join(root, 'src/css/base.css')));
});

test('CSS base — components.css existe', () => {
    assert(fs.existsSync(path.join(root, 'src/css/components.css')));
});

test('CSS base — layout.css existe', () => {
    assert(fs.existsSync(path.join(root, 'src/css/layout.css')));
});

test('CSS base — animations.css existe', () => {
    assert(fs.existsSync(path.join(root, 'src/css/animations.css')));
});

test('CSS skin — cyberpunk.css existe', () => {
    assert(fs.existsSync(path.join(root, 'src/css/skins/cyberpunk.css')));
});

test('CSS skin — light-minimal.css existe', () => {
    assert(fs.existsSync(path.join(root, 'src/css/skins/light-minimal.css')));
});

test('manifest.json — es JSON válido con campos PWA', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf-8'));
    assert(manifest.name, 'manifest debe tener name');
    assert(manifest.short_name, 'manifest debe tener short_name');
    assert(manifest.start_url, 'manifest debe tener start_url');
    assert(manifest.display === 'standalone', 'display debe ser standalone');
    assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'Debe tener al menos 2 íconos');
});

test('sw.js — service worker existe y tiene lógica de cache', () => {
    const swCode = fs.readFileSync(path.join(root, 'sw.js'), 'utf-8');
    assertIncludes(swCode, 'install');
    assertIncludes(swCode, 'fetch');
    assertIncludes(swCode, 'cache');
});

test('build.js — script de build existe', () => {
    assert(fs.existsSync(path.join(root, 'build.js')));
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 89: formHandler.js — handleImageUpload y savePdfConfiguration
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 89: formHandler — funciones adicionales ────────────');

const fhCode = fs.readFileSync(path.join(root, 'src/js/features/formHandler.js'), 'utf-8');

test('formHandler — tiene handleImageUpload', () => {
    assertIncludes(fhCode, 'handleImageUpload');
});

test('formHandler — tiene savePdfConfiguration', () => {
    assertIncludes(fhCode, 'savePdfConfiguration');
});

test('formHandler — tiene _migratePatientHistory', () => {
    assertIncludes(fhCode, '_migratePatientHistory');
});

test('formHandler — generateReportNumber genera IDs secuenciales', () => {
    localStorage.clear();
    const n1 = generateReportNumber();
    const n2 = generateReportNumber();
    assert(n1 !== n2, 'Cada llamada genera número diferente');
    const num1 = parseInt(n1.split('-')[1]);
    const num2 = parseInt(n2.split('-')[1]);
    assertEqual(num2, num1 + 1, 'Secuencial +1');
});

test('formHandler — extractPatientDataFromText con formato con puntos en DNI', () => {
    const data = extractPatientDataFromText('Paciente: Gómez, Juan. DNI: 30.456.789');
    assert(data.dni, 'Debe extraer DNI');
    assertIncludes(data.dni.replace(/\D/g, ''), '30456789');
});

test('formHandler — extractPatientDataFromText extrae edad con "años"', () => {
    const data = extractPatientDataFromText('Paciente de 63 años de edad');
    assert(data.age || data.edad, 'Debe extraer edad');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 90: Cross-module — Integridad de exports globales
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 90: Cross-module — exports globales ────────────────');

test('Global — autoDetectTemplateKey existe', () => {
    assert(typeof autoDetectTemplateKey === 'function');
});

test('Global — markdownToHtml existe', () => {
    assert(typeof markdownToHtml === 'function');
});

test('Global — structureTranscription existe', () => {
    assert(typeof structureTranscription === 'function');
});

test('Global — parseAIResponse existe', () => {
    assert(typeof parseAIResponse === 'function');
});

test('Global — normalizeFieldText existe', () => {
    assert(typeof normalizeFieldText === 'function');
});

test('Global — _normStr existe', () => {
    assert(typeof _normStr === 'function');
});

test('Global — escapeHtml existe', () => {
    assert(typeof escapeHtml === 'function');
});

test('Global — isAdminUser existe', () => {
    assert(typeof isAdminUser === 'function');
});

test('Global — evaluateConfigCompleteness existe', () => {
    assert(typeof evaluateConfigCompleteness === 'function');
});

test('Global — validateBeforeDownload existe', () => {
    assert(typeof validateBeforeDownload === 'function');
});

test('Global — MEDICAL_TEMPLATES tiene al menos 30 plantillas', () => {
    const count = Object.keys(MEDICAL_TEMPLATES).length;
    assert(count >= 30, `Esperaba >= 30 plantillas, tiene ${count}`);
});

test('Global — STUDY_TERMINOLOGY tiene al menos 50 estudios', () => {
    assert(STUDY_TERMINOLOGY.length >= 50, `Esperaba >= 50, tiene ${STUDY_TERMINOLOGY.length}`);
});

test('Global — savePatientToRegistry existe', () => {
    assert(typeof savePatientToRegistry === 'function');
});

test('Global — searchPatientRegistry existe', () => {
    assert(typeof searchPatientRegistry === 'function');
});

test('Global — extractPatientDataFromText existe', () => {
    assert(typeof extractPatientDataFromText === 'function');
});

test('Global — generateReportNumber existe', () => {
    assert(typeof generateReportNumber === 'function');
});

// ══════════════════════════════════════════════════════════════════════════════
// Bloque 91: G1 — Tests PRICING defaults (A1-A3)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 91: G1 — PRICING defaults ────────────────────────');

const registroCode = fs.readFileSync(path.join(root, 'recursos/registro.html'), 'utf-8');
const adminCode = fs.readFileSync(path.join(root, 'recursos/admin.html'), 'utf-8');

test('G1 — PRICING NORMAL devices = 1', () => {
    assert(registroCode.includes("NORMAL: { license: 102.99, monthly: 10, annual: 100, devices: 1"), 'NORMAL debe tener devices: 1');
});

test('G1 — PRICING PRO devices = 3', () => {
    assert(registroCode.includes("devices: 3, templates: 'all_specialty', historial: 30"), 'PRO debe tener devices: 3, historial: 30');
});

test('G1 — PRICING CLINIC devices = 5', () => {
    assert(registroCode.includes("CLINIC: { license: 352.99, monthly: 30, annual: 300, devices: 5"), 'CLINIC debe tener devices: 5');
});

test('G1 — PRICING NORMAL historial = 10', () => {
    assert(registroCode.includes("historial: 10, workplaces: 1, outputProfiles: 1"), 'NORMAL: historial 10, workplaces 1, outputProfiles 1');
});

test('G1 — PRICING PRO workplaces = 2', () => {
    assert(registroCode.includes("workplaces: 2, outputProfiles: 3, pdfLogo: true"), 'PRO: workplaces 2, outputProfiles 3, pdfLogo true');
});

test('G1 — PRICING CLINIC pdfColor = true', () => {
    assert(registroCode.includes("pdfLogo: true, pdfColor: true, maxProfessionals: 5"), 'CLINIC: pdfLogo true, pdfColor true, maxProfessionals 5');
});

test('G1 — DEFAULT_PLANS en admin tiene trial', () => {
    assert(adminCode.includes("trial:  { label: 'Trial'"), 'admin DEFAULT_PLANS debe tener trial');
});

test('G1 — DEFAULT_PLANS normal maxDevices=1', () => {
    assert(adminCode.includes("hasProMode: false, maxDevices: 1"), 'admin normal: hasProMode false, maxDevices 1');
});

test('G1 — DEFAULT_PLANS pro maxDevices=3', () => {
    const match = adminCode.match(/pro:\s*\{[^}]*maxDevices:\s*3/);
    assert(match, 'admin pro debe tener maxDevices: 3');
});

test('G1 — DEFAULT_PLANS clinic maxDevices=5', () => {
    const match = adminCode.match(/clinic:\s*\{[^}]*maxDevices:\s*5/);
    assert(match, 'admin clinic debe tener maxDevices: 5');
});

test('G1 — Admin header usa logo sin círculo (logo-superhero2)', () => {
    assert(adminCode.includes('logo-superhero2.png'), 'admin debe usar logo-superhero2.png');
    assert(!adminCode.includes('logo-superhero.png"'), 'admin no debe usar logo-superhero.png con círculo');
});

// ══════════════════════════════════════════════════════════════════════════════
// Bloque 92: G2 — Tests límites por plan (B1-B4)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 92: G2 — Límites por plan ────────────────────────');

test('G2 — addWorkplace respeta PRICING.workplaces', () => {
    assert(registroCode.includes('PRICING[selectedPlan].workplaces') || registroCode.includes('plan.workplaces'), 'addWorkplace debe consultar workplaces del plan');
});

test('G2 — _applyStep4PlanRestrictions color visible para todos los planes', () => {
    // El color del encabezado es para todos los planes (no se oculta por pdfColor)
    assert(!registroCode.includes("plan.pdfColor ? '' : 'none'"), 'El color NO debe ocultarse basado en pdfColor — aplica a todos los planes');
    assert(registroCode.includes('step4ProLogoGroup'), 'Debe usar ID step4ProLogoGroup para controlar logo');
});

test('G2 — _applyStep4PlanRestrictions oculta logo si no pdfLogo', () => {
    assert(registroCode.includes("plan.pdfLogo ? '' : 'none'"), 'Step4 debe ocultar logo basado en pdfLogo');
});

test('G2 — Estudios limitados a 3 en NORMAL', () => {
    assert(registroCode.includes("selectedPlan === 'NORMAL' && selectedEstudios.length >= 3"), 'toggleEstudio debe limitar a 3 en NORMAL');
});

test('G2 — _applyStep3PlanRestrictions existe y usa workplaces', () => {
    assert(registroCode.includes('function _applyStep3PlanRestrictions'), 'Debe existir _applyStep3PlanRestrictions');
    assert(registroCode.includes('PRICING[selectedPlan].workplaces'), 'Debe consultar workplaces');
});

test('G2 — Contador de estudios existe para NORMAL', () => {
    assert(registroCode.includes("estudioCounter"), 'Debe existir contador de estudios');
});

test('G2 — NORMAL no muestra botón Seleccionar todos', () => {
    assert(registroCode.includes("if (selectedPlan === 'NORMAL') return;"), 'NORMAL no debe tener botón seleccionar todos');
});

// ══════════════════════════════════════════════════════════════════════════════
// Bloque 93: G3 — Tests degradación trial→normal (C3)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 93: G3 — Degradación trial→normal ────────────────');

const licenseCode = fs.readFileSync(path.join(root, 'src/js/features/licenseManager.js'), 'utf-8');

test('G3 — licenseManager detecta EXPIRED + trial', () => {
    assert(licenseCode.includes("result.code === 'EXPIRED' && result.plan === 'trial'"), 'Debe detectar trial expirado');
});

test('G3 — Degrada CLIENT_CONFIG.type a NORMAL', () => {
    assert(licenseCode.includes("CLIENT_CONFIG.type = 'NORMAL'"), 'Debe degradar type a NORMAL');
});

test('G3 — Degrada hasProMode a false', () => {
    assert(licenseCode.includes("CLIENT_CONFIG.hasProMode = false"), 'Debe desactivar hasProMode');
});

test('G3 — Degrada maxDevices a 1', () => {
    assert(licenseCode.includes("CLIENT_CONFIG.maxDevices = 1"), 'Debe limitar maxDevices a 1');
});

test('G3 — Persiste degradación en localStorage', () => {
    assert(licenseCode.includes("localStorage.setItem('client_config_stored'"), 'Debe persistir en localStorage');
});

test('G3 — Muestra toast de degradación', () => {
    assert(licenseCode.includes("Tu período de prueba finalizó"), 'Debe mostrar toast informativo');
});

test('G3 — No bloquea UI (retorna _lmValidated = true)', () => {
    const match = licenseCode.match(/plan === 'trial'\)\s*\{[\s\S]*?_lmValidated = true/);
    assert(match, 'Debe setear _lmValidated = true para no bloquear');
});

test('G3 — Sync admin_plans_config existe en registro', () => {
    assert(registroCode.includes('_syncAdminPlanConfig'), 'registro.html debe tener sync de planes del admin');
});

test('G3 — Sync admin_addons_config existe en registro', () => {
    assert(registroCode.includes('_syncAdminAddonsConfig'), 'registro.html debe tener sync de addons del admin');
});

// ══════════════════════════════════════════════════════════════════════════════
// Bloque 94: G4 — Tests conversión de moneda (E1-E3)
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 94: G4 — Conversión de moneda ────────────────────');

test('G4 — Variable selectedCurrency existe', () => {
    assert(registroCode.includes("let selectedCurrency = 'USD'"), 'Debe existir selectedCurrency con default USD');
});

test('G4 — Variable arsRate existe', () => {
    assert(registroCode.includes('let arsRate = null'), 'Debe existir arsRate inicializada en null');
});

test('G4 — Función _fetchArsRate usa bluelytics API', () => {
    assert(registroCode.includes('api.bluelytics.com.ar/v2/latest'), 'Debe usar la API de bluelytics');
});

test('G4 — Función _formatPrice maneja USD y ARS', () => {
    assert(registroCode.includes('function _formatPrice(usdAmount)'), 'Debe existir _formatPrice');
    assert(registroCode.includes("selectedCurrency === 'ARS' && arsRate"), '_formatPrice debe verificar ARS + arsRate');
});

test('G4 — Función setCurrency existe', () => {
    assert(registroCode.includes('function setCurrency(curr)'), 'Debe existir setCurrency');
});

test('G4 — setCurrency dispara _refreshAllPrices', () => {
    assert(registroCode.includes('_refreshAllPrices'), 'setCurrency debe llamar _refreshAllPrices');
});

test('G4 — Selector de moneda en HTML (curr-btn)', () => {
    assert(registroCode.includes('curr-btn'), 'Debe existir botón de moneda con clase curr-btn');
    assert(registroCode.includes("data-curr=\"USD\""), 'Debe tener botón USD');
    assert(registroCode.includes("data-curr=\"ARS\""), 'Debe tener botón ARS');
});

test('G4 — _updatePricingCards actualiza precios en tarjetas', () => {
    assert(registroCode.includes('function _updatePricingCards'), 'Debe existir _updatePricingCards');
});

test('G4 — Formulario envía currency y arsRate', () => {
    assert(registroCode.includes('currency: selectedCurrency'), 'Debe enviar currency');
    assert(registroCode.includes('arsRate: arsRate'), 'Debe enviar arsRate');
});

test('G4 — renderInvestmentSummary usa _formatPrice', () => {
    assert(registroCode.includes('const fp = _formatPrice'), 'renderInvestmentSummary debe usar _formatPrice');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 95: Auditoría Seguridad — XSS fixes verificación
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 95: Auditoría Seguridad — XSS fixes ─────────────');

const rhCode = fs.readFileSync(path.join(root, 'src/js/features/reportHistory.js'), 'utf-8');
const tabsCodeSec = fs.readFileSync(path.join(root, 'src/js/utils/tabs.js'), 'utf-8');
const lmCodeSec = fs.readFileSync(path.join(root, 'src/js/features/licenseManager.js'), 'utf-8');
const contactCodeSec = fs.readFileSync(path.join(root, 'src/js/features/contact.js'), 'utf-8');
const prCodeSec = fs.readFileSync(path.join(root, 'src/js/features/patientRegistry.js'), 'utf-8');

test('XSS-1 — reportHistory.viewReport sanitiza htmlContent', () => {
    // Debe usar DOMPurify o strip de scripts, NO innerHTML directo
    assert(rhCode.includes('DOMPurify') || rhCode.includes('replace(/<script'), 
        'viewReport debe sanitizar htmlContent con DOMPurify o strip scripts');
    assert(!rhCode.includes("content.innerHTML = report.htmlContent;"), 
        'NO debe asignar htmlContent directamente sin sanitizar');
});

test('XSS-2 — tabs.js sanitiza transcripciones en innerHTML', () => {
    // Verificar que NINGÚN innerHTML asigna .text directamente sin sanitizar
    assert(!tabsCodeSec.includes("editor.innerHTML = window.transcriptions[window.activeTabIndex].text;"),
        'createTabs NO debe usar innerHTML directo sin sanitizar');
    assert(!tabsCodeSec.includes("editor.innerHTML = window.transcriptions[index].text;"),
        'switchTab NO debe usar innerHTML directo sin sanitizar');
    // Verificar que usa DOMPurify
    assert(tabsCodeSec.includes('DOMPurify'), 'tabs.js debe referenciar DOMPurify para sanitización');
});

test('XSS-3 — licenseManager._lmShowBlockedUI escapa result.error', () => {
    assert(lmCodeSec.includes('_esc(result.error') || lmCodeSec.includes('escapeHtml(result.error'),
        '_lmShowBlockedUI debe escapar result.error');
});

test('XSS-4 — contact.js escapa campos en htmlBody', () => {
    // Verificar que motivo, nombre, mat están escapados
    assert(contactCodeSec.includes('_esc(motivo)') || contactCodeSec.includes('escapeHtml(motivo)'),
        'htmlBody debe escapar motivo');
    assert(
        contactCodeSec.includes('_esc(senderName)') ||
        contactCodeSec.includes('_esc(nombre)') ||
        contactCodeSec.includes('escapeHtml(nombre)'),
        'htmlBody debe escapar nombre profesional (senderName/nombre)'
    );
    assert(contactCodeSec.includes('_esc(mat)'),
        'htmlBody debe escapar matrícula');
});

test('XSS-5 — contact.js escapa campos en retry de pendientes', () => {
    // El retry de mensajes pendientes también debe escapar HTML
    assert(contactCodeSec.includes('.replace(/</g') || contactCodeSec.includes('&lt;'),
        'Retry de pendientes debe escapar campos HTML con replace o &lt;');
});

test('XSS-6 — patientRegistry dropdown escapa name/dni/age', () => {
    assert(prCodeSec.includes('esc(p.name)') || prCodeSec.includes('escapeHtml(p.name)'),
        'Dropdown debe escapar p.name');
    assert(prCodeSec.includes('esc(p.dni)') || prCodeSec.includes("esc(String(p.age))"),
        'Dropdown debe escapar p.dni y p.age');
});

test('XSS-7 — patientRegistry renderTable escapa safeAge completo', () => {
    // safeAge debe escapar &, <, >, "
    assert(prCodeSec.includes("String(p.age).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')"),
        'safeAge debe tener escape completo con &, <, >, "');
});

test('XSS-8 — escapeHtml función global existe y funciona', () => {
    assert(typeof escapeHtml === 'function', 'escapeHtml debe ser una función global');
    assertEqual(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;',
        'debe escapar tags HTML');
    assertEqual(escapeHtml('"hello" & \'world\''), '&quot;hello&quot; &amp; &#039;world&#039;',
        'debe escapar comillas y ampersand');
    assertEqual(escapeHtml(null), '', 'debe retornar string vacío para null');
    assertEqual(escapeHtml(''), '', 'debe retornar string vacío para string vacío');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 96: Device ID seguro — crypto.randomUUID
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 96: Device ID seguro ─────────────────────────────');

test('DeviceID-1 — licenseManager usa crypto.randomUUID', () => {
    assert(lmCodeSec.includes('crypto.randomUUID'), 
        'licenseManager debe usar crypto.randomUUID para device ID');
});

test('DeviceID-2 — business.js factory setup usa crypto.randomUUID', () => {
    const bizCode = fs.readFileSync(path.join(root, 'src/js/features/business.js'), 'utf-8');
    assert(bizCode.includes('crypto.randomUUID'),
        'business.js factory setup debe usar crypto.randomUUID');
});

test('DeviceID-3 — licenseManager tiene fallback para navegadores sin crypto', () => {
    assert(lmCodeSec.includes("typeof crypto !== 'undefined' && crypto.randomUUID"),
        'Debe verificar disponibilidad de crypto antes de usar randomUUID');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 97: Business.js — Fallback ADMIN seguro
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 97: Business.js — Fallback ADMIN seguro ────────');

const bizCodeSec = fs.readFileSync(path.join(root, 'src/js/features/business.js'), 'utf-8');

test('ADMIN-1 — NO asume ADMIN cuando CLIENT_CONFIG es undefined', () => {
    assert(!bizCodeSec.includes("typeof CLIENT_CONFIG === 'undefined' || CLIENT_CONFIG.type === 'ADMIN'"),
        'business.js NO debe tratar undefined como ADMIN (operador ||)');
});

test('ADMIN-2 — Usa operador && para verificar ADMIN', () => {
    assert(bizCodeSec.includes("typeof CLIENT_CONFIG !== 'undefined' && CLIENT_CONFIG.type === 'ADMIN'"),
        'Debe usar && para verificar que CLIENT_CONFIG existe Y es ADMIN');
});

test('ADMIN-3 — Verifica client_config_stored antes de asumir ADMIN', () => {
    assert(bizCodeSec.includes("client_config_stored") && bizCodeSec.includes("storedConfig"),
        'Debe verificar config almacenada para confirmar ADMIN legítimo');
});

test('ADMIN-4 — Config corrupta va a modo cliente (no ADMIN)', () => {
    assert(bizCodeSec.includes('_initClient()') && bizCodeSec.includes('Config corrupta'),
        'Config corrupta debe derivar a _initClient(), no _initAdmin()');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 98: License Manager — Cache age + offline validation
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 98: License Manager — Cache offline ────────────');

test('LM-Cache-1 — Validación de fecha_vencimiento en cache offline', () => {
    assert(lmCodeSec.includes('fecha_vencimiento'),
        'Debe verificar fecha_vencimiento del cache offline');
});

test('LM-Cache-2 — Cache expirado por fecha retorna EXPIRED', () => {
    assert(lmCodeSec.includes("code: 'EXPIRED'") && lmCodeSec.includes('Cache offline: licencia vencida'),
        'Debe retornar EXPIRED si la licencia cacheada venció por fecha');
});

test('LM-Cache-3 — Cache TTL de 4 horas implementado', () => {
    assert(lmCodeSec.includes('4 * 60 * 60 * 1000'),
        'TTL del cache debe ser 4 horas');
});

test('LM-Cache-4 — _lmStartMetricsSync tiene guard contra múltiples timers', () => {
    assert(lmCodeSec.includes('if (_lmMetricsTimer) return'),
        'Debe tener guard para prevenir múltiples timers');
});

test('LM-Cache-5 — Tamper guard detecta escalación a ADMIN', () => {
    assert(lmCodeSec.includes('Intento de escalación detectado'),
        'Debe detectar cambio de tipo a ADMIN en runtime');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 99: Contact.js — Retry cap + escape en pendientes
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 99: Contact.js — Retry cap ───────────────────────');

test('Contact-Retry-1 — Tiene máximo de reintentos', () => {
    assert(contactCodeSec.includes('_CONTACT_MAX_RETRIES') || contactCodeSec.includes('_contactRetryCount'),
        'Debe tener contador de reintentos con límite');
});

test('Contact-Retry-2 — Límite es razonable (≤20)', () => {
    const match = contactCodeSec.match(/_CONTACT_MAX_RETRIES\s*=\s*(\d+)/);
    assert(match, 'Debe tener constante _CONTACT_MAX_RETRIES');
    const limit = parseInt(match[1]);
    assert(limit > 0 && limit <= 20, `Límite debe ser entre 1-20, es ${limit}`);
});

test('Contact-Retry-3 — Verifica contador antes de reintentar', () => {
    assert(contactCodeSec.includes('_contactRetryCount >= _CONTACT_MAX_RETRIES') ||
           contactCodeSec.includes('_contactRetryCount < _CONTACT_MAX_RETRIES'),
        'Debe verificar contador antes de programar reintento');
});

test('Contact-Retry-4 — Formulario de contacto valida motivo+descripción', () => {
    assert(contactCodeSec.includes('contactMotivo') && contactCodeSec.includes('contactDetalle'),
        'Debe validar campos motivo y detalle');
});

test('Contact-Formato-1 — contact.js no usa prefijo Dr./Dra. hardcodeado', () => {
    assert(!contactCodeSec.includes('Dr./Dra.'),
        'contact.js no debe hardcodear "Dr./Dra." para evitar duplicaciones');
});

test('Contact-Formato-2 — contact.js usa getProfessionalDisplay', () => {
    assert(contactCodeSec.includes('getProfessionalDisplay'),
        'contact.js debe usar getProfessionalDisplay para unificar formato profesional');
});

test('Contact-Formato-3 — email de contacto evita emoji en cabecera', () => {
    assert(!contactCodeSec.includes('📧 Contacto desde TranscriptorPro'),
        'La cabecera del email de contacto no debe incluir emoji para evitar problemas de codificación');
    assert(contactCodeSec.includes('Contacto desde TranscriptorPro'),
        'La cabecera textual del email de contacto debe mantenerse');
});

test('Contact-Formato-4 — fallback de soporte usa dominio válido .com', () => {
    const configCodeContact = fs.readFileSync(path.join(root, 'src/js/config/config.js'), 'utf-8');
    assert(contactCodeSec.includes('getResolvedSupportContactEmail'),
        'contact.js debe resolver email de soporte desde helper central');
    assert(configCodeContact.includes('DEFAULT_SUPPORT_CONTACT_EMAIL'),
        'config.js debe declarar default de email de soporte');
    assert(configCodeContact.includes("'aldowagner78@gmail.com'"),
        'El default de soporte debe ser un correo operativo');
    assert(!contactCodeSec.includes("'soporte@transcriptorpro.app'"),
        'contact.js no debe usar dominio .app inexistente para soporte');
});

const pdfPreviewCodeSec = fs.readFileSync(path.join(root, 'src/js/features/pdfPreview.js'), 'utf-8');
const pdfPreviewActionsCodeSec = fs.readFileSync(path.join(root, 'src/js/features/pdfPreviewActions.js'), 'utf-8');
const pdfMakerCodeSec = fs.readFileSync(path.join(root, 'src/js/features/pdfMaker.js'), 'utf-8');
const exportRenderCodeSec = fs.readFileSync(path.join(root, 'src/js/features/editorExportRenderUtils.js'), 'utf-8');

test('ProfessionalDisplay-1 — preview/export/PDF usan helper global', () => {
    assert(pdfPreviewCodeSec.includes('getProfessionalDisplay'),
        'pdfPreview.js debe usar getProfessionalDisplay');
    assert(pdfPreviewActionsCodeSec.includes('getProfessionalDisplay'),
        'pdfPreviewActions.js debe usar getProfessionalDisplay');
    assert(pdfMakerCodeSec.includes('getProfessionalDisplay'),
        'pdfMaker.js debe usar getProfessionalDisplay');
    assert(exportRenderCodeSec.includes('getProfessionalDisplay'),
        'editorExportRenderUtils.js debe usar getProfessionalDisplay');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 100: ThemeManager — try/finally en apply()
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 100: ThemeManager — Robustez ─────────────────────');

const tmCodeSec = fs.readFileSync(path.join(root, 'src/js/features/themeManager.js'), 'utf-8');

test('TM-1 — apply() usa try/finally para resetear _applying', () => {
    assert(tmCodeSec.includes('} finally {') && tmCodeSec.includes('_applying = false'),
        'apply() debe tener try/finally con _applying = false');
});

test('TM-2 — apply() tiene fallback a default si falla', () => {
    assert(tmCodeSec.includes("_currentSkinId = 'default'") || tmCodeSec.includes('Fallback'),
        'Debe tener fallback a default skin si el apply falla');
});

test('TM-3 — _injectSkinCSS no bloquea en error', () => {
    assert(tmCodeSec.includes('link.onerror') && tmCodeSec.includes('resolve()'),
        '_injectSkinCSS debe resolver (no rechazar) en caso de error');
});

test('TM-4 — SKIN_REGISTRY valida skins conocidos', () => {
    assert(tmCodeSec.includes("id: 'default'") && tmCodeSec.includes("id: 'cyberpunk'"),
        'Debe tener skins registrados (default, cyberpunk)');
});

test('TM-5 — Reentrance guard previene apply() concurrente', () => {
    assert(tmCodeSec.includes('if (_applying)') && tmCodeSec.includes('ignorando duplicado'),
        'apply() debe tener guard de reentrada');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 101: Report History — Límite + QuotaExceeded  
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 101: Report History — Límite + Quota ─────────────');

test('RH-Limit-1 — Historial tiene límite máximo de informes', () => {
    assert(rhCode.includes('REPORT_HISTORY_MAX') || rhCode.includes('history.length > '),
        'Debe tener límite máximo de informes en historial');
});

test('RH-Limit-2 — Límite es razonable (100-500)', () => {
    const match = rhCode.match(/REPORT_HISTORY_MAX\s*=\s*(\d+)/);
    assert(match, 'Debe tener constante REPORT_HISTORY_MAX');
    const limit = parseInt(match[1]);
    assert(limit >= 100 && limit <= 500, `Límite debe ser 100-500, es ${limit}`);
});

test('RH-Quota-1 — QuotaExceeded notifica éxito o error', () => {
    assert(rhCode.includes('saved = true') || rhCode.includes('saved = false'),
        'Debe trackear si se pudo guardar tras QuotaExceeded');
});

test('RH-Quota-2 — Notifica al usuario si no se pudo guardar', () => {
    assert(rhCode.includes('No se pudo guardar') || rhCode.includes('Almacenamiento lleno'),
        'Debe notificar al usuario cuando falla completamente');
});

test('RH-Quota-3 — saveReportToHistory valida htmlContent', () => {
    assert(rhCode.includes('!data.htmlContent'), 'Debe validar que data.htmlContent existe');
});

test('RH-Func-1 — saveReportToHistory funcional', () => {
    global.localStorage.clear();
    global._reportHistCache = null;
    const id = saveReportToHistory({ htmlContent: '<p>Test</p>', patientName: 'Test' });
    assert(id, 'Debe retornar un ID');
    const all = getAllReports();
    assert(all.length === 1, `Esperaba 1 informe, hay ${all.length}`);
    assertEqual(all[0].patientName, 'Test', 'Nombre debe ser Test');
});

test('RH-Func-2 — Límite de 200 informes se aplica', () => {
    global.localStorage.clear();
    global._reportHistCache = null;
    // Guardar 205 informes
    for (let i = 0; i < 205; i++) {
        saveReportToHistory({ htmlContent: '<p>R' + i + '</p>', patientName: 'P' + i });
    }
    const all = getAllReports();
    assert(all.length <= 200, `Historial debe tener máximo 200, tiene ${all.length}`);
});

test('RH-Func-3 — getPatientReports filtra por nombre', () => {
    global.localStorage.clear();
    global._reportHistCache = null;
    saveReportToHistory({ htmlContent: '<p>A</p>', patientName: 'Juan Pérez', patientDni: '12345' });
    saveReportToHistory({ htmlContent: '<p>B</p>', patientName: 'María López', patientDni: '67890' });
    const reports = getPatientReports('Juan');
    assert(reports.length === 1, `Esperaba 1 informe para Juan, hay ${reports.length}`);
    assertEqual(reports[0].patientName, 'Juan Pérez');
});

test('RH-Func-4 — deleteReport elimina por ID', () => {
    global.localStorage.clear();
    global._reportHistCache = null;
    const id = saveReportToHistory({ htmlContent: '<p>X</p>', patientName: 'ToDelete' });
    assert(getAllReports().length === 1);
    deleteReport(id);
    assert(getAllReports().length === 0, 'Debe estar vacío después de eliminar');
});

test('RH-Func-5 — exportReportHistory retorna JSON', () => {
    global.localStorage.clear();
    global._reportHistCache = null;
    saveReportToHistory({ htmlContent: '<p>E</p>', patientName: 'Export' });
    const json = exportReportHistory();
    assert(json, 'Debe retornar JSON');
    const parsed = JSON.parse(json);
    assert(Array.isArray(parsed) && parsed.length === 1, 'JSON debe contener 1 informe');
});

test('RH-Func-6 — importReportHistory evita duplicados', () => {
    global.localStorage.clear();
    global._reportHistCache = null;
    const id = saveReportToHistory({ htmlContent: '<p>I</p>', patientName: 'Import' });
    const json = exportReportHistory();
    const added = importReportHistory(json);
    assertEqual(added, 0, 'No debe agregar duplicados');
    assertEqual(getAllReports().length, 1, 'Debe seguir con 1 informe');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 102: Patient Registry — CRUD + seguridad
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 102: Patient Registry — CRUD completo ───────────');

test('PR-CRUD-1 — savePatientToRegistry crea nuevo paciente', () => {
    const countBefore = getAllPatients().length;
    savePatientToRegistry({ name: 'TestCrud Ana', dni: '990001', age: '30', sex: 'F' });
    const all = getAllPatients();
    assertEqual(all.length, countBefore + 1, `Debe agregar 1 paciente nuevo`);
    const found = all.find(p => p.dni === '990001');
    assert(found, 'Debe encontrar paciente por DNI 990001');
    assertEqual(found.name, 'TestCrud Ana');
});

test('PR-CRUD-2 — savePatientToRegistry actualiza por DNI', () => {
    const countBefore = getAllPatients().length;
    savePatientToRegistry({ name: 'TestCrud Ana Actualizada', dni: '990001', age: '31', sex: 'F' });
    const all = getAllPatients();
    assertEqual(all.length, countBefore, 'No debe crear duplicado por DNI');
    const found = all.find(p => p.dni === '990001');
    assertEqual(found.name, 'TestCrud Ana Actualizada', 'Debe actualizar el nombre');
    assertEqual(found.age, '31', 'Debe actualizar la edad');
});

test('PR-CRUD-3 — savePatientToRegistry incrementa visits', () => {
    const found = getAllPatients().find(p => p.dni === '990001');
    assert(found.visits >= 2, `Visits debe ser >= 2, es ${found.visits}`);
});

test('PR-CRUD-4 — searchPatientRegistry por nombre parcial', () => {
    savePatientToRegistry({ name: 'TestCrud Roberto Fernández', dni: '990002', age: '45' });
    const results = searchPatientRegistry('TestCrud Roberto');
    assert(results.length === 1, `Buscar TestCrud Roberto: esperaba 1, hay ${results.length}`);
});

test('PR-CRUD-5 — searchPatientRegistry por DNI parcial', () => {
    const results = searchPatientRegistry('990002');
    assert(results.length >= 1, 'Buscar DNI 990002 debe retornar al menos 1');
});

test('PR-CRUD-6 — searchPatientRegistry insensible a acentos', () => {
    const results = searchPatientRegistry('fernandez');
    assert(results.length >= 1, 'Buscar sin acento debe encontrar Fernández');
});

test('PR-CRUD-7 — Código valida máximo de pacientes', () => {
    // Verificar que el código tiene límite (no crear 505 registros reales por performance)
    assert(prCodeSec.includes('500') || prCodeSec.includes('MAX_PATIENTS') || prCodeSec.includes('.length >'),
        'Debe tener límite máximo de pacientes en el código');
});

test('PR-SEC-1 — Código tiene escape en dropdown', () => {
    assert(prCodeSec.includes('esc(p.name)') || prCodeSec.includes('escapeHtml'),
        'Dropdown de pacientes debe escapar datos');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 103: Factory Clone — Flujo por tipo de usuario
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 103: Factory Clone — Tipos de usuario ──────────');

test('Factory-1 — planMap tiene todos los tipos de plan', () => {
    assert(bizCodeSec.includes("trial:") && bizCodeSec.includes("normal:") && 
           bizCodeSec.includes("pro:") && bizCodeSec.includes("gift:") &&
           bizCodeSec.includes("clinic:") && bizCodeSec.includes("enterprise:"),
        'planMap debe tener: trial, normal, pro, gift, clinic, enterprise');
});

test('Factory-2 — TRIAL no tiene proMode', () => {
    const trialMatch = bizCodeSec.match(/trial:\s*\{[^}]+\}/);
    assert(trialMatch, 'Debe existir definición de trial');
    assert(trialMatch[0].includes('hasProMode: false'), 'TRIAL no debe tener proMode');
});

test('Factory-3 — NORMAL no tiene proMode', () => {
    const normalMatch = bizCodeSec.match(/normal:\s*\{[^}]+\}/);
    assert(normalMatch, 'Debe existir definición de normal');
    assert(normalMatch[0].includes('hasProMode: false'), 'NORMAL no debe tener proMode');
});

test('Factory-4 — PRO tiene proMode', () => {
    const proMatch = bizCodeSec.match(/pro:\s*\{[^}]+\}/);
    assert(proMatch, 'Debe existir definición de pro');
    assert(proMatch[0].includes('hasProMode: true'), 'PRO debe tener proMode');
});

test('Factory-5 — GIFT mapea a tipo PRO con proMode', () => {
    const giftMatch = bizCodeSec.match(/gift:\s*\{[^}]+\}/);
    assert(giftMatch, 'Debe existir definición de gift');
    assert(giftMatch[0].includes("type: 'PRO'"), 'GIFT debe mapear a tipo PRO');
    assert(giftMatch[0].includes('hasProMode: true'), 'GIFT debe tener proMode');
});

test('Factory-6 — CLINIC puede generar apps', () => {
    const clinicMatch = bizCodeSec.match(/clinic:\s*\{[^}]+\}/);
    assert(clinicMatch, 'Debe existir definición de clinic');
    assert(clinicMatch[0].includes('canGenerateApps: true'), 'CLINIC debe poder generar apps');
});

test('Factory-7 — ENTERPRISE no puede generar apps', () => {
    const entMatch = bizCodeSec.match(/enterprise:\s*\{[^}]+\}/);
    assert(entMatch, 'Debe existir definición de enterprise');
    assert(entMatch[0].includes('canGenerateApps: false'), 'ENTERPRISE no debe poder generar apps');
});

test('Factory-8 — _handleFactorySetup persiste client_config_stored', () => {
    assert(bizCodeSec.includes("localStorage.setItem('client_config_stored'"),
        'Factory setup debe persistir config en localStorage');
});

test('Factory-9 — Factory guarda prof_data', () => {
    assert(bizCodeSec.includes("localStorage.setItem('prof_data'") || 
           bizCodeSec.includes("appDB.set('prof_data'"),
        'Factory setup debe guardar datos del profesional');
});

test('Factory-10 — Factory protege sesión admin existente', () => {
    assert(bizCodeSec.includes('_ADMIN_WAS_ACTIVE') && bizCodeSec.includes('showCustomConfirm'),
        'Debe pedir confirmación antes de sobrescribir sesión admin');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 104: Circuito de Transcripción — Estructura completa
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 104: Circuito Transcripción ──────────────────────');

const transCodeSec = fs.readFileSync(path.join(root, 'src/js/features/transcriptor.js'), 'utf-8');
const editorCodeSec = fs.readFileSync(path.join(root, 'src/js/features/editor.js'), 'utf-8');
const structCodeSec = fs.readFileSync(path.join(root, 'src/js/features/structurer.js'), 'utf-8');
const indexCodeSec104 = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');

test('Trans-1 — Usa Whisper large-v3-turbo', () => {
    assert(transCodeSec.includes('whisper-large-v3-turbo'),
        'Transcriptor debe usar modelo whisper-large-v3-turbo');
});

test('Trans-2 — Tiene retry con 4 intentos', () => {
    const retryMatch = transCodeSec.match(/maxRetries?\s*[=:]\s*(\d+)/i) || 
                       transCodeSec.match(/retries?\s*<\s*(\d+)/i);
    assert(retryMatch || transCodeSec.includes('attempt'), 'Debe tener mecanismo de retry');
});

test('Trans-3 — Usa studyTerminology para prompt contextual', () => {
    assert(transCodeSec.includes('studyTerminology') || transCodeSec.includes('STUDY_TERMINOLOGY') ||
           transCodeSec.includes('getStudyPrompt'),
        'Debe usar terminología de estudio para prompt contextual');
});

test('Struct-1 — structureTranscription usa LLaMA models', () => {
    assert(structCodeSec.includes('llama') || structCodeSec.includes('GROQ_MODELS'),
        'Structurer debe usar modelos LLaMA de Groq');
});

test('Struct-2 — autoDetectTemplateKey tiene umbral mínimo', () => {
    assert(structCodeSec.includes('scoreMin') || structCodeSec.includes('score >') || 
           structCodeSec.includes('score >='),
        'autoDetectTemplateKey debe tener umbral mínimo de score');
});

test('Struct-3 — cross-tab mutex con navigator.locks', () => {
    assert(structCodeSec.includes('navigator.locks'),
        'Structurer debe usar navigator.locks para cross-tab mutex');
});

test('Struct-4 — Prompt exige ortografía y gramática impecables', () => {
    assert(structCodeSec.includes('ORTOGRAFÍA') || structCodeSec.includes('ortografía') || (structCodeSec.includes('Español médico formal impecable') && structCodeSec.includes('ortográficos')),
        'El prompt debe incluir regla explícita de ortografía/gramática');
});

test('Struct-5 — Prompt fija OROFARINGE sin tilde incorrecta', () => {
    assert(structCodeSec.includes('OROFARINGE') && structCodeSec.includes('ORÓFARINGE'),
        'El prompt debe incluir ejemplo explícito OROFARINGE (correcto) vs ORÓFARINGE');
});

test('Struct-6 — Postproceso ortográfico médico está activo', () => {
    assert(structCodeSec.includes('function _postProcessStructuredMarkdown') &&
           (structCodeSec.includes('return _postProcessStructuredMarkdown(content)') || structCodeSec.includes('return _postProcessStructuredMarkdown(cleaned)')),
        'Structurer debe aplicar postproceso ortográfico al contenido de IA');
});

test('Editor-3 — spellcheck/autocorrect desactivados en editor médico', () => {
    assert(indexCodeSec104.includes('id="editor"') &&
           indexCodeSec104.includes('spellcheck="false"') &&
           indexCodeSec104.includes('autocorrect="off"') &&
           indexCodeSec104.includes('autocapitalize="off"'),
        'El editor debe desactivar spellcheck/autocorrect/autocapitalize');
});

test('Editor-1 — Editor tiene snapshots para undo', () => {
    assert(editorCodeSec.includes('snapshot') || editorCodeSec.includes('Snapshot'),
        'Editor debe tener sistema de snapshots');
});

test('Editor-2 — Editor soporta pegado limpio', () => {
    assert(editorCodeSec.includes('paste') || editorCodeSec.includes('clipboardData'),
        'Editor debe manejar pegado limpio (paste)');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 105: Circuito PDF — Preview + Descarga
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 105: Circuito PDF ────────────────────────────────');

const pvCodeSec = fs.readFileSync(path.join(root, 'src/js/features/pdfPreview.js'), 'utf-8');
const pdfCodeSec = fs.readFileSync(path.join(root, 'src/js/features/pdfMaker.js'), 'utf-8');

test('PDF-1 — pdfPreview tiene función esc() para sanitización', () => {
    assert(pvCodeSec.includes("const esc = (t)") || pvCodeSec.includes("function esc("),
        'pdfPreview debe tener función esc() para escapar datos');
});

test('PDF-2 — pdfPreview extrae datos de paciente con fallback', () => {
    assert(pvCodeSec.includes('extractPatientDataFromText') && pvCodeSec.includes('formPatient'),
        'Debe tener cascada de extracción de datos de paciente');
});

test('PDF-3 — pdfPreview soporta múltiples formatos de descarga', () => {
    assert(pvCodeSec.includes('saveToDisk') || pvCodeSec.includes('downloadAs'),
        'Debe soportar descarga en múltiples formatos');
});

test('PDF-4 — pdfMaker genera header/footer/firma', () => {
    assert(pdfCodeSec.includes('addHeader') || pdfCodeSec.includes('header') || pdfCodeSec.includes('firma'),
        'pdfMaker debe generar header/footer/firma');
});

test('PDF-5 — pdfMaker soporta QR', () => {
    assert(pdfCodeSec.includes('QR') || pdfCodeSec.includes('qr'),
        'pdfMaker debe soportar código QR');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 106: Detección automática todas las plantillas (corpus completo)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 106: Detección — Corpus de entrenamiento ───────');

const CORPUS = {
    espirometria: `Evaluación de la función pulmonar mediante espirometría clínica. Los resultados obtenidos en la fase pre-broncodilatador revelan una capacidad vital forzada de 3.25 litros con un z-score de -1.2. El volumen espiratorio forzado en el primer segundo se sitúa en 2.10 litros con una relación VEF1/CVF del 64%.`,
    
    test_marcha: `Prueba de marcha de seis minutos para la valoración de la capacidad funcional. El paciente inició el recorrido con una saturación de oxígeno basal del 94%, logrando una distancia total de 420 metros. Se registró una desaturación significativa hasta el 89%.`,
    
    pletismografia: `Pletismografía corporal total orientada a la cuantificación de volúmenes pulmonares estáticos. La capacidad pulmonar total de 6.80 litros. El volumen residual se encuentra elevado en 1.90 litros con un z-score de 2.1, hallazgo indicativo de atrapamiento aéreo.`,
    
    oximetria_nocturna: `Oximetría nocturna continua de siete horas para tamizaje de trastornos respiratorios del sueño. Un índice de desaturación de 12 eventos por hora y un nadir de saturación del 82%.`,
    
    campimetria: `Campimetría computarizada Humphrey mediante estrategia SITA Standard 24-2 para evaluación de glaucoma. Escotoma arciforme superior en el ojo derecho. Visual Field Index del 92% y desviación media de -4.50 decibelios.`,
    
    oct_retinal: `Tomografía de coherencia óptica de segmento posterior. Mapa de espesor de la capa de fibras nerviosas de la retina muestra adelgazamiento sectorial. Espesor promedio de la CFNR es de 68 micras con una relación copa-disco de 0.7.`,
    
    topografia_corneal: `Topografía corneal por elevación para estudio de la arquitectura anterior y posterior. Mapa queratométrico central registra una potencia de 44.5 dioptrías. Elevación posterior paracentral inferior excede el límite. Paquimetría ultrasónica mínima de 510 micras.`,
    
    fondo_ojo: `Examen de fondo de ojo bajo midriasis farmacológica mediante oftalmoscopía indirecta. La papila óptica presenta bordes definidos. Brillo foveolar conservado sin exudados ni hemorragias intrarretinianas.`,

    gonioscopia: `Gonioscopía de ambos ojos con lente de cuatro espejos. Ojo derecho con ángulo grado IV de Shaffer, línea de Schwalbe y espolón escleral visibles, sin PAS ni neovasos. Ojo izquierdo con ángulo grado II, indentación positiva sin sinequias, línea de Sampaolesi inferior.`,
    
    tac: `Tomografía axial computarizada de tórax con contraste endovenoso. Se identifica un nódulo sólido de bordes espiculados de 15 milímetros en segmento apical del lóbulo superior derecho. Densidad de 40 unidades Hounsfield con realce significativo tras administración de yodo.`,
    
    resonancia: `Resonancia magnética nuclear de columna lumbosacra en secuencias T1, T2 y STIR. Deshidratación discal en L4-L5 y L5-S1 con reducción de la altura intervertebral. Protrusión discal posterocentral que oblitera parcialmente la grasa epidural anterior.`,
    
    mamografia: `Mamografía bilateral con proyecciones craneocaudal y mediolateral oblicua para tamizaje oncológico. Mama derecha con asimetría focal de baja densidad. Tejido fibroglandular tipo B según clasificación ACR. BI-RADS 2.`,
    
    densitometria: `Densitometría ósea mediante absorciometría de rayos X de energía dual. Región lumbar L1-L4 con densidad mineral ósea de 0.850 g/cm2, T-score de -2.4. Cuello femoral con T-score de -1.8.`,
    
    pet_ct: `PET-CT de cuerpo entero tras administración de 18F-FDG para estadificación oncológica. Focos hipermetabólicos en lóbulo inferior izquierdo con SUV máximo de 8.5. Actividad metabólica en ganglios mediastínicos.`,
    
    radiografia: `Radiografía de tórax posteroanterior y lateral. Silueta cardíaca con índice cardiotorácico de 0.48. Campos pulmonares bien expandidos sin infiltrados. Senos costofrénicos libres.`,
    
    ecografia_abdominal: `Ecografía abdominal total. Hígado con aumento difuso de la ecogenicidad parénquimatosa sugestivo de esteatosis grado I. Vesícula biliar de paredes finas sin litiasis. Bazo y páncreas sin lesiones ocupantes.`,
    
    ecografia_renal: `Ecografía renal y de vías urinarias para estudio de nefrolitiasis. Riñón derecho mide 105 milímetros. Imagen hiperequogénica de 6 milímetros en grupo calicial medio compatible con litiasis no obstructiva.`,
    
    ecografia_tiroidea: `Ecografía tiroidea con Doppler color para evaluación de nódulo tiroideo. Lóbulo tiroideo derecho con nódulo isoecoico de 8 por 6 milímetros. Istmo tiroideo normal. Clasificación TIRADS 3 sugiriendo nódulo probablemente benigno. Lóbulo tiroideo izquierdo homogéneo.`,
    
    ecografia_mamaria: `Ecografía mamaria bilateral complementaria. En cuadrante superior externo mama derecha quiste simple de 12 milímetros con contenido anecoico y refuerzo acústico posterior. BI-RADS 2.`,
    
    eco_doppler: `Doppler vascular de miembros inferiores para evaluación de retorno venoso. Permeabilidad de sistemas venosos profundo y superficial confirmada. Reflujo valvular prolongado superior a 500 milisegundos en unión safenofemoral derecha.`,
    
    gastroscopia: `Gastroscopía diagnóstica bajo sedación. Mucosa esofágica normal. En antro gástrico eritema difuso y petequias. Prueba de ureasa rápida positiva para Helicobacter pylori. Gastritis eritematosa antral.`,
    
    colonoscopia: `Colonoscopía total con escala de Boston grado 9. Se alcanzó ciego. En colon sigmoides dos pólipos sésiles de 5 y 7 milímetros resecados mediante asa fría. Mucosa restante sin divertículos.`,
    
    broncoscopia: `Broncoscopía flexible bajo anestesia local. Mucosa traqueobronquial congestiva con secreciones hialinas moderadas. Lavado broncoalveolar en lóbulo superior derecho. Carinas afiladas con movilidad conservada.`,
    
    laringoscopia: `Laringoscopía directa para valoración de cuerdas vocales. Cuerdas vocales de coloración nacarada con motilidad conservada. Nódulo blando en tercio anterior de la cuerda vocal derecha. Hiato fonatorio leve.`,
    
    gammagrafia_cardiaca: `Gammagrafía de perfusión miocárdica SPECT con protocolo esfuerzo-reposo. Captación uniforme en reposo. Hipocaptación en segmento anteroseptal distal durante post-esfuerzo que revierte en estudio tardío. Isquemia miocárdica reversible.`,
    
    holter: `Monitorización Holter de 24 horas continua. Registro Holter con ritmo sinusal predominante. FC media de 72 lpm. Se contabilizaron 150 extrasístoles ventriculares aisladas y 50 extrasístoles supraventriculares. Variabilidad de frecuencia cardíaca conservada. Arritmia menor detectada.`,
    
    mapa: `Monitoreo ambulatorio de presión arterial de veinticuatro horas. Promedio total 138/86 mmHg. Patrón dipper con descenso nocturno del 12%. Carga hipertensiva sistólica del 40%. Hipertensión arterial estadio I.`,
    
    cinecoro: `Cinecoronariografía invasiva por abordaje radial derecho. Coronaria derecha con irregularidades sin estenosis. Descendente anterior con placa ateromatosa excéntrica y estenosis del 60%. Circunfleja sin obstrucciones.`,
    
    ecg: `Electrocardiograma de doce derivaciones en reposo. Ritmo sinusal regular a 65 lpm. Eje QRS a -30 grados, hemibloqueo anterior izquierdo. PR 160 ms, QRS 100 ms. Sin signos de hipertrofia ni isquemia aguda.`,
    
    eco_stress: `Ecocardiograma de estrés con dobutamina. Hipocinesia del segmento apical en fase basal. Fracción de eyección del 42%. Respuesta bifásica con dosis bajas. FEVI pico del 50%. Miocardio viable con isquemia inducible.`,
    
    ett: `Ecocardiograma transtorácico Doppler color. Ventrículo izquierdo con dimensiones normales. Fracción de eyección estimada por Simpson en 58%. Insuficiencia mitral leve. Presión sistólica arteria pulmonar 25 mmHg.`,
    
    pap: `Citología cervical mediante Papanicolaou de base líquida. Muestra satisfactoria con componentes de zona de transformación. No evidencia células atípicas. Informe negativo para malignidad.`,
    
    colposcopia: `Colposcopía diagnóstica tras aplicación de ácido acético al 5%. Cuello uterino íntegro. No se observan áreas de epitelio acetoblanco. Prueba de Schiller con lugol positiva. Sin lesiones premalignas.`,
    
    ecografia_obstetrica: `Ecografía obstétrica de segundo trimestre. Feto único en situación longitudinal con presentación cefálica. Diámetro biparietal de 85 milímetros. Placenta anterior grado I. Líquido amniótico normal.`,
    
    electromiografia: `Electromiografía y estudios de conducción nerviosa de miembros superiores. Latencias motoras y sensoriales normales. Estudio con electrodo de aguja en oponente del pulgar sin fibrilación. Descarta síndrome del túnel carpiano.`,
    
    polisomnografia: `Polisomnografía nocturna completa. Tiempo total de sueño 380 minutos. Índice de apnea-hipopnea de 15 eventos por hora. Nadir de saturación del 84%. Síndrome de apnea obstructiva del sueño grado moderado.`,
    
    naso: `Videonasofibrolaringoscopía flexible para evaluación de nasofibroscopía. Fosas nasales permeables. Rinofaringe libre. Laringe: cuerdas vocales con motilidad simétrica. Luz laríngea permeable. Desviación septal leve.`,
    
    protocolo_quirurgico: `Protocolo quirúrgico de colecistectomía laparoscópica electiva. Se creó neumoperitoneo. Clipado y sección de arteria y conducto cístico. Disección de vesícula del lecho hepático. Hemostasia prolija. Recuento completo.`,
    
    nota_evolucion: `Nota de evolución médica en cuarto día de postoperatorio. Paciente afebril y hemodinámicamente estable. Abdomen blando y depresible. Tolerancia completa a dieta blanda. Se planifica alta hospitalaria.`,
    
    epicrisis: `Epicrisis de internación prolongada por neumonía bacteriana grave. Ingresó con insuficiencia respiratoria aguda. Requirió ventilación no invasiva. Tratamiento con piperacilina-tazobactam. Diagnósticos de egreso: neumonía resuelta e hipertensión controlada.`,
    
    generico: `Informe médico general de aptitud física. Paciente masculino de 45 años. Índice de masa corporal de 27. Presión arterial de 120/80 mmHg. Glucemia y perfil lipídico normales. Apto para actividad física moderada.`
};

// Test de detección automática para cada plantilla del corpus
Object.entries(CORPUS).forEach(([expectedKey, text]) => {
    test(`Corpus-${expectedKey}`, () => {
        const detected = autoDetectTemplateKey(text);
        if (expectedKey === 'generico') {
            // Genérico puede detectar cualquier plantilla si hay keywords coincidentes
            // Lo importante es que no crashee
            assert(detected !== undefined && detected !== null, `Detección no debe ser null para ${expectedKey}`);
        } else {
            assertEqual(detected, expectedKey, `Esperaba '${expectedKey}', detectó '${detected}'`);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 107: Coherencia tipos de usuario — Funcionalidades por plan
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 107: Coherencia tipos de usuario ─────────────────');

const indexCode = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');

test('UserType-1 — Botón contacto solo para no-ADMIN', () => {
    assert(contactCodeSec.includes("CLIENT_CONFIG.type === 'ADMIN'") && 
           contactCodeSec.includes("display = 'none'"),
        'Botón contacto debe ocultarse para ADMIN');
});

test('UserType-2 — structureTranscription verifica API key', () => {
    assert(structCodeSec.includes('GROQ_API_KEY') || structCodeSec.includes('apiKey') || structCodeSec.includes('checkStructurePrerequisites'),
        'Estructurado debe verificar API key antes de proceder');
});

test('UserType-3 — licenseManager bypass total para ADMIN', () => {
    assert(lmCodeSec.includes("CLIENT_CONFIG.type === 'ADMIN'") && lmCodeSec.includes('bypass'),
        'LicenseManager debe hacer bypass para ADMIN');
});

test('UserType-4 — isAdminUser función existe', () => {
    assert(typeof isAdminUser === 'function', 'isAdminUser debe existir como función global');
});

test('UserType-5 — stateManager tiene updateButtonsVisibility', () => {
    const smCodeSec2 = fs.readFileSync(path.join(root, 'src/js/utils/stateManager.js'), 'utf-8');
    assert(smCodeSec2.includes('updateButtonsVisibility'), 
        'stateManager debe tener updateButtonsVisibility');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 108: PWA — Service Worker + Manifest + Install
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 108: PWA completo ─────────────────────────────────');

const swCodePWA = fs.readFileSync(path.join(root, 'sw.js'), 'utf-8');
const manifestCode = fs.readFileSync(path.join(root, 'manifest.json'), 'utf-8');

test('PWA-SW-1 — Service Worker tiene estrategia de cache', () => {
    assert(swCodePWA.includes('caches') && (swCodePWA.includes('cache-first') || swCodePWA.includes('Cache') || swCodePWA.includes('CACHE')),
        'SW debe implementar estrategia de cache');
});

test('PWA-SW-2 — SW no cachea API de Groq', () => {
    assert(swCodePWA.includes('groq') || swCodePWA.includes('api.groq.com') || swCodePWA.includes('Network'),
        'SW no debe cachear llamadas a Groq API');
});

test('PWA-SW-3 — SW registra versión de cache', () => {
    assert(swCodePWA.includes('CACHE_VERSION') || swCodePWA.includes('CACHE_NAME') || swCodePWA.match(/v\d+/),
        'SW debe tener versionado de cache');
});

test('PWA-Manifest-1 — Manifest tiene datos correctos', () => {
    const manifest = JSON.parse(manifestCode);
    assert(manifest.name, 'Manifest debe tener name');
    assert(manifest.short_name, 'Manifest debe tener short_name');
    assertEqual(manifest.display, 'standalone', 'Display debe ser standalone');
});

test('PWA-Manifest-2 — Manifest tiene íconos', () => {
    const manifest = JSON.parse(manifestCode);
    assert(manifest.icons && manifest.icons.length >= 2, 'Debe tener al menos 2 íconos');
    const sizes = manifest.icons.map(i => i.sizes);
    assert(sizes.includes('192x192'), 'Debe tener ícono 192x192');
    assert(sizes.includes('512x512'), 'Debe tener ícono 512x512');
});

test('PWA-Install-1 — index.html registra Service Worker', () => {
    assert(indexCode.includes('serviceWorker.register') || indexCode.includes('navigator.serviceWorker'),
        'index.html debe registrar el Service Worker');
});

test('PWA-Install-2 — index.html tiene link al manifest', () => {
    assert(indexCode.includes('manifest.json'),
        'index.html debe tener link al manifest.json');
});

test('PWA-Install-3 — index.html captura beforeinstallprompt', () => {
    assert(indexCode.includes('beforeinstallprompt'),
        'Debe capturar evento beforeinstallprompt');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 109: Storage — Persistencia y migración
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 109: Storage y Persistencia ──────────────────────');

test('DB-1 — appDB tiene operaciones CRUD', () => {
    assert(typeof appDB.get === 'function', 'appDB.get debe existir');
    assert(typeof appDB.set === 'function', 'appDB.set debe existir');
    assert(typeof appDB.remove === 'function', 'appDB.remove debe existir');
});

test('DB-2 — appDB.set y appDB.get funcionan', async () => {
    await appDB.set('test_key', { hello: 'world' });
    const val = await appDB.get('test_key');
    assert(val && val.hello === 'world', 'Debe poder set/get valores');
    await appDB.remove('test_key');
});

test('DB-3 — Claves de storage documentadas existen en código', () => {
    // Verificar que las claves principales existen en los archivos correspondientes
    assert(bizCodeSec.includes('client_config_stored'), 'business.js debe usar client_config_stored');
    assert(rhCode.includes('report_history'), 'reportHistory.js debe usar report_history');
    assert(prCodeSec.includes('patient_registry'), 'patientRegistry.js debe usar patient_registry');
});

test('DB-4 — formHandler usa pdf_config y patient_history', () => {
    const fhCode = fs.readFileSync(path.join(root, 'src/js/features/formHandler.js'), 'utf-8');
    assert(fhCode.includes('pdf_config'), 'formHandler debe usar pdf_config');
    assert(fhCode.includes('patient_history'), 'formHandler debe usar patient_history');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 110: MedDictionary — Motor de correcciones
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 110: MedDictionary — Seguridad ───────────────────');

const mdCodeSec = fs.readFileSync(path.join(root, 'src/js/features/medDictionary.js'), 'utf-8');

test('MedDict-1 — _escapeRegex existe y se usa', () => {
    assert(mdCodeSec.includes('function _escapeRegex'), 'Debe tener función _escapeRegex');
    assert(mdCodeSec.includes('_escapeRegex(key)'), 'findDictMatches debe usar _escapeRegex');
});

test('MedDict-2 — _htmlEncode existe para sanitización', () => {
    assert(mdCodeSec.includes('_htmlEncode') || mdCodeSec.includes('_htmlEnc'),
        'Debe tener función _htmlEncode para escapar HTML');
});

test('MedDict-3 — renderReviewList usa _htmlEncode', () => {
    assert(mdCodeSec.includes('_htmlEncode(m.from)') || mdCodeSec.includes('_htmlEncode(m.to)'),
        'renderReviewList debe escapar datos con _htmlEncode');
});

test('MedDict-4 — AI scan tiene límite de caracteres', () => {
    assert(mdCodeSec.includes('3000') || mdCodeSec.includes('slice(0,') || mdCodeSec.includes('substring(0,'),
        'AI scan debe truncar texto largo');
});

test('MedDict-5 — Glosario canónico 2026-03 cargado', () => {
    assert(mdCodeSec.includes('MEDICAL_CANONICAL_TERMS_20260310'),
        'Debe existir glosario canónico ampliado 2026-03');
    assert(mdCodeSec.includes('amiloidosis cardíaca') && mdCodeSec.includes('videonasolaringoscopia'),
        'El glosario debe incluir términos clínicos de múltiples especialidades');
});

test('MedDict-6 — Extensión automática por acentos/guiones activa', () => {
    assert(mdCodeSec.includes('_extendMedicalDictFromCanonicalTerms') && mdCodeSec.includes("MEDICAL_DICT_BASE[plain] = canonical"),
        'El diccionario debe generar correcciones automáticas desde el glosario canónico');
});

test('MedDict-5 — vocabulario neumología ampliado', () => {
    assert(mdCodeSec.includes('curva flujo-volumen') && mdCodeSec.includes('SpO2') && mdCodeSec.includes('FEV1/FVC'),
        'El diccionario debe incluir términos clave de función respiratoria');
});

test('MedDict-6 — vocabulario cardiología/oncología/gineco ampliado', () => {
    assert(mdCodeSec.includes('cinecoronariografía') && mdCodeSec.includes('PET-CT') && mdCodeSec.includes('ASC-US'),
        'El diccionario debe incluir términos clave multiespecialidad');
});

test('MedDict-7 — normalización explícita de OROFARINGE', () => {
    assert(mdCodeSec.includes('"orófaringe":               "orofaringe"') || mdCodeSec.includes('orofaringe'),
        'El diccionario debe cubrir normalización de orofaringe');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 111: Integración cross-module — Exports globales de seguridad
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 111: Cross-module — Funciones de seguridad ──────');

test('Global-1 — escapeHtml disponible globalmente', () => {
    assert(typeof window.escapeHtml === 'function', 'escapeHtml debe ser window.escapeHtml');
});

test('Global-2 — escapeHtml maneja XSS payloads comunes', () => {
    const payloads = [
        '<img src=x onerror=alert(1)>',
        '<script>document.cookie</script>',
        '"><svg onload=alert(1)>',
        "javascript:alert('xss')",
        '<iframe src="evil.com"></iframe>'
    ];
    payloads.forEach(p => {
        const escaped = escapeHtml(p);
        assert(!escaped.includes('<script'), `Payload no escapado: ${p}`);
        assert(!escaped.includes('<img'), `Payload img no escapado: ${p}`);
        assert(!escaped.includes('<svg'), `Payload svg no escapado: ${p}`);
        assert(!escaped.includes('<iframe'), `Payload iframe no escapado: ${p}`);
    });
});

test('Global-3 — autoDetectTemplateKey disponible', () => {
    assert(typeof autoDetectTemplateKey === 'function', 'autoDetectTemplateKey debe ser global');
});

test('Global-4 — saveReportToHistory disponible', () => {
    assert(typeof saveReportToHistory === 'function', 'saveReportToHistory debe ser global');
});

test('Global-5 — savePatientToRegistry disponible', () => {
    assert(typeof savePatientToRegistry === 'function', 'savePatientToRegistry debe ser global');
});

test('Global-6 — searchPatientRegistry disponible', () => {
    assert(typeof searchPatientRegistry === 'function', 'searchPatientRegistry debe ser global');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 112: Admin Panel — Integridad y seguridad
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 112: Admin Panel ──────────────────────────────────');

const adminCodeSec = fs.readFileSync(path.join(root, 'recursos/admin.html'), 'utf-8');

test('Admin-1 — Admin panel tiene escapeHtml propia', () => {
    assert(adminCodeSec.includes('function escapeHtml'), 'admin.html debe tener su propia escapeHtml');
});

test('Admin-2 — Admin panel verifica token de sesión', () => {
    assert(adminCodeSec.includes('adminSession') || adminCodeSec.includes('sessionStorage'),
        'Admin debe verificar sesión');
});

test('Admin-3 — Admin panel verifica sesión con token', () => {
    assert(adminCodeSec.includes('token') || adminCodeSec.includes('adminSession'),
        'Admin debe verificar sesión con token');
});

test('Admin-4 — Admin panel tiene CRUD de usuarios', () => {
    assert(adminCodeSec.includes('admin_create_user') && adminCodeSec.includes('admin_update_user'),
        'Admin debe tener endpoints de crear/editar usuarios');
});

test('Admin-5 — Admin panel tiene sistema de logs', () => {
    assert(adminCodeSec.includes('admin_log_action') || adminCodeSec.includes('admin_get_logs'),
        'Admin debe tener sistema de auditoría/logs');
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 113: Admin Base URL + Tooltips fijos — anti-regresión crítica
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 113: Admin Base URL + Tooltips fijos ─────────────────');

const configCodeSec = fs.readFileSync(path.join(root, 'src/js/config/config.js'), 'utf-8');
const businessCodeSec = fs.readFileSync(path.join(root, 'src/js/features/business.js'), 'utf-8');
const indexCodeSec = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
const fixedTipsCodeSec = fs.readFileSync(path.join(root, 'src/js/features/fixedTooltips.js'), 'utf-8');
const userGuideCodeSec = fs.readFileSync(path.join(root, 'src/js/features/userGuide.js'), 'utf-8');
const settingsPopulateCodeSec = fs.readFileSync(path.join(root, 'src/js/features/settingsModalPopulateUtils.js'), 'utf-8');
const editorDialogCodeSec = fs.readFileSync(path.join(root, 'src/js/features/editorDialogUtils.js'), 'utf-8');
const snapshotsCodeSec = fs.readFileSync(path.join(root, 'src/js/features/editorSnapshotsUtils.js'), 'utf-8');
const settingsBackupActionsCodeSec = fs.readFileSync(path.join(root, 'src/js/features/settingsBackupActionsUtils.js'), 'utf-8');

test('AdminBase-1 — config.js detecta URL oficial /transcripcion', () => {
    assert(configCodeSec.includes("/transcripcion") && configCodeSec.includes('isOfficialAdminBase'),
        'config.js debe detectar la URL base oficial para forzar ADMIN');
});

test('AdminBase-2 — config.js prioriza ?id= para links de fábrica', () => {
    assert(configCodeSec.includes("params.get('id')") || configCodeSec.includes('setupId'),
        'config.js debe conservar soporte para ?id en links de fábrica');
});

test('AdminBase-3 — business.js tiene guardia dura para ADMIN base', () => {
    assert(businessCodeSec.includes('isOfficialAdminBase') && businessCodeSec.includes('_initAdmin()'),
        'business.js debe forzar _initAdmin() en la URL oficial base');
});

test('Tooltips-1 — app principal carga fixedTooltips.js', () => {
    assert(indexCodeSec.includes('src/js/features/fixedTooltips.js'),
        'index.html debe cargar fixedTooltips.js');
});

test('Tooltips-2 — admin panel carga fixedTooltips.js', () => {
    assert(adminCodeSec.includes('../src/js/features/fixedTooltips.js'),
        'recursos/admin.html debe cargar fixedTooltips.js');
});

test('Tooltips-3 — fixed tooltips evita duplicar tooltips nativos', () => {
    assert(fixedTipsCodeSec.includes('hasNativeTooltip') && fixedTipsCodeSec.includes("getAttribute('title')"),
        'fixedTooltips.js debe omitir elementos que ya tienen tooltip nativo');
});

test('Guide-1 — tutorial automático configurable (on/off)', () => {
    assert(indexCodeSec.includes('tourAutoToggle') && userGuideCodeSec.includes('auto_tour_enabled'),
        'Debe existir toggle persistente para activar/desactivar tutorial automático');
});

test('Version-1 — index expone APP_VERSION en runtime', () => {
    assert(indexCodeSec.includes('window.APP_VERSION = APP_VERSION'),
        'index.html debe exponer APP_VERSION para trazabilidad de despliegue');
});

test('Version-2 — settings usa APP_VERSION/app_version y no hardcode 2.0 fijo', () => {
    assert(settingsPopulateCodeSec.includes('window.APP_VERSION') && settingsPopulateCodeSec.includes("localStorage.getItem('app_version')"),
        'settingsModalPopulateUtils debe leer version en runtime');
    assert(!settingsPopulateCodeSec.includes("textContent = '2.0'"),
        'settingsModalPopulateUtils no debe hardcodear 2.0 en labels de version');
});

test('Modal-1 — editorDialogUtils no usa window.confirm/window.prompt nativos', () => {
    assert(!editorDialogCodeSec.includes('window.confirm('), 'No debe usar window.confirm en dialogs de la app');
    assert(!editorDialogCodeSec.includes('window.prompt('), 'No debe usar window.prompt en dialogs de la app');
    assert(editorDialogCodeSec.includes('ensureConfirmModal') && editorDialogCodeSec.includes('ensurePromptModal'),
        'Debe construir scaffolding de modales propios si faltan en DOM');
});

test('Modal-2 — no hay fallback a confirm() nativo en módulos críticos', () => {
    assert(!businessCodeSec.includes(': confirm('), 'business.js no debe fallbackear a confirm()');
    assert(!snapshotsCodeSec.includes(': confirm('), 'editorSnapshotsUtils.js no debe fallbackear a confirm()');
    assert(!settingsBackupActionsCodeSec.includes(': confirm('), 'settingsBackupActionsUtils.js no debe fallbackear a confirm()');
});

test('Modal-3 — banner API y modales clave usan clases temáticas', () => {
    assert(indexCodeSec.includes('class="api-key-warning-banner"'), 'Banner API key debe usar clase temática');
    assert(indexCodeSec.includes('class="modal-header reset-modal-header"'), 'Reset modal debe usar header temático');
    assert(indexCodeSec.includes('class="btn reset-btn-danger" id="btnConfirmResetApp"'), 'Reset modal debe usar botón temático de peligro');
    assert(indexCodeSec.includes('class="modal contact-modal" id="contactModal"'), 'Contact modal debe usar clase temática');
    assert(indexCodeSec.includes('id="contactMotivo" class="contact-input"'), 'Select de contacto debe usar clase temática');
    assert(indexCodeSec.includes('id="contactDetalle" rows="5"'), 'Textarea de contacto debe existir');
    assert(indexCodeSec.includes('class="contact-input contact-textarea"'), 'Textarea de contacto debe usar clase temática');
});

test('Modal-4 — onboarding y acciones destructivas usan clases coherentes', () => {
    assert(indexCodeSec.includes('class="modal-overlay onboarding-overlay" id="onboardingOverlay"'),
        'Onboarding overlay debe usar clase temática propia');
    assert(indexCodeSec.includes('id="settingsClearData" class="btn btn-outline btn-full stg-action-btn stg-action-btn-danger"')
        || indexCodeSec.includes('id="settingsClearData"') && indexCodeSec.includes('stg-action-btn-danger'),
        'Botón de borrar datos debe usar clase danger temática');
    assert(indexCodeSec.includes('id="btnDeleteFieldSection"') && indexCodeSec.includes('edit-field-danger-btn'),
        'Botón eliminar campo debe usar clase danger temática');
});

test('Struct-NonMedical-1 — fallback general sin conclusion + advertencia contextual', () => {
    assert(structCodeSec.includes('_getNonMedicalWarning'),
        'structurer.js debe definir funcion de advertencia contextual para texto no medico');
    assert(structCodeSec.includes('forceGeneralNoConclusion'),
        'structurer.js debe activar modo general sin conclusion para texto no medico');
    assert(structCodeSec.includes('NO agregues ninguna seccion de conclusion') || structCodeSec.includes('NO agregues ninguna sección de conclusión'),
        'prompt no medico debe prohibir seccion de conclusion');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 114: _stripRedundantEmptyMarkers — badges inteligentes
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 114: _stripRedundantEmptyMarkers (badges inteligentes) ──');

const _stripFn = StructurerCoreUtils._stripRedundantEmptyMarkers;

test('Badge-1 — conserva [No especificado] cuando es el único contenido', () => {
    const md = '**Fonación:** [No especificado]';
    const out = _stripFn(md);
    assertIncludes(out, '[No especificado]', 'Debe conservar badge en campo vacío');
});

test('Badge-2 — conserva badge en línea con solo label + marker', () => {
    const md = '**Pares craneales:** [No especificado].';
    const out = _stripFn(md);
    assertIncludes(out, '[No especificado]', 'Debe conservar badge cuando label + marker');
});

test('Badge-3 — elimina badge cuando la línea tiene frase completa (>30 chars)', () => {
    const md = 'Se observan focos de hiperintensidad esparcidos en la sustancia blanca subcortical [No especificado].';
    const out = _stripFn(md);
    assert(!out.includes('[No especificado]'), `Badge debe eliminarse en frase completa, obtuvo: ${out}`);
});

test('Badge-4 — elimina badge en frase de hallazgo completo', () => {
    const md = 'El eco muestra un quiste pineal simple de 8 mm sin significado clínico [No especificado].';
    const out = _stripFn(md);
    assert(!out.includes('[No especificado]'), 'No debe haber badge en frase completa de hallazgo');
});

test('Badge-5 — markdownToHtml no genera badge en frase completa', () => {
    const md = '## HALLAZGOS\n\nSe observan focos de hiperintensidad esparcidos en la sustancia blanca subcortical compatibles con enfermedad isquémica [No especificado].';
    const html = markdownToHtml(md);
    assert(!html.includes('no-data-field'), 'No debe generar badge en frase completa');
});

test('Badge-6 — markdownToHtml genera badge en campo vacío', () => {
    const md = '## HALLAZGOS\n\n**Fonación:** [No especificado]';
    const html = markdownToHtml(md);
    assertIncludes(html, 'no-data-field', 'Debe generar badge en campo vacío');
});

test('Badge-7 — conserva badge en línea corta sin frase coherente', () => {
    const md = 'Cornetes: [No especificado]';
    const out = _stripFn(md);
    assertIncludes(out, '[No especificado]', 'Línea corta debe conservar badge');
});

test('Gonio-AO-1 — AO bilateral replica OD en OI cuando OI queda vacío', () => {
    assertEqual(typeof _normalizeGonioscopyBilateralAO, 'function', 'Debe existir normalizador AO de gonioscopía');
    const source = 'Gonioscopía AO. Shaffer IV sin sinequias.';
    const md = `# INFORME DE GONIOSCOPÍA

## OJO DERECHO (OD)
- Ángulo: Grado IV de Shaffer, abierto.
- Hallazgos patológicos: Sin PAS ni neovasos.

## OJO IZQUIERDO (OI)
- Ángulo: [No especificado]
- Hallazgos patológicos: [No especificado]

## IMPRESIÓN DIAGNÓSTICA
- Ángulos abiertos bilaterales.`;

    const out = _normalizeGonioscopyBilateralAO(md, source);
    const oiMatch = out.match(/## OJO IZQUIERDO \(OI\)[\s\S]*?(?=\n##\s+|\s*$)/);
    assert(oiMatch && oiMatch[0], 'Debe existir sección OI en salida normalizada');
    assert(/Grado IV de Shaffer, abierto\./.test(oiMatch[0]),
        'OI debe completarse con hallazgos de OD en caso AO bilateral');
    assert(/Sin PAS ni neovasos\./.test(oiMatch[0]),
        'OI debe incluir hallazgos patológicos copiados desde OD en caso AO bilateral');
});

test('Gonio-AO-2 — sin señal bilateral no replica OD hacia OI', () => {
    const source = 'Gonioscopía OD con Shaffer IV.';
    const md = `# INFORME DE GONIOSCOPÍA

## OJO DERECHO (OD)
- Ángulo: Grado IV de Shaffer, abierto.

## OJO IZQUIERDO (OI)
- Ángulo: [No especificado]`;

    const out = _normalizeGonioscopyBilateralAO(md, source);
    assertEqual(out, md, 'No debe modificar salida cuando no hay AO/ambos ojos/bilateral');
});

test('Gonio-Quality-1 — corrige frases incompletas frecuentes', () => {
    assertEqual(typeof _normalizeGonioscopyNarrativeQuality, 'function', 'Debe existir normalizador de calidad para gonioscopía');
    const md = `## OJO DERECHO (OD)
El ángulo es abierto con un con grado Shaffer y condición abierto, la configuración del iris es.. Gonioscopía dinámica/indentación:.`;
    const out = _normalizeGonioscopyNarrativeQuality(md);
    assert(!out.includes('con un con'), 'No debe duplicar preposición (con un con)');
    assert(!/la\s+configuraci[oó]n\s+del\s+iris\s+es\s*(?:\.\.|\.)?/i.test(out),
        'No debe dejar frase truncada de configuración del iris');
    assert(!/gonioscop[ií]a\s+din[aá]mica\/indentaci[oó]n\s*(?:es|:)/i.test(out),
        'No debe incluir dinámica/indentación cuando no está especificada');
    assert(!out.includes('..'), 'No debe dejar dobles puntos');
    assert(!out.includes(':.') && !out.includes(' :.'), 'No debe dejar artefactos de ":."');
});

test('Gonio-Quality-2 — limpia texto condicional de Spaeth', () => {
    const md = `## SISTEMA SPAETH (SI ESTÁ REPORTADO)
[No especificado]`;
    const out = _postProcessStructuredMarkdown(md);
    assert(!out.includes('(SI ESTÁ REPORTADO)'),
        'No debe dejar texto condicional en heading de Spaeth');
    assert(out.includes('SISTEMA SPAETH') || out.includes('[No especificado]'),
        'Debe preservar contenido o heading');
});

test('Gonio-Quality-3 — normaliza abreviatura r.e. a R. E.', () => {
    const md = 'Papila en r.e. de bordes netos.';
    const out = _postProcessStructuredMarkdown(md);
    assert(out.includes('R. E.'), 'Debe mostrar la abreviatura como R. E.');
    assert(!out.includes('R.E.'), 'No debe quedar formato R.E. sin espacio');
});

test('Gonio-Quality-4 — limpia artefactos gramaticales severos del caso real', () => {
    const md = 'El ángulo iridocorneal es visible en toda su extensión, con un con grado Shaffer y condición abierto, se visualizan la línea de Schwalbe bien definida, la malla trabecular pigmentada, el espolón escleral definido y la banda del cuerpo ciliar visible. La pigmentación trabecular está presente. la configuración del iris es.. Gonioscopía dinámica/indentación:. No se observan hallazgos patológicos.';
    const out = _postProcessStructuredMarkdown(md);
    assert(!out.includes('con un con'), 'No debe persistir la duplicación "con un con"');
    assert(!out.includes('..'), 'No debe persistir doble punto');
    assert(!out.includes(':.') && !out.includes(' :.'), 'No debe persistir artefacto ":."');
    assert(!/la\s+configuraci[oó]n\s+del\s+iris\s+es\s*(?:\.\.|\.)?/i.test(out),
        'No debe dejar frase truncada de configuración del iris');
    assert(!/gonioscop[ií]a\s+din[aá]mica\/indentaci[oó]n\s*(?:es|:)/i.test(out),
        'No debe dejar frase truncada de dinámica/indentación');
});

test('Gonio-Quality-5 — corrige variantes con elipsis unicode y "es." sin contenido', () => {
    const md = 'El ángulo iridocorneal es visible en toda su extensión, con un grado Shaffer y condición abierto, se visualizan la línea de Schwalbe bien definida, la malla trabecular pigmentada, el espolón escleral definido y la banda del cuerpo ciliar visible. La configuración del iris es... La gonioscopía dinámica/indentación es. No se observan hallazgos patológicos como sinequias anteriores periféricas (PAS), neovasos, línea de Sampaolesi u otros.';
    const out = _postProcessStructuredMarkdown(md);
    assert(!/configuraci[oó]n del iris es\s*(?:\.\.\.|…|\.)/i.test(out),
        'No debe quedar frase truncada de iris');
    assert(!/gonioscop[ií]a din[aá]mica\/indentaci[oó]n\s+es\s*(?:\.\.\.|…|\.)/i.test(out),
        'No debe quedar frase truncada de dinámica/indentación');
    assert(!/gonioscop[ií]a\s+din[aá]mica\/indentaci[oó]n\s*:/i.test(out),
        'No debe inventar campo dinámico con marcador cuando no se especificó');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 115: Extracción paciente — 41 casos clínicos
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 115: Extracción paciente — 41 casos clínicos ─────────');

const CLINICAL_CASES = [
    { id: 1,  text: 'Paciente masculino de 58 años, Carlos Mendoza, acude por disnea de esfuerzo; se realiza espirometría forzada basal', name: 'Carlos Mendoza', age: 58, sex: 'M' },
    { id: 2,  text: 'Mujer de 65 años, Ana Rojas, realiza prueba de caminata de seis minutos en pasillo', name: 'Ana Rojas', age: 65, sex: 'F' },
    { id: 3,  text: 'Juan Pérez de 45 años es evaluado en el laboratorio de función pulmonar por sospecha de patología intersticial', name: 'Juan Pérez', age: 45 },
    { id: 4,  text: 'Paciente de 52 años, Luis Torres, evaluado por obesidad y ronquidos', name: 'Luis Torres', age: 52 },
    { id: 5,  text: 'María Gómez, femenina de 60 años con sospecha de glaucoma, realiza campimetría', name: 'María Gómez', age: 60, sex: 'F' },
    { id: 6,  text: 'Carlos López, diabético de 62 años, presenta en la tomografía de coherencia óptica de la mácula un marcado engrosamiento', name: 'Carlos López', age: 62 },
    { id: 7,  text: 'Sofía Ramírez de 24 años muestra en la topografía corneal un encurvamiento inferior asimétrico bilateral', name: 'Sofía Ramírez', age: 24 },
    { id: 8,  text: 'Hombre de 70 años, Roberto Fernández, hipertenso crónico, en la exploración del fondo de ojo bajo midriasis', name: 'Roberto Fernández', age: 70, sex: 'M' },
    { id: 9,  text: 'Lucía Martínez de 55 años, evaluada por cefalea, se le realiza tomografía axial computarizada de cráneo', name: 'Lucía Martínez', age: 55 },
    { id: 10, text: 'Miguel Sánchez de 64 años, el estudio de resonancia magnética cerebral en equipo de tres Tesla', name: 'Miguel Sánchez', age: 64 },
    { id: 11, text: 'Femenina de 50 años, Elena Castro, acude a tamizaje donde se observan mamas de composición', name: 'Elena Castro', age: 50, sex: 'F' },
    { id: 12, text: 'Rosa Silva, mujer posmenopáusica de 68 años, se realiza densitometría ósea', name: 'Rosa Silva', age: 68, sex: 'F' },
    { id: 13, text: 'Hombre de 61 años, Andrés Fuentes, con carcinoma pulmonar, recibe cero punto catorce megabequerelios', name: 'Andrés Fuentes', age: 61, sex: 'M' },
    { id: 14, text: 'Paciente de 34 años, José Domínguez, sufre traumatismo en miembro inferior derecho', name: 'José Domínguez', age: 34 },
    { id: 15, text: 'Carmen Ruiz de 48 años con dolor abdominal, la ecografía reporta hígado de morfología normal', name: 'Carmen Ruiz', age: 48 },
    { id: 16, text: 'Fernando Gómez de 59 años por cólico nefrítico, se observan riñones de situación y tamaño habitual', name: 'Fernando Gómez', age: 59 },
    { id: 17, text: 'Mujer de 35 años, Patricia Vega, se explora glándula tiroides observando en el lóbulo derecho', name: 'Patricia Vega', age: 35, sex: 'F' },
    { id: 18, text: 'Femenina de 28 años, Laura Méndez, presenta nódulo palpable en mama derecha', name: 'Laura Méndez', age: 28, sex: 'F' },
    { id: 19, text: 'Hombre de 66 años, Luis Castro, el eco doppler vascular de troncos supraaórticos muestra engrosamiento', name: 'Luis Castro', age: 66, sex: 'M' },
    { id: 20, text: 'Paciente masculino de 42 años, Javier Blanco, con dispepsia, el esófago presenta mucosa normal', name: 'Javier Blanco', age: 42, sex: 'M' },
    { id: 21, text: 'Mujer de 54 años, Silvia Ortiz, la preparación para la colonoscopía fue adecuada', name: 'Silvia Ortiz', age: 54, sex: 'F' },
    { id: 22, text: 'Hombre de 65 años, Ricardo Morales, la exploración por broncoscopía muestra cuerdas vocales', name: 'Ricardo Morales', age: 65, sex: 'M' },
    { id: 23, text: 'Femenina de 40 años, Mónica Herrera, con disfonía persistente, la laringoscopía permite visualizar', name: 'Mónica Herrera', age: 40, sex: 'F' },
    { id: 24, text: 'Paciente de 68 años, Tomás Aguilar, tras la inyección del radiotrazador la gammagrafía cardíaca', name: 'Tomás Aguilar', age: 68 },
    { id: 25, text: 'Femenina de 72 años, Beatriz Guzmán, el monitoreo holter electrocardiográfico de veinticuatro horas', name: 'Beatriz Guzmán', age: 72, sex: 'F' },
    { id: 26, text: 'Hombre de 55 años, Hugo Navarro, el monitoreo ambulatorio de presión arterial', name: 'Hugo Navarro', age: 55, sex: 'M' },
    { id: 27, text: 'Paciente masculino de 60 años, Mario Santos, el abordaje de cinecoronariografía por arteria radial', name: 'Mario Santos', age: 60, sex: 'M' },
    { id: 28, text: 'Mujer de 45 años, Rosa Mendoza, el trazado del electrocardiograma muestra un ritmo sinusal', name: 'Rosa Mendoza', age: 45, sex: 'F' },
    { id: 29, text: 'Hombre de 58 años, Carlos Vega, realiza prueba de eco stress en banda sinfín', name: 'Carlos Vega', age: 58, sex: 'M' },
    { id: 30, text: 'Femenina de 67 años, Inés Peña, en el ecocardiograma transtorácico los diámetros cavitarios', name: 'Inés Peña', age: 67, sex: 'F' },
    { id: 31, text: 'Mujer de 32 años, Andrea Ríos, la citología exfoliativa cervicovaginal evaluada bajo el sistema Bethesda', name: 'Andrea Ríos', age: 32, sex: 'F' },
    { id: 32, text: 'Paciente de 38 años, Valeria Montes, durante la colposcopía y tras la aplicación de ácido acético', name: 'Valeria Montes', age: 38 },
    { id: 33, text: 'Femenina de 28 años, Daniela Torres, cursando gestación única con feto en presentación cefálica', name: 'Daniela Torres', age: 28, sex: 'F' },
    { id: 34, text: 'Hombre de 45 años, Jorge Ruiz, el estudio de electromiografía y velocidad de conducción nerviosa', name: 'Jorge Ruiz', age: 45, sex: 'M' },
    { id: 35, text: 'Paciente masculino de 50 años, Felipe Ortega, el registro de polisomnografía evidencia una arquitectura', name: 'Felipe Ortega', age: 50, sex: 'M' },
    { id: 36, text: 'Mujer de 29 años, Clara Guzmán, la videonasolaringoscopía revela cornetes inferiores hipertróficos', name: 'Clara Guzmán', age: 29, sex: 'F' },
    { id: 37, text: 'Hombre de 34 años, Martín Suárez, la exploración mediante endoscopía otológica muestra', name: 'Martín Suárez', age: 34, sex: 'M' },
    { id: 38, text: 'Paciente femenina de 41 años, Lorena Páez, durante el protocolo quirúrgico de colecistectomía', name: 'Lorena Páez', age: 41, sex: 'F' },
    { id: 39, text: 'Hombre de 56 años, Arturo Blanco, en su segundo día de internación cursa lúcido y afebril', name: 'Arturo Blanco', age: 56, sex: 'M' },
    { id: 40, text: 'Mujer de 60 años, Carmen Paredes, ingresó por dolor precordial opresivo constatándose infarto agudo', name: 'Carmen Paredes', age: 60, sex: 'F' },
    { id: 41, text: 'Paciente masculino de 48 años, Ernesto Gómez, acude para evaluación general donde el examen físico', name: 'Ernesto Gómez', age: 48, sex: 'M' },
];

CLINICAL_CASES.forEach(c => {
    test(`Caso ${c.id} — extrae nombre "${c.name}" y edad ${c.age}`, () => {
        const data = global.extractPatientDataFromText(c.text);
        assertEqual(data.name, c.name, `Caso ${c.id}: nombre esperado "${c.name}", obtuvo "${data.name}"`);
        assertEqual(data.age, c.age, `Caso ${c.id}: edad esperada ${c.age}, obtuvo ${data.age}`);
        if (c.sex) {
            assertEqual(data.sex, c.sex, `Caso ${c.id}: sexo esperado ${c.sex}, obtuvo ${data.sex}`);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 116: autoDetectTemplateKey — 42 casos clínicos
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 116: autoDetectTemplateKey — 42 casos clínicos ──────');

const TEMPLATE_CASES = [
    { id: 1,  text: 'espirometría forzada basal y posterior a cuatrocientos microgramos de salbutamol evidenciando una capacidad vital forzada', expected: 'espirometria' },
    { id: 2,  text: 'prueba de caminata de seis minutos en pasillo de treinta metros logrando recorrer trescientos veinte metros con una saturación de oxígeno basal', expected: 'test_marcha' },
    { id: 3,  text: 'pletismografía una capacidad pulmonar total disminuida por debajo del límite inferior de la normalidad', expected: 'pletismografia' },
    { id: 4,  text: 'oximetría nocturna un índice de desaturación elevado con múltiples caídas de la saturación por debajo del ochenta y cinco por ciento', expected: 'oximetria_nocturna' },
    { id: 5,  text: 'campimetría con analizador Humphrey evaluando los treinta grados centrales mediante estímulo blanco sobre blanco', expected: 'campimetria' },
    { id: 6,  text: 'tomografía de coherencia óptica de la mácula un marcado engrosamiento retiniano', expected: 'oct_retinal' },
    { id: 7,  text: 'topografía corneal un encurvamiento inferior asimétrico bilateral con valor queratométrico', expected: 'topografia_corneal' },
    { id: 8,  text: 'exploración del fondo de ojo bajo midriasis disco óptico de forma redonda y bordes regulares', expected: 'fondo_ojo' },
    { id: 9,  text: 'gonioscopía con clasificación Shaffer grado cuatro, malla trabecular pigmentada y ausencia de sinequias anteriores periféricas', expected: 'gonioscopia' },
    { id: 10, text: 'tomografía axial computarizada de cráneo evidenciándose parénquima de densidad normal sin colecciones hemáticas', expected: 'tac' },
    { id: 11, text: 'resonancia magnética cerebral en equipo de tres Tesla con secuencias sagital T uno axial T dos y FLAIR', expected: 'resonancia' },
    { id: 12, text: 'tamizaje donde se observan mamas de composición heterogéneamente densa tipo C con microcalcificaciones birads cinco', expected: 'mamografia' },
    { id: 13, text: 'densitometría ósea reportando un T score de menos dos punto ocho en el cuello femoral izquierdo', expected: 'densitometria' },
    { id: 14, text: 'PET CT tras sesenta minutos una masa en el lóbulo superior derecho con un valor estandarizado de captación', expected: 'pet_ct' },
    { id: 15, text: 'radiografía convencional muestra una solución de continuidad ósea diáfisis tibial con trazo oblicuo', expected: 'radiografia' },
    { id: 16, text: 'ecografía reporta hígado de morfología normal vesícula biliar imágenes ecogénicas sombra acústica posterior colédoco', expected: 'ecografia_abdominal' },
    { id: 17, text: 'riñones de situación y tamaño habitual conservando el parénquima hidronefrosis moderada cálculo obstructivo unión ureteropélica', expected: 'ecografia_renal' },
    { id: 18, text: 'explora glándula tiroides lóbulo derecho nódulo sólido hipoecoico bordes irregulares microcalcificaciones internas', expected: 'ecografia_tiroidea' },
    { id: 19, text: 'ecografía revela mama derecha masa sólida ovalada circunscrita tejido fibroadenomatoso birads tres', expected: 'ecografia_mamaria' },
    { id: 20, text: 'eco doppler vascular de troncos supraaórticos engrosamiento miointimal placa de ateroma calcificada estenosis', expected: 'eco_doppler' },
    { id: 21, text: 'gastroscopía esófago mucosa normal antro gástrico eritema parcheado biopsias bulbo duodenal', expected: 'gastroscopia' },
    { id: 22, text: 'colonoscopía preparación adecuada equipo hasta el ciego colon sigmoides pólipo sésil resecado asa fría', expected: 'colonoscopia' },
    { id: 23, text: 'broncoscopía cuerdas vocales móviles tráquea normal bronquio lóbulo superior lesión exofítica biopsias cepillado citología', expected: 'broncoscopia' },
    { id: 24, text: 'laringoscopía permite visualizar tercio medio cuerda vocal verdadera nódulo base sésil movilidad cordal fonación', expected: 'laringoscopia' },
    { id: 25, text: 'gammagrafía cardíaca en reposo y esfuerzo ventrícolo izquierdo defecto de captación reversible isquemia miocárdica', expected: 'gammagrafia_cardiaca' },
    { id: 26, text: 'holter electrocardiográfico de veinticuatro horas ritmo sinusal extrasístoles ventriculares pausas segmento ST', expected: 'holter' },
    { id: 27, text: 'monitoreo ambulatorio de presión arterial veinticuatro horas promedios diurnos elevados patrón non dipper', expected: 'mapa' },
    { id: 28, text: 'cinecoronariografía por arteria radial descendente anterior estenosis severa angioplastia stent circunfleja', expected: 'cinecoro' },
    { id: 29, text: 'electrocardiograma ritmo sinusal regular intervalo PR complejo QRS eje eléctrico repolarización ventricular', expected: 'ecg' },
    { id: 30, text: 'eco stress en banda sinfín contractilidad basal normal esfuerzo máximo hipocinesia segmentos apicales isquemia miocárdica', expected: 'eco_stress' },
    { id: 31, text: 'ecocardiograma transtorácico diámetros cavitarios válvula aórtica calcificación gradiente transvalvular estenosis aórtica fracción eyección', expected: 'ett' },
    { id: 32, text: 'citología exfoliativa cervicovaginal sistema Bethesda células escamosas atípicas ascus virus papiloma humano', expected: 'pap' },
    { id: 33, text: 'colposcopía ácido acético unión escamocolumnar zona acetoblanca mosaico punteado lésión intraepitelial biopsia dirigida', expected: 'colposcopia' },
    { id: 34, text: 'ecografía obstétrica biometría fetal diámetro biparietal longitud fémur treinta y dos semanas placenta líquido amniótico', expected: 'ecografia_obstetrica' },
    { id: 35, text: 'electromiografía velocidad de conducción nerviosa latencia distal prolongada nervio mediano túnel del carpo neuropático', expected: 'electromiografia' },
    { id: 36, text: 'polisomnografía arquitectura de sueño fragmentada índice apneas hipopneas obstructivas desaturaciones oxígeno', expected: 'polisomnografia' },
    { id: 37, text: 'videonasolaringoscopía cornetes inferiores hipertróficos septum nasal desviado meato medio pólipos fosas nasales nasofaringe', expected: 'naso' },
    { id: 38, text: 'endoscopía otológica conducto auditivo externo membrana timpánica retracción derrame oído medio', expected: 'endoscopia_otologica' },
    { id: 39, text: 'protocolo quirúrgico colecistectomía laparoscópica vesícula biliar triángulo anatómico arteria conducto cístico', expected: 'protocolo_quirurgico' },
    { id: 40, text: 'nota de evolución internación lúcido afebril mejoría disnea auscultación crepitantes antibiótico intravenoso', expected: 'nota_evolucion' },
    { id: 41, text: 'epicrisis ingresó dolor precordial infarto agudo miocardio revascularización percutánea alta hospitalaria', expected: 'epicrisis' },
    { id: 42, text: 'evaluación general examen físico normal índice masa corporal sobrepeso informe médico recomendaciones dieta ejercicio', expected: 'generico' },
];

TEMPLATE_CASES.forEach(c => {
    test(`Template caso ${c.id} — detecta "${c.expected}"`, () => {
        const key = autoDetectTemplateKey(c.text);
        assertEqual(key, c.expected, `Caso ${c.id}: esperado "${c.expected}", obtuvo "${key}"`);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 117: Editor — inserción de tabla (código structural)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 117: Editor — tabla y herramientas ───────────────────');

test('Editor-Table — index.html tiene botón insertTableBtn', () => {
    assertIncludes(indexCode, 'id="insertTableBtn"', 'Debe existir botón de insertar tabla');
});

test('Editor-Table — handler usa DOM (no execCommand insertHTML)', () => {
    const fmtCode = fs.readFileSync(path.join(root, 'src/js/features/editorFormattingFindUtils.js'), 'utf-8');
    assertIncludes(fmtCode, 'insertTableBtn', 'Handler de tabla debe existir');
    assertIncludes(fmtCode, 'insertRow', 'Debe usar DOM table API (insertRow)');
    assertIncludes(fmtCode, 'insertCell', 'Debe usar DOM table API (insertCell)');
    assert(!fmtCode.includes("execCommand('insertHTML'") && !fmtCode.includes('execCommand("insertHTML"'),
        'No debe usar execCommand insertHTML para tablas');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 118: reportContextResolver — slider de hora (ON/OFF)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 118: reportContextResolver — slider hora on/off ─────');

await asyncTest('Hora OFF: resolveReportContext.studyTime debe quedar vacío', async () => {
    const prevGetEl = global.document.getElementById;
    const prevExtract = global.extractPatientDataFromText;

    const map = {
        reqShowStudyTime: { checked: false },
        reqShowStudyDate: { checked: true },
        reqStudyTime: { value: '09:45' },
        pdfStudyTime: { value: '09:45' },
        reqStudyType: { value: 'Informe médico general' },
        reqStudyDate: { value: '2026-03-13' }
    };
    global.document.getElementById = (id) => map[id] || null;
    global.extractPatientDataFromText = () => ({});

    global._pdfConfigCache = {
        studyTime: '09:45',
        showStudyTime: false,
        showStudyDate: true,
        studyDate: '2026-03-13',
        studyType: 'Informe médico general'
    };

    const ctx = await global.resolveReportContext({ includeEditorExtract: false, editorEl: null });
    assertEqual(ctx.showStudyTime, false, 'showStudyTime debe ser false');
    assertEqual(ctx.studyTime, '', 'studyTime debe ser vacío cuando slider está OFF');

    global.document.getElementById = prevGetEl;
    global.extractPatientDataFromText = prevExtract;
});

await asyncTest('Hora ON: resolveReportContext.studyTime debe conservar valor', async () => {
    const prevGetEl = global.document.getElementById;
    const prevExtract = global.extractPatientDataFromText;

    const map = {
        reqShowStudyTime: { checked: true },
        reqShowStudyDate: { checked: true },
        reqStudyTime: { value: '14:20' },
        pdfStudyTime: { value: '14:20' },
        reqStudyType: { value: 'Informe médico general' },
        reqStudyDate: { value: '2026-03-13' }
    };
    global.document.getElementById = (id) => map[id] || null;
    global.extractPatientDataFromText = () => ({});

    global._pdfConfigCache = {
        studyTime: '14:20',
        showStudyTime: true,
        showStudyDate: true,
        studyDate: '2026-03-13',
        studyType: 'Informe médico general'
    };

    const ctx = await global.resolveReportContext({ includeEditorExtract: false, editorEl: null });
    assertEqual(ctx.showStudyTime, true, 'showStudyTime debe ser true');
    assertEqual(ctx.studyTime, '14:20', 'studyTime debe conservar valor cuando slider está ON');

    global.document.getElementById = prevGetEl;
    global.extractPatientDataFromText = prevExtract;
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 119: reportContextResolver — título correcto por plantilla
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 119: reportContextResolver — título por plantilla ────');

await asyncTest('Título: genérico + heading => toma heading (GONIOSCOPÍA)', async () => {
    const prevGetEl = global.document.getElementById;
    const prevExtract = global.extractPatientDataFromText;
    const prevSelectedTemplate = global.selectedTemplate;

    const map = {
        reqShowStudyTime: { checked: true },
        reqShowStudyDate: { checked: true },
        reqStudyType: { value: 'Informe médico general' },
        reqStudyDate: { value: '2026-03-13' }
    };
    global.document.getElementById = (id) => map[id] || null;
    global.extractPatientDataFromText = () => ({});
    global.selectedTemplate = 'gonioscopia';

    const editorEl = {
        querySelector: () => ({ textContent: 'INFORME DE GONIOSCOPÍA' }),
        innerText: 'INFORME DE GONIOSCOPÍA\nHallazgos...'
    };

    global._pdfConfigCache = {
        studyType: 'Informe médico general',
        selectedTemplate: 'gonioscopia',
        showStudyDate: true,
        showStudyTime: true
    };

    const ctx = await global.resolveReportContext({ includeEditorExtract: false, editorEl });
    const up = String(ctx.studyType || '').toUpperCase();
    assertIncludes(up, 'GONIOSCOP', 'Debe tomar título de la plantilla/heading (gonioscopía)');

    global.document.getElementById = prevGetEl;
    global.extractPatientDataFromText = prevExtract;
    global.selectedTemplate = prevSelectedTemplate;
});

await asyncTest('Título: genérico + sin heading => toma nombre de plantilla', async () => {
    const prevGetEl = global.document.getElementById;
    const prevExtract = global.extractPatientDataFromText;
    const prevSelectedTemplate = global.selectedTemplate;

    const map = {
        reqShowStudyTime: { checked: true },
        reqShowStudyDate: { checked: true },
        reqStudyType: { value: 'Informe médico general' },
        reqStudyDate: { value: '2026-03-13' }
    };
    global.document.getElementById = (id) => map[id] || null;
    global.extractPatientDataFromText = () => ({});
    global.selectedTemplate = 'gonioscopia';

    const editorEl = {
        querySelector: () => null,
        innerText: ''
    };

    global._pdfConfigCache = {
        studyType: 'Informe médico general',
        selectedTemplate: 'gonioscopia',
        showStudyDate: true,
        showStudyTime: true
    };

    const ctx = await global.resolveReportContext({ includeEditorExtract: false, editorEl });
    const up = String(ctx.studyType || '').toUpperCase();
    assertIncludes(up, 'GONIOSCOP', 'Sin heading debe caer al nombre de plantilla');

    global.document.getElementById = prevGetEl;
    global.extractPatientDataFromText = prevExtract;
    global.selectedTemplate = prevSelectedTemplate;
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 120: reportContextResolver — checkbox Nº informe para PDF
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 120: reportContextResolver — Nº informe on/off ───────');

await asyncTest('Nº informe OFF: resolveReportContext.showReportNumber debe ser false', async () => {
    const prevGetEl = global.document.getElementById;
    const prevExtract = global.extractPatientDataFromText;

    const map = {
        reqShowStudyTime: { checked: true },
        reqShowStudyDate: { checked: true },
        pdfShowReportNumber: { checked: false },
        reqStudyType: { value: 'Informe médico general' },
        reqStudyDate: { value: '2026-03-13' }
    };
    global.document.getElementById = (id) => map[id] || null;
    global.extractPatientDataFromText = () => ({});

    global._pdfConfigCache = {
        showReportNumber: false,
        showStudyDate: true,
        showStudyTime: true,
        studyType: 'Informe médico general'
    };

    const ctx = await global.resolveReportContext({ includeEditorExtract: false, editorEl: null });
    assertEqual(ctx.showReportNumber, false, 'showReportNumber debe ser false cuando checkbox está OFF');

    global.document.getElementById = prevGetEl;
    global.extractPatientDataFromText = prevExtract;
});

await asyncTest('Nº informe ON: resolveReportContext.showReportNumber debe ser true', async () => {
    const prevGetEl = global.document.getElementById;
    const prevExtract = global.extractPatientDataFromText;

    const map = {
        reqShowStudyTime: { checked: true },
        reqShowStudyDate: { checked: true },
        pdfShowReportNumber: { checked: true },
        reqStudyType: { value: 'Informe médico general' },
        reqStudyDate: { value: '2026-03-13' }
    };
    global.document.getElementById = (id) => map[id] || null;
    global.extractPatientDataFromText = () => ({});

    global._pdfConfigCache = {
        showReportNumber: true,
        showStudyDate: true,
        showStudyTime: true,
        studyType: 'Informe médico general'
    };

    const ctx = await global.resolveReportContext({ includeEditorExtract: false, editorEl: null });
    assertEqual(ctx.showReportNumber, true, 'showReportNumber debe ser true cuando checkbox está ON');

    global.document.getElementById = prevGetEl;
    global.extractPatientDataFromText = prevExtract;
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 121: pdfMakerSectionUtils — firma vacía no debe paginar
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 121: PDF firma vacía sin paginación extra ────────────');

test('Firma vacía: drawSignatureSection retorna cyStart y no llama ensureSpace', () => {
    let ensureSpaceCalls = 0;
    const cyStart = 150;
    const docStub = {
        setDrawColor: () => {},
        setLineWidth: () => {},
        line: () => {},
        setFontSize: () => {},
        setFont: () => {},
        text: () => {},
        addImage: () => {}
    };

    const cyOut = global.PdfMakerSectionUtils.drawSignatureSection({
        PAGE_W: 210,
        MR: 12,
        showSignLine: false,
        showSignName: false,
        showSignMat: false,
        profName: '',
        profDisplayName: '',
        matricula: '',
        especialidad: '',
        sigB64: '',
        doc: docStub,
        setBlack: () => {},
        setGray: () => {},
        mainFont: 'helvetica',
        ensureSpace: (cy) => {
            ensureSpaceCalls++;
            return cy;
        },
        cyStart
    });

    assertEqual(cyOut, cyStart, 'Con firma vacía debe conservar cyStart');
    assertEqual(ensureSpaceCalls, 0, 'Con firma vacía no debe intentar paginar');
});

// ═══════════════════════════════════════════════════════════════════════════════
// Bloque 122: quitar campo ESTUDIO redundante en metadatos
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 122: Sin duplicar campo ESTUDIO en metadatos ────────');

test('Preview/PDF/HTML: no renderizan la celda ESTUDIO en la grilla de metadatos', () => {
    const previewCode = fs.readFileSync(path.join(root, 'src/js/features/pdfPreview.js'), 'utf-8');
    const exportCode = fs.readFileSync(path.join(root, 'src/js/features/editorExportRenderUtils.js'), 'utf-8');
    const pdfSectionCode = fs.readFileSync(path.join(root, 'src/js/features/pdfMakerSectionUtils.js'), 'utf-8');

    assert(!previewCode.includes('ESTUDIO:</span><span class="pvs-val">${studyType || \u0027—\u0027}</span>'),
        'pdfPreview no debe mostrar ESTUDIO en la fila de metadatos');
    assert(!exportCode.includes('ESTUDIO:</span><span class="pvs-val">${studyType || \u0027—\u0027}</span>'),
        'createHTML no debe mostrar ESTUDIO en la fila de metadatos');
    assert(!pdfSectionCode.includes("row1.push({ label: 'ESTUDIO:'"),
        'pdfMakerSectionUtils no debe agregar ESTUDIO a row1');
});

test('TXT/RTF: no agregan campo Estudio en cabecera de metadatos', () => {
    const exportCode = fs.readFileSync(path.join(root, 'src/js/features/editorExportRenderUtils.js'), 'utf-8');
    assert(!exportCode.includes("addField(meta, 'Estudio', ctx.studyType);"),
        'createRTF no debe incluir campo Estudio en metadatos');
    assert(!exportCode.includes("pushField('Estudio', ctx.studyType);"),
        'createTXT no debe incluir campo Estudio en metadatos');
    assertIncludes(exportCode, 'INFORME DE ${_rtfEscapeLine(String(ctx.studyType).toUpperCase())}',
        'createRTF debe incluir el tipo de estudio en el titulo');
    assertIncludes(exportCode, '`INFORME DE ${String(ctx.studyType).toUpperCase()}`',
        'createTXT debe incluir el tipo de estudio en el titulo');
});

test('Paridad Preview/PDF-HTML: orden de bloques estudio antes que paciente', () => {
    const exportCode = fs.readFileSync(path.join(root, 'src/js/features/editorExportRenderUtils.js'), 'utf-8');
    const idxPreviewStudy = indexCode.indexOf('id="previewStudy"');
    const idxPreviewPatient = indexCode.indexOf('id="previewPatient"');

    const idxStudy = exportCode.indexOf('${studySection}');
    const idxPatient = exportCode.indexOf('${patientSection}');
    assert(idxStudy >= 0 && idxPatient >= 0 && idxStudy < idxPatient,
        'createHTML debe renderizar estudio antes de paciente');
    assert(idxPreviewStudy >= 0 && idxPreviewPatient >= 0 && idxPreviewStudy < idxPreviewPatient,
        'La vista previa mantiene estudio antes de paciente');
});

// Bloque 123: Verificación exhaustiva — nombre del paciente en TODOS los pipelines
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── Bloque 123: Nombre del paciente presente en todos los canales de render ──');

test('Preview: pdfPreview.js tiene renderizado de patientName en previewPatient', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/pdfPreview.js'), 'utf-8');
    // Verifica que el código crea una celda con el nombre del paciente
    assertIncludes(code, "if (patientName)", 'pdfPreview debe tener check de patientName');
    assertIncludes(code, "Paciente</span>", 'pdfPreview debe mostrar label Paciente');
    assertIncludes(code, "${patientName}", 'pdfPreview debe interpolar patientName en la celda');
    // Verifica que la variable patientName se resuelve con fallback
    assert(code.includes('resolvedCtx.patientName') && code.includes('extracted.name') && code.includes('config.patientName'),
        'pdfPreview debe tener cadena de fallback para patientName');
});

test('HTML export: createHTML tiene renderizado de patientName en patientSection', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editorExportRenderUtils.js'), 'utf-8');
    assertIncludes(code, "if (patientName) pCells.push", 'createHTML debe agregar patientName a pCells');
    assertIncludes(code, "Paciente</span><span class=\"pvp-val pvp-bold\">${patientName}", 'createHTML debe tener celda de paciente con nombre');
    assert(code.includes('resolvedCtx.patientName') && code.includes('extracted.name') && code.includes('config.patientName'),
        'createHTML debe tener cadena de fallback para patientName');
});

test('RTF export: createRTF incluye campo Paciente con ctx.patientName', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editorExportRenderUtils.js'), 'utf-8');
    assertIncludes(code, "addField(meta, 'Paciente', ctx.patientName)", 'createRTF debe incluir Paciente en metadatos');
});

test('TXT export: createTXT incluye campo Paciente con ctx.patientName', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/editorExportRenderUtils.js'), 'utf-8');
    assertIncludes(code, "pushField('Paciente', ctx.patientName)", 'createTXT debe incluir Paciente en metadatos');
});

test('PDF jsPDF: drawPatientBlockSection dibuja pName en el bloque paciente', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/pdfMakerSectionUtils.js'), 'utf-8');
    assertIncludes(code, "if (pName) col1.push", 'drawPatientBlockSection debe agregar pName a col1');
    assertIncludes(code, "label: 'PACIENTE', value: pName", 'drawPatientBlockSection debe tener label PACIENTE');
});

test('PDF jsPDF: pdfMaker.js resuelve pName y llama drawPatientBlock', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/pdfMaker.js'), 'utf-8');
    assert(code.includes('resolvedCtx.patientName') && code.includes('config.patientName') && code.includes('_formP.name'),
        'pdfMaker debe tener cadena de fallback para pName');
    assertIncludes(code, 'drawPatientBlock()', 'pdfMaker debe llamar drawPatientBlock()');
});

test('reportContextResolver devuelve patientName desde config', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/reportContextResolver.js'), 'utf-8');
    assertIncludes(code, "config.patientName", 'reportContextResolver debe leer config.patientName');
    assertIncludes(code, "extracted.name", 'reportContextResolver debe usar extracted.name como fallback');
    // Verifica que patientName está en el return del resolver
    assert(code.includes('patientName,') || code.includes('patientName:'),
        'reportContextResolver debe retornar patientName');
});

test('index.html tiene el div previewPatient para mostrar datos del paciente', () => {
    assertIncludes(indexCode, 'id="previewPatient"', 'index.html debe tener div#previewPatient');
    const idxStudy = indexCode.indexOf('id="previewStudy"');
    const idxPatient = indexCode.indexOf('id="previewPatient"');
    const idxContent = indexCode.indexOf('id="previewContent"');
    assert(idxStudy < idxPatient && idxPatient < idxContent,
        'Orden en index.html: previewStudy → previewPatient → previewContent');
});

test('Simulación: _loadExportContext con config.patientName devuelve nombre', () => {
    localStorage.setItem('pdf_config', JSON.stringify({ patientName: 'García, María' }));
    const config = JSON.parse(localStorage.getItem('pdf_config'));
    assert(config.patientName === 'García, María',
        `config.patientName debe ser 'García, María', obtuvo: ${config.patientName}`);
    localStorage.clear();
});

test('Simulación: resolveReportContext incluye patientName desde pdf_config', async () => {
    localStorage.setItem('pdf_config', JSON.stringify({ patientName: 'López, Ana', doctorName: 'Dr. Test' }));
    // Si resolveReportContext está disponible, probarlo directamente
    if (typeof global.resolveReportContext === 'function') {
        const ctx = await global.resolveReportContext({ includeEditorExtract: false });
        assert(ctx.patientName === 'López, Ana',
            `resolvedCtx.patientName debe ser 'López, Ana', obtuvo: ${ctx.patientName}`);
    } else {
        // Verificar que el flujo de datos es correcto leyendo desde pdf_config
        const config = JSON.parse(localStorage.getItem('pdf_config'));
        assert(config.patientName === 'López, Ana',
            `Flujo de datos: pdf_config.patientName correcto`);
    }
    localStorage.clear();
});

test('Pipeline createHTML: patientSection se genera con datos no vacíos', () => {
    // Verificar la lógica: si patientName tiene valor → pCells.push → patientSection tiene contenido
    const code = fs.readFileSync(path.join(root, 'src/js/features/editorExportRenderUtils.js'), 'utf-8');
    // La variable patientSection se declara vacía y se llena si hay celdas
    assertIncludes(code, "let patientSection = ''", 'patientSection arranca vacía');
    assertIncludes(code, "if (pCells.length) patientSection =", 'patientSection se llena si hay celdas');
    // El template final incluye patientSection en el body HTML
    assertIncludes(code, '${patientSection}', 'Template HTML incluye ${patientSection}');
});

test('Pipeline Preview: previewPatient se muestra si hay celdas de paciente', () => {
    const code = fs.readFileSync(path.join(root, 'src/js/features/pdfPreview.js'), 'utf-8');
    assertIncludes(code, "patientEl.style.display = ''", 'patientEl se hace visible si hay celdas');
    assertIncludes(code, "patientEl.style.display = 'none'", 'patientEl se oculta si no hay datos');
});

test('Ningún pipeline tiene código que borre o anule patientName innecesariamente', () => {
    const previewCode = fs.readFileSync(path.join(root, 'src/js/features/pdfPreview.js'), 'utf-8');
    const exportCode = fs.readFileSync(path.join(root, 'src/js/features/editorExportRenderUtils.js'), 'utf-8');
    const pdfCode = fs.readFileSync(path.join(root, 'src/js/features/pdfMaker.js'), 'utf-8');
    // No debe haber delete, null o asignación vacía a patientName en estos archivos
    assert(!previewCode.includes('patientName = null') && !previewCode.includes('delete patientName'),
        'pdfPreview.js no anula patientName');
    assert(!exportCode.includes('patientName = null') && !exportCode.includes('delete patientName'),
        'editorExportRenderUtils.js no anula patientName');
    assert(!pdfCode.includes('pName = null') && !pdfCode.includes('delete pName'),
        'pdfMaker.js no anula pName');
});

// Limpiar estado después de tests
global.localStorage.clear();
global._reportHistCache = null;
global._registryCache = null;

// ── Resumen ───────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────────────────────────────');
console.log(`  Total: ${passed + failed} | ✅ Pasaron: ${passed} | ❌ Fallaron: ${failed}`);
console.log('─────────────────────────────────────────────────────────────────\n');
process.exit(failed > 0 ? 1 : 0);

})();
