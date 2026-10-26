# Weather and Currency Aggregator (Project 4A)

This is a REST API that acts as an aggregator. It combines data from multiple free public APIs to provide the current weather, a 3-day forecast, local time, and currency exchange rate for a given city.

## APIs Used
1. **wttr.in**: Used to fetch the current temperature and 3-day weather forecast.
2. **ExchangeRate-API**: Used to fetch INR-based rates, converted to each city's local currency.
3. **TimeAPI.io**: Used to fetch the current time from the city's coordinates.
4. **CountriesNow**: Used to find each city's local currency from its country.

## Setup Instructions
1. Install dependencies: `npm install`
2. Start the server: `node index.js`
3. The terminal will log the exact response time of each external API call in milliseconds.

## Endpoints & Sample Responses

### 1. Get Single City Data
**GET** `/city/hyderabad`
*(Note: Add `?refresh=true` to the URL to bypass the 10-minute cache)*

**Sample Response:**
```json
{
  "source": "live_api",
  "data": {
    "city": "hyderabad",
    "current_weather": "32°C",
    "forecast_3_days": [
      "2026-10-18: 34°C",
      "2026-10-19: 33°C",
      "2026-10-20: 35°C"
    ],
    "local_time": "2026-10-18T15:30:00.000",
    "local_currency": "INR",
    "exchange_rate_to_inr": 1,
    "warnings": []
  }
}
