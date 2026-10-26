const http = require('node:http');

const PORT = Number(process.env.PORT) || 3001;
const CACHE_TTL = 10 * 60 * 1000;
const cache = new Map();
let countryCurrencies;
let countryCurrenciesExpiresAt = 0;
let countryCurrenciesRequest;

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchJson(url, serviceName) {
  const maximumAttempts = 3;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3001);
    const startedAt = Date.now();

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `[external] ${serviceName} attempt ${attempt} completed in ${Date.now() - startedAt}ms (success)`,
      );
      return data;
    } catch (error) {
      console.log(
        `[external] ${serviceName} attempt ${attempt} completed in ${Date.now() - startedAt}ms (failed)`,
      );

      if (attempt === maximumAttempts) {
        throw new Error(`${serviceName}: ${getErrorMessage(error)}`);
      }

      await sleep(250 * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function findCity(cityName) {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', cityName);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const data = await fetchJson(url, 'Open-Meteo geocoding');
  return data.results && data.results.length > 0 ? data.results[0] : null;
}

async function getWeather(latitude, longitude, timezone) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', latitude);
  url.searchParams.set('longitude', longitude);
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m');
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
  url.searchParams.set('forecast_days', '3');
  url.searchParams.set('timezone', timezone);

  const data = await fetchJson(url, 'Open-Meteo weather');
  return {
    current: data.current,
    forecast: data.daily.time.map((date, index) => ({
      date,
      weatherCode: data.daily.weather_code[index],
      temperatureMax: data.daily.temperature_2m_max[index],
      temperatureMin: data.daily.temperature_2m_min[index],
    })),
  };
}

async function getCountryCurrencies() {
  if (countryCurrencies && countryCurrenciesExpiresAt > Date.now()) {
    return countryCurrencies;
  }

  if (!countryCurrenciesRequest) {
    countryCurrenciesRequest = fetchJson(
      'https://countriesnow.space/api/v0.1/countries/currency',
      'CountriesNow country currencies',
    )
      .then((data) => {
        if (!Array.isArray(data.data)) {
          throw new Error('CountriesNow: country currency data is missing');
        }

        countryCurrencies = data.data;
        countryCurrenciesExpiresAt = Date.now() + CACHE_TTL;
        return countryCurrencies;
      })
      .finally(() => {
        countryCurrenciesRequest = null;
      });
  }

  return countryCurrenciesRequest;
}

async function getCurrency(countryCode) {
  const countries = await getCountryCurrencies();
  const country = countries.find(
    (item) => item.iso2 && item.iso2.toUpperCase() === countryCode.toUpperCase(),
  );
  const currencyCode = country && country.currency;

  if (!currencyCode) {
    throw new Error(`CountriesNow: no currency was found for country code ${countryCode}`);
  }

  if (currencyCode === 'INR') {
    return { code: currencyCode, rateToINR: 1 };
  }

  const rateUrl = new URL('https://api.frankfurter.dev/v1/latest');
  rateUrl.searchParams.set('base', currencyCode);
  rateUrl.searchParams.set('symbols', 'INR');

  const rateData = await fetchJson(rateUrl, 'Frankfurter exchange rates');
  const rateToINR = rateData.rates && rateData.rates.INR;

  if (typeof rateToINR !== 'number') {
    throw new Error(`Frankfurter: no INR exchange rate was found for ${currencyCode}`);
  }

  return { code: currencyCode, rateToINR };
}

function getLocalTime(timezone) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: timezone,
  }).format(new Date());
}

function emptyCityData(cityName, warnings) {
  return {
    city: cityName,
    weather: null,
    localTime: null,
    currency: null,
    warnings,
  };
}

