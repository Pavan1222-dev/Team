import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import { createCityCache } from '../src/services/city-cache.js';
import { createCityService } from '../src/services/city.service.js';

async function withServer(context, cityService) {
  const server = createApp({ cityService }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function createCountingService() {
  const calls = { geocoding: 0, weather: 0, currency: 0 };
  const service = createCityService({
    geocoding: {
      async findCity(cityName) {
        calls.geocoding += 1;
        return {
          name: `${cityName} ${calls.geocoding}`, country: 'India', countryCode: 'IN',
          latitude: 18.5, longitude: 73.8, timezone: 'Asia/Kolkata',
        };
      },
    },
    weather: {
      async getWeather() {
        calls.weather += 1;
        return { current: { temperature: 25 }, forecast: [], units: {} };
      },
    },
    currency: {
      getCurrency() { return { code: 'INR', name: 'Indian Rupee' }; },
      async getRateToInr() {
        calls.currency += 1;
        return { base: 'INR', quote: 'INR', rate: 1, date: '2026-10-18' };
      },
    },
  });
  return { service, calls };
}

test('city cache normalizes names, clones values, and expires at its TTL', () => {
  let currentTime = 0;
  const cache = createCityCache({ ttlMs: 1_000, now: () => currentTime });
  const initial = { city: { name: 'São Paulo' } };
  cache.set('  SÃO   PAULO ', initial);
  initial.city.name = 'mutated outside the cache';

  const cached = cache.get('sao paulo');
  assert.equal(cached.city.name, 'São Paulo');
  cached.city.name = 'mutated after retrieval';
  assert.equal(cache.get('São Paulo').city.name, 'São Paulo');

  currentTime = 1_000;
  assert.equal(cache.get('sao paulo'), undefined);
});

test('city endpoint returns MISS, HIT, and BYPASS and refresh replaces cached data', async (context) => {
  const { service, calls } = createCountingService();
  const baseUrl = await withServer(context, service);

  const firstResponse = await fetch(`${baseUrl}/city/Pune`);
  const firstBody = await firstResponse.json();
  assert.equal(firstResponse.headers.get('x-cache'), 'MISS');
  assert.equal(firstBody.city.name, 'Pune 1');

  const hitResponse = await fetch(`${baseUrl}/city/%20PUNE%20`);
  assert.equal(hitResponse.headers.get('x-cache'), 'HIT');
  assert.equal((await hitResponse.json()).city.name, 'Pune 1');
  assert.deepEqual(calls, { geocoding: 1, weather: 1, currency: 1 });

  const refreshResponse = await fetch(`${baseUrl}/city/Pune?refresh=true`);
  assert.equal(refreshResponse.headers.get('x-cache'), 'BYPASS');
  assert.equal((await refreshResponse.json()).city.name, 'Pune 2');

  const replacementHit = await fetch(`${baseUrl}/city/Pune`);
  assert.equal(replacementHit.headers.get('x-cache'), 'HIT');
  assert.equal((await replacementHit.json()).city.name, 'Pune 2');
  assert.equal(calls.geocoding, 2);
  assert.equal(calls.weather, 2);
});

test('partial city responses are cached and invalid refresh values are rejected', async (context) => {
  let geocodingCalls = 0;
  const service = createCityService({
    geocoding: {
      async findCity(cityName) {
        geocodingCalls += 1;
        return {
          name: cityName, country: 'India', countryCode: 'IN', latitude: 18.5,
          longitude: 73.8, timezone: 'Asia/Kolkata',
        };
      },
    },
    weather: { async getWeather() { throw new Error('weather is down'); } },
    currency: {
      getCurrency() { return { code: 'INR', name: 'Indian Rupee' }; },
      async getRateToInr() { return { rate: 1 }; },
    },
  });
  const baseUrl = await withServer(context, service);
  const first = await fetch(`${baseUrl}/city/Pune`);
  assert.equal(first.headers.get('x-cache'), 'MISS');
  assert.equal((await first.json()).warnings.length, 1);

  const cached = await fetch(`${baseUrl}/city/Pune`);
  assert.equal(cached.headers.get('x-cache'), 'HIT');
  assert.equal((await cached.json()).currentWeather, null);
  assert.equal(geocodingCalls, 1);

  const invalid = await fetch(`${baseUrl}/city/Pune?refresh=maybe`);
  assert.equal(invalid.status, 400);
});
