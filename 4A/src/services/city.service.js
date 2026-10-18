import { createCurrencyProvider } from '../providers/currency-provider.js';
import { createGeocodingProvider } from '../providers/geocoding-provider.js';
import { createWeatherProvider } from '../providers/weather-provider.js';
import { getLocalDateTime } from '../providers/timezone-provider.js';

function publicProviderError() {
  const error = new Error('City lookup is temporarily unavailable.');
  error.statusCode = 502;
  return error;
}

function cityDetails(location) {
  return {
    name: location.name,
    country: location.country,
    countryCode: location.countryCode,
    region: location.admin1,
    coordinates: { latitude: location.latitude, longitude: location.longitude },
    timezone: location.timezone,
  };
}

export function createCityService({
  geocoding = createGeocodingProvider(),
  weather = createWeatherProvider(),
  currency = createCurrencyProvider(),
  now = () => new Date(),
} = {}) {
  return {
    async getCity(cityName) {
      let location;
      try {
        location = await geocoding.findCity(cityName);
      } catch {
        throw publicProviderError();
      }
      if (!location) return null;

      const warnings = [];
      if (location.hasAmbiguousMatches) {
        warnings.push('Several places matched this name; the exact-name match with the largest population was selected.');
      }

      const [weatherResult, currencyResult, timeResult] = await Promise.allSettled([
        weather.getWeather(location),
        (async () => {
          const details = currency.getCurrency(location.countryCode);
          try {
            const exchangeRateToInr = await currency.getRateToInr(details.code);
            return { ...details, exchangeRateToInr };
          } catch {
            warnings.push('The exchange rate is temporarily unavailable.');
            return { ...details, exchangeRateToInr: null };
          }
        })(),
        Promise.resolve().then(() => getLocalDateTime(location.timezone, now())),
      ]);

      const weatherData = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
      if (!weatherData) warnings.push('Weather data is temporarily unavailable.');

      let currencyData = currencyResult.status === 'fulfilled' ? currencyResult.value : null;
      if (!currencyData) warnings.push('Currency information is unavailable for this country.');

      const localTime = timeResult.status === 'fulfilled' ? timeResult.value : null;
      if (!localTime) warnings.push('Local time is unavailable because no valid timezone was provided.');

      return {
        city: cityDetails(location),
        currentWeather: weatherData?.current ?? null,
        forecast: weatherData?.forecast ?? [],
        weatherUnits: weatherData?.units ?? null,
        localTime,
        currency: currencyData,
        warnings,
      };
    },
  };
}
