import { getDb, nextId, nowLocal } from "./firebase";
import { ROOM_PALETTE } from "./room-colors";
import { hashPassword } from "./password";
import type { BookingStatus } from "./status";

export interface RoomRow {
  id: number;
  name: string;
  is_active: boolean;
  color: string;
}

export interface BookingRow {
  id: number;
  room_id: number;
  room_name: string;
  room_color: string;
  customer_name: string;
  customer_phone: string;
  check_in_date: string;
  check_out_date: string;
  note: string;
  nights: number;
  google_event_id: string | null;
  created_at: string;
  status: BookingStatus;
  created_by?: number | null;
}

export interface BookingInput {
  room_id: number;
  customer_name: string;
  customer_phone?: string;
  check_in_date: string;
  check_out_date: string;
  note?: string;
  created_by?: number | null;
  status?: BookingStatus;
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: "admin" | "user";
  created_at: string;
}

export interface CustomerRow {
  id: number;
  name: string;
  phone: string;
  email: string;
  note: string;
  created_at: string;
}

/* ---------- Seed ---------- */

let seeded = false;

/** ใส่ข้อมูลเริ่มต้น (ห้อง + บัญชี admin) ครั้งเดียว */
export async function ensureSeed() {
  if (seeded) return;
  const db = getDb();
  const roomsSnap = await db.collection("rooms").limit(1).get();
  if (roomsSnap.empty) {
    const names = ["101", "102", "103", "201", "202", "V1", "V2"];
    for (const [i, name] of names.entries()) {
      const id = await nextId("rooms");
      const color = ROOM_PALETTE[i % ROOM_PALETTE.length];
      await db.collection("rooms").doc(String(id)).set({
        id,
        name,
        is_active: true,
        color,
      });
    }
  }
  const adminSnap = await db
    .collection("users")
    .where("email", "==", "admin@hotel.local")
    .limit(1)
    .get();
  if (adminSnap.empty) {
    const id = await nextId("users");
    await db.collection("users").doc(String(id)).set({
      id,
      name: "Admin",
      email: "admin@hotel.local",
      password_hash: hashPassword("admin123"),
      role: "admin",
      created_at: nowLocal(),
    });
  }
  seeded = true;
}

/* ---------- Rooms ---------- */

function roomFromDoc(doc: FirebaseFirestore.DocumentSnapshot): RoomRow {
  const d = doc.data()!;
  return {
    id: d.id,
    name: d.name,
    is_active: Boolean(d.is_active),
    color: d.color,
  };
}

export async function listRooms(): Promise<RoomRow[]> {
  await ensureSeed();
  const snap = await getDb().collection("rooms").orderBy("name").get();
  const rows = snap.docs.map(roomFromDoc);
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRoom(id: number): Promise<RoomRow | null> {
  const snap = await getDb().collection("rooms").doc(String(id)).get();
  return snap.exists ? roomFromDoc(snap) : null;
}

export async function createRoom(name: string, color: string): Promise<RoomRow> {
  const id = await nextId("rooms");
  const room: RoomRow = { id, name, is_active: true, color };
  await getDb().collection("rooms").doc(String(id)).set(room);
  return room;
}

export async function setRoomActive(id: number, active: boolean) {
  await getDb().collection("rooms").doc(String(id)).update({ is_active: active });
}

export async function setRoomColor(id: number, color: string) {
  await getDb().collection("rooms").doc(String(id)).update({ color });
}

/* ---------- Bookings ---------- */

function toBookingRow(d: {
  id: number;
  room_id: number;
  customer_name: string;
  customer_phone?: string;
  check_in_date: string;
  check_out_date: string;
  note?: string;
  google_event_id?: string | null;
  created_at?: string;
  status?: string;
  created_by?: number | null;
}): BookingRow {
  const checkIn = normalizeBookingDate(d.check_in_date, "เช็คอิน");
  const checkOut = normalizeBookingDate(d.check_out_date, "เช็คเอ้าท์");
  const nights = Math.max(
    0,
    Math.round(
      (new Date(`${checkOut}T00:00:00`).getTime() -
        new Date(`${checkIn}T00:00:00`).getTime()) /
        86400000
    )
  );
  return {
    id: d.id,
    room_id: d.room_id,
    room_name: "",
    room_color: "#94a3b8",
    customer_name: d.customer_name,
    customer_phone: d.customer_phone ?? "",
    check_in_date: checkIn,
    check_out_date: checkOut,
    note: d.note ?? "",
    nights,
    google_event_id: d.google_event_id ?? null,
    created_at: d.created_at ?? "",
    status: (d.status as BookingStatus) ?? "confirmed",
    created_by: d.created_by ?? null,
  };
}

function normalizeBookingDate(value: unknown, label: string): string {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (match) return match[1];
  }
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    const date = value.toDate() as Date;
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }
  throw new Error(`วันที่ ${label} ไม่ถูกต้อง`);
}

