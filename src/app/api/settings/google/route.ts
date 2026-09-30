import { NextResponse, type NextRequest } from "next/server";
import {
  getAutoSync,
  setAutoSync,
  isGoogleConfigured,
  isGoogleLinked,
  SETTING_KEYS,
} from "@/lib/google-calendar";
import { getSetting, setSetting } from "@/lib/firebase";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });

  const [configured, linked, autoSync, clientId, clientSecret, redirectUri, calendarId, linkedEmail] =
    await Promise.all([
      isGoogleConfigured(),
      isGoogleLinked(),
      getAutoSync(),
      getSetting(SETTING_KEYS.clientId),
      getSetting(SETTING_KEYS.clientSecret),
      getSetting(SETTING_KEYS.redirectUri),
      getSetting(SETTING_KEYS.calendarId),
      getSetting(SETTING_KEYS.linkedEmail),
    ]);

  return NextResponse.json({
    configured,
    linked,
    autoSync,
    clientId: clientId ?? "",
    hasClientSecret: Boolean(clientSecret),
    redirectUri:
      redirectUri || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/settings/google/callback`,
    calendarId: calendarId ?? "primary",
    linkedEmail: linkedEmail ?? "",
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin)
    return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
  const body = await req.json();
  if (body.client_id !== undefined) {
    const v = String(body.client_id).trim();
    if (v) await setSetting(SETTING_KEYS.clientId, v);
  }
  if (body.client_secret !== undefined) {
    const v = String(body.client_secret).trim();
    if (v) await setSetting(SETTING_KEYS.clientSecret, v);
  }
  if (body.redirect_uri !== undefined) {
    const v = String(body.redirect_uri).trim();
    await setSetting(SETTING_KEYS.redirectUri, v);
  }
  if (body.calendar_id !== undefined && body.calendar_id !== null) {
    const v = String(body.calendar_id).trim();
    if (v) await setSetting(SETTING_KEYS.calendarId, v);
  }
  if (body.auto_sync !== undefined) {
    await setAutoSync(Boolean(body.auto_sync));
  }
  return NextResponse.json({ ok: true });
}
