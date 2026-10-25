
const memberService = require("../services/memberService");

function getAllMembers(req, res) {
  const members = memberService.getAllMembers();

  res.status(200).json({
    success: true,
    count: members.length,
    data: members
  });
}

function getMemberById(req, res) {
  const member = memberService.getMemberById(
    Number(req.params.id)
  );

  if (!member) {
    return res.status(404).json({
      success: false,
      error: "Member not found"
    });
  }

  res.status(200).json({
    success: true,
    data: member
  });
}

function createMember(req, res) {
  try {
    const member = memberService.createMember(req.body);

    res.status(201).json({
      success: true,
      data: member
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        success: false,
        error: "Email already exists"
      });
    }

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

function updateMember(req, res) {
  try {
    const id = Number(req.params.id);
    const existingMember = memberService.getMemberById(id);

    if (!existingMember) {
      return res.status(404).json({
        success: false,
        error: "Member not found"
      });
    }

    const member = memberService.updateMember(id, req.body);

    res.status(200).json({
      success: true,
      data: member
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        success: false,
        error: "Email already exists"
      });
    }

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

function deleteMember(req, res) {
  try {
    const id = Number(req.params.id);
    const existingMember = memberService.getMemberById(id);

    if (!existingMember) {
      return res.status(404).json({
        success: false,
        error: "Member not found"
      });
    }

    memberService.deleteMember(id);

    res.status(204).end();
  } catch (error) {
    res.status(409).json({
      success: false,
      error: "Member cannot be deleted because loan records exist"
    });
  }
}

module.exports = {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember
};
