import { NextResponse } from "next/server";
import { createBooking, listBookings, type BookingInput } from "@/lib/bookings";
import { getAutoSync, syncBookingToCalendar } from "@/lib/google-calendar";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const url = new URL(req.url);
  const rows = listBookings({
    q: url.searchParams.get("q") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    includeCancelled: url.searchParams.get("includeCancelled") === "1",
    created_by:
      url.searchParams.get("mine") === "1"
        ? user.id
        : url.searchParams.get("created_by")
          ? Number(url.searchParams.get("created_by"))
          : undefined,
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  try {
    const body = (await req.json()) as BookingInput;
    const booking = await createBooking({
      room_id: body.room_id,
      customer_name: body.customer_name,
      customer_phone: body.customer_phone,
      check_in_date: body.check_in_date,
      check_out_date: body.check_out_date,
      note: body.note,
      created_by: user.id,
    });
    const sync = await getAutoSync() ? await syncBookingToCalendar(booking.id) : null;
    return NextResponse.json({ booking, sync }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "เกิดข้อผิดพลาด" },
      { status: 400 }
    );
  }
}