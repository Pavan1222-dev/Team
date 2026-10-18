export function createCompareController(compareService) {
  return {
    async compareCities(request, response, next) {
      try {
        const result = await compareService.compare(request.cityNames, { refresh: request.refresh });
        response.set('X-Cache', result.cacheStatus);
        response.json({ results: result.results });
      } catch (error) {
        next(error);
      }
    },
  };
}
