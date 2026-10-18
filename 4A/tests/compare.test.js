import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import { createCityService } from '../src/services/city.service.js';
import { createCompareService } from '../src/services/compare.service.js';

async function withServer(context, cityService) {
  const server = createApp({ cityService }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function cityServiceWithOneMissingCity() {
  return createCityService({
    geocoding: {
      async findCity(cityName) {
        if (cityName === 'Atlantis') return null;
        return {
          name: cityName, country: 'India', countryCode: 'IN', admin1: null,
          latitude: 18.5, longitude: 73.8, timezone: 'Asia/Kolkata',
        };
      },
    },
    weather: { async getWeather() { return { current: {}, forecast: [], units: {} }; } },
    currency: {
      getCurrency() { return { code: 'INR', name: 'Indian Rupee' }; },
      async getRateToInr() { return { base: 'INR', quote: 'INR', rate: 1, date: '2026-10-18' }; },
    },
  });
}

test('GET /compare returns ordered results and isolates a missing city', async (context) => {
  const baseUrl = await withServer(context, cityServiceWithOneMissingCity());
  const response = await fetch(`${baseUrl}/compare?cities=Pune,Hyderabad,Atlantis`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.results.map(({ requestedCity }) => requestedCity), ['Pune', 'Hyderabad', 'Atlantis']);
  assert.equal(body.results[0].success, true);
  assert.equal(body.results[1].data.city.name, 'Hyderabad');
  assert.equal(body.results[2].success, false);
  assert.match(body.results[2].error.message, /Atlantis/);
});

test('GET /compare rejects missing, empty, duplicate, malformed, and excessive input', async (context) => {
  const baseUrl = await withServer(context, cityServiceWithOneMissingCity());
  for (const query of ['', '?cities=', '?cities=Pune,,Hyderabad', '?cities=Pune,pune', '?cities=A,B,C,D,E,F']) {
    const response = await fetch(`${baseUrl}/compare${query}`);
    assert.equal(response.status, 400, `Expected 400 for ${query || 'missing cities'}`);
  }
  const invalidRefresh = await fetch(`${baseUrl}/compare?cities=Pune&refresh=yes`);
  assert.equal(invalidRefresh.status, 400);
});

test('comparison endpoint reuses the city cache and supports refresh', async (context) => {
  let geocodingCalls = 0;
  const service = cityServiceWithOneMissingCity();
  const baseUrl = await withServer(context, {
    ...service,
    async getCityWithCache(cityName, options) {
      const result = await service.getCityWithCache(cityName, options);
      if (result.cacheStatus !== 'HIT') geocodingCalls += 1;
      return result;
    },
    async getCity(cityName) { return service.getCity(cityName); },
  });
  const query = '/compare?cities=Pune,Hyderabad';

  const first = await fetch(`${baseUrl}${query}`);
  assert.equal(first.headers.get('x-cache'), 'MISS');
  await first.json();

  const cached = await fetch(`${baseUrl}${query}`);
  assert.equal(cached.headers.get('x-cache'), 'HIT');
  await cached.json();
  assert.equal(geocodingCalls, 2);

  const refreshed = await fetch(`${baseUrl}${query}&refresh=true`);
  assert.equal(refreshed.headers.get('x-cache'), 'BYPASS');
  await refreshed.json();
  assert.equal(geocodingCalls, 4);
});

test('comparison service limits concurrent lookups and preserves input order', async () => {
  let active = 0;
  let highestActive = 0;
  const service = createCompareService({
    async getCityWithCache(cityName) {
      active += 1;
      highestActive = Math.max(highestActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return { data: { city: { name: cityName } }, cacheStatus: 'MISS' };
    },
  }, 2);

  const result = await service.compare(['A', 'B', 'C', 'D', 'E']);
  assert.equal(highestActive, 2);
  assert.deepEqual(result.results.map(({ requestedCity }) => requestedCity), ['A', 'B', 'C', 'D', 'E']);
  assert.equal(result.cacheStatus, 'MISS');
});
