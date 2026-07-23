const rateLimit = require('express-rate-limit');

/**
 * Rate limiter: 10 requests per minute per user (identified by JWT user id).
 * Applied specifically to /api/chat/ask.
 */
const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  keyGenerator: (req) => req.user?.id || req.ip, // per-user, fallback to IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded. You can make up to 10 requests per minute. Please wait.',
      retryAfter: 60,
    });
  },
  skip: (req) => !req.user, // skip if not authenticated (auth middleware handles it)
});

/**
 * General API rate limiter: 100 requests per 15 minutes (brute-force protection).
 */
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

module.exports = { chatRateLimiter, generalRateLimiter };