async function roomMap(): Promise<Map<number, RoomRow>> {
  const rooms = await listRooms();
  return new Map(rooms.map((r) => [r.id, r]));
}

async function allRawBookings(): Promise<
  { ref: FirebaseFirestore.DocumentReference; data: ReturnType<typeof toBookingRow> & { id: number } }[]
> {
  const snap = await getDb().collection("bookings").get();
  return snap.docs.map((doc) => {
    const d = doc.data() as FirebaseFirestore.DocumentData;
    return { ref: doc.ref, data: toBookingRow(d as never) };
  });
}

export async function getBooking(id: number): Promise<BookingRow | null> {
  const snap = await getDb().collection("bookings").doc(String(id)).get();
  if (!snap.exists) return null;
  const row = toBookingRow(snap.data() as never);
  const room = await getRoom(row.room_id);
  if (room) {
    row.room_name = room.name;
    row.room_color = room.color;
  }
  return row;
}

export async function listBookings(filters?: {
  q?: string;
  from?: string;
  to?: string;
  created_by?: number;
  includeCancelled?: boolean;
}): Promise<BookingRow[]> {
  const rooms = await roomMap();
  const all = await allRawBookings();
  const res: BookingRow[] = [];
  for (const { data } of all) {
    if (!filters?.includeCancelled && data.status === "cancelled") continue;
    if (filters?.q) {
      const q = filters.q.toLowerCase();
      if (!data.customer_name.toLowerCase().includes(q) && !data.customer_phone.toLowerCase().includes(q)) continue;
    }
    if (filters?.from && data.check_out_date < filters.from) continue;
    if (filters?.to && data.check_in_date > filters.to) continue;
    if (filters?.created_by !== undefined && data.created_by !== filters.created_by) continue;
    const room = rooms.get(data.room_id);
    if (room) {
      data.room_name = room.name;
      data.room_color = room.color;
    }
    res.push(data);
  }
  res.sort((a, b) =>
    a.check_in_date === b.check_in_date ? b.id - a.id : a.check_in_date.localeCompare(b.check_in_date)
  );
  return res;
}

export async function hasRoomConflict(
  roomId: number,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: number
): Promise<boolean> {
  if (checkOut <= checkIn) return true;
  const all = await allRawBookings();
  return all.some(
    ({ data }) =>
      data.room_id === roomId &&
      data.check_in_date < checkOut &&
      data.check_out_date > checkIn &&
      data.status !== "cancelled" &&
      (excludeBookingId === undefined || data.id !== excludeBookingId)
  );
}

export async function roomsWithConflicts(from: string, to: string): Promise<{ id: number; conflicts: number }[]> {
  const rooms = await listRooms();
  const all = await allRawBookings();
  return rooms
    .filter((r) => r.is_active)
    .map((r) => ({
      id: r.id,
      conflicts: all.filter(
        ({ data }) =>
          data.room_id === r.id &&
          data.check_in_date < to &&
          data.check_out_date > from &&
          data.status !== "cancelled"
      ).length,
    }))
    .sort((a, b) => a.id - b.id);
}

