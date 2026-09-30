"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Field,
  GhostButton,
  PrimaryButton,
  inputCls,
  useToast,
} from "@/components/ui-components";
import { dayKey, daysInMonth, monthKey } from "@/lib/date";
import { thMonthYear } from "@/components/ui";
import { CalendarPopover } from "@/components/calendar-popover";
import { roomBg } from "@/lib/room-colors";
import { useAuth } from "@/components/auth-context";
import ReportSummary from "@/components/report-summary";
import type { BookingStatus } from "@/lib/status";

interface Room {
  id: number;
  name: string;
  color: string;
}

interface CalBooking {
  id: number;
  room_id: number;
  room_color: string;
  check_in_date: string;
  check_out_date: string;
  customer_name: string;
  customer_phone: string;
  room_name: string;
  note: string | null;
  google_event_id: string | null;
  status: BookingStatus;
}

interface CalData {
  rooms: Room[];
  bookings: CalBooking[];
  from: string;
  to: string;
}

const TODAY = dayKey(new Date());
const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function CalendarPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [data, setData] = useState<CalData | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<CalBooking[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formInit, setFormInit] = useState<{ room_id?: number; check_in_date?: string; check_out_date?: string }>({});
  const [editBooking, setEditBooking] = useState<CalBooking | null>(null);
  const [dayDetail, setDayDetail] = useState<{ date: Date; bookings: CalBooking[] } | null>(null);

  const mk = useMemo(() => monthKey(month), [month]);

  const refresh = useCallback(async () => {
    const [calRes, upRes] = await Promise.all([
      fetch(`/api/calendar?month=${mk}`),
      fetch(`/api/bookings?from=${TODAY}`),
    ]);
    const [cal, up] = await Promise.all([calRes.json(), upRes.json()]);
    setData(cal.bookings ? cal : null);
    setUpcomingBookings(Array.isArray(up) ? up : (Array.isArray(up?.bookings) ? up.bookings : []));
  }, [mk]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, [refresh]);

  // จับกลุ่มการจองตามวัน (ครอบคลุมวันเข้าพักถึงก่อนวันออก)
  const bookingsByDay = useMemo(() => {
    const map = new Map<string, CalBooking[]>();
    for (const b of data?.bookings ?? []) {
      let d = new Date(`${b.check_in_date}T00:00:00`);
      const out = new Date(`${b.check_out_date}T00:00:00`);
      while (d < out) {
        const key = dayKey(d);
        const arr = map.get(key) ?? [];
        arr.push(b);
        map.set(key, arr);
        d = new Date(d.getTime() + 86400000);
      }
    }
    return map;
  }, [data]);

  const cells = useMemo(() => {
    const year = month.getFullYear();
    const mon0 = month.getMonth();
    const firstDay = new Date(year, mon0, 1);
    const lead = firstDay.getDay();
    const totalDays = daysInMonth(year, mon0);
    const list: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < lead; i++) list.push({ date: new Date(year, mon0, i - lead + 1), inMonth: false });
    for (let d = 1; d <= totalDays; d++) list.push({ date: new Date(year, mon0, d), inMonth: true });
    const remaining = list.length % 7 === 0 ? 0 : 7 - (list.length % 7);
    for (let i = 1; i <= remaining; i++) list.push({ date: new Date(year, mon0 + 1, i), inMonth: false });
    return list;
  }, [month]);

  function offset(delta: number) {
    const d = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(d);
  }

  function handleCreate(checkInDate: string) {
    setFormInit({ check_in_date: checkInDate });
    setFormOpen(true);
  }

  function handleEdit(b: CalBooking) {
    setEditBooking(b);
  }

  const alerts = useMemo(() => {
    const today = TODAY;
    const threeDays = dayKey(new Date(now.getTime() + 3 * 86400000));
    const checkinsToday = upcomingBookings.filter((b) => b.check_in_date === today);
    const checkoutsToday = upcomingBookings.filter((b) => b.check_out_date === today);
    const staying = upcomingBookings.filter((b) => b.check_in_date <= today && b.check_out_date > today);
    const upcoming3 = upcomingBookings.filter((b) => b.check_in_date > today && b.check_in_date <= threeDays);
    return { checkinsToday, checkoutsToday, staying, upcoming3 };
  }, [upcomingBookings]);

  if (!data) return <p className="text-center text-slate-400 py-10">กำลังโหลด...</p>;

  const roomCount = data.rooms.length;

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* หัวหน้าเพจ */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">ปฏิทินจองห้องพัก</h1>
          <p className="text-sm text-slate-400">ภาพรวมการจองรายเดือน · คลิกวันที่เพื่อเพิ่มการจอง</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth(new Date(now.getFullYear(), now.getMonth(), 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            เดือนนี้
          </button>
          <div className="flex items-center rounded-lg border border-slate-200 bg-white shadow-sm">
            <button onClick={() => offset(-1)} className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 transition" aria-label="เดือนก่อนหน้า">
              <ChevronLeftIcon />
            </button>
            <span className="min-w-[150px] text-center text-sm font-semibold text-slate-700">
              {thMonthYear(month)}
            </span>
            <button onClick={() => offset(1)} className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 transition" aria-label="เดือนถัดไป">
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </div>

      {/* แจ้งเตือน */}
      <AlertPanel alerts={alerts} />

      {/* Month Grid */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* หัววัน */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/60">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={`py-2.5 text-center text-xs font-semibold uppercase tracking-wide ${
                i === 0 ? "text-rose-500" : i === 6 ? "text-sky-500" : "text-slate-400"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* ช่องวัน */}
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const key = dayKey(cell.date);
            const isToday = key === TODAY;
            const dow = cell.date.getDay();
            const dayBookings = bookingsByDay.get(key) ?? [];
            const activeBookings = dayBookings.filter((b) => b.status !== "cancelled");
            const bookedRooms = new Set(activeBookings.map((b) => b.room_id)).size;
            const freeRooms = Math.max(0, roomCount - bookedRooms);
            return (
              <div
                key={idx}
                onClick={() => handleCreate(key)}
                className={`relative border-slate-100 p-1 sm:p-1.5 h-[56px] sm:h-auto sm:min-h-[112px] transition group cursor-pointer select-none ${
                  idx % 7 !== 6 ? "border-r" : ""
                } ${idx < 7 ? "" : "border-t"} ${
                  cell.inMonth ? "bg-white hover:bg-indigo-50/40" : "bg-slate-50/50"
                } ${isToday ? "bg-indigo-50/50 ring-1 ring-inset ring-indigo-300" : ""}`}
              >
                <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                  {dayBookings.length > 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDayDetail({ date: cell.date, bookings: dayBookings });
                      }}
                      title={`ดูการจองทั้งหมด ${dayBookings.length} รายการ`}
                      className={`flex size-6 sm:size-7 items-center justify-center rounded-full text-[11px] sm:text-xs font-semibold transition ${
                        isToday
                          ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                          : cell.inMonth
                            ? dow === 0
                              ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            : "bg-slate-50 text-slate-300"
                      }`}
                    >
                      {cell.date.getDate()}
                    </button>
                  ) : (
                    <span
                      className={`flex size-6 sm:size-7 items-center justify-center rounded-full text-[11px] sm:text-xs font-semibold ${
                        isToday
                          ? "bg-indigo-600 text-white shadow-sm"
                          : cell.inMonth
                            ? dow === 0
                              ? "text-rose-500"
                              : "text-slate-500"
                            : "text-slate-300"
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>
                  )}
                  {cell.inMonth && (
                    <span className="hidden md:inline text-[10px] text-slate-300">
                      ว่าง {freeRooms}/{roomCount}
                    </span>
                  )}
                </div>

                {cell.inMonth && (
                  <div className="absolute inset-x-1 sm:inset-x-1.5 bottom-1.5 sm:hidden">
                    {dayBookings.length > 0 && (
                      <div className="flex flex-wrap gap-0.5">
                        {dayBookings.slice(0, 4).map((b) => (
                          <span
                            key={b.id}
                            className={`size-1.5 rounded-full ${b.status === "cancelled" ? "bg-slate-300" : ""}`}
                            style={b.status === "cancelled" ? undefined : { backgroundColor: b.room_color ?? "#94a3b8" }}
                          />
                        ))}
                      </div>
                    )}
                    {dayBookings.length > 4 && (
                      <span className="block text-[9px] leading-tight text-slate-400">+{dayBookings.length - 4}</span>
                    )}
                  </div>
                )}

                <div className="hidden sm:block space-y-1">
                  {dayBookings.slice(0, 3).map((b) => {
                    const cancelled = b.status === "cancelled";
                    return (
                      <button
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(b);
                        }}
                        className={`block w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium transition hover:brightness-95 ${
                          cancelled ? "line-through opacity-60" : ""
                        }`}
                        style={cancelled
                          ? { backgroundColor: "#e2e8f0", color: "#94a3b8" }
                          : { backgroundColor: roomBg(b.room_color ?? "#94a3b8"), color: b.room_color ?? "#475569" }}
                        title={`${b.customer_name} · ห้อง ${b.room_name}${cancelled ? " · ยกเลิก" : ""}\n${b.check_in_date} → ${b.check_out_date}${b.note ? `\n${b.note}` : ""}`}
                      >
                        ✕ {b.customer_name}
                      </button>
                    );
                  })}
                  {dayBookings.length > 3 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDayDetail({ date: cell.date, bookings: dayBookings });
                      }}
                      className="px-1 text-left text-[11px] font-medium text-slate-400 hover:text-indigo-600 transition"
                    >
                      +{dayBookings.length - 3} รายการ ดูทั้งหมด
                    </button>
                  )}
                </div>

                <div className="absolute inset-x-1.5 bottom-1.5 hidden sm:group-hover:flex items-center gap-1 rounded-md bg-indigo-600/90 px-1.5 py-1 text-[10px] font-semibold text-white">
                  <PlusIcon /> เพิ่มการจอง
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* สรุปด้านล่าง */}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-indigo-600" /> เพิ่มการจองได้
        </span>
        <span className="mx-1">·</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full border border-indigo-300 bg-indigo-50" /> วันนี้
        </span>
      </div>

      {isAdmin && (
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">รายงานสรุปประจำเดือน</h2>
            <span className="text-sm text-slate-400">{thMonthYear(month)}</span>
          </div>
          <ReportSummary month={mk} showRecent />
        </div>
      )}

      <QuickBookingForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={formInit}
        rooms={data.rooms}
        onCreated={() => {
          setFormOpen(false);
          refresh();
        }}
      />

      <EditBookingModal
        booking={editBooking}
        onClose={() => setEditBooking(null)}
        onSaved={() => {
          setEditBooking(null);
          refresh();
        }}
      />

      <DayDetailModal
        detail={dayDetail}
        onClose={() => setDayDetail(null)}
        onEdit={(b) => {
          setEditBooking(b);
          setDayDetail(null);
        }}
        onAdd={(date) => {
          setDayDetail(null);
          handleCreate(dayKey(date));
        }}
      />
    </div>
  );
}

function DayDetailModal({
  detail,
  onClose,
  onEdit,
  onAdd,
}: {
  detail: { date: Date; bookings: CalBooking[] } | null;
  onClose: () => void;
  onEdit: (b: CalBooking) => void;
  onAdd: (date: Date) => void;
}) {
  if (!detail) return null;
  const title = new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(detail.date);
  const sorted = [...detail.bookings].sort((a, b) =>
    a.check_in_date.localeCompare(b.check_in_date) || a.room_name.localeCompare(b.room_name)
  );

  return (
    <Modal open onClose={onClose} title={`การจอง · ${title}`} wide footer={<GhostButton onClick={onClose}>ปิด</GhostButton>}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          มีการจองทั้งหมด {sorted.length} รายการในวันนี้
        </p>
        {sorted.map((b) => {
          const cancelled = b.status === "cancelled";
          return (
            <div
              key={b.id}
              onClick={() => onEdit(b)}
              className={`flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 transition cursor-pointer ${
                cancelled ? "opacity-60" : "hover:border-indigo-300 hover:bg-indigo-50/40"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-base ${cancelled ? "bg-slate-100 text-slate-400" : ""}`} style={cancelled ? undefined : { backgroundColor: roomBg(b.room_color ?? "#94a3b8"), color: b.room_color ?? "#475569" }}>
                  🛏
                </span>
                <div className="min-w-0">
                  <div className={`truncate text-sm font-semibold ${cancelled ? "text-slate-400 line-through" : "text-slate-800"}`}>
                    {b.customer_name}
                    <span className="ml-2 text-xs font-normal text-slate-400">ห้อง {b.room_name}</span>
                    {cancelled && (
                      <span className="ml-2 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 no-underline">
                        ยกเลิกแล้ว
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {b.check_in_date} → {b.check_out_date}
                    {b.customer_phone ? ` · ${b.customer_phone}` : ""}
                  </div>
                  {b.note ? <div className="mt-0.5 truncate text-xs text-slate-500">📝 {b.note}</div> : null}
                </div>
              </div>
              <span className="shrink-0 text-xs font-medium text-indigo-600">
                {cancelled ? "ดู ›" : "แก้ไข ›"}
              </span>
            </div>
          );
        })}

        <div className="!mt-5">
          <PrimaryButton onClick={() => onAdd(detail.date)}>+ เพิ่มการจองวันนี้</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

function AlertPanel({
  alerts,
}: {
  alerts: {
    checkinsToday: CalBooking[];
    checkoutsToday: CalBooking[];
    staying: CalBooking[];
    upcoming3: CalBooking[];
  };
}) {
  const items: { color: string; chip: string; badge: string; icon: React.ReactNode; label: string; count: number; bookings: CalBooking[] }[] = [
    { color: "emerald", chip: "bg-emerald-50 text-emerald-700", badge: "bg-emerald-600", icon: "→", label: "เข้าพักวันนี้", count: alerts.checkinsToday.length, bookings: alerts.checkinsToday },
    { color: "blue", chip: "bg-blue-50 text-blue-700", badge: "bg-blue-600", icon: "←", label: "เช็คเอ้าท์วันนี้", count: alerts.checkoutsToday.length, bookings: alerts.checkoutsToday },
    { color: "indigo", chip: "bg-indigo-50 text-indigo-700", badge: "bg-indigo-600", icon: "🛏", label: "กำลังเข้าพัก", count: alerts.staying.length, bookings: alerts.staying },
    { color: "amber", chip: "bg-amber-50 text-amber-700", badge: "bg-amber-500", icon: "⏰", label: "เข้าพักใน 3 วัน", count: alerts.upcoming3.length, bookings: alerts.upcoming3 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className={`flex size-9 items-center justify-center rounded-lg text-base ${item.chip}`}>{item.icon}</span>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-400">{item.label}</div>
              <div className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${item.badge}`} />
                <span className="text-lg font-bold text-slate-700">{item.count}</span>
                <span className="text-[11px] text-slate-400">รายการ</span>
              </div>
            </div>
          </div>
          {item.count > 0 && item.bookings.length <= 5 && (
            <div className="mt-2 truncate text-[11px] text-slate-500">
              {item.bookings.map((b) => `${b.customer_name} (ห้อง ${b.room_name})`).join(", ")}
            </div>
          )}
          {item.count > 5 && (
            <div className="mt-2 text-[11px] text-slate-500">
              {item.bookings.slice(0, 3).map((b) => b.customer_name).join(", ")} และอีก {item.count - 3} รายการ...
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function QuickBookingForm({
  open,
  onClose,
  initial,
  rooms,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  initial: { room_id?: number; check_in_date?: string; check_out_date?: string };
  rooms: Room[];
  onCreated: () => void;
}) {
  const toast = useToast();
  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [nights, setNights] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const checkOut = useMemo(() => {
    if (!checkIn) return "";
    const d = new Date(`${checkIn}T00:00:00`);
    d.setDate(d.getDate() + nights);
    return dayKey(d);
  }, [checkIn, nights]);

  useEffect(() => {
    if (open) {
      setRoomId(initial?.room_id ? String(initial.room_id) : "");
      setCheckIn(initial?.check_in_date ?? "");
      setNights(1);
      setCustomerName("");
      setCustomerPhone("");
      setNote("");
    }
  }, [open, initial]);

  async function save() {
    if (!roomId) return toast("กรุณาเลือกห้อง", "error");
    if (!checkIn) return toast("กรุณาระบุวันที่", "error");
    if (!customerName.trim()) return toast("กรุณาระบุชื่อผู้จอง", "error");
    setSaving(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: Number(roomId),
          customer_name: customerName.trim(),
          customer_phone: customerPhone,
          check_in_date: checkIn,
          check_out_date: checkOut,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
      if (data.sync && !data.sync.ok) {
        toast(`จองแล้ว แต่ซิงค์ปฏิทินไม่สำเร็จ: ${data.sync.message}`, "error");
      } else {
        toast(data.sync ? "จองห้องและซิงค์ปฏิทินแล้ว" : "จองห้องเรียบร้อย");
      }
      onClose();
      onCreated();
    } catch (err) {
      toast(err instanceof Error ? err.message : "เกิดข้อผิดพลาด", "error");
    } finally {
      setSaving(false);
    }
  }

  const availableRooms = rooms; // ทุกห้องที่ active (conflict จะเช็กที่ backend)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="จองห้อง"
      footer={
        <>
          <GhostButton onClick={onClose}>ยกเลิก</GhostButton>
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึกการจอง"}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="ห้องพัก" required>
          <select className={inputCls} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">-- เลือกห้อง --</option>
            {availableRooms.map((r) => (
              <option key={r.id} value={r.id}>
                ห้อง {r.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="วันที่เข้าพัก" required hint="ล็อกตามวันที่กดในปฏิทิน">
            <input className={`${inputCls} bg-slate-100`} value={checkIn} readOnly />
          </Field>
          <Field label="คืนที่เข้าพัก" required>
            <select className={inputCls} value={nights} onChange={(e) => setNights(Number(e.target.value))}>
              {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} คืน
                </option>
              ))}
            </select>
          </Field>
        </div>
        {checkOut && (
          <p className="-mt-2 text-xs text-slate-500">
            เช็คเอ้าท์อัตโนมัติ: <span className="font-semibold text-slate-700">{checkOut}</span> ({nights} คืน)
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="ชื่อผู้จอง" required>
            <input className={inputCls} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="เช่น สมชาย ใจดี" />
          </Field>
          <Field label="เบอร์โทร">
            <input className={inputCls} type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="กรอกเบอร์โทรหรือข้อความได้ไม่จำกัด" />
          </Field>
        </div>

        <Field label="หมายเหตุ">
          <textarea className={`${inputCls} min-h-[80px]`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ข้อความเพิ่มเติม (ไม่บังคับ)" />
        </Field>
      </div>
    </Modal>
  );
}

function EditBookingModal({
  booking,
  onClose,
  onSaved,
}: {
  booking: CalBooking | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [roomId, setRoomId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!booking) return;
    setRoomId(String(booking.room_id));
    setCheckIn(booking.check_in_date);
    setCheckOut(booking.check_out_date);
    setCustomerName(booking.customer_name);
    setCustomerPhone(booking.customer_phone ?? "");
    setNote(booking.note ?? "");
  }, [booking?.id]);

  if (!booking) return null;
  const b = booking;
  const cancelled = b.status === "cancelled";

  async function save() {
    if (!customerName.trim()) return toast("กรุณาระบุชื่อผู้จอง", "error");
    setSaving(true);
    try {
      const res = await fetch(`/api/bookings/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room_id: Number(roomId),
          customer_name: customerName.trim(),
          customer_phone: customerPhone,
          check_in_date: checkIn,
          check_out_date: checkOut,
          note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "เกิดข้อผิดพลาด");
      if (data.sync && !data.sync.ok) {
        toast(`บันทึกแล้ว แต่ซิงค์ปฏิทินไม่สำเร็จ: ${data.sync.message}`, "error");
      } else {
        toast(data.sync ? "บันทึกและซิงค์ปฏิทินแล้ว" : "บันทึกแล้ว");
      }
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "เกิดข้อผิดพลาด", "error");
    } finally {
      setSaving(false);
    }
  }

  async function doCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ยกเลิกไม่สำเร็จ");
      if (data.sync && !data.sync.ok) {
        toast(`ยกเลิกแล้ว แต่ลบจากปฏิทินไม่สำเร็จ: ${data.sync.message}`, "error");
      } else {
        toast(data.sync ? "ยกเลิกและลบจากปฏิทินแล้ว" : "ยกเลิกการจองแล้ว");
      }
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "เกิดข้อผิดพลาด", "error");
    } finally {
      setCancelling(false);
    }
  }

  async function doDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/bookings/${b.id}`, { method: "DELETE" });
      if (res.ok) {
        toast("ลบการจองแล้ว");
        onSaved();
      } else {
        const data = await res.json();
        toast(data.error ?? "ลบไม่สำเร็จ", "error");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${cancelled ? "รายละเอียด" : "แก้ไข"}การจอง #${booking.id}`}
      wide
      footer={
        <>
          <GhostButton onClick={onClose}>ปิด</GhostButton>
          {!cancelled && (
            <PrimaryButton onClick={save} disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
            </PrimaryButton>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {cancelled && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
            การจองนี้ถูกยกเลิกแล้ว
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="ห้องพัก" required>
            <input className={inputCls} value={`ห้อง ${booking.room_name}`} disabled />
          </Field>
          <Field label="สถานะ">
            <input
              className={inputCls}
              value={cancelled ? "ยกเลิกแล้ว" : "ยืนยันแล้ว"}
              disabled
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="วันที่เช็คอิน" required>
            {cancelled ? (
              <input className={`${inputCls} bg-slate-100`} value={checkIn} readOnly />
            ) : (
              <CalendarPopover value={checkIn} onSelect={setCheckIn} />
            )}
          </Field>
          <Field label="วันที่เช็คเอ้าท์" required>
            {cancelled ? (
              <input className={`${inputCls} bg-slate-100`} value={checkOut} readOnly />
            ) : (
              <CalendarPopover value={checkOut} onSelect={setCheckOut} />
            )}
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="ชื่อผู้จอง" required>
            <input className={inputCls} value={customerName} onChange={(e) => setCustomerName(e.target.value)} disabled={cancelled} />
          </Field>
          <Field label="เบอร์โทร">
            <input className={inputCls} type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} disabled={cancelled} />
          </Field>
        </div>

        <Field label="หมายเหตุ">
          <textarea className={`${inputCls} min-h-[80px]`} value={note} onChange={(e) => setNote(e.target.value)} disabled={cancelled} />
        </Field>

        {cancelled && isAdmin ? (
          <GhostButton className="!text-red-600 !border-red-200 !hover:bg-red-50" onClick={doDelete} disabled={deleting}>
            {deleting ? "กำลังลบ..." : "ลบการจองออกจากระบบ"}
          </GhostButton>
        ) : !cancelled ? (
          <div className="flex flex-wrap items-center gap-2">
            <GhostButton
              className={isAdmin ? "!text-red-600 !border-red-200 !hover:bg-red-50" : "!border-slate-300 !text-slate-600"}
              onClick={doCancel}
              disabled={cancelling}
            >
              {cancelling ? "กำลังยกเลิก..." : "ยกเลิกการจอง"}
            </GhostButton>
            {isAdmin && (
              <GhostButton className="!text-red-600 !border-red-200 !hover:bg-red-50" onClick={doDelete} disabled={deleting}>
                {deleting ? "กำลังลบ..." : "ลบการจอง"}
              </GhostButton>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}