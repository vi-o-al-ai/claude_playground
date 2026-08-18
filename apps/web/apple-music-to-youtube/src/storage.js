/** localStorage persistence: user settings and a resumable conversion job. */

const SETTINGS_KEY = "apple-music-to-youtube:settings";
const JOB_KEY = "apple-music-to-youtube:job";

const DEFAULT_SETTINGS = { clientId: "", privacyStatus: "private", order: "title-artist" };
// Access tokens are deliberately absent: they stay in memory for the session.
const PERSISTED_SETTINGS = Object.keys(DEFAULT_SETTINGS);

function readJson(store, key) {
  try {
    const raw = store?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(store, key, value) {
  try {
    store?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadSettings(store) {
  const stored = readJson(store, SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored && typeof stored === "object" ? stored : {}) };
}

export function saveSettings(store, settings) {
  const safe = {};
  for (const key of PERSISTED_SETTINGS) {
    if (settings?.[key] !== undefined) safe[key] = settings[key];
  }
  return writeJson(store, SETTINGS_KEY, safe);
}

export function saveJob(store, job) {
  return writeJson(store, JOB_KEY, job);
}

export function loadJob(store) {
  const job = readJson(store, JOB_KEY);
  return job && typeof job === "object" ? job : null;
}

export function clearJob(store) {
  try {
    store?.removeItem(JOB_KEY);
  } catch {
    /* private browsing — nothing to clear */
  }
}
