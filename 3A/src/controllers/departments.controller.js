import { asyncHandler } from '../middleware/async-handler.js';

export function createDepartmentsController(service) {
  return {
    create: asyncHandler(async (request, response) => {
      const data = await service.create(request.validated);
      response.status(201).json({ data });
    }),
    list: asyncHandler(async (request, response) => {
      response.json({ data: await service.list(request.validated) });
    }),
    get: asyncHandler(async (request, response) => {
      response.json({ data: await service.get(request.validated.id) });
    }),
    update: asyncHandler(async (request, response) => {
      response.json({ data: await service.update(request.validated.id, request.validated.fields) });
    }),
    delete: asyncHandler(async (request, response) => {
      await service.delete(request.validated.id);
      response.status(204).end();
    }),
  };
}
