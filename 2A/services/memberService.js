
const memberRepository = require("../data-access/memberRepository");

function getAllMembers() {
  return memberRepository.getAllMembers();
}

function getMemberById(id) {
  return memberRepository.getMemberById(id);
}

function createMember(member) {
  return memberRepository.createMember(member);
}

function updateMember(id, member) {
  return memberRepository.updateMember(id, member);
}

function deleteMember(id) {
  return memberRepository.deleteMember(id);
}

module.exports = {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember
};
