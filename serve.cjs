// Servidor estático para TutorApp con fallback SPA (history mode).
// Uso:  node serve.cjs
// Variables opcionales:  HOST=0.0.0.0  PORT=3000
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, 'dist');
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = path.join(ROOT, urlPath);

  // Evitar path traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('403 Forbidden'); return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isFile()) {
      sendFile(res, filePath);
      return;
    }
    // Fallback SPA: cualquier ruta desconocida -> index.html
    sendFile(res, path.join(ROOT, 'index.html'));
  });
});

server.listen(PORT, HOST, () => {
  console.log(`TutorApp sirviendo dist/ en http://localhost:${PORT}`);
  if (HOST === '0.0.0.0') {
    // Al escuchar en toda la red, mostramos las IPs locales para abrir desde el celular.
    for (const name of Object.keys(os.networkInterfaces())) {
      for (const net of os.networkInterfaces()[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`  Desde el celular (misma Wi-Fi): http://${net.address}:${PORT}`);
        }
      }
    }
  }
  console.log('Fallback SPA activado (rutas como /login y /admin funcionan al recargar).');
});

// Mantener el proceso vivo aunque no haya peticiones
setInterval(() => {}, 1 << 30);
