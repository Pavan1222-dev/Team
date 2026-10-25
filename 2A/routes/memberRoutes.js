
const express = require("express");
const router = express.Router();
const validate = require("../middleware/validate");
const { memberSchema } = require("../validations/memberValidation");

const memberController = require("../controllers/memberController");

router.get("/", memberController.getAllMembers);
router.get("/:id", memberController.getMemberById);
router.post("/", validate(memberSchema), memberController.createMember);
router.put("/:id", validate(memberSchema), memberController.updateMember);
router.delete("/:id", memberController.deleteMember);

module.exports = router;
