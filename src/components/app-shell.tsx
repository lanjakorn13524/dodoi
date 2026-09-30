"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import BottomNav from "./bottom-nav";
import { useAuth } from "./auth-context";

interface SidebarCtx {
  collapsed: boolean;
  expanded: boolean;
  toggle: () => void;
  setHovered: (v: boolean) => void;
}

const Ctx = createContext<SidebarCtx>({
  collapsed: false,
  expanded: true,
  toggle: () => {},
  setHovered: () => {},
});

export function useSidebar() {
  return useContext(Ctx);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setCollapsed(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) return null;

  const expanded = !collapsed || hovered;

  return (
    <Ctx.Provider
      value={{
        collapsed,
        expanded,
        toggle: () => {
          setCollapsed((c) => !c);
          setHovered(false);
        },
        setHovered,
      }}
    >
      <div className="flex h-dvh w-full flex-col bg-slate-100 lg:flex-row lg:gap-3 lg:p-3">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="min-h-full p-4 md:p-6 lg:rounded-xl lg:border lg:border-[var(--foreground)]/[0.08] lg:bg-white lg:p-7 lg:shadow-sm">
            {children}
          </div>
        </main>
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </Ctx.Provider>
  );
}