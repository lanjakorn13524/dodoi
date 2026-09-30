import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";
import { requireAdmin, type UserRole } from "@/lib/auth";
import {
  listUsers,
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  countBookingsByUser,
  deleteSessionsByUser,
  clearBookingsCreatedBy,
} from "@/lib/repo";

const VALID_ROLES: UserRole[] = ["admin", "user"];

export async function GET() {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });

  const users = await listUsers();
  const rows = await Promise.all(
    users.map(async (u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      created_at: u.created_at,
      booking_count: await countBookingsByUser(u.id),
    }))
  );
  rows.sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === "admin" ? -1 : 1));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = VALID_ROLES.includes(body.role) ? body.role : "user";

  if (!name || !email)
    return NextResponse.json({ error: "กรอกชื่อและอีเมล" }, { status: 400 });
  if (password.length < 4)
    return NextResponse.json({ error: "รหัสผ่านต้องอย่างน้อย 4 ตัวอักษร" }, { status: 400 });

  const exists = await getUserByEmail(email);
  if (exists)
    return NextResponse.json({ error: "มีอีเมลนี้ในระบบแล้ว" }, { status: 400 });

  await createUser({ name, email, password_hash: hashPassword(password), role });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });

  const body = await req.json();
  const id = Number(body.id);
  if (!id)
    return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 400 });

  const target = await getUserById(id);
  if (!target)
    return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });

  if (id === admin.id && body.role && body.role !== "admin") {
    return NextResponse.json({ error: "ไม่สามารถลดสิทธิ์บัญชีตัวเองได้" }, { status: 400 });
  }

  if (body.name !== undefined && !String(body.name).trim())
    return NextResponse.json({ error: "กรอกชื่อ" }, { status: 400 });
  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "กรอกอีเมล" }, { status: 400 });
    const dup = await getUserByEmail(email);
    if (dup && dup.id !== id)
      return NextResponse.json({ error: "มีอีเมลนี้ในระบบแล้ว" }, { status: 400 });
  }

  const name = body.name !== undefined ? String(body.name).trim() : target.name;
  const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : undefined;
  const role =
    body.role !== undefined && VALID_ROLES.includes(body.role) ? body.role : target.role;

  const patch: Record<string, unknown> = { name, role };
  if (email !== undefined) patch.email = email;
  if (body.password) {
    if (String(body.password).length < 4)
      return NextResponse.json({ error: "รหัสผ่านต้องอย่างน้อย 4 ตัวอักษร" }, { status: 400 });
    patch.password_hash = hashPassword(String(body.password));
  }
  await updateUser(id, patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });

  const body = await req.json();
  const id = Number(body.id);
  if (!id)
    return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 400 });
  if (id === admin.id)
    return NextResponse.json({ error: "ไม่สามารถลบบัญชีตัวเองได้" }, { status: 400 });

  const target = await getUserById(id);
  if (!target)
    return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });

  await deleteSessionsByUser(id);
  await clearBookingsCreatedBy(id);
  await deleteUser(id);
  return NextResponse.json({ ok: true });
}
