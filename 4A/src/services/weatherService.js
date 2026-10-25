
const { apiRequest } = require("../utils/apiClient");

const GEO_URL =
  "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast";

async function getCityCoordinates(cityName) {
  const data = await apiRequest(GEO_URL, {
    name: cityName,
    count: 1,
    language: "en",
    format: "json",
  });

  if (!data.results || data.results.length === 0) {
    throw new Error(`City not found: ${cityName}`);
  }

  const city = data.results[0];

  return {
    name: city.name,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
  };
}

async function getWeatherForCity(city) {
  const data = await apiRequest(WEATHER_URL, {
    latitude: city.latitude,
    longitude: city.longitude,
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    forecast_days: 3,
    timezone: "auto",
  });

  return {
    city: city.name,
    country: city.country,
    coordinates: {
      latitude: city.latitude,
      longitude: city.longitude,
    },
    currentWeather: {
      temperature: data.current?.temperature_2m,
      humidity: data.current?.relative_humidity_2m,
      feelsLike: data.current?.apparent_temperature,
      weatherCode: data.current?.weather_code,
      windSpeed: data.current?.wind_speed_10m,
    },
    forecast: (data.daily?.time || []).map((date, index) => ({
      date,
      weatherCode: data.daily.weather_code[index],
      maxTemperature: data.daily.temperature_2m_max[index],
      minTemperature: data.daily.temperature_2m_min[index],
    })),
    localTime: data.current?.time,
    timezone: data.timezone,
  };
}

module.exports = { getCityCoordinates, getWeatherForCity };
