import { once } from 'node:events';
import { performance } from 'node:perf_hooks';
import { createApp } from '../src/app.js';
import { createCityService } from '../src/services/city.service.js';
import { logger } from '../src/utils/logger.js';

logger.level = 'silent';

const cityService = createCityService({
  geocoding: {
    async findCity(cityName) {
      return {
        name: cityName, country: 'Benchmark', countryCode: 'IN', admin1: null,
        latitude: 1, longitude: 1, timezone: 'Asia/Kolkata',
      };
    },
  },
  weather: { async getWeather() { return { current: null, forecast: [], units: null }; } },
  currency: {
    getCurrency() { return { code: 'INR', name: 'Indian Rupee' }; },
    async getRateToInr() { return { base: 'INR', quote: 'INR', rate: 1, date: '2026-01-01' }; },
  },
});

const server = createApp({ cityService }).listen(0, '127.0.0.1');
await once(server, 'listening');

try {
  const url = `http://127.0.0.1:${server.address().port}/city/benchmark`;
  for (let index = 0; index < 10; index += 1) {
    const response = await fetch(url);
    await response.arrayBuffer();
  }

  const durations = [];
  for (let index = 0; index < 100; index += 1) {
    const startedAt = performance.now();
    const response = await fetch(url);
    await response.arrayBuffer();
    if (response.headers.get('x-cache') !== 'HIT') throw new Error('Expected benchmark request to be a cache hit.');
    durations.push(performance.now() - startedAt);
  }
  durations.sort((left, right) => left - right);
  const averageMs = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  const p95Ms = durations[Math.ceil(durations.length * 0.95) - 1];
  console.log(`Cached HTTP response latency (100 local requests after 10 warmups): average ${averageMs.toFixed(2)} ms, p95 ${p95Ms.toFixed(2)} ms, max ${durations.at(-1).toFixed(2)} ms.`);
} finally {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
