// ═══════════════════════════════════════════════════════════════════
// server.js — a tiny, dependency-free static file server for the
// Zimelia frontend. In production you can instead deploy this folder
// to any static host (Netlify, Vercel, GitHub Pages, nginx, etc).
// ═══════════════════════════════════════════════════════════════════

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5173;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (filePath.endsWith('/')) filePath = path.join(filePath, 'index.html');
  if (!path.extname(filePath)) filePath = path.join(ROOT, 'index.html'); // simple SPA-ish fallback

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 — not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`🌸 Zimelia's frontend is online — http://localhost:${PORT}`);
});
