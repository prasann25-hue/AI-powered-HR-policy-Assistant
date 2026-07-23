/**
 * Middleware factory: Require a specific user role.
 * Must be used AFTER authenticateJWT middleware.
 * @param {string} role - Required role (e.g., 'hr_admin')
 */
const requireRole = (role) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  if (req.user.role !== role) {
    return res.status(403).json({
      error: `Access denied. This endpoint requires the '${role}' role.`,
    });
  }
  next();
};

module.exports = { requireRole };
