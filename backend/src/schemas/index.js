const { z } = require('zod');

// ── Auth Schemas ──────────────────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  department: z.string().min(1, 'Department is required').max(100),
  role: z.enum(['employee', 'hr_admin']).default('employee'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ── Policy Schemas ────────────────────────────────────────────────────────────
const policyIngestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  category: z.string().min(1, 'Category is required').max(100),
  content: z.string().min(50, 'Policy content must be at least 50 characters'),
  access_level: z.enum(['global', 'manager']).default('global'),
});

// ── Chat Schemas ──────────────────────────────────────────────────────────────
const chatAskSchema = z.object({
  question: z
    .string()
    .min(5, 'Question must be at least 5 characters')
    .max(2000, 'Question too long'),
});

// ── Validation Middleware Factory ─────────────────────────────────────────────
const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    next(err); // Pass ZodError to centralized error handler
  }
};

module.exports = {
  registerSchema,
  loginSchema,
  policyIngestSchema,
  chatAskSchema,
  validate,
};
