
const db = require("../database/db");

function getAllMembers() {
  return db.prepare("SELECT * FROM members").all();
}

function getMemberById(id) {
  return db.prepare(
    "SELECT * FROM members WHERE id = ?"
  ).get(id);
}

function createMember(member) {
  const result = db.prepare(`
    INSERT INTO members (name, email, phone, membership_type)
    VALUES (?, ?, ?, ?)
  `).run(
    member.name,
    member.email,
    member.phone,
    member.membership_type
  );

  return getMemberById(result.lastInsertRowid);
}

function updateMember(id, member) {
  db.prepare(`
    UPDATE members
    SET name = ?, email = ?, phone = ?, membership_type = ?
    WHERE id = ?
  `).run(
    member.name,
    member.email,
    member.phone,
    member.membership_type,
    id
  );

  return getMemberById(id);
}

function deleteMember(id) {
  return db.prepare(
    "DELETE FROM members WHERE id = ?"
  ).run(id);
}

module.exports = {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember
};
