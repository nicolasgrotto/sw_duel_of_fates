import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { gameConfig } from '../src/config/gameConfig.js';
import { OfflineSupport, shouldRegisterOffline } from '../src/core/OfflineSupport.js';
import { DuelState } from '../src/states/DuelState.js';
import { GameState } from '../src/states/GameState.js';
import { MenuState } from '../src/states/MenuState.js';
import { ReplayState } from '../src/states/ReplayState.js';
import {
  OFFLINE_ROOT, buildOfflineResources, computeOfflineVersion, readOfflineResources, renderOfflineResources,
} from '../tools/offline.js';

const SCOPE = 'https://example.test/game/';
const resources = readOfflineResources();

function allowsUpdate(StateClass) {
  let prototype = StateClass.prototype;
  while (prototype && !Object.getOwnPropertyDescriptor(prototype, 'allowsUpdate')) prototype = Object.getPrototypeOf(prototype);
  return Object.getOwnPropertyDescriptor(prototype, 'allowsUpdate').get.call({});
}

function createCaches(initial = {}) {
  const stores = new Map(Object.entries(initial).map(([name, entries]) => [name, new Map(entries)]));
  const strip = (url) => url.split('?')[0];
  const open = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      put: async (url, response) => { store.set(url, response); },
      match: async (request, options = {}) => {
        const url = typeof request === 'string' ? request : request.url;
        return store.get(options.ignoreSearch ? strip(url) : url);
      },
    };
  };
  return { stores, api: { open, keys: async () => [...stores.keys()], delete: async (name) => stores.delete(name) } };
}

function htmlResponse() {
  return new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } });
}

function loadWorker({ caches, fetch, clients = [] }) {
  const listeners = {};
  const state = { skipped: 0, claimed: 0 };
  const self = {
    registration: { scope: SCOPE },
    clients: {
      matchAll: async () => clients,
      claim: async () => { state.claimed += 1; },
    },
    skipWaiting: async () => { state.skipped += 1; },
    addEventListener: (type, listener) => { listeners[type] = listener; },
  };
  const context = vm.createContext({
    self, caches, fetch, Response, URL, Error, Promise, Map,
    importScripts: (file) => vm.runInContext(readFileSync(join(OFFLINE_ROOT, file), 'utf8'), context),
  });
  vm.runInContext(readFileSync(join(OFFLINE_ROOT, 'sw.js'), 'utf8'), context);
  const dispatch = async (type, event) => {
    let pending = null;
    let response = null;
    listeners[type]({ ...event, waitUntil: (promise) => { pending = promise; }, respondWith: (value) => { response = value; } });
    if (pending) await pending;
    return response ? await response : null;
  };
  return { dispatch, state, cacheName: `duel-of-fates-${resources.version}` };
}

function serveAll(overrides = {}) {
  return async (url) => {
    const file = url.slice(SCOPE.length);
    if (file in overrides) return overrides[file]();
    const type = file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream';
    return new Response(file, { headers: { 'content-type': type } });
  };
}

