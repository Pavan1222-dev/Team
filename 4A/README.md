# Weather and Currency Aggregator

A small Node.js API that combines public city, weather, local-time, and currency data. It uses only Node.js built-in modules and does not need API keys or installed packages.

## Setup and configuration

Use Node.js 18 or newer. No API keys or npm dependencies are required.

```sh
npm install
npm start
```

The server listens on port `3001` by default. Set `PORT` to a valid available port to
change it; no `.env` file is required.

## Endpoints

- `GET /city/Hyderabad` returns current weather, a 3-day forecast, local time, and the local currency's value in INR.
- `GET /compare?cities=Hyderabad,Pune,Bengaluru` returns the same data for each city.
- Add `?refresh=true` to either endpoint to skip the cache and fetch fresh data.

Responses include a `cached` field. The `X-Cache` response header is `HIT` for cached data and `MISS` for newly fetched data.

If an external service fails, its data field is `null` and the response includes a warning. Other available data is still returned.

## Public APIs used

- [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) — city coordinates, country code, and time zone.
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs) — current conditions and a 3-day forecast.
- [CountriesNow](https://countriesnow.space/) — country currency codes.
- [Frankfurter](https://frankfurter.dev/) — exchange rates, with the local currency as the base and INR as the target.

These APIs do not require API keys. The server caches endpoint responses in memory for 10 minutes. External requests have a 3-second timeout, up to two retries, and log their duration to the console.

## Design decisions

- Node's built-in HTTP and `fetch` APIs keep the service dependency-free.
- Independent weather and currency lookups run concurrently; a failed upstream is
  reported as a warning without discarding the other available data.
- The in-memory cache is intentionally process-local and expires after ten minutes.
- City input is URL-decoded, then validated and bounded before requests are made.

## Sample response

`GET /city/Hyderabad`

```json
{
  "city": "Hyderabad",
  "weather": {
    "current": {
      "time": "2025-01-01T12:00",
      "temperature_2m": 28.4,
      "relative_humidity_2m": 45,
      "apparent_temperature": 29.1,
      "weather_code": 1,
      "wind_speed_10m": 8.2
    },
    "forecast": [
      {
        "date": "2025-01-01",
        "weatherCode": 1,
        "temperatureMax": 30.2,
        "temperatureMin": 19.4
      }
    ]
  },
  "localTime": "Jan 1, 2025, 12:00:00 PM",
  "currency": {
    "code": "INR",
    "rateToINR": 1
  },
  "warnings": [],
  "cached": false
}
```

The forecast contains three entries in an actual response. Weather values and sample dates above are illustrative.
