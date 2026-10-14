import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const HARNESS_PATH = '/__perf__.html';

export const BUDGET = Object.freeze({ updateMs: 2, renderMs: 10, frameMs: 12 });
export const DEFAULTS = Object.freeze({
  cases: ['normal', 'lightning', 'stress', 'replay'],
  rounds: 1,
  throttle: 6,
  warmupFrames: 120,
  seconds: 11,
  windowFrames: 60,
  probes: 5,
  probeIterations: 1e6,
  viewport: { width: 844, height: 390, deviceScaleFactor: 3 },
});

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const MIME_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };

const HARNESS_PAGE = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles/main.css"></head>
<body><main class="stage"><canvas id="game" class="game-canvas" tabindex="0"></canvas></main>
<script type="module">import { Game } from '/src/core/Game.js'; window.perfGame = new Game(document.getElementById('game')); perfGame.start();</script></body></html>`;

export function parseArgs(argv) {
  const options = { ...DEFAULTS, cases: [...DEFAULTS.cases], dirs: [], out: null, chrome: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      options.dirs.push(resolve(arg));
      continue;
    }
    const key = arg.slice(2);
    const value = argv[index + 1];
    index += 1;
    if (key === 'cases') options.cases = value.split(',');
    else if (key === 'out' || key === 'chrome') options[key] = value;
    else if (key in DEFAULTS && typeof DEFAULTS[key] === 'number') options[key] = Number(value);
    else throw new Error(`Unknown option --${key}`);
  }
  if (options.dirs.length === 0) options.dirs.push(REPO_ROOT);
  if (options.dirs.length > 2) throw new Error('Pass at most two directories (A and B)');
  return options;
}

export function runOrder(dirCount, rounds) {
  const pattern = dirCount === 2 ? [0, 1, 1, 0] : [0];
  const order = [];
  for (let round = 0; round < rounds; round += 1) order.push(...pattern);
  return order;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function percentile(values, ratio) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

function median(values) {
  return percentile(values, 0.5);
}

function windowMeans(values, size) {
  const windows = [];
  for (let start = 0; start + size <= values.length; start += size) windows.push(mean(values.slice(start, start + size)));
  return windows;
}

export function summarizeWall(windows, frames) {
  const intervals = frames.map((frame) => frame.interval);
  const steps = frames.map((frame) => frame.steps);
  return {
    windows: windows.length,
    frames: frames.length,
    meanUpdate: mean(windows.map((row) => row.updateMs)),
    maxWindowUpdate: Math.max(0, ...windows.map((row) => row.updateMs)),
    meanRender: mean(windows.map((row) => row.renderMs)),
    maxWindowRender: Math.max(0, ...windows.map((row) => row.renderMs)),
    intervalP95: percentile(intervals, 0.95),
    intervalMax: Math.max(0, ...intervals),
    stepsPerFrame: mean(steps),
    maxSteps: Math.max(0, ...steps),
    multiStepShare: steps.length ? steps.filter((count) => count > 1).length / steps.length : 0,
  };
}

export function selectGameFrames(traceEvents, callbackIds) {
  const ids = new Set(callbackIds);
  return traceEvents
    .filter((event) => event.name === 'FireAnimationFrame' && event.ph === 'X' && Number.isFinite(event.tdur) && ids.has(event.args?.data?.id))
    .sort((a, b) => a.ts - b.ts)
    .map((event) => ({ cpu: event.tdur / 1000, wall: event.dur / 1000 }));
}

export function summarizeCpu(frames, throttle, windowFrames) {
  const cpu = frames.map((frame) => frame.cpu);
  const cpuMean = mean(cpu);
  return {
    frames: cpu.length,
    mean: cpuMean,
    p50: median(cpu),
    p95: percentile(cpu, 0.95),
    maxWindow: Math.max(0, ...windowMeans(cpu, windowFrames)),
    wallMean: mean(frames.map((frame) => frame.wall)),
    projected: cpuMean * throttle,
  };
}

export function evaluateBudget(cpuSummary, wallAtOne, throttle) {
  const projectedUpdate = wallAtOne.meanUpdate * throttle;
  const projectedRender = wallAtOne.meanRender * throttle;
  return {
    projectedFrame: cpuSummary.projected,
    projectedUpdate,
    projectedRender,
    pass: cpuSummary.projected <= BUDGET.frameMs && projectedUpdate <= BUDGET.updateMs && projectedRender <= BUDGET.renderMs,
  };
}

function findChrome(explicit) {
  const path = [explicit, ...CHROME_CANDIDATES].find((candidate) => candidate && existsSync(candidate));
  if (!path) throw new Error('Chrome not found; pass --chrome <path> or set CHROME_PATH');
  return path;
}

function startServer(root) {
  const server = createServer(async (request, response) => {
    const urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (urlPath === HARNESS_PATH) {
      response.writeHead(200, { 'content-type': MIME_TYPES['.html'] });
      response.end(HARNESS_PAGE);
      return;
    }
    const filePath = normalize(join(root, urlPath));
    const info = filePath.startsWith(root + sep) ? await stat(filePath).catch(() => null) : null;
    if (!info?.isFile()) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, { 'content-type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream' });
    response.end(await readFile(filePath));
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server)));
}

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

class DevToolsSession {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.exceptions = [];
    this.traceEvents = [];
    this.traceDone = null;
    this.socket.addEventListener('message', (message) => this.receive(JSON.parse(message.data)));
  }

  open() {
    return new Promise((done, fail) => {
      this.socket.addEventListener('open', done, { once: true });
      this.socket.addEventListener('error', fail, { once: true });
    });
  }

  receive(message) {
    if (message.id && this.pending.has(message.id)) {
      this.pending.get(message.id)(message);
      this.pending.delete(message.id);
    } else if (message.method === 'Runtime.exceptionThrown') {
      this.exceptions.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    } else if (message.method === 'Tracing.dataCollected') {
      this.traceEvents.push(...message.params.value);
    } else if (message.method === 'Tracing.tracingComplete') {
      this.traceDone?.();
    }
  }

  call(method, params = {}) {
    this.nextId += 1;
    const id = this.nextId;
    return new Promise((done, fail) => {
      this.pending.set(id, (message) => (message.error ? fail(new Error(`${method}: ${message.error.message}`)) : done(message.result)));
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  }

  startTrace() {
    this.traceEvents = [];
    return this.call('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline'] }, transferMode: 'ReportEvents' });
  }

  async stopTrace() {
    const done = new Promise((resolveDone) => { this.traceDone = resolveDone; });
    await this.call('Tracing.end');
    await done;
    return this.traceEvents;
  }

  close() {
    this.socket.close();
  }
}

async function launchChrome(chromePath, root) {
  const profile = await mkdtemp(join(tmpdir(), 'perf-budget-'));
  const server = await startServer(root);
  const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling', `--user-data-dir=${profile}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const port = await new Promise((done, fail) => {
    let output = '';
    const timer = setTimeout(() => fail(new Error('Chrome did not open the DevTools port')), 30000);
    chrome.stderr.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
      if (match) {
        clearTimeout(timer);
        done(Number(match[1]));
      }
    });
  });
  const pageUrl = `http://127.0.0.1:${server.address().port}${HARNESS_PATH}`;
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${pageUrl}`, { method: 'PUT' })).json();
  const session = new DevToolsSession(target.webSocketDebuggerUrl);
  await session.open();
  const close = async () => {
    session.close();
    const exited = new Promise((done) => chrome.once('exit', done));
    chrome.kill();
    await Promise.race([exited, wait(5000)]);
    server.close();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await rm(profile, { recursive: true, force: true });
        return;
      } catch {
        await wait(500);
      }
    }
  };
  return { session, close };
}

async function preparePage(session, viewport) {
  await session.call('Runtime.enable');
  await session.call('Page.enable');
  await session.call('Emulation.setDeviceMetricsOverride', { ...viewport, mobile: false });
  const deadline = Date.now() + 30000;
  while (!(await session.evaluate('Boolean(window.perfGame)').catch(() => false))) {
    if (Date.now() > deadline) throw new Error('Game did not start');
    await wait(100);
  }
  await session.evaluate('document.fonts.ready.then(() => true)');
  await wait(1000);
}

function probeExpression(count, iterations) {
  return `(async () => { const times = []; for (let probe = 0; probe < ${count}; probe += 1) { const start = performance.now(); let value = 0; for (let index = 0; index < ${iterations}; index += 1) value += Math.sqrt(index); times.push(performance.now() - start + value * 0); await new Promise((done) => setTimeout(done, 50)); } return times; })()`;
}

async function probe(session, options) {
  const times = await session.evaluate(probeExpression(options.probes, options.probeIterations));
  return { median: median(times), min: Math.min(...times), max: Math.max(...times) };
}

async function pageScenario({ caseName, warmupFrames, seconds }) {
  const { StateId } = await import('/src/states/stateIds.js');
  const { EnemyAI } = await import('/src/ai/EnemyAI.js');
  const { aiConfig } = await import('/src/config/aiConfig.js');
  const { EffectType } = await import('/src/systems/EffectsSystem.js');
  const { colors } = await import('/src/config/themeConfig.js');
  const { effectsConfig } = await import('/src/config/effectsConfig.js');
  const { characters } = await import('/src/characters/characterData.js');
  const game = window.perfGame;
  const { loop } = game;
  const replay = caseName === 'replay';
  const stress = caseName === 'stress';
  const lightning = caseName === 'lightning';
  game.settings.sound = false;
  game.settings.music = false;
  game.settings.reducedEffects = false;
  game.settings.powers = true;
  game.settings.finalReplay = false;
  game.applySettings();
  game.debug.enabled = false;
  const playerCharacter = lightning ? 'sovereign' : stress ? 'guardian' : 'heron';
  const opponentCharacter = lightning ? 'guardian' : stress ? 'wasp' : 'shadow';
  game.changeState(StateId.DUEL, { mode: 'versus', playerCharacter, opponentCharacter, arena: 'sanctuary', seed: 1 });
  const duel = game.states.current;
  const [player, opponent] = duel.fighters;
  duel.introTime = 5;
  const createAI = (self, other) => new EnemyAI({ self, opponent: other, profile: aiConfig.profiles[characters[self.id].aiProfile], difficulty: aiConfig.difficulties.normal, perception: aiConfig.perception, random: duel.random, rules: duel.rules, arena: duel.arena, projectiles: duel.simulation.projectiles });
  duel.participants[0].controller = createAI(player, opponent);
  if (lightning) {
    const channel = (fighter, direction) => ({ updateIntent(intent) { fighter.clearIntent(); intent.moveX = direction; intent.power = !fighter.combat.power; intent.powerHeld = true; } });
    duel.participants[0].controller = channel(player, 0);
    duel.participants[1].controller = channel(opponent, 1);
  }
  const eventParams = { x: 640, y: 460, direction: 1, color: colors.accent, secondaryColor: colors.accent };
  const maintain = () => {
    for (const fighter of duel.fighters) {
      fighter.health = fighter.stats.maxHealth;
      fighter.stamina = fighter.stats.maxStamina;
      fighter.flowMeter = fighter.stats.power.max;
    }
    if (!lightning && !stress) return;
    player.x = 520;
    opponent.x = lightning ? 710 : 640;
    player.facing = 1;
    opponent.facing = -1;
    if (!stress) return;
    for (const fighter of duel.fighters) {
      fighter.combat.focusTime = 5;
      fighter.combat.wrathTime = 5;
      fighter.combat.healTime = 5;
    }
    while (duel.effects.particles.activeCount < effectsConfig.maxParticles) duel.effects.spawn(EffectType.SABER_CLASH, eventParams);
    for (let index = 0; index < effectsConfig.maxLights; index += 1) duel.effects.spawnLight({ radius: 90, alpha: 0.4, duration: 0.2 }, 520 + index * 25, 460, colors.accent);
    for (let index = 0; index < effectsConfig.maxRings; index += 1) duel.effects.spawnRing({ radius: 100, lineWidth: 3, alpha: 0.5, duration: 0.2 }, 580 + index * 20, 460, colors.accent);
    duel.effects.spawnShockwave(player, 1, 260, 1);
    duel.effects.spawnShockwave(opponent, -1, 260, 1);
    for (let index = 0; index < 6; index += 1) {
      Object.assign(duel.simulation.projectiles.pool[index], { active: true, kind: 'throw', owner: index % 2, source: 'throw', x: 480 + index * 60, y: 180, vx: 0, radius: 20, level: 10, potency: 1, age: 0, hit: false });
    }
  };
  let playback = null;
  const pushReplay = () => game.pushState(StateId.REPLAY, { playback, fighters: duel.fighters, arenaId: duel.arenaId, rules: duel.rules });
  if (replay) {
    for (let index = 0; index < 240; index += 1) {
      maintain();
      game.update(1 / 60);
    }
    playback = duel.replayBuffer.createPlayback();
    pushReplay();
  }

  const windows = [];
  const frames = [];
  const callbackIds = [];
  let measuring = false;
  const schedule = loop.schedule;
  const publishTimings = loop.publishTimings;
  const recordFrame = loop.recordFrame;
  loop.schedule = (callback) => {
    const id = schedule(callback);
    if (measuring) callbackIds.push(id);
    return id;
  };
  loop.publishTimings = function publish() {
    publishTimings.call(this);
    if (measuring) windows.push({ ...this.timings });
  };
  loop.recordFrame = function record(frameTime, steps) {
    if (measuring) frames.push({ interval: frameTime * 1000, steps });
    recordFrame.call(this, frameTime, steps);
  };
  const restore = () => {
    loop.schedule = schedule;
    loop.publishTimings = publishTimings;
    loop.recordFrame = recordFrame;
  };

  return new Promise((done, fail) => {
    let warmup = 0;
    let measuredStart = null;
    const timeout = setTimeout(() => {
      restore();
      fail(new Error('Scenario timeout'));
    }, (seconds + 60) * 1000);
    const tick = (now) => {
      try {
        if (replay && game.states.current === duel) pushReplay();
        if (!replay) maintain();
        warmup += 1;
        if (warmup === warmupFrames) {
          loop.timingFrames = 0;
          loop.updateTotal = 0;
          loop.renderTotal = 0;
          loop.stepsTotal = 0;
          loop.maxSteps = 0;
          measuring = true;
          measuredStart = now;
          callbackIds.push(loop.frameId);
        }
        if (measuredStart !== null && now - measuredStart >= seconds * 1000) {
          measuring = false;
          clearTimeout(timeout);
          restore();
          done({ windows, frames, callbackIds, canvas: [game.renderer.canvas.width, game.renderer.canvas.height] });
          return;
        }
        requestAnimationFrame(tick);
      } catch (error) {
        clearTimeout(timeout);
        restore();
        fail(error);
      }
    };
    requestAnimationFrame(tick);
  });
}

function scenarioExpression(caseName, options) {
  return `(${pageScenario.toString()})(${JSON.stringify({ caseName, warmupFrames: options.warmupFrames, seconds: options.seconds })})`;
}

async function measureRun(chromePath, root, caseName, options) {
  const { session, close } = await launchChrome(chromePath, root);
  try {
    await preparePage(session, options.viewport);
    const probeAtOne = await probe(session, options);

    await session.startTrace();
    const cpuRun = await session.evaluate(scenarioExpression(caseName, options));
    const traceEvents = await session.stopTrace();
    const cpu = summarizeCpu(selectGameFrames(traceEvents, cpuRun.callbackIds), options.throttle, options.windowFrames);
    const wallAtOne = summarizeWall(cpuRun.windows, cpuRun.frames);

    await session.call('Emulation.setCPUThrottlingRate', { rate: options.throttle });
    const probeBefore = await probe(session, options);
    const throttledRun = await session.evaluate(scenarioExpression(caseName, options));
    const probeAfter = await probe(session, options);
    await session.call('Emulation.setCPUThrottlingRate', { rate: 1 });
    const wall = summarizeWall(throttledRun.windows, throttledRun.frames);

    return {
      case: caseName,
      root,
      canvas: cpuRun.canvas,
      calibration: {
        probeIterations: options.probeIterations,
        atOne: probeAtOne,
        throttledBefore: probeBefore,
        throttledAfter: probeAfter,
        effectiveFactor: [probeBefore.median / probeAtOne.median, probeAfter.median / probeAtOne.median],
      },
      cpu,
      wallAtOne,
      wall,
      budget: evaluateBudget(cpu, wallAtOne, options.throttle),
      exceptions: [...session.exceptions],
    };
  } finally {
    await close();
  }
}

export function summarizeRuns(runs) {
  const groups = new Map();
  for (const run of runs) {
    const key = `${run.case}\u0000${run.root}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(run);
  }
  return [...groups.values()].map((group) => ({
    case: group[0].case,
    root: group[0].root,
    runs: group.length,
    cpuMean: mean(group.map((run) => run.cpu.mean)),
    cpuP95: mean(group.map((run) => run.cpu.p95)),
    projectedFrame: mean(group.map((run) => run.budget.projectedFrame)),
    projectedUpdate: mean(group.map((run) => run.budget.projectedUpdate)),
    projectedRender: mean(group.map((run) => run.budget.projectedRender)),
    pass: group.every((run) => run.budget.pass),
    intervalP95AtOne: mean(group.map((run) => run.wallAtOne.intervalP95)),
    wallMeanUpdate: mean(group.map((run) => run.wall.meanUpdate)),
    wallMeanRender: mean(group.map((run) => run.wall.meanRender)),
    wallMaxWindowUpdate: Math.max(...group.map((run) => run.wall.maxWindowUpdate)),
    wallMaxWindowRender: Math.max(...group.map((run) => run.wall.maxWindowRender)),
    stepsPerFrame: mean(group.map((run) => run.wall.stepsPerFrame)),
    multiStepShare: mean(group.map((run) => run.wall.multiStepShare)),
    effectiveFactor: [Math.min(...group.flatMap((run) => run.calibration.effectiveFactor)), Math.max(...group.flatMap((run) => run.calibration.effectiveFactor))],
    exceptions: group.reduce((sum, run) => sum + run.exceptions.length, 0),
  }));
}

