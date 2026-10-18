import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCurrencyProvider, getCurrencyForCountry } from '../src/providers/currency-provider.js';
import { createGeocodingProvider } from '../src/providers/geocoding-provider.js';
import { ProviderError, requestJson } from '../src/providers/http-client.js';
import { createWeatherProvider } from '../src/providers/weather-provider.js';
import { getLocalDateTime } from '../src/providers/timezone-provider.js';

const quietLogger = { info() {}, warn() {} };
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('geocoding normalizes fields and selects an exact popular match over a prefix', async () => {
  let calledUrl;
  const provider = createGeocodingProvider({
    logger: quietLogger,
    fetchImpl: async (url) => {
      calledUrl = new URL(url);
      return jsonResponse({ results: [
        { name: 'Pune', latitude: 18.52, longitude: 73.85, country_code: 'IN', country: 'India', timezone: 'Asia/Kolkata', population: 3_000_000 },
        { name: 'Pune City', latitude: 1, longitude: 2, country_code: 'US', population: 4_000_000 },
      ] });
    },
  });
  const location = await provider.findCity(' Pune ');
  assert.equal(calledUrl.searchParams.get('name'), 'Pune');
  assert.equal(location.countryCode, 'IN');
  assert.equal(location.latitude, 18.52);
});

test('geocoding returns null for no match and rejects malformed provider data', async () => {
  const noMatch = createGeocodingProvider({ fetchImpl: async () => jsonResponse({ results: [] }), logger: quietLogger });
  assert.equal(await noMatch.findCity('Nowhere'), null);
  const malformed = createGeocodingProvider({ fetchImpl: async () => jsonResponse({}), logger: quietLogger });
  await assert.rejects(malformed.findCity('Pune'), { name: 'ProviderError' });
});

test('weather provider normalizes current conditions and three daily forecast entries', async () => {
  let requestedUrl;
  const provider = createWeatherProvider({
    logger: quietLogger,
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return jsonResponse({
        current: { temperature_2m: 30, relative_humidity_2m: 60, apparent_temperature: 32, precipitation: 0, weather_code: 2, wind_speed_10m: 8, time: '2026-10-18T13:00' },
        current_units: { temperature_2m: '°C', wind_speed_10m: 'km/h', precipitation: 'mm' },
        daily: { time: ['2026-10-18', '2026-10-19', '2026-10-20'], weather_code: [2, 3, 61], temperature_2m_max: [31, 29, 27], temperature_2m_min: [24, 23, 21], precipitation_probability_max: [10, 20, 70] },
      });
    },
  });
  const result = await provider.getWeather({ latitude: 18.52, longitude: 73.85, timezone: 'Asia/Kolkata' });
  assert.equal(requestedUrl.searchParams.get('forecast_days'), '3');
  assert.equal(result.current.description, 'Partly cloudy');
  assert.equal(result.forecast.length, 3);
  assert.equal(result.forecast[2].precipitationProbability, 70);
});

test('country currency data uses ISO country codes and Frankfurter normalizes INR rate', async () => {
  assert.deepEqual(getCurrencyForCountry('in'), { code: 'INR', name: 'Indian Rupee' });
  let calledUrl;
  const provider = createCurrencyProvider({
    logger: quietLogger,
    fetchImpl: async (url) => {
      calledUrl = new URL(url);
      return jsonResponse({ date: '2026-10-16', base_code: 'USD', quote_code: 'INR', rate: 88.5 });
    },
  });
  const rate = await provider.getRateToInr('USD');
  assert.equal(calledUrl.pathname, '/v2/rate/USD/INR');
  assert.deepEqual(rate, { base: 'USD', quote: 'INR', rate: 88.5, date: '2026-10-16' });
  assert.equal((await provider.getRateToInr('INR')).rate, 1);
});

test('request client retries transient failures and does not retry permanent client errors', async () => {
  let attempts = 0;
  const result = await requestJson('test', 'https://provider.test/data', {
    fetchImpl: async () => (++attempts < 2 ? jsonResponse({}, 503) : jsonResponse({ value: 5 })),
    logger: quietLogger,
    retryDelayMs: 0,
    validate: (body) => body.value,
  });
  assert.equal(attempts, 2);
  assert.equal(result, 5);

  attempts = 0;
  await requestJson('test', 'https://provider.test/data', {
    fetchImpl: async () => (++attempts === 1 ? jsonResponse({}, 408) : jsonResponse({ value: 6 })),
    logger: quietLogger,
    retryDelayMs: 0,
  });
  assert.equal(attempts, 2);

  attempts = 0;
  await assert.rejects(requestJson('test', 'https://provider.test/data', {
    fetchImpl: async () => { attempts += 1; return jsonResponse({}, 404); },
    logger: quietLogger,
    retryDelayMs: 0,
  }), (error) => error instanceof ProviderError && error.transient === false);
  assert.equal(attempts, 1);
});

test('request client logs provider, duration, attempt, and result for each attempt', async () => {
  const records = [];
  let attempts = 0;
  const result = await requestJson('test-provider', 'https://provider.test/data', {
    fetchImpl: async () => (++attempts === 1 ? jsonResponse({}, 503) : jsonResponse({ ok: true })),
    logger: {
      info(fields) { records.push(fields); },
      warn(fields) { records.push(fields); },
    },
    retryDelayMs: 0,
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(records.length, 2);
  assert.deepEqual(records.map(({ attempt, success }) => [attempt, success]), [[1, false], [2, true]]);
  for (const record of records) {
    assert.equal(record.provider, 'test-provider');
    assert.ok(Number.isFinite(record.durationMs));
  }
});

test('request client retries malformed responses as a permanent provider failure only once', async () => {
  let attempts = 0;
  await assert.rejects(requestJson('test', 'https://provider.test/data', {
    fetchImpl: async () => { attempts += 1; return new Response('{bad', { status: 200 }); },
    logger: quietLogger,
    retryDelayMs: 0,
  }), /malformed JSON/);
  assert.equal(attempts, 1);
});

test('request client applies a bounded timeout and retries network timeouts at most twice', async () => {
  let attempts = 0;
  await assert.rejects(requestJson('test', 'https://provider.test/slow', {
    fetchImpl: (_url, { signal }) => {
      attempts += 1;
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
    },
    logger: quietLogger,
    timeoutMs: 5_000,
    retryDelayMs: 0,
  }), (error) => error instanceof ProviderError && error.transient);
  assert.equal(attempts, 3);
});

test('timezone formatter returns local date and time with IANA timezone rules', () => {
  assert.deepEqual(getLocalDateTime('Asia/Kolkata', new Date('2026-01-01T00:00:00Z')), {
    date: '2026-01-01', time: '05:30:00', timeZone: 'Asia/Kolkata',
  });
  assert.throws(() => getLocalDateTime('Not/AZone'), RangeError);
});
