function resultFor(cityName, result) {
  if (!result) {
    return {
      requestedCity: cityName,
      success: false,
      data: null,
      error: { message: `No city matching ${cityName} was found.` },
    };
  }
  return { requestedCity: cityName, success: true, data: result, error: null };
}

export function createCompareService(cityService, concurrency = 2) {
  const workerCount = Math.max(1, Math.trunc(concurrency));

  return {
    async compare(cityNames) {
      const results = new Array(cityNames.length);
      let nextIndex = 0;
      const workers = Array.from({ length: Math.min(workerCount, cityNames.length) }, async () => {
        while (nextIndex < cityNames.length) {
          const index = nextIndex;
          nextIndex += 1;
          const requestedCity = cityNames[index];
          try {
            results[index] = resultFor(requestedCity, await cityService.getCity(requestedCity));
          } catch {
            results[index] = {
              requestedCity,
              success: false,
              data: null,
              error: { message: 'City data is temporarily unavailable.' },
            };
          }
        }
      });
      await Promise.all(workers);
      return { results };
    },
  };
}
