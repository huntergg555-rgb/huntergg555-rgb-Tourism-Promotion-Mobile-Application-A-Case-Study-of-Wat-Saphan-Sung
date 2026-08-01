const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const db = require('./config/database');
const authRoutes = require('./routes/auth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// API Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Auth Bypass Demo API is running',
    timestamp: new Date().toISOString(),
    database: 'TiDB Cloud'
  });
});

// Start server
async function startServer() {
  try {
    await db.initialize();
    await db.createUsersTable();
    await db.createAttackLogsTable();
    await db.seedDemoUsers();

    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║  🔓 Auth Bypass Demo API Server                 ║
║                                                  ║
║  📍 http://localhost:${PORT}                       ║
║  📊 API: http://localhost:${PORT}/api              ║
║  🗄️  Database: TiDB Cloud (MySQL)               ║
║  🎯 Demo: SQL Injection & Session Hijacking      ║
║                                                  ║
╚══════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});

startServer();
