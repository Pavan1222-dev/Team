# Weather and Currency Aggregator

Node.js and Express service that combines city geocoding, weather, local time, and currency data from public providers. Implementation is delivered in stages. The health route and tested provider clients are currently available; city aggregation endpoints are added in later stages.

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

## Provider clients

Provider modules are isolated under `src/providers/` and normalize upstream data for the aggregation service. They are implemented and tested, but are not yet exposed as HTTP endpoints.

- Open-Meteo Geocoding resolves city names to country, coordinates, and an IANA timezone. When multiple results match, the client prefers an exact normalized name and then the largest population; it reports whether same-name results are ambiguous.
- Open-Meteo Forecast supplies current conditions and up to three daily forecasts. The API is keyless for non-commercial use and requires attribution under CC BY 4.0. See [Open-Meteo documentation](https://open-meteo.com/en/docs) and [terms](https://open-meteo.com/en/terms).
- Frankfurter supplies currency exchange rates against INR and does not require an API key. Rates are based on daily reference data, not real-time trading prices. See [Frankfurter documentation](https://frankfurter.dev/).
- `country-to-currency` maps the geocoded ISO country code to a currency. Local date and time are formatted with Node's `Intl` APIs using the geocoded IANA timezone.

Each upstream attempt is capped at three seconds and transient failures are retried at most twice. The provider client logs each attempt and duration. Invalid client responses and malformed JSON are not retried. City and comparison endpoints, partial-result warnings, and caching are not implemented yet.

## Commands

```sh
npm start
npm run dev
npm test
npm run lint
```

The application can be imported from `src/app.js` without starting a listener. `src/server.js` owns process startup. Provider calls are isolated in provider modules and will be coordinated by a city aggregation service in later stages.
