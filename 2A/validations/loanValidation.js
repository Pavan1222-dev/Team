
const Joi = require("joi");

const issueLoanSchema = Joi.object({
  book_id: Joi.number().integer().positive().required(),
  member_id: Joi.number().integer().positive().required()
});

module.exports = { issueLoanSchema };
