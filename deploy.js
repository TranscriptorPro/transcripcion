#!/usr/bin/env node
/**
 * deploy.js — Transcriptor Pro
 * Un solo comando para ver cambios en producción:
 *   node deploy.js
 *   node deploy.js "mensaje opcional"
 *   npm run deploy -- "mensaje opcional"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const run = (cmd, label) => {
    if (label) process.stdout.write(`\n▶ ${label}...\n`);
    try {
        execSync(cmd, { stdio: 'inherit', cwd: __dirname });
        return true;
    } catch (e) {
        process.stderr.write(`\n✖ Falló: ${label || cmd}\n`);
        process.exit(1);
    }
};

// ── Incrementar versión del Service Worker automáticamente ──────────────────
function bumpSwVersion() {
    const swPath = path.join(__dirname, 'sw.js');
    let content = fs.readFileSync(swPath, 'utf8');
    const match = content.match(/const CACHE_NAME\s*=\s*['"]transcriptor-pro-v(\d+)['"]/);
    if (!match) { console.warn('⚠️  No se encontró CACHE_NAME en sw.js'); return; }
    const newVersion = parseInt(match[1], 10) + 1;
    content = content.replace(
        /const CACHE_NAME\s*=\s*['"]transcriptor-pro-v\d+['"]/,
        `const CACHE_NAME   = 'transcriptor-pro-v${newVersion}'`
    );
    fs.writeFileSync(swPath, content, 'utf8');
    process.stdout.write(`\n▶ SW cache: v${match[1]} → v${newVersion}\n`);
}

const msg = process.argv[2] || `deploy ${new Date().toISOString().slice(0,16).replace('T',' ')}`;

console.log('\n🚀 Transcriptor Pro — Deploy rápido\n' + '─'.repeat(40));

run('node tests/run_tests.js', 'Tests');
bumpSwVersion();             // ← incrementa versión de cache ANTES del build
run('node build.js',           'Build');
run('git add -A',              'Git add');
run(`git commit -m "${msg.replace(/"/g, "'")}"`, 'Commit');
run('git push origin main',    'Push → main (GitHub Pages)');

console.log('\n✅ Listo. En ~1 min se actualiza: https://transcriptorpro.github.io/transcripcion/\n');
