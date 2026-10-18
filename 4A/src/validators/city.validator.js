const VALID_CITY_CHARACTERS = /^[\p{L}\p{M}\p{N} .,'’()\-]+$/u;

export function isValidCityName(cityName) {
  return cityName.length >= 1
    && cityName.length <= 100
    && /[\p{L}\p{N}]/u.test(cityName)
    && VALID_CITY_CHARACTERS.test(cityName);
}

export function validateCityName(request, response, next) {
  const cityName = typeof request.params.name === 'string' ? request.params.name.trim() : '';
  if (!isValidCityName(cityName)) {
    response.status(400).json({ error: 'City name must be 1 to 100 characters and contain a valid city name.' });
    return;
  }
  request.cityName = cityName;
  next();
}

export function validateCompareQuery(request, response, next) {
  const rawCities = request.query.cities;
  const configuredLimit = Number(process.env.MAX_COMPARE_CITIES ?? 5);
  const maximum = Number.isInteger(configuredLimit) && configuredLimit > 0
    ? Math.min(configuredLimit, 5)
    : 5;

  if (typeof rawCities !== 'string' || rawCities.trim().length === 0) {
    response.status(400).json({ error: 'Query parameter "cities" must contain comma-separated city names.' });
    return;
  }

  const cities = rawCities.split(',').map((city) => city.trim());
  if (cities.some((city) => !isValidCityName(city))) {
    response.status(400).json({ error: 'Each city name must be 1 to 100 characters and contain a valid city name.' });
    return;
  }

  const normalizedCities = cities.map((city) => city.normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('en'));
  if (new Set(normalizedCities).size !== cities.length) {
    response.status(400).json({ error: 'Duplicate city names are not allowed.' });
    return;
  }
  if (cities.length > maximum) {
    response.status(400).json({ error: `At most ${maximum} cities may be compared at once.` });
    return;
  }

  request.cityNames = cities;
  next();
}
