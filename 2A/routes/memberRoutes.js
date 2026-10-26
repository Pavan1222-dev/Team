import express from "express";
import * as memberController from "../controllers/memberController.js";
import { validate } from "../middlewares/validationMiddleware.js";
import {
  idParamsSchema,
  memberQuerySchema,
  memberSchema
} from "../validations/schemas.js";

// Define the CRUD URLs for members.
const router = express.Router();
router.get('/', validate(memberQuerySchema, 'query'), memberController.listMembers);
router.post('/', validate(memberSchema), memberController.createMember);
router.get('/:id', validate(idParamsSchema, 'params'), memberController.getMember);
router.put(
  '/:id',
  validate(idParamsSchema, 'params'),
  validate(memberSchema),
  memberController.updateMember
);
router.delete('/:id', validate(idParamsSchema, 'params'), memberController.deleteMember);
export default router;