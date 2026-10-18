# Weather and Currency Aggregator

Node.js and Express service that combines city geocoding, weather, local time, and currency data from public providers. The health route, tested provider clients, city lookup, and city comparison endpoints are currently available; caching is added in a later stage.

## Requirements and setup

- Node.js 20 or later
- npm

```sh
npm install
Copy-Item .env.example .env
npm run dev
```

The service listens on port `3000` by default. Set `PORT` in `.env` to use another port. The selected public APIs do not need provider keys.

## Current endpoint

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Return `{ "status": "ok" }` |
| GET | `/city/:name` | Return city, weather, local time, and currency details |
| GET | `/compare?cities=Hyderabad,Pune,Bengaluru` | Return isolated results for up to five cities |

### City lookup

```sh
curl "http://localhost:3000/city/Pune"
```

The city name is trimmed and must be 1–100 characters, using letters, digits, spaces, and common punctuation. An unresolved name returns `404`; malformed input returns `400`. If geocoding itself is unavailable, the endpoint returns a sanitized `502` error.

Example response (provider values vary):

```json
{
  "city": {
    "name": "Pune",
    "country": "India",
    "countryCode": "IN",
    "region": "Maharashtra",
    "coordinates": { "latitude": 18.52, "longitude": 73.85 },
    "timezone": "Asia/Kolkata"
  },
  "currentWeather": {
    "temperature": 30.1,
    "feelsLike": 31.4,
    "humidity": 62,
    "precipitation": 0,
    "windSpeed": 8.2,
    "code": 1,
    "description": "Mainly clear",
    "observedAt": "2026-10-18T12:00"
  },
  "forecast": [
    { "date": "2026-10-18", "code": 1, "description": "Mainly clear", "high": 31, "low": 23, "precipitationProbability": 10 }
  ],
  "weatherUnits": { "temperature": "degrees Celsius", "windSpeed": "km/h", "precipitation": "mm" },
  "localTime": { "date": "2026-10-18", "time": "17:30:00", "timeZone": "Asia/Kolkata" },
  "currency": {
    "code": "INR",
    "name": "Indian Rupee",
    "exchangeRateToInr": { "base": "INR", "quote": "INR", "rate": 1, "date": "2026-10-18" }
  },
  "warnings": []
}
```

Weather, exchange-rate, and local-time retrieval are independent. If a secondary provider fails, the endpoint returns available fields and a `warnings` entry; unavailable weather fields are `null` and its forecast is an empty array. Provider details are kept out of API responses. When geocoding returns multiple same-name locations, the service selects an exact normalized name and then the largest population, and includes a warning in the response.

### Compare cities

```sh
curl "http://localhost:3000/compare?cities=Hyderabad,Pune,Bengaluru"
```

The `cities` query parameter is required, comma-separated, and accepts at most five distinct valid city names. Empty elements, duplicates (case and accent insensitive), or too many names return `400`. Results preserve the requested order and include `requestedCity`, `success`, `data`, and `error` for each entry. One city failing does not discard the rest:

```json
{
  "results": [
    { "requestedCity": "Pune", "success": true, "data": { "city": { "name": "Pune" }, "warnings": [] }, "error": null },
    { "requestedCity": "Atlantis", "success": false, "data": null, "error": { "message": "No city matching Atlantis was found." } }
  ]
}
```

Comparisons run with at most two city lookups at a time, limiting outbound request bursts while retaining parallel work.

## Provider clients

Provider modules are isolated under `src/providers/` and normalize upstream data for the city aggregation service.

- Open-Meteo Geocoding resolves city names to country, coordinates, and an IANA timezone. When multiple results match, the client prefers an exact normalized name and then the largest population; it reports whether same-name results are ambiguous.
- Open-Meteo Forecast supplies current conditions and up to three daily forecasts. The API is keyless for non-commercial use and requires attribution under CC BY 4.0. See [Open-Meteo documentation](https://open-meteo.com/en/docs) and [terms](https://open-meteo.com/en/terms).
- Frankfurter supplies currency exchange rates against INR and does not require an API key. Rates are based on daily reference data, not real-time trading prices. See [Frankfurter documentation](https://frankfurter.dev/).
- `country-to-currency` maps the geocoded ISO country code to a currency. Local date and time are formatted with Node's `Intl` APIs using the geocoded IANA timezone.

Each upstream attempt is capped at three seconds and transient failures are retried at most twice. The provider client logs each attempt and duration. Invalid client responses and malformed JSON are not retried. Caching is not implemented yet.

## Commands

```sh
npm start
npm run dev
npm test
npm run lint
```

The application can be imported from `src/app.js` without starting a listener. `src/server.js` owns process startup. `src/services/city.service.js` resolves the city and runs independent weather, currency, and local-time work in parallel. `Promise.allSettled` keeps secondary failures from cancelling other results.
