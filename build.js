#!/usr/bin/env node
/**
 * Build script — Transcriptor Pro
 * ────────────────────────────────
 * Concatena todos los JS en orden, los minifica y ofusca con Terser,
 * y genera dist/index.html apuntando al bundle único.
 *
 * Uso:  node build.js
 * Resultado: carpeta dist/ lista para deploy (copiar a GitHub Pages)
 */

const fs   = require('fs');
const path = require('path');
const { minify } = require('terser');

// ─── Archivos JS en el orden exacto de carga de index.html ────────
const JS_FILES = [
    'src/js/utils/db.js',
    'src/js/config/config.js',
    'src/js/config/templates.js',
    'src/js/config/studyTerminology.js',
    'src/js/utils/dom.js',
    'src/js/utils/toast.js',
    'src/js/utils/ui.js',
    'src/js/utils/uiKeyboardShortcuts.js',
    'src/js/utils/uiAutosaveUtils.js',
    'src/js/utils/uiMultiTabUtils.js',
    'src/js/utils/uiApiManagementUtils.js',
    'src/js/utils/uiProfessionalUtils.js',
    'src/js/utils/tabsIndexUtils.js',
    'src/js/utils/tabs.js',
    'src/js/utils/stateManager.js',
    'src/js/core/state.js',
    'src/js/core/audio.js',
    'src/js/features/editor.js',
    'src/js/features/transcriptor.js',
    'src/js/features/structurer.js',
    'src/js/features/medDictionary.js',
    'src/js/features/contact.js',
    'src/js/features/diagnostic.js',
    'src/js/features/licenseCacheUtils.js',
    'src/js/features/licenseManager.js',
    'src/js/features/patientRegistry.js',
    'src/js/features/formHandler.js',
    'src/js/features/themeManager.js',
    'src/js/features/settingsThemeUtils.js',
    'src/js/features/settingsThemeSectionUtils.js',
    'src/js/features/settingsModalWatchUtils.js',
    'src/js/features/settingsModalShellUtils.js',
    'src/js/features/settingsAccountUtils.js',
    'src/js/features/settingsApiUtils.js',
    'src/js/features/settingsWorkplaceUtils.js',
    'src/js/features/settingsQuickProfilesUtils.js',
    'src/js/features/settingsEditorPrefsUtils.js',
    'src/js/features/settingsToolsLinksUtils.js',
    'src/js/features/settingsBackupUtils.js',
    'src/js/features/settingsBackupActionsUtils.js',
    'src/js/features/settingsModalPopulateUtils.js',
    'src/js/features/settingsModalActionsUtils.js',
    'src/js/features/settingsPanel.js',
    'src/js/features/pricingCart.js',
    'src/js/features/business.js',
    'src/js/features/sessionAssistant.js',
    'src/js/features/outputProfiles.js',
    'src/js/features/pdfDataAccessUtils.js',
    'src/js/features/pdfPreview.js',
    'src/js/features/pdfMaker.js',
    'src/js/features/reportHistoryPolicyUtils.js',
    'src/js/features/reportHistory.js',
    'src/js/features/userGuide.js',
];

// ─── Archivos CSS ─────────────────────────────────────────────────
const CSS_FILES = [
    'src/css/variables.css',
    'src/css/base.css',
    'src/css/layout.css',
    'src/css/components.css',
    'src/css/preview-print.css',
    'src/css/animations.css',
];

const DIST = path.join(__dirname, 'dist');

