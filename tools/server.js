import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT) || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

async function resolveFilePath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  const filePath = normalize(join(ROOT, decodedPath));

  if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
    return null;
  }

  const info = await stat(filePath).catch(() => null);
  if (!info) {
    return null;
  }

  return info.isDirectory() ? join(filePath, 'index.html') : filePath;
}

function sendNotFound(response) {
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Not found');
}

async function handleRequest(request, response) {
  const filePath = await resolveFilePath(request.url).catch(() => null);
  const content = filePath ? await readFile(filePath).catch(() => null) : null;

  if (!content) {
    sendNotFound(response);
    return;
  }

  response.writeHead(200, {
    'Content-Type': MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  response.end(content);
}

createServer(handleRequest).listen(PORT, () => {
  console.log(`Duel of Fates running at http://localhost:${PORT}`);
});
