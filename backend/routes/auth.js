const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');
require('dotenv').config();

/**
 * POST /api/auth/register
 * สมัครสมาชิก (ปลอดภัย - ใช้ Parameterized Query)
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name, phone } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน (username, email, password)'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
      });
    }

    const existing = await db.execute(
      'SELECT COUNT(*) AS cnt FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing[0].cnt > 0) {
      return res.status(409).json({
        success: false,
        message: 'ชื่อผู้ใช้หรืออีเมลนี้ถูกใช้แล้ว'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      'INSERT INTO users (username, email, password, full_name, phone) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, full_name || null, phone || null]
    );

    res.status(201).json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ!'
    });

  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก'
    });
  }
});

/**
 * POST /api/auth/login-safe
 * ล็อกอินแบบปลอดภัย (Parameterized Query)
 */
router.post('/login-safe', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
      });
    }

    // ✅ SAFE: ใช้ Parameterized Query - ป้องกัน SQL Injection
    const users = await db.execute(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
        query_used: `SELECT * FROM users WHERE username = '?' OR email = '?'`,
        protection: 'Parameterized Query - Input ถูก escape อัตโนมัติ'
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'บัญชีนี้ถูกระงับ' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
        query_used: `SELECT * FROM users WHERE username = ? OR email = ?`,
        protection: 'Parameterized Query + bcrypt password hashing'
      });
    }

    await db.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ (Safe Mode)',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        created_at: user.created_at
      },
      security_info: {
        method: 'Parameterized Query',
        password_hash: 'bcrypt (10 rounds)',
        token_type: 'JWT (24h expiry)'
      }
    });

  } catch (err) {
    console.error('Login-safe error:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

/**
 * POST /api/auth/login-vulnerable
 * ⚠️ ล็อกอินแบบมีช่องโหว่ (String Concatenation - SQL Injection!)
 * สำหรับ DEMO เท่านั้น!
 */
router.post('/login-vulnerable', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'
      });
    }

    // ❌ VULNERABLE: ต่อ string ตรงๆ - SQL Injection ได้!
    const rawSQL = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

    // Log the attack attempt
    await db.execute(
      'INSERT INTO attack_logs (attack_type, payload, result, ip_address) VALUES (?, ?, ?, ?)',
      ['SQL Injection Attempt', `username: ${username}, password: ${password}`, 'pending', req.ip || 'unknown']
    );

    let users;
    try {
      users = await db.executeRaw(rawSQL);
    } catch (sqlErr) {
      return res.status(200).json({
        success: false,
        message: 'SQL Error (ช่องโหว่ถูกใช้งาน!)',
        vulnerability: {
          type: 'SQL Injection',
          query_executed: rawSQL,
          error: sqlErr.message
        }
      });
    }

    if (users.length > 0) {
      const user = users[0];

      // Log successful attack
      await db.execute(
        'UPDATE attack_logs SET result = ? WHERE attack_type = ? ORDER BY id DESC LIMIT 1',
        ['bypassed', 'SQL Injection Attempt']
      );

      const token = jwt.sign(
        { id: user.id, username: user.username, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        message: '⚠️ เข้าสู่ระบบสำเร็จ (ผ่านช่องโหว่ SQL Injection!)',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        },
        vulnerability: {
          type: 'SQL Injection',
          query_executed: rawSQL,
          explanation: 'Query ถูก inject ทำให้เงื่อนไข WHERE เป็น TRUE เสมอ',
          impact: 'ผู้โจมตีเข้าสู่ระบบได้โดยไม่ต้องรู้รหัสผ่าน'
        }
      });
    }

    // Log failed attempt
    await db.execute(
      'UPDATE attack_logs SET result = ? WHERE attack_type = ? ORDER BY id DESC LIMIT 1',
      ['blocked', 'SQL Injection Attempt']
    );

    res.status(401).json({
      success: false,
      message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      vulnerability: {
        type: 'SQL Injection',
        query_executed: rawSQL,
        note: 'Query ไม่ได้ถูก inject หรือไม่มี user ที่ตรงกัน (password ถูก hash ไว้จึง match ตรงๆ ไม่ได้)'
      }
    });

  } catch (err) {
    console.error('Login-vulnerable error:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

/**
 * GET /api/auth/profile
 * ดูโปรไฟล์
 */
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const users = await db.execute(
      'SELECT id, username, email, full_name, phone, role, created_at, last_login, is_active FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    res.json({ success: true, user: users[0] });
  } catch (err) {
    console.error('Profile error:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

/**
 * GET /api/auth/users
 * ดูผู้ใช้ทั้งหมด
 */
router.get('/users', verifyToken, async (req, res) => {
  try {
    const users = await db.execute(
      'SELECT id, username, email, full_name, role, created_at, last_login, is_active FROM users ORDER BY created_at DESC'
    );

    res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error('Get users error:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

/**
 * GET /api/auth/attack-logs
 * ดู log การโจมตี
 */
router.get('/attack-logs', async (req, res) => {
  try {
    const logs = await db.execute(
      'SELECT * FROM attack_logs ORDER BY timestamp DESC LIMIT 50'
    );
    res.json({ success: true, logs });
  } catch (err) {
    console.error('Attack logs error:', err.message);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;
