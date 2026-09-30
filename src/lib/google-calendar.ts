import { google } from "googleapis";
import { getSetting, setSetting, deleteSetting } from "./firebase";
import { getBooking, listBookings, setBookingGoogleEventId } from "./bookings";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

export const SETTING_KEYS = {
  clientId: "google_client_id",
  clientSecret: "google_client_secret",
  redirectUri: "google_redirect_uri",
  tokens: "google_tokens",
  calendarId: "google_calendar_id",
  linkedEmail: "google_linked_email",
  autoSync: "google_auto_sync",
} as const;

function getAppRedirectUri() {
  return `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings`;
}

export async function getAutoSync(): Promise<boolean> {
  return (await getSetting(SETTING_KEYS.autoSync)) !== "0";
}

export async function setAutoSync(enabled: boolean) {
  await setSetting(SETTING_KEYS.autoSync, enabled ? "1" : "0");
}

export async function isGoogleConfigured(): Promise<boolean> {
  return Boolean(
    (await getSetting(SETTING_KEYS.clientId) || process.env.GOOGLE_CLIENT_ID) &&
    (await getSetting(SETTING_KEYS.clientSecret) || process.env.GOOGLE_CLIENT_SECRET)
  );
}

export async function isGoogleLinked(): Promise<boolean> {
  return Boolean(await getSetting(SETTING_KEYS.tokens));
}

async function makeOAuth() {
  const clientId = (await getSetting(SETTING_KEYS.clientId)) || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = (await getSetting(SETTING_KEYS.clientSecret)) || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    (await getSetting(SETTING_KEYS.redirectUri)) ||
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/settings/google/callback`;
  return new google.auth.OAuth2(clientId!, clientSecret!, redirectUri);
}

async function resolveCalendarId(oauth: InstanceType<typeof google.auth.OAuth2>, configuredId?: string) {
  const calendar = google.calendar({ version: "v3", auth: oauth });
  const calendars = (await calendar.calendarList.list()).data.items ?? [];
  const requested = configuredId?.trim().toLowerCase();
  const selected = requested
    ? calendars.find((item) => item.id?.toLowerCase() === requested || item.summary?.trim().toLowerCase() === requested)
    : undefined;
  const primary = calendars.find((item) => item.id === "primary" || item.primary);
  const resolved = selected ?? primary ?? calendars[0];
  if (!resolved?.id) throw new Error("ไม่พบปฏิทินในบัญชี Google");
  if (resolved.id !== configuredId) await setSetting(SETTING_KEYS.calendarId, resolved.id);
  return { id: resolved.id, calendar };
}

function calendarDate(value: unknown, label: string) {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    const date = value.toDate() as Date;
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }
  throw new Error(`วันที่ ${label} ไม่ถูกต้อง`);
}

export async function getAuthUrl(): Promise<string> {
  if (!(await isGoogleConfigured())) throw new Error("ยังไม่ได้ตั้งค่า Client ID / Secret");
  const oauth = await makeOAuth();
  return oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export function getGoogleAppRedirectUri() {
  return getAppRedirectUri();
}

export async function completeAuth(code: string) {
  const oauth = await makeOAuth();
  const { tokens } = await oauth.getToken(code);
  oauth.setCredentials(tokens);
  await setSetting(SETTING_KEYS.tokens, JSON.stringify(tokens));

  const { id: calendarId, calendar } = await resolveCalendarId(
    oauth,
    await getSetting(SETTING_KEYS.calendarId) || undefined
  );
  await setSetting(SETTING_KEYS.calendarId, calendarId);
  await setSetting(SETTING_KEYS.linkedEmail, "");
  try {
    const profile = await calendar.calendarList.get({ calendarId });
    if (profile.data.id) await setSetting(SETTING_KEYS.linkedEmail, profile.data.summary ?? "");
  } catch {
    /* ignore */
  }
}

export async function clearAuth() {
  for (const key of [
    SETTING_KEYS.tokens,
    SETTING_KEYS.calendarId,
    SETTING_KEYS.linkedEmail,
  ]) {
    await deleteSetting(key);
  }
}

async function loadToken() {
  const oauth = await makeOAuth();
  const savedTokens = JSON.parse((await getSetting(SETTING_KEYS.tokens))!);
  oauth.setCredentials(savedTokens);
  const refreshed = await oauth.refreshAccessToken();
  const tokens = { ...savedTokens, ...refreshed.credentials };
  await setSetting(SETTING_KEYS.tokens, JSON.stringify(tokens));
  oauth.setCredentials(tokens);
  return oauth;
}

export interface SyncResult {
  ok: boolean;
  message: string;
  eventId?: string;
}

export async function syncBookingToCalendar(bookingId: number): Promise<SyncResult> {
  const booking = await getBooking(bookingId);
  if (!booking) return { ok: false, message: "ไม่พบการจอง" };
  if (!(await isGoogleConfigured()) || !(await isGoogleLinked())) {
    return { ok: false, message: "Google Calendar ยังไม่ได้เชื่อมต่อ" };
  }
  try {
    const oauth = await loadToken();
    const { id: calendarId, calendar } = await resolveCalendarId(
      oauth,
      await getSetting(SETTING_KEYS.calendarId) || undefined
    );
    const checkInDate = calendarDate(booking.check_in_date, "เช็คอิน");
    const checkOutDate = calendarDate(booking.check_out_date, "เช็คเอ้าท์");
    const summary = `${booking.room_name} — ${booking.customer_name}`;
    const description = [
      `วันที่เข้าพัก: ${checkInDate}`,
      `วันที่ออก: ${checkOutDate}`,
      `ห้อง: ${booking.room_name}`,
      `ลูกค้า: ${booking.customer_name}`,
      `โทร: ${booking.customer_phone}`,
      `คืน: ${booking.nights}`,
      booking.note ? `หมายเหตุ: ${booking.note}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const event = {
      summary,
      description,
      start: { date: checkInDate },
      end: { date: checkOutDate },
      colorId: "7",
      extendedProperties: {
        private: { bookingId: String(booking.id), app: "hotel-booking" },
      },
    };

    if (booking.google_event_id) {
      try {
        await calendar.events.update({
          calendarId,
          eventId: booking.google_event_id,
          requestBody: event,
        });
        return { ok: true, message: "อัปเดตอีเวนต์แล้ว", eventId: booking.google_event_id };
      } catch (err) {
        if (!(err && typeof err === "object" && "code" in err && err.code === 404)) throw err;
      }
    }

    const created = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });
    if (created.data.id) {
      await setBookingGoogleEventId(booking.id, created.data.id);
      return { ok: true, message: "สร้างอีเวนต์แล้ว", eventId: created.data.id } as SyncResult;
    }
    return { ok: false, message: "Google ไม่คืน event id" };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "เกิดข้อผิดพลาด",
    };
  }
}

