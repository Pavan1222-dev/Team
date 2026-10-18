import { errorResponse, successResponse } from '../utils/responses.js';

export function createMembersController(service) {
  return {
    createMember: async function createMember(request, response, next) {
      try {
        const member = await service.createMember(request.body);
        response.status(201).json(successResponse(member));
      } catch (error) {
        next(error);
      }
    },
    listMembers: async function listMembers(request, response, next) {
      try {
        const { members, totalItems } = await service.listMembers(request.validatedQuery);
        const { page, limit } = request.validatedQuery;
        response.json(successResponse({
          members,
          pagination: {
            page,
            limit,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
          },
        }));
      } catch (error) {
        next(error);
      }
    },
    getMember: async function getMember(request, response, next) {
      try {
        const member = await service.getMemberById(request.memberId);
        if (!member) {
          response.status(404).json(errorResponse('Member not found.'));
          return;
        }

        response.json(successResponse(member));
      } catch (error) {
        next(error);
      }
    },
    updateMember: async function updateMember(request, response, next) {
      try {
        const member = await service.updateMember(request.memberId, request.body);
        if (!member) {
          response.status(404).json(errorResponse('Member not found.'));
          return;
        }

        response.json(successResponse(member));
      } catch (error) {
        next(error);
      }
    },
    deleteMember: async function deleteMember(request, response, next) {
      try {
        const deleted = await service.deleteMember(request.memberId);
        if (!deleted) {
          response.status(404).json(errorResponse('Member not found.'));
          return;
        }

        response.status(204).end();
      } catch (error) {
        next(error);
      }
    },
  };
}
