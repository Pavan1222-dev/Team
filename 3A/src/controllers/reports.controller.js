import { asyncHandler } from '../middleware/async-handler.js';

export function createReportsController(service) {
  return {
    departmentHeadcount: asyncHandler(async (_request, response) => {
      response.json({ data: await service.departmentHeadcount() });
    }),
    employeesOnLeaveToday: asyncHandler(async (_request, response) => {
      response.json({ data: await service.employeesOnLeaveToday() });
    }),
    managerHierarchy: asyncHandler(async (request, response) => {
      response.json({ data: await service.managerHierarchy(request.validated.id) });
    }),
  };
}
