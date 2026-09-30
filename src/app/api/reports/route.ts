import { NextResponse } from "next/server";
import { listRooms, listBookings } from "@/lib/repo";
import { bookedNightsInMonth } from "@/lib/bookings";
import { getCurrentUser } from "@/lib/auth";

function dateDiffNights(from: string, to: string): number {
  const ms = new Date(to + "T00:00:00").getTime() - new Date(from + "T00:00:00").getTime();
  return Math.round(ms / 86400000);
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

  const monthStr = `${year}-${String(mon).padStart(2, "0")}`;
  const daysInMonth = new Date(year, mon, 0).getDate();

  const [rooms, allBookings] = await Promise.all([listRooms(), listBookings()]);

  const activeRooms = rooms.filter((r) => r.is_active).length;

  const bookingsThisMonth = allBookings.filter(
    (b) => b.check_in_date.startsWith(monthStr) && b.status !== "cancelled"
  );

  const bookedNights = await bookedNightsInMonth(year, mon - 1);

  const perRoomMap = new Map<string, { bookings: number; nights: number }>();
  for (const b of bookingsThisMonth) {
    const cur = perRoomMap.get(b.room_name) ?? { bookings: 0, nights: 0 };
    cur.bookings += 1;
    cur.nights += dateDiffNights(b.check_in_date, b.check_out_date);
    perRoomMap.set(b.room_name, cur);
  }
  const perRoom = Array.from(perRoomMap.entries()).map(([room_name, v]) => ({
    room_name,
    bookings: v.bookings,
    nights: v.nights,
  }));

  const recent = bookingsThisMonth.slice(-5).reverse().map((b) => ({
    id: b.id,
    room_name: b.room_name,
    customer_name: b.customer_name,
    check_in_date: b.check_in_date,
    check_out_date: b.check_out_date,
  }));

  return NextResponse.json({
    month: monthStr,
    bookingsCount: bookingsThisMonth.length,
    bookedNights,
    occupancy: activeRooms
      ? Math.round((bookedNights / (activeRooms * daysInMonth)) * 100)
      : 0,
    daysInMonth,
    activeRooms,
    perRoom,
    recent,
  });
}
