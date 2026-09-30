import { NextResponse } from "next/server";
import { getBooking } from "@/lib/bookings";
import { syncBookingToCalendar } from "@/lib/google-calendar";
import { getCurrentUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { id } = await ctx.params;
  const booking = await getBooking(Number(id));
  if (!booking) return NextResponse.json({ error: "ไม่พบการจอง" }, { status: 404 });
  const res = await syncBookingToCalendar(booking.id);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}