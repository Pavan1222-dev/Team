import * as memberService from "../services/memberService.js";

// Controllers connect a route to the service and return an HTTP response.
// Read members for the requested page.
async function listMembers(_request, response) {
  const data = await memberService.listMembers(response.locals.validated.query);
  response.status(200).json({ success: true, data, error: null });
}

// Read one member.
async function getMember(_request, response) {
  const { id } = response.locals.validated.params;
  const data = await memberService.getMember(id);
  response.status(200).json({ success: true, data, error: null });
}

// Save a new member and respond with 201 Created.
async function createMember(_request, response) {
  const data = await memberService.createMember(response.locals.validated.body);
  response.status(201).json({ success: true, data, error: null });
}

// Save changes to an existing member.
async function updateMember(_request, response) {
  const { id } = response.locals.validated.params;
  const data = await memberService.updateMember(id, response.locals.validated.body);
  response.status(200).json({ success: true, data, error: null });
}

// Delete a member and respond with 204 No Content.
async function deleteMember(_request, response) {
  const { id } = response.locals.validated.params;
  await memberService.deleteMember(id);
  response.status(204).end();
}

export { createMember, deleteMember, getMember, listMembers, updateMember };