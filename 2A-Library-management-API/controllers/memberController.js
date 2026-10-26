const memberService = require('../services/memberService');

async function createMember(req, res, next) {
  try {
    let result = await memberService.createMember(req.body);
    res.status(201).json({ success: true, data: result, error: null });
  } catch (error) {
    next(error);
  }
}

async function getMembers(req, res, next) {
  try {
    let page = Number(req.query.page) || 1;
    let limit = Number(req.query.limit) || 10;

    let result = await memberService.getMembers(page, limit);
    res.status(200).json({ success: true, data: result, error: null });
  } catch (error) {
    next(error);
  }
}

async function updateMember(req, res, next) {
  try {
    let id = Number(req.params.id);
    let result = await memberService.updateMember(id, req.body);
    res.status(200).json({ success: true, data: result, error: null });
  } catch (error) {
    next(error);
  }
}

async function deleteMember(req, res, next) {
  try {
    let id = Number(req.params.id);
    let result = await memberService.deleteMember(id);
    res.status(200).json({ success: true, data: result, error: null });
  } catch (error) {
    next(error);
  }
}

module.exports = { createMember, getMembers, updateMember, deleteMember };