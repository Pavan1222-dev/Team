import { ProviderError, requestJson } from './http-client.js';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

function normalizeCityName(value) {
  return value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').trim().toLocaleLowerCase('en');
}

function validateGeocodingResponse(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.results)) {
    throw new ProviderError('open-meteo-geocoding', 'Provider returned an unexpected geocoding response.');
  }
  return body.results;
}

function toLocation(result) {
  const latitude = Number(result.latitude);
  const longitude = Number(result.longitude);
  if (!result.name || !result.country_code || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    name: String(result.name),
    country: result.country ? String(result.country) : null,
    countryCode: String(result.country_code).toUpperCase(),
    admin1: result.admin1 ? String(result.admin1) : null,
    latitude,
    longitude,
    timezone: result.timezone ? String(result.timezone) : null,
    population: Number.isFinite(Number(result.population)) ? Number(result.population) : 0,
    featureCode: result.feature_code ? String(result.feature_code) : null,
  };
}

export function createGeocodingProvider(options = {}) {
  return {
    async findCity(cityName) {
      const url = new URL(GEOCODING_URL);
      url.searchParams.set('name', cityName.trim());
      url.searchParams.set('count', '10');
      url.searchParams.set('language', 'en');
      const results = await requestJson('open-meteo-geocoding', url, {
        ...options,
        validate: validateGeocodingResponse,
      });
      const locations = results.map(toLocation).filter(Boolean);
      if (locations.length === 0) return null;

      const requestedName = normalizeCityName(cityName);
      locations.sort((left, right) => {
        const leftExact = Number(normalizeCityName(left.name) === requestedName);
        const rightExact = Number(normalizeCityName(right.name) === requestedName);
        return rightExact - leftExact || right.population - left.population;
      });
      const selected = locations[0];
      return {
        ...selected,
        hasAmbiguousMatches: locations.filter((location) => (
          normalizeCityName(location.name) === normalizeCityName(selected.name)
        )).length > 1,
      };
    },
  };
}
