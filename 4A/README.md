# Weather and Currency Aggregator API

## Overview
A Node.js and Express REST API that retrieves current weather, a 3-day forecast, local time, and the country's currency exchange rate against INR.

## Technologies
- Node.js
- Express.js
- Axios
- Open-Meteo Geocoding and Weather APIs
- Frankfurter Exchange Rate API
- dotenv

## Features
- Get weather and currency information for a city.
- Compare multiple cities through a single endpoint.
- Cache city responses for 10 minutes.
- Bypass cache with `refresh=true`.
- Handle independent API failures using warnings.
- Retry failed external requests with a timeout.
- Log external API request durations.

## Installation
1. Install Node.js.
2. Clone or download the project.
3. Open the project folder in a terminal.
4. Install dependencies:

   `npm install`

5. Create a `.env` file in the project root:

   `PORT=3000`  
   `CACHE_TTL=600000`  
   `API_TIMEOUT=3000`  
   `MAX_RETRIES=2`

6. Start the server:

   `npm start`

For development, run `npm run dev` if the dev script is configured.

## API Endpoints

### 1. Get city information
`GET /city/:name`

Example: `/city/Hyderabad`

Returns city details, current weather, a 3-day forecast, local time, currency information, warnings, and cache status.

### 2. Compare cities
`GET /compare?cities=Hyderabad,Pune,Bengaluru`

Returns results for multiple cities. A maximum of 10 cities is allowed per request.

### 3. Refresh cached data
`GET /city/Hyderabad?refresh=true`

Bypasses the existing city cache and fetches fresh data.

## Error Handling
If weather or currency retrieval fails, the API returns the available information and includes a warning for the failed service. Invalid or unrecognized city names may return an error.

## Cache
Successful city results are cached in memory for 10 minutes by default. Cached data is lost when the server restarts.

## Notes
Exchange rates are reference rates and may not reflect real-time trading prices. Currency mappings are currently configured for a limited list of countries.
