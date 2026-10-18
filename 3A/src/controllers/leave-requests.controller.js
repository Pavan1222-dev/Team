import { asyncHandler } from '../middleware/async-handler.js';

export function createLeaveRequestsController(service) {
  return {
    create: asyncHandler(async (request, response) => {
      response.status(201).json({ data: await service.create(request.validated) });
    }),
    list: asyncHandler(async (request, response) => {
      response.json({ data: await service.list(request.validated) });
    }),
    get: asyncHandler(async (request, response) => {
      response.json({ data: await service.get(request.validated.id) });
    }),
    approve: asyncHandler(async (request, response) => {
      const { id, reviewerId } = request.validated;
      response.json({ data: await service.approve(id, reviewerId) });
    }),
    reject: asyncHandler(async (request, response) => {
      const { id, reviewerId } = request.validated;
      response.json({ data: await service.reject(id, reviewerId) });
    }),
  };
}
