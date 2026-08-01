const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;

/**
 * สร้าง Connection Pool เชื่อมต่อ TiDB Cloud
 */
async function initialize() {
  try {
    pool = mysql.createPool({
      host: process.env.TIDB_HOST,
      port: parseInt(process.env.TIDB_PORT) || 4000,
      user: process.env.TIDB_USER,
      password: process.env.TIDB_PASSWORD,
      database: process.env.TIDB_DATABASE,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 30000
    });

    const conn = await pool.getConnection();
    console.log('✅ TiDB Cloud connection successful');
    conn.release();
  } catch (err) {
    console.error('❌ TiDB Cloud connection error:', err.message);
    throw err;
  }
}

/**
 * Execute a parameterized query (SAFE - ป้องกัน SQL Injection)
 */
async function execute(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    console.error('❌ Database query error:', err.message);
    throw err;
  }
}

/**
 * Execute a RAW query (VULNERABLE - มีช่องโหว่ SQL Injection)
 * ⚠️ ใช้เฉพาะใน demo เท่านั้น - สำหรับแสดงช่องโหว่
 */
async function executeRaw(sql) {
  try {
    const [rows] = await pool.query(sql);
    return rows;
  } catch (err) {
    console.error('❌ Raw query error:', err.message);
    throw err;
  }
}

/**
 * สร้างตาราง users ถ้ายังไม่มี
 */
async function createUsersTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      full_name VARCHAR(100),
      phone VARCHAR(20),
      role VARCHAR(20) DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL,
      is_active TINYINT(1) DEFAULT 1
    )
  `;

  try {
    await execute(createTableSQL);
    console.log('✅ Users table ready');
  } catch (err) {
    console.error('❌ Error creating users table:', err.message);
    throw err;
  }
}

/**
 * สร้างตาราง attack_logs สำหรับบันทึกการโจมตี
 */
async function createAttackLogsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS attack_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      attack_type VARCHAR(50) NOT NULL,
      payload TEXT,
      result VARCHAR(20),
      ip_address VARCHAR(45),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  try {
    await execute(sql);
    console.log('✅ Attack logs table ready');
  } catch (err) {
    console.error('❌ Error creating attack_logs table:', err.message);
    throw err;
  }
}

/**
 * เพิ่ม demo user ถ้ายังไม่มี
 */
async function seedDemoUsers() {
  const bcrypt = require('bcryptjs');

  const demoUsers = [
    { username: 'admin', email: 'admin@demo.com', password: 'admin123', full_name: 'Administrator', role: 'admin' },
    { username: 'user1', email: 'user1@demo.com', password: 'password123', full_name: 'Demo User', role: 'user' },
    { username: 'john', email: 'john@demo.com', password: 'john2026', full_name: 'John Smith', role: 'user' }
  ];

  for (const user of demoUsers) {
    const existing = await execute('SELECT id FROM users WHERE username = ?', [user.username]);
    if (existing.length === 0) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await execute(
        'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
        [user.username, user.email, hashedPassword, user.full_name, user.role]
      );
      console.log(`  ➕ Demo user created: ${user.username}`);
    }
  }
  console.log('✅ Demo users ready');
}

function getPool() {
  return pool;
}

module.exports = { initialize, execute, executeRaw, createUsersTable, createAttackLogsTable, seedDemoUsers, getPool };
