const express = require('express');
const { z } = require('zod');
const memberController = require('../controllers/memberController');
const validateBody = require('../middleware/validate');

const router = express.Router();
const memberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email address"),
  phone: z.string().min(10, "Phone number is required"),
  membership_type: z.string().min(1, "Membership type is required")
});

router.post('/', validateBody(memberSchema), memberController.createMember);
router.get('/', memberController.getMembers);
router.put('/:id', validateBody(memberSchema), memberController.updateMember);
router.delete('/:id', memberController.deleteMember);

module.exports = router;