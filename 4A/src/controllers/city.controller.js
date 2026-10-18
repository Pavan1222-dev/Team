export function createCityController(cityService) {
  return {
    async getCity(request, response, next) {
      try {
        const result = await cityService.getCity(request.cityName);
        if (!result) {
          response.status(404).json({ error: `No city matching "${request.cityName}" was found.` });
          return;
        }
        response.json(result);
      } catch (error) {
        next(error);
      }
    },
  };
}
