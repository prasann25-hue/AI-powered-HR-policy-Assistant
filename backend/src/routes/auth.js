const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/supabase');
const { validate, registerSchema, loginSchema } = require('../schemas');
const { generalRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Apply general rate limiter to auth routes (brute-force protection)
router.use(generalRateLimiter);

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name, department, role } = req.body;

    // Check if user already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({ email, password_hash, name, department, role })
      .select('id, email, name, department, role, created_at')
      .single();

    if (error) throw error;

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, department: user.department },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, department: user.department },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, password_hash, role, department, created_at')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, department: user.department },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, department: user.department },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
