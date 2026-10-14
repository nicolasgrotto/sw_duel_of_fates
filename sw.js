importScripts('offline-resources.js');

const CACHE_PREFIX = 'duel-of-fates-';
const CACHE_NAME = `${CACHE_PREFIX}${self.offlineResources.version}`;
const INDEX_FILE = 'index.html';
const SCRIPT_EXTENSION = '.js';
const HTML_TYPE = 'text/html';
const clientSafety = new Map();

function toScopeUrl(file) {
  return new URL(file, self.registration.scope).href;
}

async function fetchVerified(file) {
  const url = toScopeUrl(file);
  const response = await fetch(url, { cache: 'reload' });
  if (!response.ok) {
    throw new Error(`offline: ${file} answered ${response.status}`);
  }
  if (file.endsWith(SCRIPT_EXTENSION) && (response.headers.get('content-type') ?? '').includes(HTML_TYPE)) {
    throw new Error(`offline: ${file} answered HTML`);
  }
  return [url, response];
}

async function install() {
  try {
    const responses = await Promise.all(self.offlineResources.files.map(fetchVerified));
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(responses.map(([url, response]) => cache.put(url, response)));
  } catch (error) {
    await caches.delete(CACHE_NAME);
    throw error;
  }
}

async function activate() {
  const names = await caches.keys();
  await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
  await self.clients.claim();
}

async function respond(request) {
  const cache = await caches.open(CACHE_NAME);
  if (request.mode === 'navigate') {
    const page = await cache.match(toScopeUrl(INDEX_FILE));
    return page ?? fetch(request);
  }
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) {
    return cached;
  }
  try {
    return await fetch(request);
  } catch {
    return Response.error();
  }
}

async function activateWhenSafe() {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (windows.length > 0 && windows.every((client) => clientSafety.get(client.id) === true)) {
    await self.skipWaiting();
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(install());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(activate());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) {
    return;
  }
  event.respondWith(respond(request));
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'safety' || !event.source) {
    return;
  }
  clientSafety.set(event.source.id, event.data.safe === true);
  event.waitUntil(activateWhenSafe());
});
