"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "./app-shell";
import { useAuth, ROLE_LABEL } from "./auth-context";

const svg = (path: React.ReactNode, viewBox = "0 0 24 24") => (
  <svg viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0">
    {path}
  </svg>
);

const I = {
  panelLeft: svg(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></>),
  calendar: svg(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  door: svg(<><path d="M13 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M12 12h.01" /></>),
  reports: svg(<><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M7 13l3-3 4 4 5-5" /></>),
  users: svg(<><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M21 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  settings: svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.05a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.05a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.05a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>),
  chevronDown: svg(<path d="m6 9 6 6 6-6" />),
  chevronUp: svg(<path d="m18 15-6-6-6 6" />),
};

export type Route = {
  id: string;
  title: string;
  icon: React.ReactNode;
  link: string;
  subs?: { title: string; link: string }[];
};

const routes: Route[] = [
  { id: "calendar", title: "ปฏิทิน", icon: I.calendar, link: "/calendar" },
  { id: "rooms", title: "จัดการห้อง", icon: I.door, link: "/rooms" },
  { id: "reports", title: "บัญชีพนักงาน", icon: I.users, link: "/reports" },
  { id: "settings", title: "ตั้งค่า", icon: I.settings, link: "/settings" },
];

function NavMain({ list }: { list: Route[] }) {
  const pathname = usePathname();
  const { expanded } = useSidebar();
  const [openId, setOpenId] = useState<string | null>(null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  if (!expanded) {
    return (
      <nav className="flex flex-col items-center gap-1 px-0">
        {list.map((r) =>
          r.subs?.length ? (
            <button
              key={r.id}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-[var(--foreground)]/[0.06]"
              title={r.title}
            >
              {r.icon}
            </button>
          ) : (
            <Link
              key={r.id}
              href={r.link}
              title={r.title}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--foreground)]/[0.06] ${
                isActive(r.link) ? "bg-[var(--foreground)]/[0.06] text-[var(--foreground)]" : "text-muted-foreground"
              }`}
            >
              {r.icon}
            </Link>
          )
        )}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1">
      {list.map((r) => {
        const hasSubs = !!r.subs?.length;
        const open = openId === r.id;
        const active = isActive(r.link) || (hasSubs && r.subs!.some((s) => isActive(s.link)));

        if (!hasSubs) {
          return (
            <Link
              key={r.id}
              href={r.link}
              className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors hover:bg-[var(--foreground)]/[0.06] ${
                active ? "bg-[var(--foreground)]/[0.06] text-[var(--foreground)]" : "text-muted-foreground"
              }`}
            >
              {r.icon}
              <span className="ml-2 flex-1">{r.title}</span>
            </Link>
          );
        }

        return (
          <div key={r.id}>
            <button
              onClick={() => setOpenId(open ? null : r.id)}
              className={`flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors hover:bg-[var(--foreground)]/[0.06] ${
                open || active ? "bg-[var(--foreground)]/[0.06] text-[var(--foreground)]" : "text-muted-foreground"
              }`}
            >
              {r.icon}
              <span className="ml-2 flex-1 text-left">{r.title}</span>
              {open ? (
                <span className="size-4 text-muted-foreground">{I.chevronUp}</span>
              ) : (
                <span className="size-4 text-muted-foreground">{I.chevronDown}</span>
              )}
            </button>
            {open && (
              <div className="relative my-1 ml-3.5 space-y-0.5 pl-4 before:absolute before:inset-y-0 before:left-[9px] before:w-px before:bg-[var(--foreground)]/[0.08]">
                {r.subs!.map((s) => (
                  <Link
                    key={s.title}
                    href={s.link}
                    className={`flex items-center rounded-md px-2 py-1.5 text-sm font-medium hover:bg-[var(--foreground)]/[0.06] ${
                      isActive(s.link) ? "bg-[var(--foreground)]/[0.06] text-[var(--foreground)]" : "text-muted-foreground"
                    }`}
                  >
                    {s.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

const userRoutes: Route[] = [
  { id: "calendar", title: "ปฏิทิน", icon: I.calendar, link: "/calendar" },
  { id: "rooms", title: "ห้องพัก", icon: I.door, link: "/rooms" },
  { id: "reports", title: "รายงาน", icon: I.reports, link: "/reports" },
  { id: "settings", title: "ตั้งค่า", icon: I.settings, link: "/settings" },
];

function UserBox() {
  const { expanded } = useSidebar();
  const { user } = useAuth();

  const name = user?.name ?? "";
  const roleLabel = user ? ROLE_LABEL[user.role] : "";
  const initial = name.charAt(0).toUpperCase() || "?";

  if (!expanded) {
    return (
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--foreground)]/[0.06]"
        title={`${name} · ${roleLabel}`}
      >
        <span className="text-sm font-semibold">{initial}</span>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-2 rounded-lg px-2 py-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--foreground)]/[0.06]">
        <span className="text-sm font-semibold">{initial}</span>
      </span>
      <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
      </span>
    </div>
  );
}

export default function Sidebar() {
  const { collapsed, expanded, toggle, setHovered } = useSidebar();
  const { user } = useAuth();
  const list = user?.role === "admin" ? routes : userRoutes;

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--foreground)]/[0.08] bg-background shadow-sm transition-[width] duration-300 ease-in-out ${
        expanded ? "w-72" : "w-[68px]"
      }`}
    >
      <div
        className={`flex border-b border-[var(--foreground)]/[0.06] ${
          expanded ? "h-16 flex-row items-center justify-between px-3" : "flex-col items-center py-3"
        }`}
      >
        <a href="/calendar" className={expanded ? "flex items-center gap-2" : "flex"}>
          <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--foreground)] text-background">
            {expanded ? I.door : I.calendar}
          </span>
          {expanded && <span className="font-semibold">ที่พักของฉัน</span>}
        </a>
        {expanded && (
          <button
            onClick={toggle}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[var(--foreground)]/[0.06]"
            title={collapsed ? "ปักหมุดให้ขยายตลอด" : "ย่อแถบข้าง"}
          >
            {I.panelLeft}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <NavMain list={list} />
      </div>

      <div className="border-t border-[var(--foreground)]/[0.06] p-2">
        <UserBox />
      </div>
    </aside>
  );
}