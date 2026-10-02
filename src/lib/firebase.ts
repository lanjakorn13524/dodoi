import { existsSync } from "node:fs";
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type Credential,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let dbInstance: Firestore | null = null;

/** ตั้งค่า credential ไม่ครบบนเซิร์ฟเวอร์ (คนละเรื่องกับ Firestore ล่ม/สิทธิ์ไม่พอ) */
export class FirebaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FirebaseConfigError";
  }
}

function credentialFromEnv(): Credential {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const missing: string[] = [];
  if (!process.env.FIREBASE_PROJECT_ID) missing.push("FIREBASE_PROJECT_ID");
  if (!process.env.FIREBASE_CLIENT_EMAIL) missing.push("FIREBASE_CLIENT_EMAIL");
  if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");

  if (missing.length === 0 && privateKey?.includes("PRIVATE KEY")) {
    return cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    });
  }

  const adc = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (adc) {
    if (!existsSync(adc)) {
      throw new FirebaseConfigError(
        `GOOGLE_APPLICATION_CREDENTIALS ชี้ไฟล์ที่ไม่มีบนเครื่องนี้: ${adc} (path นี้ใช้ได้แค่ตอนรันในเครื่องตัวเอง)`
      );
    }
    return applicationDefault();
  }

  if (missing.length === 0) {
    throw new FirebaseConfigError("FIREBASE_PRIVATE_KEY รูปแบบไม่ถูกต้อง (ต้องมี -----BEGIN PRIVATE KEY-----)");
  }
  throw new FirebaseConfigError(
    `ยังไม่ได้ตั้ง Firebase credential บนเซิร์ฟเวอร์ (ขาด: ${missing.join(", ")}) — ` +
      `ตั้งใน Netlify → Environment variables แล้ว redeploy`
  );
}

/** firestore (Admin SDK) — credential มาจาก env 3 ตัว หรือ ADC เฉพาะตอนรันในเครื่อง */
export function getDb(): Firestore {
  if (dbInstance) return dbInstance;
  if (!getApps().length) {
    initializeApp({ credential: credentialFromEnv() });
  }
  dbInstance = getFirestore();
  return dbInstance;
}

/** ตัวนับ ID แบบ auto-increment (เก็บในคอลเล็กชัน counters) */
export async function nextId(name: string): Promise<number> {
  const db = getDb();
  const ref = db.collection("counters").doc(name);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? (snap.get("value") as number) || 0 : 0;
    await tx.set(ref, { value: current + 1 });
    return current + 1;
  });
}

export function nowLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export async function getSetting(key: string): Promise<string | null> {
  const snap = await getDb().collection("settings").doc(key).get();
  const v = snap.get("value");
  return typeof v === "string" ? v : null;
}

export async function setSetting(key: string, value: string) {
  await getDb().collection("settings").doc(key).set({ value });
}

export async function deleteSetting(key: string) {
  await getDb().collection("settings").doc(key).delete();
}