require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const policyRoutes = require('./routes/policies');
const chatRoutes = require('./routes/chat');
const interactionRoutes = require('./routes/interactions');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & Logging Middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000',
    ].filter(Boolean);

    if (allowed.includes(origin) || allowed.includes('*') || origin.endsWith('.vercel.app') || origin.endsWith('.netlify.app')) {
      return callback(null, true);
    }
    
    callback(null, true); // Fallback: allow for seamless deployment
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// SSE-safe: don't parse body for SSE routes, only parse JSON for others
app.use((req, res, next) => {
  if (req.path === '/api/chat/ask') return next();
  express.json({ limit: '10mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/interactions', interactionRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Centralized Error Handler ─────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ HR Policy Assistant API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
