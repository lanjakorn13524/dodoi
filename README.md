# scaffold (ระบบจองห้อง + sync Google Calendar)

Next.js 15 (App Router, TypeScript) + **Firebase Firestore** portal สำหรับโรงแรมเล็ก ๆ

## เริ่มต้น (สำหรับเครื่องใหม่)

```bash
npm install
cp .env.example .env.local   # แล้วกรอกค่าจาก service account ของคุณ (ดู .env.example)
npm run dev                  # → http://localhost:3000
```

**ต้องสร้างให้เสร็จก่อนรัน (ใน Firebase Console):**
1. โปรเจกต์ Firebase ของคุณ
2. **Build → Firestore Database → Create database** (production mode, ภูมิภาคใกล้คุณเช่น `asia-southeast1`)
3. Project settings ⚙ → Service accounts → **Generate new private key** → ได้ไฟล์ `.json`
4. เปิดไฟล์นั้นแล้วกรอก 3 ค่าลง `.env.local`:
   - `FIREBASE_PROJECT_ID` ← `project_id`
   - `FIREBASE_CLIENT_EMAIL` ← `client_email`
   - `FIREBASE_PRIVATE_KEY` ← `private_key` (ขึ้นต้น `-----BEGIN PRIVATE KEY-----`)

> ⚠️ `FIREBASE_PRIVATE_KEY` ต้องเป็น**บรรทัดเดียว** (แทน `\n` จริงด้วย escaped `\n`) — ถ้า copy ตรงจาก JSON จะได้หลายบรรทัด ต้องรวมให้เหลือบรรทัดเดียวด้วย `\n` ระหว่างบรรทัด

หลัง build ผ่าน: เข้า `/login` → ระบบจะสร้าง admin คนแรกจาก env (ถ้า `FIREBASE_ADMIN_*` ถูกตั้งไว้) หรือทำผ่าน cron (`ADMIN_SEED_CRON=true`)

## สคริปต์

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | dev server (Next.js) |
| `npm run build` | build production + type-check |
| `npm run start` | รัน production build |

## โครงสร้างที่สำคัญ

```
src/app/api/        # REST routes (Next route handlers)
src/lib/firebase.ts # init firebase-admin + Firestore
src/lib/repo.ts     # data layer ทั้งหมด (Firestore) — ไม่มี sqlite แล้ว
src/lib/auth.ts     # session (cookie) + role
src/lib/bookings.ts # business logic การจอง (conflict / nights / overlap)
src/lib/google-calendar.ts # sync Google Calendar ผ่าน OAuth
```

## หมายเหตุการ migrate

- เดิมใช้ **SQLite (better-sqlite3)** → ย้ายมา **Firestore (Firestore)** ทั้งหมดแล้ว (ไม่มี `@/lib/db`, ไม่มี `db.prepare` เหลือใน code)
- ระบบ auth (session) ยังทำงานเหมือนเดิม แต่ข้อมูล session/user/bookings เก็บใน Firestore collection (`users`, `sessions`, `bookings`, `rooms`, `customers`, `settings`, `counters`)
- Google Calendar sync ใช้ OAuth (client id/secret ตั้งที่หน้า `/settings`) — หลังลิงก์จะ sync booking → all-day event
