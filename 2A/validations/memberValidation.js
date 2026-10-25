
const Joi = require("joi");

const memberSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  email: Joi.string().trim().email().required(),
  phone: Joi.string().trim().pattern(/^[0-9]{10}$/).required()
    .messages({
      "string.pattern.base": "Phone must contain exactly 10 digits"
    }),
  membership_type: Joi.string()
    .valid("Standard", "Premium")
    .required()
});

module.exports = { memberSchema };
