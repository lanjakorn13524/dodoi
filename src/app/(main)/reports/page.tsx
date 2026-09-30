"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-context";
import ReportSummary from "@/components/report-summary";
import { monthKey, thMonthYear } from "@/components/ui";
import {
  Card,
  Field,
  GhostButton,
  Modal,
  PrimaryButton,
  inputCls,
  useToast,
} from "@/components/ui-components";

interface Account {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  created_at: string;
  booking_count: number;
}

function MonthNav({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  function shift(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    onChange(monthKey(d));
  }
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => shift(-1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
        ‹
      </button>
      <span className="min-w-[150px] text-center text-sm font-semibold">
        {thMonthYear(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1))}
      </span>
      <button onClick={() => shift(1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
        ›
      </button>
    </div>
  );
}

function UserReportsPage() {
  const [month, setMonth] = useState(monthKey());
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">รายงานสรุป</h1>
        <MonthNav month={month} onChange={setMonth} />
      </div>
      <ReportSummary month={month} showRecent={false} />
    </div>
  );
}

function RoleBadge({ role }: { role: "admin" | "user" }) {
  return role === "admin" ? (
    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">Admin</span>
  ) : (
    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">พนักงาน</span>
  );
}

function AccountModal({ account, onClose }: { account?: Account | null; onClose: () => void }) {
  const toast = useToast();
  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [role, setRole] = useState(account?.role ?? "user");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast("กรอกชื่อ", "error");
    if (!email.trim()) return toast("กรอกอีเมล", "error");
    if (!account && password.length < 4) return toast("รหัสผ่านต้องอย่างน้อย 4 ตัวอักษร", "error");
    setSaving(true);
    try {
      const url = account ? `/api/accounts` : `/api/accounts`;
      const body: Record<string, unknown> = {
        name: name.trim(),
        email: email.trim(),
        role,
      };
      if (account) body.id = account.id;
      if (password) body.password = password;
      const res = await fetch(url, {
        method: account ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      toast(account ? "อัปเดตบัญชีแล้ว" : "สร้างบัญชีแล้ว");
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "เกิดข้อผิดพลาด", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={account ? `แก้ไขบัญชี · ${account.name}` : "เพิ่มพนักงาน"}
      footer={
        <>
          <GhostButton onClick={onClose}>ยกเลิก</GhostButton>
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="ชื่อ" required>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น สมชาย ใจดี" />
        </Field>
        <Field label="อีเมล" required>
          <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="สิทธิ์">
          <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as "admin" | "user")}>
            <option value="user">พนักงาน</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <Field label={account ? "รหัสผ่านใหม่" : "รหัสผ่าน"} required={!account} hint={account ? "เว้นว่างไว้เพื่อไม่เปลี่ยน" : "อย่างน้อย 4 ตัวอักษร"}>
          <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </Field>
      </div>
    </Modal>
  );
}

function AdminAccountsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modal, setModal] = useState<{ open: boolean; account?: Account }>({ open: false });

  async function load() {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    if (res.ok) setAccounts(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function del(account: Account) {
    if (!confirm(`ลบบัญชี "${account.name}"?`)) return;
    const res = await fetch("/api/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: account.id }),
    });
    const data = await res.json();
    if (res.ok) {
      toast("ลบบัญชีแล้ว");
      load();
    } else {
      toast(data.error ?? "ลบไม่สำเร็จ", "error");
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">บัญชีพนักงาน</h1>
          <p className="text-sm text-slate-400">สร้างและจัดการผู้ใช้งานระบบ</p>
        </div>
        <PrimaryButton onClick={() => setModal({ open: true })}>+ เพิ่มพนักงาน</PrimaryButton>
      </div>

      <Card className="p-5">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th className="py-2">ชื่อ</th>
              <th className="py-2">อีเมล</th>
              <th className="py-2 text-right">การจอง</th>
              <th className="py-2 text-right">สิทธิ์</th>
              <th className="py-2 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b border-slate-100">
                <td className="py-2.5 font-medium">
                  {a.name}
                  {a.id === user?.id && <span className="ml-1.5 text-xs font-normal text-slate-400">(คุณ)</span>}
                </td>
                <td className="py-2.5 text-slate-500">{a.email}</td>
                <td className="py-2.5 text-right tabular-nums">{a.booking_count}</td>
                <td className="py-2.5 text-right">
                  <div className="flex justify-end"><RoleBadge role={a.role} /></div>
                </td>
                <td className="py-2.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <GhostButton onClick={() => setModal({ open: true, account: a })}>แก้ไข</GhostButton>
                    {a.id !== user?.id && (
                      <GhostButton className="!text-red-600 !border-red-200 hover:!bg-red-50" onClick={() => del(a)}>
                        ลบ
                      </GhostButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {accounts.length === 0 && <p className="py-6 text-center text-sm text-slate-400">ยังไม่มีพนักงาน</p>}
      </Card>

      {modal.open && (
        <AccountModal
          account={modal.account}
          onClose={() => {
            setModal({ open: false });
            load();
          }}
        />
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  return user?.role === "admin" ? <AdminAccountsPage /> : <UserReportsPage />;
}