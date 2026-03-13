#!/usr/bin/env node
/*
 * Release verify pipeline:
 * 1) Build + full local tests
 * 2) Local E2E against dist served in localhost
 * 3) Optional push to origin/main
 * 4) Remote smoke
 * 5) Remote E2E with propagation retries
 *
 * Usage:
 *   node scripts/release-verify.js
 *   node scripts/release-verify.js --with-push
 *   node scripts/release-verify.js --remote-url https://transcriptorpro.github.io/transcripcion/
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const isWin = process.platform === 'win32';

function parseArgs(argv) {
    const args = {
        withPush: false,
        skipBuild: false,
        skipLocal: false,
        skipRemote: false,
        localPort: 4173,
        localUrl: '',
        remoteUrl: 'https://transcriptorpro.github.io/transcripcion/',
        remoteRetries: 3,
        retryDelayMs: 60000
    };

    for (let i = 0; i < argv.length; i += 1) {
        const a = argv[i];
        if (a === '--with-push') args.withPush = true;
        else if (a === '--skip-build') args.skipBuild = true;
        else if (a === '--skip-local') args.skipLocal = true;
        else if (a === '--skip-remote') args.skipRemote = true;
        else if (a === '--local-port') args.localPort = Number(argv[++i] || 4173);
        else if (a === '--local-url') args.localUrl = String(argv[++i] || '');
        else if (a === '--remote-url') args.remoteUrl = String(argv[++i] || args.remoteUrl);
        else if (a === '--remote-retries') args.remoteRetries = Math.max(1, Number(argv[++i] || 3));
        else if (a === '--retry-delay-ms') args.retryDelayMs = Math.max(1000, Number(argv[++i] || 60000));
    }

    if (!args.localUrl) args.localUrl = `http://127.0.0.1:${args.localPort}/`;
    return args;
}

function runCmd(cmd, cmdArgs, envExtra, title) {
    console.log(`\n[STEP] ${title}`);
    const res = spawnSync(cmd, cmdArgs, {
        stdio: 'inherit',
        env: { ...process.env, ...(envExtra || {}) }
    });
    if (res.error) {
        throw new Error(`${title} failed: ${res.error.message}`);
    }
    if (res.status !== 0) {
        const suffix = res.signal ? ` (signal ${res.signal})` : '';
        throw new Error(`${title} failed with exit code ${res.status}${suffix}`);
    }
}

function runCmdAsync(cmd, cmdArgs, envExtra, title) {
    console.log(`\n[STEP] ${title}`);
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, cmdArgs, {
            stdio: 'inherit',
            env: { ...process.env, ...(envExtra || {}) }
        });

        child.on('error', (err) => reject(new Error(`${title} failed: ${err.message}`)));
        child.on('close', (code, signal) => {
            if (code === 0) return resolve();
            const suffix = signal ? ` (signal ${signal})` : '';
            reject(new Error(`${title} failed with exit code ${code}${suffix}`));
        });
    });
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function contentTypeByExt(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.html') return 'text/html; charset=utf-8';
    if (ext === '.js') return 'application/javascript; charset=utf-8';
    if (ext === '.css') return 'text/css; charset=utf-8';
    if (ext === '.json') return 'application/json; charset=utf-8';
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.svg') return 'image/svg+xml';
    if (ext === '.ico') return 'image/x-icon';
    if (ext === '.webmanifest') return 'application/manifest+json; charset=utf-8';
    return 'application/octet-stream';
}

function startLocalDistServer(port) {
    const distRoot = path.resolve(process.cwd(), 'dist');
    const server = http.createServer((req, res) => {
        try {
            const rawUrl = String(req.url || '/').split('?')[0];
            const normalized = rawUrl === '/' ? '/index.html' : rawUrl;
            const safePath = path.normalize(decodeURIComponent(normalized)).replace(/^([\\/])+/, '');
            const absPath = path.resolve(distRoot, safePath);
            if (!absPath.startsWith(distRoot)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }

            fs.readFile(absPath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('Not found');
                    return;
                }
                res.writeHead(200, {
                    'Content-Type': contentTypeByExt(absPath),
                    'Cache-Control': 'no-store'
                });
                res.end(data);
            });
        } catch (_) {
            res.writeHead(500);
            res.end('Server error');
        }
    });

    return new Promise((resolve, reject) => {
        server.on('error', reject);
        server.listen(port, '127.0.0.1', () => resolve(server));
    });
}

function ensureCleanForPush() {
    const status = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
    if (status.status !== 0) {
        throw new Error('git status failed');
    }
    if ((status.stdout || '').trim()) {
        throw new Error('Working tree is not clean. Commit before --with-push.');
    }
}

async function runRemoteE2EWithRetry(remoteUrl, retries, retryDelayMs) {
    for (let i = 1; i <= retries; i += 1) {
        const cbUrl = `${remoteUrl}${remoteUrl.includes('?') ? '&' : '?'}cb=${Date.now()}_${i}`;
        console.log(`\n[STEP] Remote E2E attempt ${i}/${retries} (${cbUrl})`);
        const res = spawnSync('node', ['tests/e2e-full-qa-playwright.js'], {
            stdio: 'inherit',
            env: { ...process.env, APP_URL: cbUrl }
        });
        if (res.status === 0) return;
        if (i < retries) {
            console.log(`[INFO] Remote E2E failed. Waiting ${Math.round(retryDelayMs / 1000)}s for propagation...`);
            await wait(retryDelayMs);
        }
    }
    throw new Error('Remote E2E failed after all retries');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    let server = null;

    try {
        if (!args.skipBuild) runCmd('node', ['build.js'], null, 'Build dist');
        runCmd('node', ['tests/run_tests.js'], null, 'Run full regression tests');

        if (!args.skipLocal) {
            console.log(`\n[STEP] Start local dist server on ${args.localUrl}`);
            server = await startLocalDistServer(args.localPort);

            await runCmdAsync('node', ['tests/e2e-full-qa-playwright.js'], { APP_URL: args.localUrl }, 'Run local E2E against dist');
        }

        if (args.withPush) {
            ensureCleanForPush();
            runCmd('git', ['push', 'origin', 'main'], null, 'Push main to origin');
        }

        if (!args.skipRemote) {
            runCmd('node', ['tests/smoke-postdeploy-version.js'], { APP_URL: args.remoteUrl }, 'Run remote postdeploy smoke');
            await runRemoteE2EWithRetry(args.remoteUrl, args.remoteRetries, args.retryDelayMs);
        }

        console.log('\n[DONE] Release verification pipeline completed successfully.');
    } finally {
        if (server && typeof server.close === 'function') {
            await new Promise((resolve) => server.close(resolve));
        }
    }
}

main().catch((err) => {
    console.error(`\n[FAIL] ${err.message}`);
    process.exit(1);
});
