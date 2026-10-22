const ttlMs = Number(process.env.CACHE_TTL_MS) || 10 * 60 * 1000;
const entries = new Map();

export function readCache(key) {
  const entry = entries.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    entries.delete(key);
    return null;
  }
  return entry.value;
}

export function writeCache(key, value) {
  entries.set(key, { value, expiresAt: Date.now() + ttlMs });
}
