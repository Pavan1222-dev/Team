import { all, get, run } from "./dbConnection.js";

// Give member fields readable names in API responses.
const MEMBER_SELECT = `
  SELECT id, name, email, phone,
         membership_type AS membershipType
  FROM members
`;

// Return only one page of members.
async function listMembers({ sortBy, order, limit, offset }) {
  const countRow = await get('SELECT COUNT(*) AS total FROM members');
  const rows = await all(
    `${MEMBER_SELECT} ORDER BY ${sortBy} ${order}, id ASC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return { items: rows, total: countRow.total };
}

// Find a member by id or email.
function findMemberById(id) {
  return get(`${MEMBER_SELECT} WHERE id = ?`, [id]);
}

function findMemberByEmail(email) {
  return get(`${MEMBER_SELECT} WHERE email = ? COLLATE NOCASE`, [email]);
}

async function createMember(member) {
  const result = await run(
    'INSERT INTO members (name, email, phone, membership_type) VALUES (?, ?, ?, ?)',
    [member.name, member.email, member.phone, member.membershipType]
  );
  return findMemberById(result.lastID);
}

// Replace all member fields with the new values.
async function updateMember(id, member) {
  const result = await run(
    `UPDATE members
     SET name = ?, email = ?, phone = ?, membership_type = ?
     WHERE id = ?`,
    [member.name, member.email, member.phone, member.membershipType, id]
  );
  return result.changes ? findMemberById(id) : null;
}

// Delete a member and let SQLite reject it if a loan refers to them.
async function deleteMember(id) {
  const result = await run('DELETE FROM members WHERE id = ?', [id]);
  return result.changes > 0;
}

export {
  createMember,
  deleteMember,
  findMemberByEmail,
  findMemberById,
  listMembers,
  updateMember
};