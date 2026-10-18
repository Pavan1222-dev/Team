import { ProviderError, requestJson } from './http-client.js';

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
const WEATHER_CODES = new Map([
  [0, 'Clear sky'], [1, 'Mainly clear'], [2, 'Partly cloudy'], [3, 'Overcast'],
  [45, 'Fog'], [48, 'Rime fog'], [51, 'Light drizzle'], [53, 'Drizzle'], [55, 'Heavy drizzle'],
  [61, 'Light rain'], [63, 'Rain'], [65, 'Heavy rain'], [71, 'Light snow'], [73, 'Snow'], [75, 'Heavy snow'],
  [80, 'Rain showers'], [81, 'Heavy rain showers'], [82, 'Violent rain showers'],
  [95, 'Thunderstorm'], [96, 'Thunderstorm with hail'], [99, 'Thunderstorm with heavy hail'],
]);

function labelFor(code) {
  return WEATHER_CODES.get(Number(code)) ?? 'Unknown conditions';
}

function validateWeatherResponse(body) {
  if (!body || typeof body !== 'object' || !body.current || !body.daily
    || !Array.isArray(body.daily.time) || !Array.isArray(body.daily.weather_code)
    || !Array.isArray(body.daily.temperature_2m_max) || !Array.isArray(body.daily.temperature_2m_min)) {
    throw new ProviderError('open-meteo-weather', 'Provider returned an unexpected weather response.');
  }
  return body;
}

export function createWeatherProvider(options = {}) {
  return {
    async getWeather(location) {
      const url = new URL(WEATHER_URL);
      url.searchParams.set('latitude', String(location.latitude));
      url.searchParams.set('longitude', String(location.longitude));
      url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m');
      url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
      url.searchParams.set('forecast_days', '3');
      url.searchParams.set('timezone', location.timezone || 'auto');

      const body = await requestJson('open-meteo-weather', url, {
        ...options,
        validate: validateWeatherResponse,
      });
      const current = body.current;
      const daily = body.daily;
      return {
        current: {
          temperature: current.temperature_2m ?? null,
          feelsLike: current.apparent_temperature ?? null,
          humidity: current.relative_humidity_2m ?? null,
          precipitation: current.precipitation ?? null,
          windSpeed: current.wind_speed_10m ?? null,
          code: current.weather_code ?? null,
          description: labelFor(current.weather_code),
          observedAt: current.time ?? null,
        },
        forecast: daily.time.slice(0, 3).map((date, index) => ({
          date,
          code: daily.weather_code[index] ?? null,
          description: labelFor(daily.weather_code[index]),
          high: daily.temperature_2m_max[index] ?? null,
          low: daily.temperature_2m_min[index] ?? null,
          precipitationProbability: daily.precipitation_probability_max?.[index] ?? null,
        })),
        units: {
          temperature: body.current_units?.temperature_2m ?? 'degrees Celsius',
          windSpeed: body.current_units?.wind_speed_10m ?? 'km/h',
          precipitation: body.current_units?.precipitation ?? 'mm',
        },
      };
    },
  };
}
