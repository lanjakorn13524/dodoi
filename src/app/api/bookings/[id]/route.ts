import { NextResponse } from "next/server";
import {
  cancelBooking,
  deleteBooking,
  getBooking,
  updateBooking,
  type BookingInput,
} from "@/lib/bookings";
import { deleteBookingEvent, getAutoSync, syncBookingToCalendar } from "@/lib/google-calendar";
import { getCurrentUser, requireAdmin } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { id } = await ctx.params;
  const booking = await getBooking(Number(id));
  if (!booking) return NextResponse.json({ error: "ไม่พบการจอง" }, { status: 404 });
  return NextResponse.json(booking);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const body = (await req.json()) as Partial<BookingInput> & { status?: string };
    let booking;
    let sync: { ok: boolean; message: string } | null = null;
    if (body.status === "cancelled") {
      booking = await cancelBooking(Number(id));
      if (await getAutoSync()) {
        sync = await deleteBookingEvent(booking.id, booking.google_event_id);
      }
    } else {
      booking = await updateBooking(Number(id), {
        room_id: body.room_id,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        check_in_date: body.check_in_date,
        check_out_date: body.check_out_date,
        note: body.note,
      });
      if (await getAutoSync()) sync = await syncBookingToCalendar(booking.id);
    }
    return NextResponse.json({ booking, sync });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "ไม่มีสิทธิ์ลบการจอง" }, { status: 403 });
  const { id } = await ctx.params;
  const booking = await getBooking(Number(id));
  if (!booking) return NextResponse.json({ error: "ไม่พบการจอง" }, { status: 404 });
  if (await getAutoSync()) {
    await deleteBookingEvent(booking.id, booking.google_event_id);
  }
  await deleteBooking(booking.id);
  return NextResponse.json({ ok: true });
}