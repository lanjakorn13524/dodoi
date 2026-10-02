"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import {
  Card,
  Checkbox,
  GhostButton,
  PrimaryButton,
  Separator,
  inputCls,
  useToast,
} from "@/components/ui-components";
import { useAuth } from "@/components/auth-context";

const defaultGoogleState: GoogleState = {
  configured: false,
  linked: false,
  tokenOk: false,
  tokenError: "",
  autoSync: true,
  clientId: "",
  calendarId: "primary",
  linkedEmail: "",
  hasClientSecret: false,
  redirectUri: "",
};

function isGoogleState(value: unknown): value is GoogleState {
  return !!value && typeof value === "object" && (
    "configured" in value ||
    "linked" in value ||
    "autoSync" in value ||
    "clientId" in value ||
    "calendarId" in value ||
    "linkedEmail" in value ||
    "hasClientSecret" in value ||
    "redirectUri" in value
  );
}

function GoogleSection() {
  const toast = useToast();

  const [state, setState] = useState<GoogleState | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/google");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState(defaultGoogleState);
        setClientId("");
        setCalendarId("primary");
        setRedirectUri(`${window.location.origin}/api/settings/google/callback`);
        return;
      }

      if (!isGoogleState(data)) {
        setState(defaultGoogleState);
        setClientId("");
        setCalendarId("primary");
        setRedirectUri(`${window.location.origin}/api/settings/google/callback`);
        return;
      }

      const nextState: GoogleState = {
        ...defaultGoogleState,
        ...data,
        configured: Boolean(data.configured),
        linked: Boolean(data.linked),
        tokenOk: Boolean(data.tokenOk),
        tokenError: String(data.tokenError ?? ""),
        autoSync: Boolean(data.autoSync),
        clientId: String(data.clientId ?? ""),
        calendarId: String(data.calendarId ?? "primary"),
        linkedEmail: String(data.linkedEmail ?? ""),
        hasClientSecret: Boolean(data.hasClientSecret),
        redirectUri: String(data.redirectUri ?? ""),
      };

      setState(nextState);
      setClientId(nextState.clientId);
      setCalendarId(nextState.calendarId || "primary");
      setRedirectUri(nextState.redirectUri || `${window.location.origin}/api/settings/google/callback`);
    } catch {
      setState(defaultGoogleState);
      setClientId("");
      setCalendarId("primary");
      setRedirectUri(`${window.location.origin}/api/settings/google/callback`);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const g = params.get("google");
    const reason = params.get("reason") ?? "ไม่ทราบสาเหตุ";

    if (g === "linked") toast("เชื่อมต่อ Google Calendar เรียบร้อย");
    else if (g === "error") toast("เชื่อมต่อไม่สำเร็จ: " + reason, "error");

    if (g) {
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
      load();
    }
  }, [load, toast]);

  async function connect() {
    setConnecting(true);
    try {
      const saved = await saveGoogleSettings(false);
      if (!saved) return;

      const res = await fetch("/api/settings/google/auth-url", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "สร้าง URL เชื่อมต่อไม่สำเร็จ");
      window.open(data.url, "_blank");
    } catch (err) {
      toast(err instanceof Error ? err.message : "เกิดข้อผิดพลาด", "error");
    } finally {
      setConnecting(false);
    }
  }

  async function saveGoogleSettings(showToast = true) {
    const res = await fetch("/api/settings/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        ...(clientSecret.trim() ? { client_secret: clientSecret.trim() } : {}),
        redirect_uri: redirectUri.trim(),
      }),
    });
    if (!res.ok) {
      toast("บันทึกการตั้งค่า Google Calendar ไม่สำเร็จ", "error");
      return false;
    }
    setClientSecret("");
    if (showToast) toast("บันทึกการตั้งค่า Google Calendar แล้ว");
    await load();
    return true;
  }

  async function saveCalendarId() {
    const res = await fetch("/api/settings/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendar_id: calendarId }),
    });
    if (res.ok) {
      toast("บันทึก Calendar ID แล้ว");
      load();
    }
  }

  async function syncAll() {
    const res = await fetch("/api/settings/google/sync?force=1", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error ?? "ซิงค์ Google Calendar ไม่สำเร็จ", "error");
      return;
    }
    toast(
      `ซิงค์แล้วสำเร็จ ${data.ok} รายการ${data.fail ? `, ไม่สำเร็จ ${data.fail} รายการ` : ""}`,
      data.fail ? "error" : "success"
    );
    if (data.messages?.length) toast(data.messages[0], "error");
  }

  async function toggleAutoSync(v: boolean) {
    await fetch("/api/settings/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auto_sync: v }),
    });
    load();
  }

  async function disconnect() {
    await fetch("/api/settings/google/clear", { method: "POST" });
    toast("ยกเลิกการเชื่อมต่อแล้ว");
    load();
  }

  const safeState = state && isGoogleState(state) ? state : defaultGoogleState;

  if (!state || !isGoogleState(state)) return <p className="text-center text-slate-400 py-8">กำลังโหลด...</p>;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-xl font-bold">ตั้งค่า</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveCalendarId();
        }}
      >
        {/* Google Calendar */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h2 className="font-semibold text-foreground">ข้อมูลปฏิทิน</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              กรอกข้อมูล Google OAuth แล้วบันทึก จากนั้นกดเชื่อมต่อเพื่อเลือกบัญชี Google Calendar
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="grid gap-3">
              <label className="block text-sm font-medium text-slate-700">
                Google Client ID
                <input className={inputCls + " mt-1"} value={clientId} onChange={(e) => setClientId(e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Google Client Secret
                <input
                  className={inputCls + " mt-1"}
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={safeState.hasClientSecret ? "บันทึกไว้แล้ว ถ้าจะเปลี่ยนให้กรอกค่าใหม่" : "กรอก Client Secret"}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Authorized Redirect URI
                <input className={inputCls + " mt-1"} value={redirectUri} onChange={(e) => setRedirectUri(e.target.value)} />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  ต้องเป็น <code>/api/settings/google/callback</code> ของโดเมนนี้ และต้องตรงกับ Authorized redirect URIs
                  ใน Google Cloud Console แบบเป๊ะ ๆ
                </span>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <GhostButton type="button" onClick={() => saveGoogleSettings()}>
                บันทึกการตั้งค่า
              </GhostButton>
              <PrimaryButton type="button" onClick={connect} disabled={connecting}>
                {safeState.linked ? "เปลี่ยนบัญชี Google" : "เชื่อมต่อ Google Calendar"}
              </PrimaryButton>
              {safeState.linked && (
                <GhostButton type="button" className="!text-red-600" onClick={disconnect}>
                  ยกเลิกการเชื่อมต่อ
                </GhostButton>
              )}
              </div>
              <details className="mt-4 text-sm text-slate-600">
                <summary className="cursor-pointer font-medium text-slate-700">
                  วิธีตั้งค่าและเชื่อมต่อ Google Calendar
                </summary>
                <ol className="ml-5 mt-3 list-decimal space-y-2 leading-6">
                  <li>เข้า Google Cloud Console แล้วเลือก Project ของคุณ</li>
                  <li>เปิดใช้งาน Google Calendar API ที่เมนู APIs &amp; Services → Library</li>
                  <li>สร้าง OAuth Client แบบ Web application ที่เมนู Credentials</li>
                  <li>
                    ตั้ง Authorized redirect URI เป็น
                    <code className="ml-1 rounded bg-white px-1.5 py-0.5 text-xs text-slate-700">
                      /api/settings/google/callback
                    </code>
                    โดยเติมโดเมนปัจจุบันไว้ด้านหน้า
                  </li>
                  <li>นำ Client ID และ Client Secret ไปตั้งใน backend หรือ Environment Variables ของระบบ</li>
                  <li>กลับมาหน้านี้ แล้วกด “เชื่อมต่อ Google Calendar” เพื่อเลือกบัญชีและอนุญาตการเข้าถึง</li>
                </ol>
              </details>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Connection status */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h2 className="font-semibold text-foreground">สถานะการเชื่อมต่อปฏิทิน</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              ยืนยันว่าปฏิทิน Google เชื่อมต่อและซิงค์อีเวนต์การจองเรียบร้อยแล้ว
            </p>
          </div>
          <div className="md:col-span-2">
            {safeState.linked && !safeState.tokenOk ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                  <span className="size-2 rounded-full bg-amber-500" />
                  เชื่อมต่ออยู่ แต่ใช้ซิงค์ไม่ได้
                </div>
                <p className="mt-1 text-xs leading-5 text-amber-800">
                  {safeState.tokenError || "token ของ Google หมดอายุหรือถูกยกเลิก"}
                </p>
                <p className="mt-2 text-xs leading-5 text-amber-800">
                  ถ้าเพิ่งย้าย consent screen จาก Testing เป็น In production ต้องกด “เชื่อมต่อ Google Calendar”
                  ใหม่อีกครั้ง ไม่งั้น token จะหมดอายุทุก 7 วัน
                </p>
              </div>
            ) : safeState.linked ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  เชื่อมต่อแล้ว: {safeState.linkedEmail}
                </div>
                <p className="mt-1 text-xs text-emerald-700">
                  ปฏิทินเป้าหมาย: <b>{safeState.calendarId}</b>
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                ยังไม่ได้เชื่อมต่อกับบัญชี Google
              </div>
            )}
          </div>
        </div>

        <Separator className="my-8" />

        {/* Calendar */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h2 className="font-semibold text-foreground">ปฏิทินที่ใช้</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              ใช้ “primary” เป็นปฏิทินหลัก หรือระบุ ID ปฏิทินอื่น
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="flex gap-2">
              <input
                className={inputCls}
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                disabled={!safeState.linked}
              />
              <GhostButton type="button" onClick={saveCalendarId} disabled={!safeState.linked}>
                บันทึก
              </GhostButton>
            </div>
            <p className="mt-2 text-xs text-slate-400">ใช้ได้เฉพาะตอนเชื่อมต่อแล้ว</p>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Notification / sync settings */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h2 className="font-semibold text-foreground">การตั้งค่าการซิงค์ปฏิทิน</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              ตั้งค่าการซิงค์และการแจ้งเตือนของอีเวนต์ในปฏิทิน
            </p>
          </div>
          <div className="md:col-span-2">
            <fieldset>
              <legend className="text-sm font-medium text-foreground">Google Calendar</legend>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                จัดการการเชื่อมต่อและข้อมูลกับอีเวนต์ใน Google ปฏิทิน
              </p>
              <div className="mt-2">
                <label
                  className={`flex cursor-pointer items-center gap-3 py-1.5 ${safeState.linked ? "" : "opacity-50"}`}
                >
                  <Checkbox
                    checked={safeState.autoSync}
                    onChange={(v) => toggleAutoSync(v)}
                  />
                  <span className="text-sm text-slate-700">
                    ซิงค์อัตโนมัติเมื่อมีการสร้างหรือแก้ไขการจอง
                  </span>
                </label>
              </div>
            </fieldset>

            <fieldset className="mt-7">
              <legend className="text-sm font-medium text-foreground">การจัดการ</legend>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                ส่งข้อมูลการจองทั้งหมดไปยัง Google ปฏิทินทันที
              </p>
              <div className="mt-2">
                <div className="flex items-center justify-between gap-3 py-1.5">
                  <div>
                    <div className="text-sm text-slate-700">ซิงค์ทั้งหมดตอนนี้</div>
                    <p className="text-xs text-slate-400">
                      นำการจองทั้งหมดไปสร้าง/อัปเดตอีเวนต์ในปฏิทิน
                    </p>
                  </div>
                  <GhostButton type="button" onClick={syncAll} disabled={!safeState.linked}>
                    ซิงค์ตอนนี้
                  </GhostButton>
                </div>
              </div>
            </fieldset>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex items-center justify-end gap-3">
          <GhostButton type="button" onClick={() => window.history.back()}>
            ย้อนกลับ
          </GhostButton>
          <PrimaryButton type="submit">
            บันทึกปฏิทิน
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}

interface GoogleState {
  configured: boolean;
  linked: boolean;
  tokenOk: boolean;
  tokenError: string;
  autoSync: boolean;
  clientId: string;
  calendarId: string;
  linkedEmail: string;
  hasClientSecret: boolean;
  redirectUri: string;
}

function RoleBadge({ role }: { role: "admin" | "user" }) {
  return role === "admin" ? (
    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">Admin</span>
  ) : (
    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">พนักงาน</span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

function UserSettings() {
  const { user, logout } = useAuth();
  const [history, setHistory] = useState<{
    id: number;
    customer_name: string;
    room_name: string;
    check_in_date: string;
    check_out_date: string;
  }[]>([]);

  async function loadHistory() {
    const res = await fetch("/api/bookings?mine=1");
    const data = await res.json();
    if (res.ok) setHistory(Array.isArray(data) ? data : (Array.isArray(data?.bookings) ? data.bookings : []));
  }

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-xl font-bold">ตั้งค่า</h1>

      <Card className="mb-6 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">บัญชีของฉัน</h2>
          <RoleBadge role={user?.role ?? "user"} />
        </div>
        <InfoRow label="ชื่อ" value={user?.name ?? ""} />
        <InfoRow label="อีเมล" value={user?.email ?? ""} />
      </Card>

      <Card className="mb-6 p-5">
        <h2 className="font-semibold mb-4">ประวัติการจองของฉัน</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">ยังไม่มีการจอง</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((b) => (
              <li key={b.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{b.customer_name} · ห้อง {b.room_name}</div>
                  <div className="text-xs text-slate-400">{b.check_in_date} → {b.check_out_date}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="border-t border-slate-200 pt-8">
        <GhostButton
          className="!text-red-600 !border-red-200 hover:!bg-red-50 mx-auto !flex !w-full max-w-sm !items-center !justify-center !py-3 !text-base !font-semibold"
          onClick={logout}
        >
          ออกจากระบบ
        </GhostButton>
      </div>
    </div>
  );
}

function AdminSettings() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-xl font-bold">ตั้งค่า</h1>

      <Card className="mb-6 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">บัญชีของฉัน</h2>
          <RoleBadge role={user?.role ?? "user"} />
        </div>
        <InfoRow label="ชื่อ" value={user?.name ?? ""} />
        <InfoRow label="อีเมล" value={user?.email ?? ""} />
      </Card>

      <div className="mt-8 border-t border-slate-200 pt-8">
        <GhostButton
          className="!text-red-600 !border-red-200 hover:!bg-red-50 mx-auto !flex !w-full max-w-sm !items-center !justify-center !py-3 !text-base !font-semibold"
          onClick={logout}
        >
          ออกจากระบบ
        </GhostButton>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <Suspense fallback={<p className="text-center text-slate-400 py-8">กำลังโหลด...</p>}>
      {isAdmin ? (
        <>
          <AdminSettings />
          <div className="mt-10">
            <GoogleSection />
          </div>
        </>
      ) : (
        <UserSettings />
      )}
    </Suspense>
  );
}