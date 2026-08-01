# 🔓 Auth Bypass Demo — คู่มือ Deploy

## สถาปัตยกรรม
```
Frontend (Vercel) ──→ Backend API (Render) ──→ TiDB Cloud (MySQL)
```

---

## ขั้นตอนที่ 1: สร้าง TiDB Cloud Database

1. ไปที่ https://tidbcloud.com → สมัคร/เข้าสู่ระบบ
2. สร้าง Cluster → เลือก **Serverless** (Free Tier)
3. ตั้งชื่อ Cluster เช่น `auth-bypass-demo`
4. เลือก Region: **ap-southeast-1** (Singapore)
5. กด **Create** รอสักครู่
6. กด **Connect** → เลือก **General** → จดข้อมูล:
   - `Host`, `Port`, `User`, `Password`
7. สร้าง Database: ในหน้า SQL Editor พิมพ์
   ```sql
   CREATE DATABASE IF NOT EXISTS auth_bypass_demo;
   ```

---

## ขั้นตอนที่ 2: Deploy Backend ขึ้น Render

1. Push โฟลเดอร์ `backend/` ขึ้น GitHub repository
2. ไปที่ https://render.com → สร้างบัญชี
3. กด **New** → **Web Service**
4. เชื่อมต่อ GitHub repo → เลือก branch
5. ตั้งค่า:
   - **Root Directory**: `backend` (ถ้า push ทั้ง project)
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
6. เพิ่ม **Environment Variables**:
   ```
   TIDB_HOST=gateway01.ap-southeast-1.prod.aws.tidbcloud.com
   TIDB_PORT=4000
   TIDB_USER=<username จาก TiDB>
   TIDB_PASSWORD=<password จาก TiDB>
   TIDB_DATABASE=auth_bypass_demo
   JWT_SECRET=your_jwt_secret_here
   SESSION_SECRET=your_session_secret_here
   FRONTEND_URL=https://your-app.vercel.app
   ```
7. กด **Deploy** → จด URL ที่ได้ เช่น `https://auth-bypass-demo.onrender.com`

---

## ขั้นตอนที่ 3: Deploy Frontend ขึ้น Vercel

1. **แก้ไขไฟล์ `frontend/app.js`** บรรทัดที่ 5:
   ```js
   const API_BASE = window.location.hostname === 'localhost'
     ? 'http://localhost:3001/api/auth'
     : 'https://auth-bypass-demo.onrender.com/api/auth';  // ← URL จาก Render
   ```
2. Push โฟลเดอร์ `frontend/` ขึ้น GitHub
3. ไปที่ https://vercel.com → เชื่อมต่อ GitHub
4. เลือก repo → ตั้ง **Root Directory** เป็น `frontend`
5. **Framework Preset**: Other
6. กด **Deploy** → ได้ URL เช่น `https://auth-bypass-demo.vercel.app`

---

## ขั้นตอนที่ 4: อัปเดต CORS

กลับไปที่ Render → Environment Variables → แก้ `FRONTEND_URL`:
```
FRONTEND_URL=https://auth-bypass-demo.vercel.app
```

---

## ทดสอบ

### SQL Injection
1. เปิดหน้า SQL Injection Demo
2. เลือกโหมด **Vulnerable**
3. กดปุ่ม `' OR '1'='1' --`
4. กด Login → ดูผลลัพธ์ (ข้ามระบบ Login สำเร็จ!)
5. เปลี่ยนเป็นโหมด **Safe** → ลองอีกครั้ง → ถูกบล็อค!

### Session Hijacking
1. เปิดหน้า Session Hijacking Demo
2. Login ด้วย admin/admin123
3. จะเห็น JWT Token ที่เก็บใน localStorage
4. Copy token → วางในช่อง Stolen Token → กดใช้ Token
5. เข้าถึงข้อมูลของเหยื่อได้สำเร็จ!

---

## โครงสร้างไฟล์
```
AuthBypassDemo/
├── backend/               → Deploy ขึ้น Render
│   ├── config/database.js
│   ├── middleware/auth.js
│   ├── routes/auth.js
│   ├── server.js
│   ├── package.json
│   ├── render.yaml
│   └── .env.example
├── frontend/              → Deploy ขึ้น Vercel
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── vercel.json
└── DEPLOY_GUIDE.md
```
