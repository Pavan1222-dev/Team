# Weather and Currency Aggregator

A small Express API that combines public city, weather, and exchange-rate data. It is designed as a learning project: the code is split into the HTTP layer, the city workflow, an external-request helper, and a tiny in-memory cache.

## Run it

Requirements: Node.js 20 or newer and npm.

```powershell
npm install
npm run dev
```

The server starts at `http://localhost:3000`. Both npm scripts load `.env` using Node's `--env-file` option. Copy `.env.example` to `.env`, then put your REST Countries API key in `RESTCOUNTRIES_API_KEY`. The key is sent as a bearer token and must not be committed to Git. Node.js 20.6 or newer is needed for `--env-file`.

```powershell
# If you don't have a .env yet, copy .env.example to .env; then add your key.
npm run dev
```

No API keys are needed. Keep any future keys in environment variables, never in source code.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Simple server health check |
| GET | `/city/:name` | Current weather, three-day forecast, local time, and currency rate against INR |
| GET | `/compare?cities=Hyderabad,Pune,Bengaluru` | Fetch the same data for 2–10 cities side by side |

Add `?refresh=true` to either data endpoint to skip cached values and fetch fresh data. Responses include a `cache` field, and the `X-Cache` header is `HIT` or `MISS`.

### Example: one city

`GET /city/Hyderabad`

```json
{
  "data": {
    "city": "Hyderabad",
    "location": {
      "country": "India",
      "countryCode": "IN",
      "latitude": 17.3753,
      "longitude": 78.4744
    },
    "currentWeather": {
      "time": "2026-10-22T12:15",
      "temperature_2m": 29.1,
      "relative_humidity_2m": 48,
      "apparent_temperature": 31.4,
      "is_day": 1,
      "precipitation": 0,
      "weather_code": 1,
      "wind_speed_10m": 8.2
    },
    "forecast": {
      "time": ["2026-10-22", "2026-10-23", "2026-10-24"],
      "weather_code": [1, 3, 2],
      "temperature_2m_max": [30.2, 29.8, 29.5],
      "temperature_2m_min": [21.4, 21.7, 21.3]
    },
    "localTime": "2026-10-22T12:15",
    "timezone": "Asia/Kolkata",
    "currency": {
      "code": "INR",
      "name": "Indian rupee",
      "rateToINR": 1,
      "rateDate": "2026-10-21"
    }
  },
  "warnings": [],
  "cache": "MISS"
}
```

Weather and currency numbers vary with the live APIs. `forecast` uses Open-Meteo daily arrays: index 0 in `time` pairs with index 0 in each temperature/code array. Weather codes are WMO codes.

### Example: compare

`GET /compare?cities=Hyderabad,Pune,Bengaluru`

```json
{
  "cities": [
    { "data": { "city": "Hyderabad", "currentWeather": {}, "forecast": {}, "localTime": "2026-10-22T12:15", "currency": {} }, "warnings": [], "cache": "MISS" },
    { "data": { "city": "Pune", "currentWeather": {}, "forecast": {}, "localTime": "2026-10-22T12:15", "currency": {} }, "warnings": [], "cache": "MISS" },
    { "data": { "city": "Bengaluru", "currentWeather": {}, "forecast": {}, "localTime": "2026-10-22T12:15", "currency": {} }, "warnings": [], "cache": "MISS" }
  ],
  "cache": "MISS"
}
```

The `{}` values above stand for the same full fields shown in the one-city example. In a real response, every city object contains the complete `data`, `warnings`, and `cache` values.

When an upstream provider fails, its section is `null` and a human-readable message is added to `warnings`; other successful sections are still returned. If the location lookup itself fails, the service cannot know which coordinates or country to query, so it returns the city name with null data and a warning.

## APIs used

1. **Open-Meteo Geocoding API** — turns a city name into coordinates and a country code: `https://geocoding-api.open-meteo.com/v1/search`.
2. **Open-Meteo Forecast API** — current conditions, three daily forecasts, timezone, and local current time: `https://api.open-meteo.com/v1/forecast`. `timezone=auto` asks the API to use the location's timezone.
3. **REST Countries v5** — gets the currency code and name for the geocoded country: `https://api.restcountries.com/countries/v5/codes.alpha_2/{countryCode}`. Its `currencies` field is an array of `{ code, name, symbol }` objects. This API requires a bearer token in `RESTCOUNTRIES_API_KEY`.
4. **Frankfurter** — gets the latest rate for one unit of the local currency expressed in INR: `https://api.frankfurter.dev/v2/rate/{currency}/INR`. When the local currency is already INR, the result is exactly `1`, so the service returns that directly without making a rate request.

## How the implementation works

### 1. Route layer: `src/app.js`

The routes validate the basic request shape, call the service, set `X-Cache`, and send JSON. The compare route accepts 2–10 comma-separated names. Keeping HTTP details here makes the data workflow reusable and easier to read separately.

### 2. Data workflow: `src/services/city-service.js`

For each city, the service first geocodes its name. That result is a dependency: weather needs latitude/longitude, while currency lookup needs a country code. Once it has those values, it starts the weather request and country request together with `Promise.allSettled`. `allSettled` waits for both without rejecting the whole operation when just one fails. After the country response identifies the currency, the service requests the INR exchange rate.

The compare endpoint starts each city's workflow together using `Promise.all`. The response keeps each city's warnings next to that city's data, so partial failures are clear. If a city's currency is INR, the currency-to-INR rate is exactly `1`, so no exchange-rate API call is needed for that city.

### 3. Resilient requests: `src/services/external-api.js`

`fetchJson` uses Node's built-in `fetch` and `async`/`await`. Each attempt has its own `AbortController` timeout (3 seconds by default). It tries at most three times total: the original attempt plus two retries, with a short increasing delay. It logs one JSON record per external call with its label, total elapsed milliseconds, attempt count, and success/failure. The timer is cleared after every attempt.

The timeout applies per attempt, as requested. A failing provider can therefore take longer than three seconds overall when retries and their delays are included; other independent providers continue and can still contribute data.

### 4. Cache: `src/services/cache.js`

The `Map` stores each normalized city result with an expiry time ten minutes in the future. A live cache hit skips all external requests, which is why it should return well below 50 ms on the same running server. Expired entries are removed on read. `refresh=true` bypasses the read and replaces the stored value after fetching. The cache is per process and is cleared when the server restarts.

## Project layout

```text
4A/
  src/
    app.js
    server.js
    services/
      cache.js
      city-service.js
      external-api.js
  .env.example
  package.json
  README.md
```
