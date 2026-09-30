"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-context";

const svg = (path: React.ReactNode, viewBox = "0 0 24 24") => (
  <svg viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="size-5">
    {path}
  </svg>
);

const I = {
  calendar: svg(<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  door: svg(<><path d="M13 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M12 12h.01" /></>),
  reports: svg(<><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M7 13l3-3 4 4 5-5" /></>),
  settings: svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.05a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.05a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.05a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>),
};

const adminItems = [
  { href: "/calendar", label: "ปฏิทิน", icon: I.calendar },
  { href: "/rooms", label: "จัดการห้อง", icon: I.door },
  { href: "/reports", label: "บัญชีพนักงาน", icon: I.reports },
  { href: "/settings", label: "ตั้งค่า", icon: I.settings },
];

const userItems = [
  { href: "/calendar", label: "ปฏิทิน", icon: I.calendar },
  { href: "/rooms", label: "ห้องพัก", icon: I.door },
  { href: "/reports", label: "รายงาน", icon: I.reports },
  { href: "/settings", label: "ตั้งค่า", icon: I.settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const items = user?.role === "admin" ? adminItems : userItems;
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="flex h-16 shrink-0 items-stretch border-t border-[var(--foreground)]/[0.08] bg-background shadow-[0_-1px_0_rgba(0,0,0,0.04)] lg:hidden">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors"
          >
            {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-[var(--foreground)]" />}
            <span className={active ? "text-[var(--foreground)]" : "text-muted-foreground"}>{item.icon}</span>
            <span className={active ? "text-[var(--foreground)]" : "text-muted-foreground"}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}