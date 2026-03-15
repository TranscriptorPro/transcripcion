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
        circuit: step.circuit || 'general',
        roleScope: step.roleScope || 'mixed',
        criticality: step.criticality || 'medium',
        tags: Array.isArray(step.tags) ? step.tags : [],
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
        circuit: step.circuit || 'general',
        roleScope: step.roleScope || 'mixed',
        criticality: step.criticality || 'medium',
        tags: Array.isArray(step.tags) ? step.tags : [],
        ok: code === 0,
        exitCode: code,
        durationMs: Date.now() - startMs
      });
    });
  });
}

function initBucketSummary() {
  return { total: 0, passed: 0, failed: 0, totalMs: 0 };
}

function summarizeBy(items, keyName) {
  const out = {};
  for (const item of items) {
    const key = String(item[keyName] || 'unknown');
    if (!out[key]) out[key] = initBucketSummary();
    out[key].total += 1;
    out[key].totalMs += Number(item.durationMs || 0);
    if (item.ok) out[key].passed += 1;
    else out[key].failed += 1;
  }
  return out;
}

function summarizeTags(items) {
  const out = {};
  for (const item of items) {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    for (const tag of tags) {
      const key = String(tag || 'unknown');
      if (!out[key]) out[key] = initBucketSummary();
      out[key].total += 1;
      out[key].totalMs += Number(item.durationMs || 0);
      if (item.ok) out[key].passed += 1;
      else out[key].failed += 1;
    }
  }
  return out;
}

function toSeconds(ms) {
  return (Number(ms || 0) / 1000).toFixed(1);
}

function computeReleaseGate(report) {
  const steps = Array.isArray(report.steps) ? report.steps : [];
  const criticalFailures = steps.filter((s) => s.criticality === 'critical' && !s.ok);
  const highFailures = steps.filter((s) => s.criticality === 'high' && !s.ok);
  return {
    ready: criticalFailures.length === 0 && highFailures.length === 0,
    criticalFailures: criticalFailures.length,
    highFailures: highFailures.length
  };
}

function buildFoda(report) {
  const steps = Array.isArray(report.steps) ? report.steps : [];
  const byTag = (report.summary && report.summary.byTag) || {};
  const failed = steps.filter((s) => !s.ok);
  const passed = steps.filter((s) => s.ok);
  const gate = computeReleaseGate(report);

  const fortalezas = [];
  if ((byTag['release-gate'] && byTag['release-gate'].failed === 0)) {
    fortalezas.push('Los checks de release-gate pasaron sin fallos.');
  }
  if ((byTag.e2e && byTag.e2e.passed > 0)) {
    fortalezas.push(`Se ejecutaron ${byTag.e2e.passed} circuitos E2E con resultado OK.`);
  }
  if ((byTag.business && byTag.business.failed === 0 && byTag.business.total > 0)) {
    fortalezas.push('Los circuitos de negocio ejecutados no mostraron fallas.');
  }
  if (fortalezas.length === 0 && passed.length > 0) {
    fortalezas.push(`${passed.length} paso(s) de auditoria finalizaron correctamente.`);
  }

  const debilidades = failed.map((s) => `${s.title} (${s.circuit}, criticidad ${s.criticality})`);
  if (debilidades.length === 0) {
    debilidades.push('No se detectaron debilidades en la corrida actual.');
  }

  const oportunidades = [
    'Extender el perfil full con circuitos de compra, upgrade y transferencias.',
    'Agregar tendencia historica por circuito para detectar regresiones tempranas.',
    'Usar el resumen por criticidad para definir SLA de correccion pre-release.'
  ];

  const amenazas = [];
  if (!gate.ready) {
    amenazas.push('Existen fallos de criticidad alta/critica: bloquear release hasta corregir.');
  }
  const slowStep = steps.slice().sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0))[0];
  if (slowStep && Number(slowStep.durationMs || 0) > 45000) {
    amenazas.push(`Tiempo elevado en ${slowStep.title} (${toSeconds(slowStep.durationMs)}s), riesgo de inestabilidad CI.`);
  }
  if (amenazas.length === 0) {
    amenazas.push('Sin amenazas de release detectadas en esta corrida.');
  }

  return { fortalezas, debilidades, oportunidades, amenazas, gate };
}

