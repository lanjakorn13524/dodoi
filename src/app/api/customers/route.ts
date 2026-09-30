import { NextResponse } from "next/server";
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  customerBookingCount,
} from "@/lib/repo";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const customers = await listCustomers(q || undefined);
  const rows = customers.map((c) => ({
    ...c,
    booking_count: 0, // computed below
  }));
  const withCount = await Promise.all(
    rows.map(async (r) => ({ ...r, booking_count: await customerBookingCount(r.name) }))
  );
  return NextResponse.json(withCount);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name)
    return NextResponse.json({ error: "กรุณาระบุชื่อลูกค้า" }, { status: 400 });

  const customer = await createCustomer({
    name,
    phone: String(body.phone ?? "").trim(),
    email: String(body.email ?? "").trim().toLowerCase(),
    note: String(body.note ?? "").trim(),
  });
  return NextResponse.json(customer, { status: 201 });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const body = await req.json();
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "ไม่พบลูกค้า" }, { status: 400 });

  const patch: {
    name?: string;
    phone?: string;
    email?: string;
    note?: string;
  } = {};
  if (body.name !== undefined)
    patch.name = String(body.name).trim() || undefined;
  if (body.phone !== undefined) patch.phone = String(body.phone).trim();
  if (body.email !== undefined)
    patch.email = String(body.email).trim().toLowerCase();
  if (body.note !== undefined) patch.note = String(body.note).trim();

  if (!patch.name)
    return NextResponse.json({ error: "กรุณาระบุชื่อลูกค้า" }, { status: 400 });

  await updateCustomer(id, patch);
  return NextResponse.json({ ok: true });
}
