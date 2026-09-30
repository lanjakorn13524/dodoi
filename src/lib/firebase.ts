import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let dbInstance: Firestore | null = null;

function loadServiceAccount(): ServiceAccount | undefined {
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }
  return undefined;
}

/** เรียก firestore (Admin SDK) ระบบจะลอง initial ด้วย env หลายแบบ */
export function getDb(): Firestore {
  if (dbInstance) return dbInstance;
  if (!getApps().length) {
    const sa = loadServiceAccount();
    if (sa) {
      initializeApp({ credential: cert(sa) });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // ใช้ service account file (Application Default Credentials)
      initializeApp();
    } else {
      // ใช้ credentials จากตัวแปร env มาตรฐาน (หรือ emulator ที่ตั้งไว้)
      initializeApp();
    }
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