function buildMarkdownSummary(report) {
  const summary = report.summary || { totals: { total: 0, passed: 0, failed: 0, totalMs: 0 }, byCircuit: {} };
  const foda = report.foda || buildFoda(report);
  const lines = [];
  lines.push(`# Auditoria ${report.profile.toUpperCase()} — ${report.startedAt}`);
  lines.push('');
  lines.push(`- Estado general: ${report.ok ? 'OK' : 'FAIL'}`);
  lines.push(`- Release gate: ${foda.gate.ready ? 'APTO' : 'NO APTO'}`);
  lines.push(`- Pasos: ${summary.totals.passed}/${summary.totals.total} OK (${summary.totals.failed} fallos)`);
  lines.push(`- Duracion total: ${toSeconds(summary.totals.totalMs)}s`);
  lines.push('');

  lines.push('## Resumen por circuito');
  for (const [circuit, data] of Object.entries(summary.byCircuit || {})) {
    lines.push(`- ${circuit}: ${data.passed}/${data.total} OK, ${toSeconds(data.totalMs)}s`);
  }
  lines.push('');

  lines.push('## FODA');
  lines.push('### Fortalezas');
  for (const item of foda.fortalezas) lines.push(`- ${item}`);
  lines.push('### Debilidades');
  for (const item of foda.debilidades) lines.push(`- ${item}`);
  lines.push('### Oportunidades');
  for (const item of foda.oportunidades) lines.push(`- ${item}`);
  lines.push('### Amenazas');
  for (const item of foda.amenazas) lines.push(`- ${item}`);
  lines.push('');

  lines.push('## Detalle de pasos');
  for (const step of report.steps || []) {
    lines.push(`- [${step.ok ? 'OK' : 'FAIL'}] ${step.title} | circuito=${step.circuit} | rol=${step.roleScope} | crit=${step.criticality} | ${toSeconds(step.durationMs)}s`);
  }
  lines.push('');

  if (Array.isArray(report.failures) && report.failures.length > 0) {
    lines.push('## Fallos');
    for (const f of report.failures) {
      lines.push(`- ${f.title} (id=${f.id}, exit=${f.exitCode})`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function getAuditRunJsonFiles(outputDir) {
  let names = [];
  try {
    names = fs.readdirSync(outputDir);
  } catch (_) {
    return [];
  }
  return names
    .filter((n) => /^AUDIT_RUN_\d{8}_\d{6}_(quick|full)\.json$/i.test(n))
    .map((n) => path.join(outputDir, n))
    .sort();
}

function buildTrendData(outputDir) {
  const files = getAuditRunJsonFiles(outputDir);
  const runs = [];

  for (const f of files) {
    const data = safeReadJson(f);
    if (!data || !Array.isArray(data.steps)) continue;
    const inferredGateReady = (() => {
      if (data.releaseGate && typeof data.releaseGate.ready === 'boolean') return data.releaseGate.ready;
      const criticalOrHighFailures = data.steps.filter((s) => !s.ok && (s.criticality === 'critical' || s.criticality === 'high'));
      return criticalOrHighFailures.length === 0;
    })();
    const totals = (data.summary && data.summary.totals) || {
      total: data.steps.length,
      passed: data.steps.filter((s) => s.ok).length,
      failed: data.steps.filter((s) => !s.ok).length,
      totalMs: data.steps.reduce((acc, s) => acc + Number(s.durationMs || 0), 0)
    };

    runs.push({
      file: path.basename(f),
      profile: data.profile || 'unknown',
      startedAt: data.startedAt || null,
      finishedAt: data.finishedAt || null,
      ok: !!data.ok,
      releaseGateReady: inferredGateReady,
      totals,
      failedSteps: Array.isArray(data.failures) ? data.failures : [],
      byCircuit: (data.summary && data.summary.byCircuit) || {}
    });
  }

  runs.sort((a, b) => String(a.startedAt || '').localeCompare(String(b.startedAt || '')));

  const aggregate = {
    totalRuns: runs.length,
    okRuns: runs.filter((r) => r.ok).length,
    failedRuns: runs.filter((r) => !r.ok).length,
    releaseGateReadyRuns: runs.filter((r) => r.releaseGateReady).length,
    quickRuns: runs.filter((r) => r.profile === 'quick').length,
    fullRuns: runs.filter((r) => r.profile === 'full').length,
    totalDurationMs: runs.reduce((acc, r) => acc + Number((r.totals && r.totals.totalMs) || 0), 0)
  };

  const latest = runs.length > 0 ? runs[runs.length - 1] : null;
  const last5 = runs.slice(-5);
  const last5FailRate = last5.length > 0
    ? Number(((last5.filter((r) => !r.ok).length / last5.length) * 100).toFixed(1))
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    aggregate: {
      ...aggregate,
      avgDurationSec: runs.length > 0 ? Number((aggregate.totalDurationMs / runs.length / 1000).toFixed(1)) : 0,
      last5FailRatePct: last5FailRate
    },
    latest,
    runs
  };
}

function buildTrendMarkdown(trend) {
  const a = trend.aggregate || {};
  const latest = trend.latest;
  const lines = [];
  lines.push(`# Auditoria Trend — ${trend.generatedAt}`);
  lines.push('');
  lines.push(`- Corridas totales: ${a.totalRuns || 0}`);
  lines.push(`- Corridas OK: ${a.okRuns || 0}`);
  lines.push(`- Corridas FAIL: ${a.failedRuns || 0}`);
  lines.push(`- Release gate apto: ${a.releaseGateReadyRuns || 0}`);
  lines.push(`- Promedio de duracion: ${a.avgDurationSec || 0}s`);
  lines.push(`- Tasa de fallo ultimas 5: ${a.last5FailRatePct || 0}%`);
  lines.push('');

  if (latest) {
    lines.push('## Ultima corrida');
    lines.push(`- Archivo: ${latest.file}`);
    lines.push(`- Perfil: ${latest.profile}`);
    lines.push(`- Estado: ${latest.ok ? 'OK' : 'FAIL'}`);
    lines.push(`- Gate: ${latest.releaseGateReady ? 'APTO' : 'NO APTO'}`);
    lines.push(`- Pasos: ${(latest.totals && latest.totals.passed) || 0}/${(latest.totals && latest.totals.total) || 0}`);
    lines.push('');
  }

  lines.push('## Ultimas 10 corridas');
  const last10 = (trend.runs || []).slice(-10);
  for (const run of last10) {
    lines.push(`- ${run.startedAt || 'n/a'} | ${run.profile} | ${run.ok ? 'OK' : 'FAIL'} | gate=${run.releaseGateReady ? 'APTO' : 'NO APTO'} | pasos=${(run.totals && run.totals.passed) || 0}/${(run.totals && run.totals.total) || 0} | ${toSeconds((run.totals && run.totals.totalMs) || 0)}s`);
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function writeTrendArtifacts(outputDir) {
  const trend = buildTrendData(outputDir);
  const trendJsonPath = path.join(outputDir, 'AUDIT_TREND.json');
  const trendMdPath = path.join(outputDir, 'AUDIT_TREND.md');
  fs.writeFileSync(trendJsonPath, JSON.stringify(trend, null, 2), 'utf8');
  fs.writeFileSync(trendMdPath, buildTrendMarkdown(trend), 'utf8');
  return { trendJsonPath, trendMdPath, trend };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(__dirname, '..');
  const distRoot = path.join(root, 'dist');
  const outputDir = path.join(root, args.outputDir);
  const reportPath = path.join(outputDir, `AUDIT_RUN_${timestampTag()}_${args.profile}.json`);
  const reportMdPath = reportPath.replace(/\.json$/i, '.md');

  const stepsQuick = [
    {
      id: 'build',
      title: 'Build dist',
      cmd: 'node',
      args: ['build.js'],
      circuit: 'release',
      roleScope: 'mixed',
      criticality: 'critical',
      tags: ['build', 'release-gate']
    },
    {
      id: 'unit-regression',
      title: 'Regression suite',
      cmd: 'node',
      args: ['tests/run_tests.js'],
      circuit: 'core-regression',
      roleScope: 'mixed',
      criticality: 'critical',
      tags: ['regression', 'core', 'release-gate']
    },
    {
      id: 'e2e-admin-edit',
      title: 'E2E admin edit wizard',
      cmd: 'node',
      args: ['tests/e2e-admin-user-edit-wizard.js'],
      circuit: 'admin-management',
      roleScope: 'admin',
      criticality: 'high',
      tags: ['admin', 'crud']
    }
  ];

  const stepsFull = [
    ...stepsQuick,
    {
      id: 'e2e-full-local',
      title: 'E2E full QA local',
      cmd: 'node',
      args: ['tests/e2e-full-qa-playwright.js'],
      circuit: 'end-to-end-general',
      roleScope: 'mixed',
      criticality: 'critical',
      tags: ['e2e', 'core', 'release-gate']
    },
    {
      id: 'e2e-factory-clone',
      title: 'E2E factory clone matrix',
      cmd: 'node',
      args: ['tests/e2e-factory-clone.js'],
      circuit: 'factory-cloning',
      roleScope: 'admin',
      criticality: 'high',
      tags: ['e2e', 'business', 'clone-factory', 'plans']
    },
    {
      id: 'e2e-gift-clone-comprehensive',
      title: 'E2E gift clone comprehensive',
      cmd: 'node',
      args: ['tests/e2e-gift-clone-comprehensive.js'],
      circuit: 'gift-onboarding',
      roleScope: 'user',
      criticality: 'high',
      tags: ['e2e', 'gift', 'business', 'branding']
    },
    {
      id: 'gift-node-logic',
      title: 'Gift logic Node runner',
      cmd: 'node',
      args: ['tests/run-gift-e2e-node.js'],
      circuit: 'gift-onboarding',
      roleScope: 'user',
      criticality: 'high',
      tags: ['logic', 'gift', 'business']
    }
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
    const failedSteps = [];
    for (const step of runOrder) {
      console.log(`\n[audit] STEP -> ${step.title}`);
      const r = await runStep(step, { APP_URL: `http://127.0.0.1:${args.port}/` });
      report.steps.push(r);
      if (!r.ok) {
        failedSteps.push({ id: step.id, title: step.title, exitCode: r.exitCode });
        console.error(`[audit] STEP FAIL -> ${step.title} (exit=${r.exitCode})`);
      }
    }

    report.summary = {
      totals: {
        total: report.steps.length,
        passed: report.steps.filter((s) => s.ok).length,
        failed: report.steps.filter((s) => !s.ok).length,
        totalMs: report.steps.reduce((acc, s) => acc + Number(s.durationMs || 0), 0)
      },
      byCircuit: summarizeBy(report.steps, 'circuit'),
      byRoleScope: summarizeBy(report.steps, 'roleScope'),
      byCriticality: summarizeBy(report.steps, 'criticality'),
      byTag: summarizeTags(report.steps)
    };
    report.releaseGate = computeReleaseGate(report);
    report.foda = buildFoda(report);

    if (failedSteps.length > 0) {
      report.failures = failedSteps;
      throw new Error(`Audit completed with ${failedSteps.length} failed step(s)`);
    }

    report.ok = true;
  } catch (err) {
    report.ok = false;
    report.error = err && err.message ? err.message : String(err);
    console.error(`\n[audit] FAIL: ${report.error}`);
  } finally {
    report.finishedAt = new Date().toISOString();
    report.totalMs = new Date(report.finishedAt).getTime() - new Date(report.startedAt).getTime();

    if (!report.summary) {
      report.summary = {
        totals: {
          total: report.steps.length,
          passed: report.steps.filter((s) => s.ok).length,
          failed: report.steps.filter((s) => !s.ok).length,
          totalMs: report.steps.reduce((acc, s) => acc + Number(s.durationMs || 0), 0)
        },
        byCircuit: summarizeBy(report.steps, 'circuit'),
        byRoleScope: summarizeBy(report.steps, 'roleScope'),
        byCriticality: summarizeBy(report.steps, 'criticality'),
        byTag: summarizeTags(report.steps)
      };
    }
    if (!report.releaseGate) report.releaseGate = computeReleaseGate(report);
    if (!report.foda) report.foda = buildFoda(report);

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n[audit] Report saved: ${reportPath}`);

    const mdSummary = buildMarkdownSummary(report);
    fs.writeFileSync(reportMdPath, mdSummary, 'utf8');
    console.log(`[audit] Summary saved: ${reportMdPath}`);

    const trendResult = writeTrendArtifacts(outputDir);
    console.log(`[audit] Trend saved: ${trendResult.trendJsonPath}`);
    console.log(`[audit] Trend summary saved: ${trendResult.trendMdPath}`);

    if (server && typeof server.close === 'function') {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  process.exit(report.ok ? 0 : 1);
}

main();
