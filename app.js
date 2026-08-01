/* =============================================
   Auth Bypass Demo - Frontend Logic
   ============================================= */

// ⚠️ เปลี่ยน URL นี้เป็น Render backend URL ตอน deploy
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api/auth'
  : 'https://huntergg555-rgb-tourism-promotion-mobile.onrender.com/api/auth';

let currentMode = 'vulnerable';

// ========== PAGE NAVIGATION ==========
function showPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageName}`);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.querySelector(`.nav-link[data-page="${pageName}"]`);
  if (activeLink) activeLink.classList.add('active');
  document.querySelector('.nav-links')?.classList.remove('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Nav link handlers
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const page = link.dataset.page;
    if (page) showPage(page);
  });
});

// ========== TOAST ==========
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut .4s ease forwards';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// ========== API HELPER ==========
async function apiRequest(url, method = 'GET', body = null, customToken = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = customToken || localStorage.getItem('demo-token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(API_BASE + url, options);
    const data = await response.json();
    return { ok: response.ok, data };
  } catch (err) {
    return { ok: false, data: { success: false, message: 'ไม่สามารถเชื่อมต่อ API ได้ (' + err.message + ')' } };
  }
}

// ========== SQL INJECTION DEMO ==========
function setMode(mode) {
  currentMode = mode;
  document.getElementById('btn-mode-vuln').classList.toggle('active', mode === 'vulnerable');
  document.getElementById('btn-mode-safe').classList.toggle('active', mode === 'safe');
  showToast(`เปลี่ยนเป็นโหมด ${mode === 'vulnerable' ? '⚠️ Vulnerable' : '✅ Safe'}`, mode === 'vulnerable' ? 'warning' : 'success');
}

function fillPayload(username, password) {
  document.getElementById('sqli-username').value = username;
  document.getElementById('sqli-password').value = password;
  showToast('ใส่ Payload แล้ว — กด Login เพื่อทดสอบ', 'info');
}

async function handleSQLiLogin(e) {
  e.preventDefault();
  const username = document.getElementById('sqli-username').value;
  const password = document.getElementById('sqli-password').value;
  const resultBox = document.getElementById('sqli-result');
  const queryBox = document.getElementById('sqli-query');
  const queryText = document.getElementById('sqli-query-text');
  const explanationBox = document.getElementById('sqli-explanation');
  const explanationText = document.getElementById('sqli-explanation-text');

  if (!username || !password) {
    showToast('กรุณากรอก Username และ Password', 'error');
    return;
  }

  const btn = document.getElementById('btn-sqli-login');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> กำลังส่ง...';

  const endpoint = currentMode === 'vulnerable' ? '/login-vulnerable' : '/login-safe';
  const { ok, data } = await apiRequest(endpoint, 'POST', { username, password });

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> เข้าสู่ระบบ';

  // Show result
  if (data.success) {
    resultBox.innerHTML = `
      <div class="result-success">
        <div class="result-icon ${currentMode === 'vulnerable' ? 'danger' : 'safe'}">
          <i class="fas ${currentMode === 'vulnerable' ? 'fa-skull-crossbones' : 'fa-check-circle'}"></i>
        </div>
        <h4>${data.message}</h4>
        <div class="result-details">
          <p><strong>User:</strong> ${data.user?.username || 'N/A'}</p>
          <p><strong>Email:</strong> ${data.user?.email || 'N/A'}</p>
          <p><strong>Role:</strong> <span class="badge">${data.user?.role || 'N/A'}</span></p>
        </div>
        ${data.vulnerability ? `
          <div class="vuln-info">
            <h5><i class="fas fa-bug"></i> Vulnerability Info</h5>
            <p><strong>Type:</strong> ${data.vulnerability.type}</p>
            <p><strong>Impact:</strong> ${data.vulnerability.impact || data.vulnerability.explanation}</p>
          </div>
        ` : ''}
        ${data.security_info ? `
          <div class="safe-info">
            <h5><i class="fas fa-shield-alt"></i> Security Info</h5>
            <p><strong>Method:</strong> ${data.security_info.method}</p>
            <p><strong>Password:</strong> ${data.security_info.password_hash}</p>
          </div>
        ` : ''}
      </div>
    `;
    showToast(data.message, currentMode === 'vulnerable' ? 'warning' : 'success');
  } else {
    resultBox.innerHTML = `
      <div class="result-fail">
        <div class="result-icon blocked"><i class="fas fa-ban"></i></div>
        <h4>${data.message}</h4>
        ${data.vulnerability ? `
          <div class="vuln-info">
            <p><strong>Note:</strong> ${data.vulnerability.note || data.vulnerability.error || ''}</p>
          </div>
        ` : ''}
      </div>
    `;
    showToast(data.message, 'error');
  }

  // Show query
  const queryUsed = data.vulnerability?.query_executed || data.query_used || '';
  if (queryUsed) {
    queryBox.style.display = 'block';
    queryText.textContent = queryUsed;
  }

  // Show explanation
  if (currentMode === 'vulnerable') {
    explanationBox.style.display = 'block';
    explanationText.innerHTML = `
      <div class="explain-item danger">
        <i class="fas fa-times-circle"></i>
        <div>
          <strong>❌ Vulnerable Code (String Concatenation)</strong>
          <pre>const sql = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";</pre>
          <p>Input ของผู้ใช้ถูกนำไปต่อใน SQL ตรงๆ → ถูก Inject ได้!</p>
        </div>
      </div>
      <div class="explain-item success">
        <i class="fas fa-check-circle"></i>
        <div>
          <strong>✅ Safe Code (Parameterized Query)</strong>
          <pre>const sql = "SELECT * FROM users WHERE username = ?";
