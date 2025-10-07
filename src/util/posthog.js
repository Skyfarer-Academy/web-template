// SSR-safe PostHog wrapper: no-ops on server, real client in browser

const noop = () => {};

const serverStub = {
  init: noop,
  identify: noop,
  group: noop,
  reset: noop,
  capture: noop,
  register: noop,
  unregister: noop,
  setPersonProperties: noop,
};

let posthogInstance = serverStub;
let initialized = false;

function initClientInstance() {
  if (typeof window === 'undefined' || initialized) {
    return posthogInstance;
  }
  try {
    // Load only in the browser
    // eslint-disable-next-line global-require
    const mod = require('posthog-js');
    const ph = mod && (mod.default || mod);
    if (ph && !ph.__skyfarer_inited) {
      ph.init('phc_lf1TbLlgF1qbWd9s62FFtbbx9zY3MpDHDQshMC1hFIF', {
        api_host: 'https://us.i.posthog.com',
        defaults: '2025-05-24',
        person_profiles: 'always',
      });
      ph.__skyfarer_inited = true;
    }
    posthogInstance = ph || serverStub;
    initialized = true;
  } catch (e) {
    // Silently fall back to server stub
    posthogInstance = serverStub;
  }
  return posthogInstance;
}

export const ensureInitialized = () => {
  initClientInstance();
};

const posthogProxy = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = initClientInstance();
      const value = client && client[prop];
      if (typeof value === 'function') return value.bind(client);
      if (value != null) return value;
      return noop;
    },
  }
);

export default posthogProxy;


