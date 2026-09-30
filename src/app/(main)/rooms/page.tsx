"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Field,
  GhostButton,
  Modal,
  PrimaryButton,
  inputCls,
  useToast,
} from "@/components/ui-components";
import { ROOM_PALETTE, randomRoomColor, roomBg } from "@/lib/room-colors";
import { useAuth } from "@/components/auth-context";

interface Room {
  id: number;
  name: string;
  is_active: number;
  color: string;
}

export default function RoomsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  if (isAdmin) {
    return <AdminRooms />;
  }
  return <UserRooms />;
}

function UserRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/rooms");
    const data = await res.json();
    if (res.ok && Array.isArray(data)) setRooms(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="text-center text-slate-400 py-10">กำลังโหลด...</p>;

  const active = rooms.filter((r) => r.is_active);
  const inactive = rooms.filter((r) => !r.is_active);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-1">ห้องพัก</h1>
      <p className="text-sm text-slate-400 mb-5">สถานะห้องว่างในตอนนี้</p>

      <Card className="p-5">
        {active.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 text-xs font-medium text-slate-400">เปิดให้เช่า ({active.length})</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {active.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
                  <span className="size-7 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">ห้อง {r.name}</div>
                    <div className="text-xs text-emerald-600 font-medium">เปิดให้เช่า</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {inactive.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-medium text-slate-400">ปิด (ไม่ให้เช่า) ({inactive.length})</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {inactive.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 opacity-70">
                  <span className="size-7 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-400 line-through">ห้อง {r.name}</div>
                    <div className="text-xs text-rose-500 font-medium">ปิด</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {rooms.length === 0 && <span className="text-sm text-slate-400">ยังไม่มีห้อง</span>}
      </Card>
    </div>
  );
}

function AdminRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomOpen, setRoomOpen] = useState(false);
  const toast = useToast();

  async function load() {
    const r = await fetch("/api/rooms").then((x) => x.json());
    setRooms(r);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(room: Room) {
    const res = await fetch("/api/rooms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: room.id, is_active: !room.is_active }),
    });
    if (res.ok) load();
  }

  async function changeColor(room: Room, color: string) {
    if (color === room.color) return;
    const res = await fetch("/api/rooms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: room.id, color }),
    });
    if (res.ok) load();
  }

  const activeRooms = rooms.filter((r) => r.is_active).length;

  const active = rooms.filter((r) => r.is_active);
  const inactive = rooms.filter((r) => !r.is_active);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">จัดการห้องพัก</h1>
          <p className="text-sm text-slate-400">แตะสีเพื่อเปลี่ยนสีของห้อง (ตรงกับสีในปฏิทิน)</p>
        </div>
        <PrimaryButton onClick={() => setRoomOpen(true)}>+ เพิ่มห้อง</PrimaryButton>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">ห้องพักทั้งหมด</h2>
          <p className="text-xs text-slate-400">
            ใช้งานอยู่ {activeRooms} / {rooms.length} ห้อง
          </p>
        </div>

        {active.length > 0 && (
          <div className="mb-3">
            <div className="mb-2 text-xs font-medium text-slate-400">ใช้อยู่</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {active.map((r) => (
                <RoomCard key={r.id} room={r} onToggle={() => toggle(r)} onChangeColor={(c) => changeColor(r, c)} />
              ))}
            </div>
          </div>
        )}

        {inactive.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-medium text-slate-400">ปิดการใช้งาน</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {inactive.map((r) => (
                <RoomCard key={r.id} room={r} onToggle={() => toggle(r)} onChangeColor={(c) => changeColor(r, c)} />
              ))}
            </div>
          </div>
        )}

        {rooms.length === 0 && <span className="text-sm text-slate-400">ยังไม่มีห้อง</span>}
      </Card>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-sm text-slate-500">
        <span>💡</span>
        <span>
          กด <b>+ เพิ่มห้อง</b> ระบบจะสุ่มสีให้อัตโนมัติ และสีนั้นจะตรงกับชิปการจองในหน้าปฏิทินทันที
        </span>
      </div>

      <RoomModal open={roomOpen} onClose={() => setRoomOpen(false)} onAdded={() => { toast("เพิ่มห้องแล้ว"); setRoomOpen(false); load(); }} />
    </div>
  );
}

function RoomCard({
  room,
  onToggle,
  onChangeColor,
}: {
  room: Room;
  onToggle: () => void;
  onChangeColor: (color: string) => void;
}) {
  const [pickOpen, setPickOpen] = useState(false);

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border p-2 transition ${
        room.is_active
          ? "border-slate-200 bg-white"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="relative">
        <button
          onClick={() => setPickOpen((o) => !o)}
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition hover:scale-105"
          style={{ backgroundColor: room.color }}
          title="เปลี่ยนสีห้อง"
        >
          🎨
        </button>
        {pickOpen && (
          <div className="absolute left-0 top-9 z-20 flex w-40 flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            {ROOM_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => { onChangeColor(c); setPickOpen(false); }}
                className="size-6 rounded-full transition hover:scale-110"
                style={{ backgroundColor: c, outline: room.color === c ? "2px solid #111" : "none" }}
              />
            ))}
            <button
              onClick={() => { onChangeColor(randomRoomColor()); setPickOpen(false); }}
              className="flex w-full items-center justify-center gap-1 rounded-md bg-slate-100 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
            >
              สุ่มสี
            </button>
          </div>
        )}
      </div>

      <button onClick={onToggle} className="flex-1 text-left" title={room.is_active ? "คลิกเพื่อปิดการใช้งาน" : "คลิกเพื่อเปิดใช้งาน"}>
        <span className={`block text-sm font-semibold ${room.is_active ? "text-slate-800" : "text-slate-400 line-through"}`}>
          ห้อง {room.name}
        </span>
        <span
          className={`mt-0.5 block h-1 rounded-full ${room.is_active ? "" : "opacity-30"}`}
          style={{ backgroundColor: room.color }}
        />
      </button>

      <span
        className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${room.is_active ? "text-emerald-700" : "text-slate-400"}`}
        style={{ backgroundColor: roomBg(room.is_active ? "#10b981" : "#cbd5e1") }}
      >
        {room.is_active ? "เปิด" : "ปิด"}
      </span>
    </div>
  );
}

function RoomModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState(() => randomRoomColor());

  useEffect(() => {
    if (open) {
      setName("");
      setColor(randomRoomColor());
    }
  }, [open]);

  async function save() {
    if (!name.trim()) return toast("กรุณาระบุชื่อห้อง", "error");
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color }),
    });
    if (res.ok) onAdded();
    else toast("บันทึกไม่สำเร็จ", "error");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="เพิ่มห้อง"
      footer={
        <>
          <GhostButton onClick={onClose}>ยกเลิก</GhostButton>
          <PrimaryButton onClick={save}>บันทึก</PrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="ชื่อห้อง / เลขห้อง" required hint="เช่น 201, V3">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น 201, V3" />
        </Field>

        <Field label="สีของห้อง" hint="สุ่มมาให้อัตโนมัติ เลือกเองได้">
          <div className="flex flex-wrap items-center gap-2">
            {ROOM_PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="size-8 rounded-full transition hover:scale-110"
                style={{ backgroundColor: c, outline: color === c ? "3px solid #334155" : "1px solid #e2e8f0" }}
              />
            ))}
            <button
              onClick={() => setColor(randomRoomColor())}
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              🎲 สุ่มใหม่
            </button>
          </div>
        </Field>
      </div>
    </Modal>
  );
}