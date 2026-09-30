import { NextResponse } from "next/server";
import { cookieOptions, login } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");
    if (!email || !password)
      return NextResponse.json({ error: "กรอกอีเมลและรหัสผ่าน" }, { status: 400 });

    const result = await login(email, password);
    if (!result)
      return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });

    const res = NextResponse.json({ user: result.user });
    res.cookies.set("hotel_session", result.token, cookieOptions());
    return res;
  } catch {
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}