export async function deleteBookingEvent(bookingId: number, eventId: string | null): Promise<SyncResult> {
  const booking = await getBooking(bookingId);
  const resolved = eventId ?? booking?.google_event_id;
  if (!resolved) return { ok: true, message: "ไม่มีอีเวนต์ให้ลบ" };
  if (!(await isGoogleConfigured()) || !(await isGoogleLinked())) {
    return { ok: false, message: "Google Calendar ยังไม่ได้เชื่อมต่อ" };
  }
  try {
    const oauth = await loadToken();
    const { id: calendarId, calendar } = await resolveCalendarId(
      oauth,
      await getSetting(SETTING_KEYS.calendarId) || undefined
    );
    await calendar.events.delete({ calendarId, eventId: resolved });
    return { ok: true, message: "ลบอีเวนต์แล้ว" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "ลบอีเวนต์ไม่สำเร็จ" };
  }
}

/** ซิงค์การจองที่ยังไม่ยกเลิกทั้งหมด (ใช้ปุ่ม "ซิงค์ทั้งหมด") */
export async function syncAllBookings(): Promise<{ ok: number; fail: number; messages: string[] }> {
  const rows = await listBookings();
  let ok = 0;
  let fail = 0;
  const messages: string[] = [];
  for (const row of rows) {
    const res = await syncBookingToCalendar(row.id);
    if (res.ok) ok++;
    else {
      fail++;
      messages.push(`#${row.id}: ${res.message}`);
    }
  }
  return { ok, fail, messages };
}

export async function resyncAllBookings(): Promise<{ ok: number; fail: number; messages: string[] }> {
  const rows = await listBookings();
  let ok = 0;
  let fail = 0;
  const messages: string[] = [];
  for (const row of rows) {
    try {
      if (row.google_event_id) {
        const oauth = await loadToken();
        const { id: calendarId, calendar } = await resolveCalendarId(
          oauth,
          await getSetting(SETTING_KEYS.calendarId) || undefined
        );
        try {
          await calendar.events.delete({ calendarId, eventId: row.google_event_id });
        } catch (err) {
          if (!(err && typeof err === "object" && "code" in err && err.code !== 404)) throw err;
        }
        await setBookingGoogleEventId(row.id, "");
      }
      const result = await syncBookingToCalendar(row.id);
      if (result.ok) ok++;
      else {
        fail++;
        messages.push(`#${row.id}: ${result.message}`);
      }
    } catch (err) {
      fail++;
      messages.push(`#${row.id}: ${err instanceof Error ? err.message : "ซิงค์ไม่สำเร็จ"}`);
    }
  }
  return { ok, fail, messages };
}