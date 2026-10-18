export function createCompareController(compareService) {
  return {
    async compareCities(request, response, next) {
      try {
        response.json(await compareService.compare(request.cityNames));
      } catch (error) {
        next(error);
      }
    },
  };
}
