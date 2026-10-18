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
    async compare(cityNames, { refresh = false } = {}) {
      const results = new Array(cityNames.length);
      const cacheStatuses = new Array(cityNames.length);
      let nextIndex = 0;
      const workers = Array.from({ length: Math.min(workerCount, cityNames.length) }, async () => {
        while (nextIndex < cityNames.length) {
          const index = nextIndex;
          nextIndex += 1;
          const requestedCity = cityNames[index];
          try {
            const cityResult = await cityService.getCityWithCache(requestedCity, { refresh });
            results[index] = resultFor(requestedCity, cityResult.data);
            cacheStatuses[index] = cityResult.cacheStatus;
          } catch {
            results[index] = {
              requestedCity,
              success: false,
              data: null,
              error: { message: 'City data is temporarily unavailable.' },
            };
            cacheStatuses[index] = refresh ? 'BYPASS' : 'MISS';
          }
        }
      });
      await Promise.all(workers);
      const cacheStatus = refresh ? 'BYPASS'
        : cacheStatuses.every((status) => status === 'HIT') ? 'HIT' : 'MISS';
      return { results, cacheStatus };
    },
  };
}
