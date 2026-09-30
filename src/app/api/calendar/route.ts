import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listRooms, listBookings } from "@/lib/repo";

function pad(d: number) {
  return String(d).padStart(2, "0");
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const url = new URL(req.url);
  const month = (url.searchParams.get("month") ?? "").slice(0, 7);
  const year = Number(month.slice(0, 4));
  const mon = Number(month.slice(5, 7));
  if (!year || !mon || mon < 1 || mon > 12)
    return NextResponse.json({ error: "ระบุเดือนไม่ถูกต้อง" }, { status: 400 });

  const fromDate = `${year}-${pad(mon)}-01`;
  const nextMonth = new Date(year, mon, 1);
  const toDate = `${nextMonth.getFullYear()}-${pad(nextMonth.getMonth() + 1)}-01`;

  const [rooms, bookings] = await Promise.all([
    listRooms().then((rs) =>
      rs
        .filter((r) => r.is_active)
        .map((r) => ({ id: r.id, name: r.name, color: r.color }))
    ),
    listBookings().then((bs) =>
      bs
        .filter(
          (b) =>
            b.status !== "cancelled" &&
            b.check_out_date > fromDate &&
            b.check_in_date < toDate
        )
        .map((b) => ({
          id: b.id,
          room_id: b.room_id,
          room_name: b.room_name,
          room_color: b.room_color,
          customer_name: b.customer_name,
          customer_phone: b.customer_phone,
          check_in_date: b.check_in_date,
          check_out_date: b.check_out_date,
          note: b.note,
          status: b.status,
          google_event_id: b.google_event_id,
        }))
    ),
  ]);

  return NextResponse.json({ rooms, bookings, from: fromDate, to: toDate });
}
