const VALID_CITY_CHARACTERS = /^[\p{L}\p{M}\p{N} .,'’()\-]+$/u;

export function validateCityName(request, response, next) {
  const cityName = typeof request.params.name === 'string' ? request.params.name.trim() : '';
  if (cityName.length < 1 || cityName.length > 100 || !VALID_CITY_CHARACTERS.test(cityName)) {
    response.status(400).json({ error: 'City name must be 1 to 100 characters and contain a valid city name.' });
    return;
  }
  request.cityName = cityName;
  next();
}
