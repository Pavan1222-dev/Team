import { Router } from 'express';
import { validateCityName, validateCompareQuery } from '../validators/city.validator.js';

export function createCityRouter(controller, compareController) {
  const router = Router();
  router.get('/compare', validateCompareQuery, compareController.compareCities);
  router.get('/city/:name', validateCityName, controller.getCity);
  return router;
}
