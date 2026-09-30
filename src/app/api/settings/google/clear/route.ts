import { NextResponse } from "next/server";
import { clearAuth } from "@/lib/google-calendar";
import { requireAdmin } from "@/lib/auth";

export async function POST() {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
  await clearAuth();
  return NextResponse.json({ ok: true });
}