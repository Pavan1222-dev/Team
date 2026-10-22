const timeoutMs = Number(process.env.EXTERNAL_TIMEOUT_MS) || 3000;
const retryDelayMs = Number(process.env.RETRY_DELAY_MS) || 250;

const API_KEY = process.env.RESTCOUNTRIES_API_KEY;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchJson(label, url) {
  const startedAt = Date.now();
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = { accept: 'application/json' };
      if (label === 'rest-countries' && API_KEY) {
        headers.authorization = `Bearer ${API_KEY}`;
      }
      const response = await fetch(url, { signal: controller.signal, headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log(JSON.stringify({ type: 'external_call', api: label, attempt, durationMs: Date.now() - startedAt, success: true }));
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(retryDelayMs * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  console.log(JSON.stringify({ type: 'external_call', api: label, attempt: 3, durationMs: Date.now() - startedAt, success: false, error: lastError?.message ?? 'Unknown error' }));
  throw new Error(`${label} failed after 3 attempts: ${lastError?.message ?? 'Unknown error'}`);
}
