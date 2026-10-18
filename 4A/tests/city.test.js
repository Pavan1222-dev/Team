import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import { ProviderError } from '../src/providers/http-client.js';
import { createCityService } from '../src/services/city.service.js';

const location = {
  name: 'Pune', country: 'India', countryCode: 'IN', admin1: 'Maharashtra',
  latitude: 18.52, longitude: 73.85, timezone: 'Asia/Kolkata', hasAmbiguousMatches: false,
};
const weatherData = {
  current: { temperature: 30, description: 'Clear sky' },
  forecast: [{ date: '2026-10-18' }, { date: '2026-10-19' }, { date: '2026-10-20' }],
  units: { temperature: '°C' },
};

async function withServer(context, service) {
  const server = createApp({ cityService: service }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function serviceFor({ geocodingResult = location, geocodingError, weatherResult = weatherData,
  weatherError, currencyResult = { code: 'INR', name: 'Indian Rupee', exchangeRateToInr: { rate: 1 } },
  currencyError } = {}) {
  return createCityService({
    geocoding: {
      async findCity() {
        if (geocodingError) throw geocodingError;
        return geocodingResult;
      },
    },
    weather: {
      async getWeather() {
        if (weatherError) throw weatherError;
        return weatherResult;
      },
    },
    currency: {
      getCurrency() {
        return { code: 'INR', name: 'Indian Rupee' };
      },
      async getRateToInr() {
        if (currencyError) throw currencyError;
        return currencyResult.exchangeRateToInr;
      },
    },
    now: () => new Date('2026-10-18T00:00:00.000Z'),
  });
}

test('GET /city/:name returns city, current weather, three-day forecast, local time, and currency', async (context) => {
  const baseUrl = await withServer(context, serviceFor());
  const response = await fetch(`${baseUrl}/city/%20Pune%20`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.city.name, 'Pune');
  assert.equal(body.currentWeather.temperature, 30);
  assert.equal(body.forecast.length, 3);
  assert.equal(body.localTime.timeZone, 'Asia/Kolkata');
  assert.equal(body.currency.code, 'INR');
  assert.deepEqual(body.warnings, []);
});

test('secondary provider failures return available data with warnings', async (context) => {
  const baseUrl = await withServer(context, serviceFor({
    weatherError: new Error('upstream weather details should not be exposed'),
    currencyError: new Error('upstream currency details should not be exposed'),
  }));
  const response = await fetch(`${baseUrl}/city/Pune`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.currentWeather, null);
  assert.deepEqual(body.forecast, []);
  assert.equal(body.currency.code, 'INR');
  assert.equal(body.currency.exchangeRateToInr, null);
  assert.equal(body.localTime.timeZone, 'Asia/Kolkata');
  assert.equal(body.warnings.length, 2);
  assert.equal(JSON.stringify(body).includes('upstream'), false);
});

test('unresolved city returns 404 and invalid names return 400', async (context) => {
  const baseUrl = await withServer(context, serviceFor({ geocodingResult: null }));
  const missing = await fetch(`${baseUrl}/city/Atlantis`);
  assert.equal(missing.status, 404);
  assert.match((await missing.json()).error, /No city matching/);

  const invalid = await fetch(`${baseUrl}/city/%20%20`);
  assert.equal(invalid.status, 400);

  const malformedJson = await fetch(`${baseUrl}/city/Pune`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
  assert.equal(malformedJson.status, 400);
  assert.deepEqual(await malformedJson.json(), { error: 'The request could not be parsed.' });
});

test('geocoding provider failure returns a sanitized gateway error', async (context) => {
  const baseUrl = await withServer(context, serviceFor({ geocodingError: new Error('private upstream detail') }));
  const response = await fetch(`${baseUrl}/city/Pune`);
  const body = await response.json();
  assert.equal(response.status, 502);
  assert.equal(body.error, 'The city data service is temporarily unavailable.');
  assert.equal(JSON.stringify(body).includes('private upstream'), false);
});

test('a timed-out weather provider becomes a partial-response warning', async (context) => {
  const timeout = new ProviderError('open-meteo-weather', 'The provider request timed out.', { transient: true });
  const baseUrl = await withServer(context, serviceFor({ weatherError: timeout }));
  const response = await fetch(`${baseUrl}/city/Pune`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.currentWeather, null);
  assert.ok(body.warnings.includes('Weather data is temporarily unavailable.'));
  assert.equal(JSON.stringify(body).includes('timed out'), false);
});

test('city aggregation begins weather and currency retrieval independently', async () => {
  let weatherCalled = false;
  let currencyCalled = false;
  let releaseWeather;
  let releaseCurrency;
  const weatherGate = new Promise((resolve) => { releaseWeather = resolve; });
  const currencyGate = new Promise((resolve) => { releaseCurrency = resolve; });
  const service = createCityService({
    geocoding: { async findCity() { return location; } },
    weather: { getWeather() { weatherCalled = true; return weatherGate; } },
    currency: {
      getCurrency() { return { code: 'USD', name: 'US Dollar' }; },
      getRateToInr() { currencyCalled = true; return currencyGate; },
    },
  });
  const pending = service.getCity('Pune');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(weatherCalled, true);
  assert.equal(currencyCalled, true);
  releaseWeather(weatherData);
  releaseCurrency({ base: 'USD', quote: 'INR', rate: 80, date: '2026-10-17' });
  assert.equal((await pending).currency.exchangeRateToInr.rate, 80);
});