async function build() {
    console.log('🔨 Transcriptor Pro — Build de producción\n');

    // 1. Crear dist/
    if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
    fs.mkdirSync(DIST, { recursive: true });

    // 2. Concatenar JS
    console.log('📦 Concatenando', JS_FILES.length, 'archivos JS...');
    let combined = '';
    for (const f of JS_FILES) {
        const code = fs.readFileSync(path.join(__dirname, f), 'utf8');
        combined += `\n;\n// ═══ ${f} ═══\n${code}\n`;
    }

    // 3. Minificar + ofuscar
    console.log('🔐 Minificando y ofuscando...');
    const result = await minify(combined, {
        compress: {
            drop_console: false,     // mantener console.info para debug en producción
            drop_debugger: true,
            passes: 2,
            dead_code: true,
            conditionals: true,
            evaluate: true,
        },
        mangle: {
            toplevel: false,         // no renombrar globals (window.X necesarios)
            properties: false,       // no renombrar propiedades (DOM IDs)
        },
        format: {
            comments: false,
            ascii_only: true,
        },
        sourceMap: false,
    });

    if (result.error) {
        console.error('❌ Error de minificación:', result.error);
        process.exit(1);
    }

    const bundleName = `app.${Date.now().toString(36)}.min.js`;
    fs.writeFileSync(path.join(DIST, bundleName), result.code, 'utf8');

    const origSize = Buffer.byteLength(combined, 'utf8');
    const minSize  = Buffer.byteLength(result.code, 'utf8');
    console.log(`   Original: ${(origSize/1024).toFixed(0)} KB → Minificado: ${(minSize/1024).toFixed(0)} KB (${((1-minSize/origSize)*100).toFixed(0)}% reducción)`);

    // 4. Concatenar CSS
    console.log('🎨 Concatenando CSS...');
    let cssBundle = '';
    for (const f of CSS_FILES) {
        cssBundle += fs.readFileSync(path.join(__dirname, f), 'utf8') + '\n';
    }
    // Minificar CSS (básico: quitar comentarios, espacios extra)
    cssBundle = cssBundle
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,>+~])\s*/g, '$1')
        .replace(/;}/g, '}')
        .trim();
    const cssBundleName = `app.${Date.now().toString(36)}.min.css`;
    fs.writeFileSync(path.join(DIST, cssBundleName), cssBundle, 'utf8');

    // 5. Procesar index.html
    console.log('📄 Generando index.html...');
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

    // Reemplazar todas las etiquetas <script src="src/js/..."> por una sola
    // Encontrar el bloque de scripts
    const scriptRegex = /\s*<script src="src\/js\/[^"]+"><\/script>/g;
    let firstMatch = true;
    html = html.replace(scriptRegex, (match) => {
        if (firstMatch) {
            firstMatch = false;
            return `\n        <script src="${bundleName}"></script>`;
        }
        return ''; // eliminar los demás
    });

    // Reemplazar links CSS individuales por uno solo
    const cssRegex = /\s*<link rel="stylesheet" href="src\/css\/[^"]+"\/?>/g;
    let firstCss = true;
    html = html.replace(cssRegex, (match) => {
        if (firstCss) {
            firstCss = false;
            return `\n        <link rel="stylesheet" href="${cssBundleName}">`;
        }
        return '';
    });

    // Limpiar comentarios HTML de secciones (<!-- Configuration & Utils --> etc.)
    html = html.replace(/\s*<!-- Configuration & Utils -->/g, '');
    html = html.replace(/\s*<!-- Core Logic -->/g, '');
    html = html.replace(/\s*<!-- Features -->/g, '');

    fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');

    // 6. Copiar assets necesarios
    console.log('📁 Copiando archivos estáticos...');
    const staticFiles = ['manifest.json', 'sw.js'];
    for (const f of staticFiles) {
        if (fs.existsSync(path.join(__dirname, f))) {
            fs.copyFileSync(path.join(__dirname, f), path.join(DIST, f));
        }
    }

    // Copiar carpeta assets/
    if (fs.existsSync(path.join(__dirname, 'assets'))) {
        copyDirSync(path.join(__dirname, 'assets'), path.join(DIST, 'assets'));
    }

    // Copiar skins CSS (cargados dinámicamente por ThemeManager)
    if (fs.existsSync(path.join(__dirname, 'src', 'css', 'skins'))) {
        copyDirSync(path.join(__dirname, 'src', 'css', 'skins'), path.join(DIST, 'src', 'css', 'skins'));
    }

    // Copiar recursos/ (admin.html, login, registro)
    if (fs.existsSync(path.join(__dirname, 'recursos'))) {
        copyDirSync(path.join(__dirname, 'recursos'), path.join(DIST, 'recursos'));
    }

    // Actualizar SW para que cachee el bundle en vez de los archivos individuales
    let sw = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
    // Reemplazar lista de archivos JS/CSS individuales por los bundles
    sw = sw.replace(
        /const PRECACHE_URLS\s*=\s*\[[\s\S]*?\];/,
        `const PRECACHE_URLS = [\n    './',\n    './index.html',\n    './${bundleName}',\n    './${cssBundleName}',\n    './manifest.json'\n];`
    );
    fs.writeFileSync(path.join(DIST, 'sw.js'), sw, 'utf8');

    console.log('\n✅ Build completado en dist/');
    console.log(`   📦 ${bundleName} (${(minSize/1024).toFixed(0)} KB)`);
    console.log(`   🎨 ${cssBundleName}`);
    console.log(`   📄 index.html`);
    console.log('\n💡 Para deploy: copiar contenido de dist/ a tu rama de GitHub Pages');
}

function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirSync(s, d);
        } else {
            fs.copyFileSync(s, d);
        }
    }
}

build().catch(err => {
    console.error('❌ Build fallido:', err);
    process.exit(1);
});
