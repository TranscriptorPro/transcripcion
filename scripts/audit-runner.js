#!/usr/bin/env node
/*
 * Audit runner for Transcriptor Pro
 * - Runs selected verification circuits
 * - Produces consolidated JSON report under reportes/
 *
 * Usage:
 *   node scripts/audit-runner.js --profile=quick
 *   node scripts/audit-runner.js --profile=full
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function parseArgs(argv) {
  const args = {
    profile: 'quick',
    port: 4180,
    skipBuild: false,
    outputDir: 'reportes'
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--profile=')) args.profile = a.split('=')[1] || 'quick';
    else if (a === '--profile') args.profile = String(argv[++i] || 'quick');
    else if (a.startsWith('--port=')) args.port = Number(a.split('=')[1] || 4180);
    else if (a === '--port') args.port = Number(argv[++i] || 4180);
    else if (a === '--skip-build') args.skipBuild = true;
    else if (a.startsWith('--output-dir=')) args.outputDir = a.split('=')[1] || 'reportes';
    else if (a === '--output-dir') args.outputDir = String(argv[++i] || 'reportes');
  }

  args.profile = String(args.profile || 'quick').toLowerCase();
  if (!['quick', 'full'].includes(args.profile)) args.profile = 'quick';
  if (!Number.isFinite(args.port) || args.port <= 0) args.port = 4180;
  return args;
}

function timestampTag() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
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
  return 'application/octet-stream';
}

function startLocalDistServer(distRoot, port) {
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

function runStep(step, envExtra) {
  return new Promise((resolve) => {
    const startMs = Date.now();
    const cmd = step.cmd;
    const args = step.args || [];

    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: false,
      env: { ...process.env, ...(envExtra || {}), ...(step.env || {}) }
    });

    child.on('error', (err) => {
      resolve({
        id: step.id,
        title: step.title,
        ok: false,
        exitCode: -1,
        durationMs: Date.now() - startMs,
        error: err.message
      });
    });

    child.on('close', (code) => {
      resolve({
        id: step.id,
        title: step.title,
        ok: code === 0,
        exitCode: code,
        durationMs: Date.now() - startMs
      });
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(__dirname, '..');
  const distRoot = path.join(root, 'dist');
  const outputDir = path.join(root, args.outputDir);
  const reportPath = path.join(outputDir, `AUDIT_RUN_${timestampTag()}_${args.profile}.json`);

  const stepsQuick = [
    { id: 'build', title: 'Build dist', cmd: 'node', args: ['build.js'] },
    { id: 'unit-regression', title: 'Regression suite', cmd: 'node', args: ['tests/run_tests.js'] },
    { id: 'e2e-admin-edit', title: 'E2E admin edit wizard', cmd: 'node', args: ['tests/e2e-admin-user-edit-wizard.js'] }
  ];

  const stepsFull = [
    ...stepsQuick,
    { id: 'e2e-full-local', title: 'E2E full QA local', cmd: 'node', args: ['tests/e2e-full-qa-playwright.js'] }
  ];

  let steps = args.profile === 'full' ? stepsFull : stepsQuick;
  if (args.skipBuild) {
    steps = steps.filter((s) => s.id !== 'build');
  }

  const report = {
    profile: args.profile,
    startedAt: new Date().toISOString(),
    appUrl: `http://127.0.0.1:${args.port}/`,
    steps: [],
    ok: false
  };

  let server = null;
  try {
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`[audit] Profile: ${args.profile}`);
    console.log(`[audit] Output: ${reportPath}`);

    // Build can run before server; the rest can reuse APP_URL.
    const buildStep = steps.find((s) => s.id === 'build');
    if (buildStep) {
      console.log(`\n[audit] STEP -> ${buildStep.title}`);
      const r = await runStep(buildStep);
      report.steps.push(r);
      if (!r.ok) throw new Error(`${buildStep.title} failed`);
    }

    console.log(`\n[audit] Starting local dist server at http://127.0.0.1:${args.port}/`);
    server = await startLocalDistServer(distRoot, args.port);

    const runOrder = steps.filter((s) => s.id !== 'build');
    for (const step of runOrder) {
      console.log(`\n[audit] STEP -> ${step.title}`);
      const r = await runStep(step, { APP_URL: `http://127.0.0.1:${args.port}/` });
      report.steps.push(r);
      if (!r.ok) throw new Error(`${step.title} failed`);
    }

    report.ok = true;
  } catch (err) {
    report.ok = false;
    report.error = err && err.message ? err.message : String(err);
    console.error(`\n[audit] FAIL: ${report.error}`);
  } finally {
    report.finishedAt = new Date().toISOString();
    report.totalMs = new Date(report.finishedAt).getTime() - new Date(report.startedAt).getTime();

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n[audit] Report saved: ${reportPath}`);

    if (server && typeof server.close === 'function') {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  process.exit(report.ok ? 0 : 1);
}

main();
