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

const msg = process.argv[2] || `deploy ${new Date().toISOString().slice(0,16).replace('T',' ')}`;

console.log('\n🚀 Transcriptor Pro — Deploy rápido\n' + '─'.repeat(40));

run('node tests/run_tests.js', 'Tests');
run('node build.js',           'Build');
run('git add -A',              'Git add');
run(`git commit -m "${msg.replace(/"/g, "'")}"`, 'Commit');
run('git push origin main',    'Push → main (GitHub Pages)');

console.log('\n✅ Listo. En ~1 min se actualiza: https://transcriptorpro.github.io/transcripcion/\n');