db.execute(sql, [username]);</pre>
          <p>Input ถูก escape อัตโนมัติ → Inject ไม่ได้!</p>
        </div>
      </div>
    `;
  } else {
    explanationBox.style.display = 'block';
    explanationText.innerHTML = `
      <div class="explain-item success">
        <i class="fas fa-shield-alt"></i>
        <div>
          <strong>✅ โหมดปลอดภัย</strong>
          <p>ระบบใช้ Parameterized Query + bcrypt password hashing</p>
          <p>SQL Injection payload จะไม่ทำงาน เพราะ input ถูก treat เป็น string ธรรมดา</p>
        </div>
      </div>
    `;
  }
}

// ========== SESSION HIJACKING DEMO ==========
async function handleSessionLogin(e) {
  e.preventDefault();
  const username = document.getElementById('session-username').value;
  const password = document.getElementById('session-password').value;

  const { ok, data } = await apiRequest('/login-safe', 'POST', { username, password });

  if (ok && data.token) {
    localStorage.setItem('demo-token', data.token);
    document.getElementById('token-display').style.display = 'block';
    document.getElementById('token-value').textContent = data.token;
    document.getElementById('hijack-section').style.display = 'block';
    document.getElementById('stolen-token').value = data.token;

    document.getElementById('session-result').innerHTML = `
      <div class="result-success">
        <div class="result-icon safe"><i class="fas fa-check-circle"></i></div>
        <h4>เข้าสู่ระบบสำเร็จในฐานะ: ${data.user.username}</h4>
        <p>Token ถูกเก็บใน <code>localStorage</code></p>
        <p class="text-danger"><i class="fas fa-exclamation-triangle"></i> XSS attack สามารถขโมย Token นี้ได้!</p>
      </div>
    `;
    showToast('Login สำเร็จ! Token ถูกเก็บใน localStorage', 'success');
  } else {
    showToast(data.message || 'Login ไม่สำเร็จ', 'error');
  }
}

function copyToken() {
  const token = document.getElementById('token-value').textContent;
  navigator.clipboard.writeText(token);
  showToast('คัดลอก Token แล้ว!', 'success');
}

async function hijackSession() {
  const stolenToken = document.getElementById('stolen-token').value;
  if (!stolenToken) {
    showToast('กรุณาใส่ Token', 'error');
    return;
  }

  const { ok, data } = await apiRequest('/profile', 'GET', null, stolenToken);
  const resultBox = document.getElementById('session-result');
  const explanationBox = document.getElementById('session-explanation');

  if (ok) {
    resultBox.innerHTML = `
      <div class="result-success">
        <div class="result-icon danger"><i class="fas fa-skull-crossbones"></i></div>
        <h4>⚠️ Session Hijacking สำเร็จ!</h4>
        <p>ผู้โจมตีเข้าถึงข้อมูลของเหยื่อได้</p>
        <div class="result-details">
          <p><strong>Username:</strong> ${data.user?.username}</p>
          <p><strong>Email:</strong> ${data.user?.email}</p>
          <p><strong>Full Name:</strong> ${data.user?.full_name || '-'}</p>
          <p><strong>Role:</strong> <span class="badge">${data.user?.role}</span></p>
        </div>
      </div>
    `;
    explanationBox.style.display = 'block';
    showToast('⚠️ Session Hijacking สำเร็จ! เข้าถึงข้อมูลเหยื่อได้', 'warning');
  } else {
    resultBox.innerHTML = `
      <div class="result-fail">
        <div class="result-icon blocked"><i class="fas fa-ban"></i></div>
        <h4>Token ไม่ถูกต้องหรือหมดอายุ</h4>
      </div>
    `;
    showToast('Token ไม่ถูกต้อง', 'error');
  }
}

// ========== ATTACK LOGS ==========
async function loadAttackLogs() {
  const { ok, data } = await apiRequest('/attack-logs');
  const tbody = document.getElementById('logs-tbody');

  if (ok && data.logs) {
    if (data.logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">ยังไม่มี log</td></tr>';
      return;
    }
    tbody.innerHTML = data.logs.map(log => `
      <tr class="${log.result === 'bypassed' ? 'row-danger' : ''}">
        <td>${log.id}</td>
        <td><span class="badge badge-${log.attack_type.includes('SQL') ? 'danger' : 'warning'}">${log.attack_type}</span></td>
        <td><code class="log-payload">${escapeHtml(log.payload || '')}</code></td>
        <td><span class="badge badge-${log.result === 'bypassed' ? 'danger' : log.result === 'blocked' ? 'success' : 'info'}">${log.result}</span></td>
        <td>${log.ip_address || '-'}</td>
        <td>${new Date(log.timestamp).toLocaleString('th-TH')}</td>
      </tr>
    `).join('');
    showToast(`โหลด ${data.logs.length} logs สำเร็จ`, 'success');
  } else {
    showToast('ไม่สามารถโหลด logs ได้', 'error');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== PARTICLES ANIMATION ==========
function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDuration = (3 + Math.random() * 4) + 's';
    particle.style.animationDelay = Math.random() * 3 + 's';
    particle.style.width = particle.style.height = (2 + Math.random() * 4) + 'px';
    container.appendChild(particle);
  }
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  showPage('home');
});
