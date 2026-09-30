import { NextResponse } from "next/server";
import { roomsWithConflicts } from "@/lib/bookings";
import { isValidDateRange } from "@/lib/bookings";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!isValidDateRange(from, to))
    return NextResponse.json({ error: "ช่วงวันที่ไม่ถูกต้อง" }, { status: 400 });

  const rows = await roomsWithConflicts(from, to);
  const rooms = rows.map((r) => ({ id: r.id, available: r.conflicts === 0 }));
  void rooms;
  return NextResponse.json(rooms);
}