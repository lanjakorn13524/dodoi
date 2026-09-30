import { NextResponse, type NextRequest } from "next/server";
import { listRooms, createRoom, setRoomActive, setRoomColor } from "@/lib/repo";
import { randomRoomColor } from "@/lib/room-colors";
import { getCurrentUser, requireAdmin } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const rooms = (await listRooms()).map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    is_active: r.is_active,
  }));
  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "ระบุชื่อห้อง" }, { status: 400 });
  const color = String(body.color ?? "").trim() || randomRoomColor();
  const created = await createRoom(name, color);
  return NextResponse.json({
    id: created.id,
    name: created.name,
    color: created.color,
    is_active: created.is_active,
  }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
  const body = await req.json();
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "ระบุห้อง" }, { status: 400 });
  if (body.color !== undefined) {
    const v = String(body.color).trim();
    if (v) await setRoomColor(id, v);
  }
  if (body.is_active !== undefined) {
    await setRoomActive(id, Boolean(body.is_active));
  }
  return NextResponse.json({ ok: true });
}
