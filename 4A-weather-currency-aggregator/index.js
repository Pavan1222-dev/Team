require('dotenv').config(); 
const express = require('express');
const { fetchWithRetry } = require('./apiService');

const app = express();
app.use(express.json());


const cache = {};
const CACHE_LIMIT_MS = 10 * 60 * 1000;


async function getCityData(city) {

  const weatherUrl = `https://wttr.in/${city}?format=j1`;
  const currencyUrl = `https://open.er-api.com/v6/latest/INR`;
  const results = await Promise.allSettled([
    fetchWithRetry('Weather', weatherUrl),
    fetchWithRetry('Currency', currencyUrl) 
  ]);

  let citySummary = {
    city: city,
    current_weather: null,
    forecast_3_days: null,
    local_time: null,
    local_currency: null,
    exchange_rate_to_inr: null,
    warnings: []
  };

  if (results[0].status === 'fulfilled') {
    let weatherData = results[0].value;
    const area = weatherData.nearest_area[0];
    const country = area.country[0].value;
    const latitude = area.latitude;
    const longitude = area.longitude;
    citySummary.current_weather = weatherData.current_condition[0].temp_C + "°C";

    let forecast = [];
    for (let i = 0; i < 3; i++) {
      forecast.push(weatherData.weather[i].date + ": " + weatherData.weather[i].maxtempC + "°C");
    }
    citySummary.forecast_3_days = forecast;
    const locationResults = await Promise.allSettled([
      fetchWithRetry('Time', `https://timeapi.io/api/Time/current/coordinate?latitude=${latitude}&longitude=${longitude}`),
      fetchWithRetry('Country currency', `https://countriesnow.space/api/v0.1/countries/currency/q?country=${encodeURIComponent(country)}`)
    ]);

    if (locationResults[0].status === 'fulfilled') {
      citySummary.local_time = locationResults[0].value.dateTime;
    } else {
      citySummary.warnings.push("Local time data is currently unavailable.");
    }

    const currencyCode = locationResults[1].status === 'fulfilled' ? locationResults[1].value.data?.currency : null;

    if (currencyCode) {
      citySummary.local_currency = currencyCode;

      if (results[1].status === 'fulfilled' && results[1].value.rates[currencyCode]) {
        citySummary.exchange_rate_to_inr = 1 / results[1].value.rates[currencyCode];
      } else {
        citySummary.warnings.push("Currency exchange data is currently unavailable.");
      }
    } else {
      citySummary.warnings.push("Local currency data is currently unavailable.");
    }

  } else {
    citySummary.warnings.push("Weather data is currently unavailable.");
  }


  return citySummary;
}


app.get('/city/:name', async (req, res) => {
  const city = req.params.name.toLowerCase();
  const forceRefresh = req.query.refresh === 'true';


  if (forceRefresh === false && cache[city] !== undefined) {
    const timeSinceSaved = Date.now() - cache[city].timestamp;
    
    if (timeSinceSaved < CACHE_LIMIT_MS) {

      return res.status(200).json({
        source: "cache",
        data: cache[city].data
      });
    }
  }


  const freshData = await getCityData(city);

  cache[city] = {
    timestamp: Date.now(),
    data: freshData
  };

  return res.status(200).json({
    source: "live_api",
    data: freshData
  });
});

app.get('/compare', async (req, res) => {
  const citiesString = req.query.cities;
  
  if (!citiesString) {
    return res.status(400).json({ error: "Please provide cities in the URL. Example: ?cities=Hyderabad,Pune" });
  }

  const citiesArray = citiesString.split(',').map(city => city.trim().toLowerCase()).filter(Boolean);
  const compareResults = await Promise.all(citiesArray.map(city => getCityData(city)));

  return res.status(200).json({
    source: "live_api",
    data: compareResults
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Weather & Currency Aggregator running on http://localhost:${PORT}`);
});
