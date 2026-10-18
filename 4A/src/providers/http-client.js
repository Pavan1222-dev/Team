import { logger as defaultLogger } from '../utils/logger.js';

export class ProviderError extends Error {
  constructor(provider, message, { statusCode, transient = false, cause } = {}) {
    super(message, { cause });
    this.name = 'ProviderError';
    this.provider = provider;
    this.statusCode = statusCode;
    this.transient = transient;
  }
}

function normalizeError(error, provider, controller) {
  if (error instanceof ProviderError) return error;
  if (controller.signal.aborted) {
    return new ProviderError(provider, 'The provider request timed out.', { transient: true, cause: error });
  }
  return new ProviderError(provider, 'The provider could not be reached.', { transient: true, cause: error });
}

function retryDelay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function requestJson(provider, url, {
  fetchImpl = globalThis.fetch,
  logger = defaultLogger,
  timeoutMs = 3000,
  retryDelayMs = 150,
  maxRetries = 2,
  validate = (body) => body,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');
  const timeout = Math.min(3000, Math.max(1, Number(timeoutMs) || 3000));
  const retries = Math.min(2, Math.max(0, Math.trunc(Number(maxRetries) || 0)));
  let lastError;

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const startedAt = Date.now();

    try {
      const response = await fetchImpl(url, { signal: controller.signal });
      if (!response.ok) {
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        throw new ProviderError(provider, `Provider returned HTTP ${response.status}.`, {
          statusCode: response.status,
          transient: retryable,
        });
      }
      let body;
      try {
        body = await response.json();
      } catch (error) {
        throw new ProviderError(provider, 'Provider returned malformed JSON.', { cause: error });
      }
      const result = validate(body);
      logger.info({ provider, durationMs: Date.now() - startedAt, attempt, success: true }, 'Provider request completed');
      return result;
    } catch (error) {
      lastError = normalizeError(error, provider, controller);
      logger.warn({
        provider,
        durationMs: Date.now() - startedAt,
        attempt,
        success: false,
        statusCode: lastError.statusCode,
        error: lastError.message,
      }, 'Provider request failed');
      if (!lastError.transient || attempt > retries) throw lastError;
    } finally {
      clearTimeout(timer);
    }

    await retryDelay(Math.max(0, Number(retryDelayMs) || 0));
  }

  throw lastError;
}
