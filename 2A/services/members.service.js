const REPOSITORY_CONFLICTS = new Map([
  ['MEMBER_EMAIL_CONFLICT', 409],
  ['MEMBER_HAS_LOANS', 409],
]);

async function handleRepositoryConflicts(operation) {
  try {
    return await operation();
  } catch (error) {
    const status = REPOSITORY_CONFLICTS.get(error.code);
    if (!status) {
      throw error;
    }

    const conflict = new Error(error.message, { cause: error });
    conflict.status = status;
    throw conflict;
  }
}

export function createMembersService(repository) {
  return {
    async createMember(member) {
      return handleRepositoryConflicts(() => repository.create(member));
    },

    async listMembers(options) {
      return repository.list(options);
    },

    async getMemberById(id) {
      return repository.getById(id);
    },

    async updateMember(id, changes) {
      return handleRepositoryConflicts(() => repository.update(id, changes));
    },

    async deleteMember(id) {
      return handleRepositoryConflicts(() => repository.delete(id));
    },
  };
}
