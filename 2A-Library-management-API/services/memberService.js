const db = require('../data-access/db');
async function createMember(data) {
  const existing = await db.getOne('SELECT * FROM members WHERE email = ?', [data.email]);
  if (existing) {
    let err = new Error('A member with this email already exists.');
    err.status = 409;
    throw err;
  }

  let sql = 'INSERT INTO members (name, email, phone, membership_type) VALUES (?, ?, ?, ?)';
  await db.runQuery(sql, [data.name, data.email, data.phone, data.membership_type]);
  return { message: "Member created successfully" };
}
async function getMembers(page = 1, limit = 10) {
  let offset = (page - 1) * limit;
  return await db.getAll('SELECT * FROM members LIMIT ? OFFSET ?', [limit, offset]);
}
async function updateMember(id, data) {
  let sql = 'UPDATE members SET name = ?, phone = ?, membership_type = ? WHERE id = ?';
  await db.runQuery(sql, [data.name, data.phone, data.membership_type, id]);
  return { message: "Member updated successfully" };
}
async function deleteMember(id) {
  await db.runQuery('DELETE FROM members WHERE id = ?', [id]);
  return { message: "Member deleted successfully" };
}

module.exports = { createMember, getMembers, updateMember, deleteMember };