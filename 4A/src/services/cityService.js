const { getCityCoordinates, getWeatherForCity } = require("./weatherService");
const { getCurrency } = require("./currencyService");

async function getCityData(cityName) {
  const city = await getCityCoordinates(cityName);

  // Fetch weather and currency independently and in parallel.
  const results = await Promise.allSettled([
    getWeatherForCity(city),
    getCurrency(city.country),
  ]);

  let weather = null;
  let currency = null;
  const warnings = [];

  if (results[0].status === "fulfilled") {
    weather = results[0].value;
  } else {
    warnings.push({
      service: "weather",
      message: results[0].reason.message,
    });
  }

  if (results[1].status === "fulfilled") {
    currency = results[1].value;
  } else {
    warnings.push({
      service: "currency",
      message: results[1].reason.message,
    });
  }

  return {
    city: city.name,
    country: city.country,
    weather,
    currency,
    warnings,
  };
}

module.exports = { getCityData };