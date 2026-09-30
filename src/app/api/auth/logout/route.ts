import { NextResponse } from "next/server";
import { cookieOptions, logout } from "@/lib/auth";

export async function POST() {
  await logout();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("hotel_session", "", { ...cookieOptions(), maxAge: 0 });
  return res;
}