describe('offline resources', () => {
  it('lists every runtime file and is up to date with the files on disk', () => {
    const expected = buildOfflineResources();
    assert.deepEqual(resources, expected);
    assert.equal(readFileSync(join(OFFLINE_ROOT, 'offline-resources.js'), 'utf8').replace(/\r\n/g, '\n'), renderOfflineResources(expected));
    assert.equal(new Set(resources.files).size, resources.files.length);
    assert.ok(resources.files.every((file) => existsSync(join(OFFLINE_ROOT, file))));
    const index = readFileSync(join(OFFLINE_ROOT, 'index.html'), 'utf8');
    for (const [, path] of index.matchAll(/(?:href|src)="([^"]+)"/g)) assert.ok(resources.files.includes(path), path);
    const manifest = JSON.parse(readFileSync(join(OFFLINE_ROOT, 'manifest.webmanifest'), 'utf8'));
    for (const icon of manifest.icons) assert.ok(resources.files.includes(icon.src), icon.src);
    assert.ok(resources.files.includes('assets/fonts/Oxanium.ttf'));
    assert.ok(resources.files.includes('src/main.js') && resources.files.includes('src/core/OfflineSupport.js'));
    assert.ok(!resources.files.some((file) => file.startsWith('tests/') || file.startsWith('tools/') || file === 'sw.js'));
  });

  it('changes the version with the content of any file or the worker, not with line endings', () => {
    const root = mkdtempSync(join(tmpdir(), 'offline-'));
    try {
      writeFileSync(join(root, 'a.js'), 'export const a = 1;\n');
      writeFileSync(join(root, 'sw.js'), 'self;\n');
      const first = computeOfflineVersion(root, ['a.js']);
      writeFileSync(join(root, 'a.js'), 'export const a = 1;\r\n');
      assert.equal(computeOfflineVersion(root, ['a.js']), first);
      writeFileSync(join(root, 'a.js'), 'export const a = 2;\n');
      const second = computeOfflineVersion(root, ['a.js']);
      assert.notEqual(second, first);
      writeFileSync(join(root, 'sw.js'), 'self; self;\n');
      assert.notEqual(computeOfflineVersion(root, ['a.js']), second);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('service worker', () => {
  it('installs every listed file into its own versioned cache', async () => {
    const caches = createCaches();
    const worker = loadWorker({ caches: caches.api, fetch: serveAll() });
    await worker.dispatch('install', {});
    const store = caches.stores.get(worker.cacheName);
    assert.equal(store.size, resources.files.length);
    assert.ok(store.has(`${SCOPE}src/main.js`));
  });

  it('keeps the old version intact when any file fails or a script answers HTML', async () => {
    for (const override of [{ 'src/main.js': () => new Response('missing', { status: 404 }) }, { 'src/core/Game.js': htmlResponse }]) {
      const old = [[`${SCOPE}index.html`, new Response('old')]];
      const caches = createCaches({ 'duel-of-fates-vold': old });
      const worker = loadWorker({ caches: caches.api, fetch: serveAll(override) });
      await assert.rejects(worker.dispatch('install', {}));
      assert.deepEqual([...caches.stores.keys()], ['duel-of-fates-vold']);
      assert.equal(caches.stores.get('duel-of-fates-vold').size, 1);
    }
  });

  it('drains response bodies while later requests wait for a connection', { timeout: 3000 }, async () => {
    const caches = createCaches();
    let releaseHeaders;
    let drained = false;
    const available = new Promise(resolve => { releaseHeaders = resolve; });
    const network = serveAll();
    const firstUrl = `${SCOPE}${resources.files[0]}`;
    const response = new Response(new ReadableStream({
      pull(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
        controller.close();
        drained = true;
        releaseHeaders();
      },
    }, { highWaterMark: 0 }));
    Object.defineProperty(response, 'url', { value: firstUrl });
    const worker = loadWorker({
      caches: { ...caches.api, open: async (name) => { assert.equal(drained, true); return caches.api.open(name); } },
      fetch: async (url) => {
        if (url === firstUrl) return response;
        await available;
        return network(url);
      },
    });
    await worker.dispatch('install', {});
    const stored = caches.stores.get(worker.cacheName).get(firstUrl);
    assert.equal(stored.url, firstUrl);
    assert.deepEqual(new Uint8Array(await stored.arrayBuffer()), new Uint8Array([1, 2, 3]));
    assert.equal(caches.stores.get(worker.cacheName).size, resources.files.length);
  });

  it('preserves the old cache when a response body fails after successful headers', async () => {
    const caches = createCaches({ 'duel-of-fates-vold': [[`${SCOPE}index.html`, new Response('old')]] });
    const worker = loadWorker({ caches: caches.api, fetch: serveAll({
      'src/main.js': () => new Response(new ReadableStream({
        pull(controller) { controller.error(new TypeError('Download interrupted')); },
      }, { highWaterMark: 0 }), { headers: { 'content-type': 'text/javascript' } }),
    }) });
    await assert.rejects(worker.dispatch('install', {}), /Download interrupted/);
    assert.deepEqual([...caches.stores.keys()], ['duel-of-fates-vold']);
    assert.equal(await caches.stores.get('duel-of-fates-vold').get(`${SCOPE}index.html`).text(), 'old');
  });

  it('deletes only its own older caches on activation and never touches other storage', async () => {
    const caches = createCaches({ 'duel-of-fates-vold': [], 'another-app': [], [`duel-of-fates-${resources.version}`]: [] });
    const worker = loadWorker({ caches: caches.api, fetch: serveAll() });
    await worker.dispatch('activate', {});
    assert.deepEqual([...caches.stores.keys()].sort(), ['another-app', worker.cacheName].sort());
    assert.equal(worker.state.claimed, 1);
    assert.doesNotMatch(readFileSync(join(OFFLINE_ROOT, 'sw.js'), 'utf8'), /localStorage|indexedDB/);
  });

  it('serves cached files, the page for navigations and never HTML in place of a missing script', async () => {
    const caches = createCaches();
    let online = true;
    const network = serveAll();
    const worker = loadWorker({ caches: caches.api, fetch: async (url) => { if (!online) throw new TypeError('offline'); return network(url); } });
    await worker.dispatch('install', {});
    online = false;
    const script = await worker.dispatch('fetch', { request: { method: 'GET', url: `${SCOPE}src/main.js?v=2`, mode: 'cors' } });
    assert.equal(await script.text(), 'src/main.js');
    const page = await worker.dispatch('fetch', { request: { method: 'GET', url: `${SCOPE}duel`, mode: 'navigate' } });
    assert.equal(await page.text(), 'index.html');
    const missing = await worker.dispatch('fetch', { request: { method: 'GET', url: `${SCOPE}src/missing.js`, mode: 'cors' } });
    assert.equal(missing.type, 'error');
    const outside = await worker.dispatch('fetch', { request: { method: 'GET', url: 'https://example.test/other/a.js', mode: 'cors' } });
    assert.equal(outside, null);
  });

  it('activates a waiting update only when every open tab reports a safe moment', async () => {
    const clients = [{ id: 'a' }, { id: 'b' }];
    const worker = loadWorker({ caches: createCaches().api, fetch: serveAll(), clients });
    await worker.dispatch('message', { data: { type: 'safety', safe: true }, source: clients[0] });
    assert.equal(worker.state.skipped, 0);
    await worker.dispatch('message', { data: { type: 'safety', safe: false }, source: clients[1] });
    assert.equal(worker.state.skipped, 0);
    await worker.dispatch('message', { data: { type: 'safety', safe: true }, source: clients[1] });
    assert.equal(worker.state.skipped, 1);
  });
});

describe('offline support in the page', () => {
  it('registers outside local development, or locally only with the opt-in flag', () => {
    const config = gameConfig.offline;
    const storage = (value) => ({ getItem: () => value });
    assert.equal(shouldRegisterOffline({ hostname: 'example.github.io' }, null, config), true);
    assert.equal(shouldRegisterOffline({ hostname: 'localhost' }, storage(null), config), false);
    assert.equal(shouldRegisterOffline({ hostname: '127.0.0.1' }, storage(config.enabledValue), config), true);
    assert.equal(shouldRegisterOffline({ hostname: 'localhost' }, { getItem: () => { throw new Error('blocked'); } }, config), false);
  });

  it('registers the relative worker and tells a waiting update whether the game is in a safe moment', async () => {
    const posted = [];
    const listeners = {};
    const waiting = { postMessage: (message) => posted.push(message) };
    const registration = { waiting: null, addEventListener: (type, listener) => { listeners[type] = listener; } };
    const container = { register: async (script) => { assert.equal(script, 'sw.js'); return registration; } };
    const offline = new OfflineSupport({ container, location: { hostname: 'example.github.io' }, storage: null, config: gameConfig.offline });
    await offline.start();
    offline.setSafe(true);
    assert.deepEqual(posted, []);
    const installing = { state: 'installing', addEventListener: (type, listener) => { installing.listener = listener; } };
    registration.installing = installing;
    listeners.updatefound();
    registration.waiting = waiting;
    installing.state = 'installed';
    installing.listener();
    offline.setSafe(false);
    assert.deepEqual(posted, [{ type: 'safety', safe: true }, { type: 'safety', safe: false }]);
    assert.equal(await new OfflineSupport({ container: null, location: { hostname: 'x' }, config: gameConfig.offline }).start(), null);
  });

  it('marks duels and replays as unsafe for an update and every other state as safe', () => {
    assert.equal(allowsUpdate(DuelState), false);
    assert.equal(allowsUpdate(ReplayState), false);
    assert.equal(allowsUpdate(MenuState), true);
    assert.equal(allowsUpdate(GameState), true);
  });
});
