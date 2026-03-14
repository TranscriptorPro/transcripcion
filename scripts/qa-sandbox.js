#!/usr/bin/env node
/*
 * QA sandbox launcher
 * - Levanta servidor estatico sin cache
 * - Abre pagina de prueba visual al instante
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const root = path.join(__dirname, '..');
const argPage = process.argv.find((a) => a.startsWith('--page='));
const page = (argPage ? argPage.split('=')[1] : 'sandbox').toLowerCase();
const port = Number(process.env.QA_PORT || 4174);

const pages = {
  sandbox: '/tests/test-report-sandbox.html',
  preview: '/tests/test-preview-visual.html',
  manual: '/tests/test-manual-preview.html'
};

const targetPath = pages[page] || pages.sandbox;
const targetUrl = `http://localhost:${port}${targetPath}`;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
};

function normalizeUrlPath(urlPath) {
  const noQuery = String(urlPath || '/').split('?')[0].split('#')[0];
  const decoded = decodeURIComponent(noQuery);
  const safe = path.normalize(decoded).replace(/^([.][.][/\\])+/, '');
  return safe === '/' ? '/index.html' : safe;
}

function openBrowser(url) {
  const cmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) {
      console.log(`[qa] No se pudo abrir navegador automaticamente. URL: ${url}`);
    }
  });
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = normalizeUrlPath(req.url || '/');
    const filePath = path.join(root, urlPath);

    if (!filePath.startsWith(root)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (statErr, stats) => {
      if (statErr || !stats.isFile()) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const type = mimeTypes[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', type);
      // Sin cache para ver cambios inmediatamente con refresh.
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const stream = fs.createReadStream(filePath);
      stream.on('error', () => {
        res.statusCode = 500;
        res.end('Internal server error');
      });
      stream.pipe(res);
    });
  } catch (_) {
    res.statusCode = 500;
    res.end('Internal server error');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log('[qa] Servidor QA activo');
  console.log(`[qa] Pagina: ${targetPath}`);
  console.log(`[qa] URL: ${targetUrl}`);
  console.log('[qa] Tip: deja esta terminal abierta y usa F5 en el navegador tras cada cambio.');
  openBrowser(targetUrl);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
