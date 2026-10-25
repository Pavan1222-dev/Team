
const axios = require("axios");

const API_TIMEOUT = Number(process.env.API_TIMEOUT) || 3000;
const MAX_RETRIES = Number(process.env.MAX_RETRIES) || 2;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function apiRequest(url, params = {}, config = {}) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const startTime = Date.now();

    try {
      const response = await axios.get(url, {
    ...config,
    params,
    timeout: API_TIMEOUT,
    });

      console.log(
        `[API] ${url} | Attempt ${attempt + 1} | ${Date.now() - startTime} ms`
      );

      return response.data;
    } catch (error) {
      lastError = error;

      console.error(
        `[API ERROR] ${url} | Attempt ${attempt + 1} | ${
          Date.now() - startTime
        } ms | ${error.message}`
      );

      if (attempt < MAX_RETRIES) {
        const delay = 500 * (attempt + 1);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

module.exports = { apiRequest };
