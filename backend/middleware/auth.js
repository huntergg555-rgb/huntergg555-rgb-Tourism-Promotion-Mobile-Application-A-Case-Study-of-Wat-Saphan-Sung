const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware ตรวจสอบ JWT Token
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'กรุณาเข้าสู่ระบบ'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Token ไม่ถูกต้องหรือหมดอายุ'
    });
  }
}

module.exports = { verifyToken };
