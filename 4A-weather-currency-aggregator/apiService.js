const axios = require('axios');


async function fetchWithRetry(apiName, url, retries = 2) {
  let startTime = Date.now();

  try {

    let response = await axios.get(url, { timeout: 3000 });
    let timeTaken = Date.now() - startTime;
    console.log(`[SUCCESS] ${apiName} API took ${timeTaken} milliseconds.`);

    return response.data;

  } catch (error) {

    if (retries > 0) {
      console.log(`[RETRY] ${apiName} API failed. Waiting and trying again... (${retries} retries left)`);


      await new Promise(function (resolve) {
        setTimeout(resolve, 500);
      });


      return fetchWithRetry(apiName, url, retries - 1);
    }


    let timeTaken = Date.now() - startTime;
    console.log(`[FAILED] ${apiName} API permanently failed after ${timeTaken} milliseconds.`);
    throw error;
  }
}

module.exports = { fetchWithRetry };