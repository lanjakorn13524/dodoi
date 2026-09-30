export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled";

export const BOOKING_STATUSES: { value: BookingStatus; label: string; color: string }[] = [
  { value: "pending", label: "รอชำระมัดจำ", color: "amber" },
  { value: "confirmed", label: "ยืนยันแล้ว", color: "blue" },
  { value: "checked_in", label: "เข้าพักแล้ว", color: "green" },
  { value: "checked_out", label: "เช็คเอ้าท์แล้ว", color: "gray" },
  { value: "cancelled", label: "ยกเลิก", color: "red" },
];

export const STATUS_LABEL = Object.fromEntries(
  BOOKING_STATUSES.map((s) => [s.value, s.label])
) as Record<BookingStatus, string>;

export function getStatusColor(status: BookingStatus): string {
  return BOOKING_STATUSES.find((s) => s.value === status)?.color ?? "gray";
}