/**
 * Minimal static server for E2E fixture pages (content scripts match http/https only).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const port = Number(process.env.E2E_FIXTURE_PORT ?? 8765);

const server = http.createServer((req, res) => {
  const raw = req.url?.split('?')[0] ?? '/';
  const safe = raw === '/' ? '/index.html' : raw;
  const file = path.normalize(path.join(root, safe));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(data);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`e2e fixture server http://127.0.0.1:${port}`);
});
