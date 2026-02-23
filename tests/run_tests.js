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
global.askJoinAudiosPromise = async () => false;
global.GROQ_API_KEY      = null;
global.fetch             = async () => {};
global.selectedTemplate  = undefined;
global.document          = { getElementById: () => null, querySelectorAll: () => [] };
global.extractPatientDataFromText = () => ({});
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

load('src/js/config/templates.js');
load('src/js/features/structurer.js');
load('src/js/features/patientRegistry.js');

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
    // Usar ids manuales para evitar colisión de Date.now() en la misma ms
    localStorage.setItem('struct_pending_queue', JSON.stringify([
        { id: 2001, text: 'a conservar', templateKey: 'generico', savedAt: '1/1/2026', preview: 'a conservar' },
        { id: 2000, text: 'a eliminar',  templateKey: 'generico', savedAt: '1/1/2026', preview: 'a eliminar'  }
    ]));
    global.removeFromStructurePendingQueue(2000);
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

// ── Resumen ───────────────────────────────────────────────────────────────────
console.log('\n─────────────────────────────────────────────────────────────────');
console.log(`  Total: ${passed + failed} | ✅ Pasaron: ${passed} | ❌ Fallaron: ${failed}`);
console.log('─────────────────────────────────────────────────────────────────\n');
process.exit(failed > 0 ? 1 : 0);

})();