async function getCityData(cityName) {
  let location;

  try {
    location = await findCity(cityName);
  } catch (error) {
    return emptyCityData(cityName, [getErrorMessage(error)]);
  }

  if (!location) {
    return emptyCityData(cityName, [`Open-Meteo geocoding: no results found for "${cityName}"`]);
  }

  const warnings = [];
  const [weatherResult, currencyResult] = await Promise.allSettled([
    getWeather(location.latitude, location.longitude, location.timezone),
    getCurrency(location.country_code),
  ]);

  const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
  const currency = currencyResult.status === 'fulfilled' ? currencyResult.value : null;

  if (weatherResult.status === 'rejected') {
    warnings.push(getErrorMessage(weatherResult.reason));
  }
  if (currencyResult.status === 'rejected') {
    warnings.push(getErrorMessage(currencyResult.reason));
  }

  return {
    city: location.name || cityName,
    weather,
    localTime: location.timezone ? getLocalTime(location.timezone) : null,
    currency,
    warnings,
  };
}

function getCachedResponse(key) {
  const cached = cache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

function saveCachedResponse(key, data) {
  for (const [cachedKey, value] of cache) {
    if (value.expiresAt <= Date.now()) {
      cache.delete(cachedKey);
    }
  }

  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

function sendJson(response, statusCode, data, cacheStatus) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Cache': cacheStatus,
  });
  response.end(JSON.stringify(data));
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Only GET requests are supported' }, 'BYPASS');
    return;
  }

  const refresh = url.searchParams.get('refresh') === 'true';
  const cityMatch = url.pathname.match(/^\/city\/(.+)$/);

  if (cityMatch) {
    let cityName;
    try {
      cityName = decodeURIComponent(cityMatch[1]).trim();
    } catch {
      sendJson(response, 400, { error: 'Invalid city name' }, 'BYPASS');
      return;
    }

    if (!cityName || cityName.length > 100 || /[\u0000-\u001F\u007F]/.test(cityName)) {
      sendJson(response, 400, { error: 'City name must contain between 1 and 100 valid characters' }, 'BYPASS');
      return;
    }

    const cacheKey = `city:${cityName.toLowerCase()}`;
    const cached = refresh ? null : getCachedResponse(cacheKey);
    if (cached) {
      sendJson(response, 200, { ...cached, cached: true }, 'HIT');
      return;
    }

    const data = await getCityData(cityName);
    const responseData = { ...data, cached: false };
    saveCachedResponse(cacheKey, responseData);
    sendJson(response, 200, responseData, 'MISS');
    return;
  }

  if (url.pathname === '/compare') {
    const citiesValue = url.searchParams.get('cities');
    const cities = citiesValue ? citiesValue.split(',').map((city) => city.trim()).filter(Boolean) : [];

    if (
      cities.length === 0 ||
      cities.length > 10 ||
      cities.some((city) => city.length > 100 || /[\u0000-\u001F\u007F]/.test(city))
    ) {
      sendJson(response, 400, { error: 'Provide between 1 and 10 valid city names (up to 100 characters each)' }, 'BYPASS');
      return;
    }

    const cacheKey = `compare:${cities.map((city) => city.toLowerCase()).join('|')}`;
    const cached = refresh ? null : getCachedResponse(cacheKey);
    if (cached) {
      sendJson(response, 200, { ...cached, cached: true }, 'HIT');
      return;
    }

    const results = await Promise.allSettled(cities.map((city) => getCityData(city)));
    const cityData = results.map((result, index) => (
      result.status === 'fulfilled'
        ? result.value
        : emptyCityData(cities[index], [getErrorMessage(result.reason)])
    ));
    const responseData = { cities: cityData, cached: false };
    saveCachedResponse(cacheKey, responseData);
    sendJson(response, 200, responseData, 'MISS');
    return;
  }

  sendJson(response, 404, { error: 'Route not found' }, 'BYPASS');
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(`[server] ${getErrorMessage(error)}`);
    if (!response.headersSent) {
      sendJson(response, 500, { error: 'Internal server error' }, 'BYPASS');
    } else {
      response.end();
    }
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Weather and currency aggregator listening on port http://localhost:${PORT}`);
  });
}

module.exports = { server };
