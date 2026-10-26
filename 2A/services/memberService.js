import * as memberData from "../data_access/memberData.js";

// Use this error for missing members and duplicate emails.
class ServiceError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Return a page of members and information about the page.
async function listMembers(query) {
  const result = await memberData.listMembers({
    sortBy: query.sortBy === "membershipType" ? "membership_type" : query.sortBy,
    order: query.order.toUpperCase(),
    limit: query.limit,
    offset: (query.page - 1) * query.limit
  });

  return {
    items: result.items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      pages: Math.ceil(result.total / query.limit)
    }
  };
}

// Find one member by its id.
async function getMember(id) {
  const member = await memberData.findMemberById(id);
  if (!member) throw new ServiceError(404, "MEMBER_NOT_FOUND", "Member not found.");
  return member;
}

// Email addresses must be unique.
async function createMember(input) {
  if (await memberData.findMemberByEmail(input.email)) {
    throw new ServiceError(409, "DUPLICATE_EMAIL", "A member with this email already exists.");
  }
  return memberData.createMember(input);
}

// Update a member without taking another member's email.
async function updateMember(id, input) {
  await getMember(id);
  const existing = await memberData.findMemberByEmail(input.email);
  if (existing && existing.id !== id) {
    throw new ServiceError(409, "DUPLICATE_EMAIL", "A member with this email already exists.");
  }
  const member = await memberData.updateMember(id, input);
  if (!member) throw new ServiceError(404, "MEMBER_NOT_FOUND", "Member not found.");
  return member;
}

// Delete a member if it exists and has no loans.
async function deleteMember(id) {
  if (!(await memberData.deleteMember(id))) {
    throw new ServiceError(404, "MEMBER_NOT_FOUND", "Member not found.");
  }
}

export { createMember, deleteMember, getMember, listMembers, updateMember };
