const Joi = require('joi');

const emailSchema = Joi.string()
  .trim()
  .lowercase()
  .email()
  .max(254)
  .required()
  .messages({
    'string.empty': 'Email cannot be empty',
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required',
  });

const nameSchema = Joi.string()
  .trim()
  .max(100)
  .required()
  .messages({
    'string.empty': 'Name cannot be empty',
    'any.required': 'Name is required',
  });
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/)
  .required()
  .messages({
    'string.empty': 'Password cannot be empty',
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base':
      'Password must include uppercase, lowercase, number, and special character',
    'any.required': 'Password is required',
  });

const registerSchema = Joi.object({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchema
});

const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required(),
});

function validate(schema) {
  return (req, res, next) => {
    const source = req.body || {};
    const { error, value } = schema.validate(source, { abortEarly: false, stripUnknown: true });
    if (error) {
      const details = error.details.map(d => ({ message: d.message, path: d.path }));
      return res.status(400).json({ error: 'Validation failed', details });
    }

    req.body = value;
    next();
  }
};

module.exports = {
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
  schemas: { registerSchema, loginSchema },
};