function format(value, digits = 2) {
  return value.toFixed(digits).padStart(6);
}

function printRun(run, label) {
  const { cpu, wall, wallAtOne, calibration, budget } = run;
  console.log(`${run.case.padEnd(9)} ${label} cpu ${format(cpu.mean, 3)} (p95 ${format(cpu.p95, 3)}) → ${format(budget.projectedFrame)} | 1x upd/rnd ${format(wallAtOne.meanUpdate, 3)}/${format(wallAtOne.meanRender, 3)} p95 ${format(wallAtOne.intervalP95, 1)} | throttled upd ${format(wall.meanUpdate)}/${format(wall.maxWindowUpdate)} rnd ${format(wall.meanRender)}/${format(wall.maxWindowRender)} steps ${wall.stepsPerFrame.toFixed(2)} | factor ${calibration.effectiveFactor.map((factor) => factor.toFixed(1)).join('→')} | ${budget.pass ? 'pass' : 'FAIL'}${run.exceptions.length ? ` | ${run.exceptions.length} exceptions` : ''}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const chromePath = findChrome(options.chrome);
  const labels = options.dirs.length === 2 ? ['A', 'B'] : [''];
  const runs = [];
  console.log(`Chrome ${chromePath}; throttle ${options.throttle}x; ${options.warmupFrames} warmup frames + ${options.seconds} s; budget update ${BUDGET.updateMs} / render ${BUDGET.renderMs} / frame CPU ${BUDGET.frameMs} ms`);
  for (const caseName of options.cases) {
    for (const dirIndex of runOrder(options.dirs.length, options.rounds)) {
      const run = await measureRun(chromePath, options.dirs[dirIndex], caseName, options);
      run.label = labels[dirIndex];
      runs.push(run);
      printRun(run, run.label || '-');
    }
  }
  const summary = summarizeRuns(runs);
  console.log('\nSummary (projected = mean CPU at 1x × throttle; throttled windows are informational)');
  for (const row of summary) {
    const label = options.dirs.length === 2 ? (row.root === options.dirs[0] ? 'A' : 'B') : '-';
    console.log(`${row.case.padEnd(9)} ${label} n=${row.runs} cpu ${format(row.cpuMean, 3)} → frame ${format(row.projectedFrame)} upd ${format(row.projectedUpdate)} rnd ${format(row.projectedRender)} ${row.pass ? 'pass' : 'FAIL'} | p95@1x ${format(row.intervalP95AtOne, 1)} | throttled max upd ${format(row.wallMaxWindowUpdate)} rnd ${format(row.wallMaxWindowRender)} steps ${row.stepsPerFrame.toFixed(2)} (${(row.multiStepShare * 100).toFixed(0)}% multi) | factor ${row.effectiveFactor.map((factor) => factor.toFixed(1)).join('–')}${row.exceptions ? ` | ${row.exceptions} exceptions` : ''}`);
  }
  if (options.out) await writeFile(options.out, JSON.stringify({ options: { ...options, chrome: chromePath }, budget: BUDGET, runs, summary }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
