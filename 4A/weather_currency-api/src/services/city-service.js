import { readCache, writeCache } from './cache.js';
import { fetchJson } from './external-api.js';

const geocodingUrl = 'https://geocoding-api.open-meteo.com/v1/search';
const weatherUrl = 'https://api.open-meteo.com/v1/forecast';
const currencyUrl = 'https://api.frankfurter.dev/v2/rate';
const countryUrl = 'https://api.restcountries.com/countries/v5/codes.alpha_2/';

function cityKey(name) {
  return `city:${name.trim().toLocaleLowerCase()}`;
}

async function loadCity(name) {
  const warnings = [];
  const encodedName = encodeURIComponent(name);
  let location;

  try {
    const geocoding = await fetchJson('open-meteo-geocoding', `${geocodingUrl}?name=${encodedName}&count=1&language=en&format=json`);
    location = geocoding.results?.[0];
  } catch (error) {
    return { data: { city: name, location: null, currentWeather: null, forecast: null, localTime: null, currency: null }, warnings: [`Location lookup unavailable: ${error.message}`] };
  }

  if (!location) {
    return { data: { city: name, location: null, currentWeather: null, forecast: null, localTime: null, currency: null }, warnings: ['City was not found by the location service.'] };
  }

  const [weatherResult, countryResult] = await Promise.allSettled([
    fetchJson('open-meteo-weather', `${weatherUrl}?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=3&timezone=auto`),
    fetchJson('rest-countries', `${countryUrl}/${encodeURIComponent(location.country_code)}?response_fields=names.common,codes.alpha_2,currencies`)
  ]);

  let weather = null;
  if (weatherResult.status === 'fulfilled') weather = weatherResult.value;
  else warnings.push(`Weather service unavailable: ${weatherResult.reason.message}`);

  let currency = null;
  if (countryResult.status === 'rejected') {
    warnings.push(`Country/currency lookup unavailable: ${countryResult.reason.message}`);
  } else {
    // REST Countries v5 wraps the matching records in data.objects.
    const country = countryResult.value?.data?.objects?.[0];
    const currencies = country?.currencies ?? [];
    // v5 returns [{ code, name, symbol }], while older versions used a code-keyed map.
    const [code, details] = Array.isArray(currencies)
      ? [currencies[0]?.code, currencies[0]]
      : Object.entries(currencies)[0] ?? [];
    if (!code) {
      warnings.push('No currency was listed for this country.');
    } else if (code === 'INR') {
      // One rupee is exactly one rupee; no external rate request is needed.
      currency = { code, name: details?.name ?? code, rateToINR: 1, rateDate: null };
    } else {
      try {
        const exchange = await fetchJson('frankfurter-exchange-rate', `${currencyUrl}/${encodeURIComponent(code)}/INR`);
        const rate = exchange.rate;
        if (typeof rate === 'number') currency = { code, name: details?.name ?? code, rateToINR: rate, rateDate: exchange.date };
        else warnings.push(`Frankfurter has no INR rate for ${code}.`);
      } catch (error) {
        warnings.push(`Exchange-rate service unavailable: ${error.message}`);
      }
    }
  }

  return {
    data: {
      city: location.name,
      location: { country: location.country, countryCode: location.country_code, latitude: location.latitude, longitude: location.longitude },
      currentWeather: weather?.current ?? null,
      forecast: weather?.daily ?? null,
      localTime: weather?.current?.time ?? null,
      timezone: weather?.timezone ?? null,
      currency
    },
    warnings
  };
}

export async function getCityData(name, refresh = false) {
  const key = cityKey(name);
  if (!refresh) {
    const cached = readCache(key);
    if (cached) return { body: { ...cached, cache: 'HIT' }, cache: 'HIT' };
  }
  const body = { ...await loadCity(name), cache: 'MISS' };
  writeCache(key, body);
  return { body, cache: 'MISS' };
}

export async function getCompareData(names, refresh = false) {
  const results = await Promise.all(names.map((name) => getCityData(name, refresh)));
  const cache = results.every((result) => result.cache === 'HIT') ? 'HIT' : 'MISS';
  return { body: { cities: results.map((result) => result.body), cache }, cache };
}
