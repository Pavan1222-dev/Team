export function createCityController(cityService) {
  return {
    async getCity(request, response, next) {
      try {
        const { data: result, cacheStatus } = await cityService.getCityWithCache(request.cityName, {
          refresh: request.refresh,
        });
        response.set('X-Cache', cacheStatus);
        if (!result) {
          response.status(404).json({ error: `No city matching ${request.cityName} was found.` });
          return;
        }
        response.json(result);
      } catch (error) {
        next(error);
      }
    },
  };
}