export async function createBooking(input: BookingInput): Promise<BookingRow> {
  if (!input.customer_name.trim()) throw new Error("ต้องระบุชื่อผู้จอง");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.check_in_date) || !/^\d{4}-\d{2}-\d{2}$/.test(input.check_out_date)) {
    throw new Error("รูปแบบวันที่ต้องเป็น YYYY-MM-DD");
  }
  if (input.check_out_date <= input.check_in_date) throw new Error("วันที่เช็คเอ้าท์ต้องมาหลังวันที่เช็คอิน");
  if (await hasRoomConflict(input.room_id, input.check_in_date, input.check_out_date)) {
    throw new Error("ห้องนี้ถูกจองในช่วงวันที่ดังกล่าวแล้ว");
  }
  const id = await nextId("bookings");
  const now = nowLocal();
  await getDb().collection("bookings").doc(String(id)).set({
    id,
    room_id: input.room_id,
    customer_name: input.customer_name.trim(),
    customer_phone: input.customer_phone ?? "",
    check_in_date: input.check_in_date,
    check_out_date: input.check_out_date,
    note: input.note ?? "",
    google_event_id: null,
    created_at: now,
    updated_at: now,
    status: input.status ?? "confirmed",
    created_by: input.created_by ?? null,
  });
  const booking = await getBooking(id);
  if (!booking) throw new Error("สร้างการจองไม่สำเร็จ");
  return booking;
}

export async function updateBooking(id: number, input: Partial<Omit<BookingInput, "customer_id">>): Promise<BookingRow> {
  const existing = await getBooking(id);
  if (!existing) throw new Error("ไม่พบการจอง");

  const roomId = input.room_id ?? existing.room_id;
  const checkIn = input.check_in_date ?? existing.check_in_date;
  const checkOut = input.check_out_date ?? existing.check_out_date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
    throw new Error("รูปแบบวันที่ต้องเป็น YYYY-MM-DD");
  }
  if (await hasRoomConflict(roomId, checkIn, checkOut, id)) {
    throw new Error("ห้องนี้ถูกจองในช่วงวันที่ดังกล่าวแล้ว");
  }
  if (input.customer_name !== undefined && !input.customer_name.trim())
    throw new Error("ต้องระบุชื่อผู้จอง");

  const patch: Record<string, unknown> = {
    customer_name: input.customer_name?.trim() ?? existing.customer_name,
    customer_phone: input.customer_phone ?? existing.customer_phone,
    room_id: roomId,
    check_in_date: checkIn,
    check_out_date: checkOut,
    note: input.note ?? existing.note,
    updated_at: nowLocal(),
  };
  await getDb().collection("bookings").doc(String(id)).update(patch);
  const booking = await getBooking(id);
  if (!booking) throw new Error("อัปเดตการจองไม่สำเร็จ");
  return booking;
}

export async function deleteBooking(id: number) {
  await getDb().collection("bookings").doc(String(id)).delete();
}

export async function cancelBooking(id: number): Promise<BookingRow> {
  const booking = await getBooking(id);
  if (!booking) throw new Error("ไม่พบการจอง");
  if (booking.status === "cancelled") return booking;
  await getDb().collection("bookings").doc(String(id)).update({ status: "cancelled", updated_at: nowLocal() });
  const updated = await getBooking(id);
  if (!updated) throw new Error("อัปเดตการจองไม่สำเร็จ");
  return updated;
}

export async function setBookingGoogleEventId(id: number, googleEventId: string) {
  await getDb().collection("bookings").doc(String(id)).update({ google_event_id: googleEventId });
}

export async function bookedNightsInMonth(year: number, mon0: number): Promise<number> {
  const monthStart = new Date(year, mon0, 1);
  const monthEnd = new Date(year, mon0 + 1, 0);
  const from = `${year}-${String(mon0 + 1).padStart(2, "0")}-01`;
  const next = new Date(year, mon0 + 1, 1);
  const to = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;

  const all = await allRawBookings();
  let nights = 0;
  for (const { data } of all) {
    if (data.status === "cancelled") continue;
    if (!(data.check_in_date < to && data.check_out_date > from)) continue;
    const inD = new Date(`${data.check_in_date}T00:00:00`);
    const outD = new Date(`${data.check_out_date}T00:00:00`);
    const s = inD < monthStart ? monthStart : inD;
    const e = outD > monthEnd ? new Date(monthEnd.getTime() + 86400000) : outD;
    if (e > s) nights += Math.round((e.getTime() - s.getTime()) / 86400000);
  }
  return nights;
}

