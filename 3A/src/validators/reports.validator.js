import { positiveId, validateWith } from './shared.js';

export const validateHierarchyEmployeeId = validateWith((request) => ({
  id: positiveId(request.params.id, 'id'),
}));
