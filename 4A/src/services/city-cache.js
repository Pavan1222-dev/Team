const DEFAULT_TTL_MS = 10 * 60 * 1000;

export function normalizeCityKey(cityName) {
  return cityName.normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en');
}

export function createCityCache({ ttlMs = Number(process.env.CACHE_TTL_MS ?? DEFAULT_TTL_MS), now = Date.now } = {}) {
  const duration = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS;
  const entries = new Map();

  return {
    get(cityName) {
      const key = normalizeCityKey(cityName);
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      return structuredClone(entry.value);
    },

    set(cityName, value) {
      const currentTime = now();
      for (const [key, entry] of entries) {
        if (entry.expiresAt <= currentTime) entries.delete(key);
      }
      entries.set(normalizeCityKey(cityName), {
        value: structuredClone(value),
        expiresAt: currentTime + duration,
      });
    },
  };
}
