# Weather and Currency Aggregator

Node.js and Express service that will combine city geocoding, weather, local time, and currency data from public providers. The implementation is delivered in stages; this first stage exposes the health route and establishes the project structure.

## Requirements and setup

- Node.js 20 or later
- npm

```sh
npm install
Copy-Item .env.example .env
npm run dev
```

The service listens on port `3000` by default. Set `PORT` in `.env` to use another port. No provider keys are needed for the planned public APIs.

## Current endpoint

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Return `{ "status": "ok" }` |

## Commands

```sh
npm start
npm run dev
npm test
npm run lint
```

The application can be imported from `src/app.js` without starting a listener. `src/server.js` owns process startup. Provider calls will be isolated in provider modules and called by the city aggregation service in later stages.
