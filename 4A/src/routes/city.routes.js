import { Router } from 'express';
import { validateCityName } from '../validators/city.validator.js';

export function createCityRouter(controller) {
  const router = Router();
  router.get('/city/:name', validateCityName, controller.getCity);
  return router;
}
