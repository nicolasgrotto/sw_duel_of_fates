const INSTALLED = 'installed';

export function shouldRegisterOffline(location, storage, config) {
  if (!config.localHosts.includes(location.hostname)) {
    return true;
  }
  try {
    return storage?.getItem(config.storageFlag) === config.enabledValue;
  } catch {
    return false;
  }
}

export class OfflineSupport {
  constructor({ container, location, storage, config }) {
    this.container = container ?? null;
    this.location = location;
    this.storage = storage;
    this.config = config;
    this.registration = null;
    this.safe = false;
  }

  start() {
    if (!this.container || !shouldRegisterOffline(this.location, this.storage, this.config)) {
      return Promise.resolve(null);
    }
    return this.container.register(this.config.script).then((registration) => {
      this.registration = registration;
      registration.addEventListener('updatefound', () => this.watch(registration.installing));
      this.report();
      return registration;
    }).catch(() => null);
  }

  watch(worker) {
    worker?.addEventListener('statechange', () => {
      if (worker.state === INSTALLED) this.report();
    });
  }

  setSafe(safe) {
    if (safe === this.safe) {
      return;
    }
    this.safe = safe;
    this.report();
  }

  report() {
    this.registration?.waiting?.postMessage({ type: 'safety', safe: this.safe });
  }
}
