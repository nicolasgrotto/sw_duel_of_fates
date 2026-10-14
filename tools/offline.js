import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const OFFLINE_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const RESOURCES_FILE = 'offline-resources.js';
export const WORKER_FILE = 'sw.js';

const ENTRY_FILES = ['index.html', 'manifest.webmanifest'];
const RESOURCE_DIRECTORIES = [
  { path: 'styles', extensions: ['.css'] },
  { path: 'assets/fonts', extensions: ['.ttf', '.woff', '.woff2'] },
  { path: 'assets/ui', extensions: ['.png'] },
  { path: 'src', extensions: ['.js'] },
];
const TEXT_EXTENSIONS = new Set(['.html', '.js', '.css', '.webmanifest', '.json']);

function listDirectory(root, directory, extensions) {
  const absolute = join(root, directory);
  return readdirSync(absolute).flatMap((name) => {
    const path = join(absolute, name);
    if (statSync(path).isDirectory()) return listDirectory(root, relative(root, path), extensions);
    return extensions.includes(extname(name)) ? [relative(root, path).split(sep).join('/')] : [];
  });
}

export function collectOfflineFiles(root = OFFLINE_ROOT) {
  const files = RESOURCE_DIRECTORIES.flatMap(({ path, extensions }) => listDirectory(root, path, extensions));
  return [...ENTRY_FILES, ...files.sort()];
}

function readForDigest(root, file) {
  const content = readFileSync(join(root, file));
  return TEXT_EXTENSIONS.has(extname(file)) ? Buffer.from(content.toString('utf8').replace(/\r\n/g, '\n')) : content;
}

export function computeOfflineVersion(root, files) {
  const hash = createHash('sha256');
  for (const file of [...files, WORKER_FILE]) {
    hash.update(file);
    hash.update('\0');
    hash.update(readForDigest(root, file));
    hash.update('\0');
  }
  return `v${hash.digest('hex').slice(0, 16)}`;
}

export function renderOfflineResources({ version, files }) {
  const lines = files.map((file) => `    '${file}',`);
  return ['self.offlineResources = {', `  version: '${version}',`, '  files: [', ...lines, '  ],', '};', ''].join('\n');
}

export function readOfflineResources(root = OFFLINE_ROOT) {
  const source = readFileSync(join(root, RESOURCES_FILE), 'utf8');
  const scope = {};
  new Function('self', source)(scope);
  return scope.offlineResources;
}

export function buildOfflineResources(root = OFFLINE_ROOT) {
  const files = collectOfflineFiles(root);
  return { version: computeOfflineVersion(root, files), files };
}

function main(mode) {
  const expected = renderOfflineResources(buildOfflineResources());
  if (mode === '--write') {
    writeFileSync(join(OFFLINE_ROOT, RESOURCES_FILE), expected);
    console.log(`${RESOURCES_FILE} updated`);
    return;
  }
  const current = readFileSync(join(OFFLINE_ROOT, RESOURCES_FILE), 'utf8').replace(/\r\n/g, '\n');
  if (current !== expected) {
    console.error(`${RESOURCES_FILE} is out of date: run npm run offline`);
    process.exitCode = 1;
    return;
  }
  console.log(`${RESOURCES_FILE} is up to date`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2] ?? '--check');
}