/* ---------- Users / Sessions ---------- */

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  await ensureSeed();
  const snap = await getDb()
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const d = snap.docs[0].data();
  return {
    id: d.id,
    name: d.name,
    email: d.email,
    password_hash: d.password_hash,
    role: d.role,
    created_at: d.created_at,
  };
}

export async function getUserById(id: number): Promise<UserRow | null> {
  const snap = await getDb().collection("users").doc(String(id)).get();
  if (!snap.exists) return null;
  const d = snap.data();
  if (!d) return null;
  return {
    id: d.id,
    name: d.name,
    email: d.email,
    password_hash: d.password_hash,
    role: d.role,
    created_at: d.created_at,
  };
}

export async function listUsers(): Promise<UserRow[]> {
  const snap = await getDb().collection("users").orderBy("name").get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: d.id,
      name: d.name,
      email: d.email,
      password_hash: d.password_hash,
      role: d.role,
      created_at: d.created_at,
    };
  });
}

export async function createUser(input: {
  name: string;
  email: string;
  password_hash: string;
  role: string;
}): Promise<UserRow> {
  const id = await nextId("users");
  const user: UserRow = { ...input, id, role: input.role as UserRow["role"], created_at: nowLocal() };
  await getDb().collection("users").doc(String(id)).set(user);
  return user;
}

export async function updateUser(id: number, patch: Partial<Pick<UserRow, "name" | "email" | "role" | "password_hash">>) {
  await getDb().collection("users").doc(String(id)).update(patch);
}

export async function deleteUser(id: number) {
  await getDb().collection("users").doc(String(id)).delete();
}

export async function createSession(token: string, userId: number, expiresAt: string) {
  await getDb().collection("sessions").doc(token).set({
    user_id: userId,
    created_at: nowLocal(),
    expires_at: expiresAt,
  });
}

export async function getUserBySessionToken(token: string): Promise<UserRow | null> {
  const snap = await getDb().collection("sessions").doc(token).get();
  if (!snap.exists) return null;
  const s = snap.data();
  if (!s) return null;
  if (new Date(s.expires_at) <= new Date()) return null;
  return getUserById(s.user_id);
}

export async function deleteSession(token: string) {
  await getDb().collection("sessions").doc(token).delete();
}

export async function deleteSessionsByUser(userId: number) {
  const snap = await getDb().collection("sessions").where("user_id", "==", userId).get();
  const batch = getDb().batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

export async function clearBookingsCreatedBy(userId: number) {
  const all = await allRawBookings();
  const batch = getDb().batch();
  for (const { ref, data } of all) {
    if (data.created_by === userId) batch.update(ref, { created_by: null });
  }
  await batch.commit();
}

/* ---------- Customers ---------- */

export async function listCustomers(q?: string): Promise<CustomerRow[]> {
  const snap = await getDb().collection("customers").orderBy("created_at", "desc").get();
  const rows = snap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: d.id,
      name: d.name,
      phone: d.phone ?? "",
      email: d.email ?? "",
      note: d.note ?? "",
      created_at: d.created_at,
    };
  });
  if (q) {
    const s = q.toLowerCase();
    return rows
      .filter((r) => r.name.toLowerCase().includes(s) || r.phone.includes(s) || r.email.toLowerCase().includes(s))
      .slice(0, 200);
  }
  return rows.slice(0, 200);
}

export async function createCustomer(input: {
  name: string;
  phone: string;
  email: string;
  note: string;
}): Promise<CustomerRow> {
  const id = await nextId("customers");
  const row: CustomerRow = { ...input, id, created_at: nowLocal() };
  await getDb().collection("customers").doc(String(id)).set(row);
  return row;
}

export async function updateCustomer(id: number, patch: Partial<Pick<CustomerRow, "name" | "phone" | "email" | "note">>) {
  await getDb().collection("customers").doc(String(id)).update(patch);
}

/** จำนวนการจองของลูกค้า (นับตามชื่อ) */
export async function customerBookingCount(name: string): Promise<number> {
  const all = await allRawBookings();
  return all.filter(({ data }) => data.customer_name === name).length;
}

export async function countBookingsByUser(userId: number): Promise<number> {
  const all = await allRawBookings();
  return all.filter(({ data }) => data.created_by === userId).length;
}