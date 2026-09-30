import { NextResponse } from "next/server";
import { resyncAllBookings, syncAllBookings } from "@/lib/google-calendar";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
  const force = new URL(req.url).searchParams.get("force") === "1";
  const { ok, fail, messages } = await (force ? resyncAllBookings() : syncAllBookings());
  return NextResponse.json({ ok, fail, messages });
}