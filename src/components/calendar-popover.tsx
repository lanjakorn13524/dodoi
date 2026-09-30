"use client";

import { useMemo, useState } from "react";
import { dayKey, daysInMonth, thDayShort } from "@/lib/date";
import { formatDate, thMonthYear } from "./ui";

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export const calendarIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0">
    <path d="M8 2v4M16 2v4M3 10h18" />
    <rect x="3" y="4" width="18" height="18" rx="2" />
  </svg>
);

export function CalendarPopover({
  value,
  onSelect,
  placeholder = "เลือกวันที่",
}: {
  value: string;
  onSelect: (d: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const today = dayKey(new Date());

  const base = value ? new Date(`${value}T00:00:00`) : new Date();
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMon0, setViewMon0] = useState(base.getMonth());

  function toggleOpen() {
    setOpen((o) => {
      if (!o) {
        const anchor = value ? new Date(`${value}T00:00:00`) : new Date();
        setViewYear(anchor.getFullYear());
        setViewMon0(anchor.getMonth());
      }
      return !o;
    });
  }

  const cells = useMemo(() => {
    const n = daysInMonth(viewYear, viewMon0);
    const firstDow = new Date(viewYear, viewMon0, 1).getDay();
    const out: (string | null)[] = Array.from({ length: firstDow }, () => null);
    for (let d = 1; d <= n; d++) out.push(dayKey(new Date(viewYear, viewMon0, d)));
    return out;
  }, [viewYear, viewMon0]);

  function select(d: string) {
    onSelect(d);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onClick={toggleOpen}
      >
        <span className="text-slate-400">{calendarIcon}</span>
        <span className={value ? "font-medium" : "font-normal text-slate-400"}>
          {value ? formatDate(value) : placeholder}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-[calc(100%+4px)] z-40 w-[260px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                onClick={() => {
                  const d = new Date(viewYear, viewMon0 - 1, 1);
                  setViewYear(d.getFullYear());
                  setViewMon0(d.getMonth());
                }}
              >
                <ChevronLeft />
              </button>
              <div className="text-sm font-semibold text-slate-800">
                {thMonthYear(new Date(viewYear, viewMon0, 1))}
              </div>
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                onClick={() => {
                  const d = new Date(viewYear, viewMon0 + 1, 1);
                  setViewYear(d.getFullYear());
                  setViewMon0(d.getMonth());
                }}
              >
                <ChevronRight />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: 7 }, (_, i) => (
                <div
                  key={i}
                  className={`flex h-8 items-center justify-center text-[11px] font-semibold ${i === 0 ? "text-red-400" : "text-slate-400"}`}
                >
                  {thDayShort(i)}
                </div>
              ))}
              {cells.map((d, i) =>
                d === null ? (
                  <div key={`x${i}`} />
                ) : (
                  (() => {
                    const dow = new Date(`${d}T00:00:00`).getDay();
                    const isSunday = dow === 0;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => select(d)}
                        className={`flex h-8 items-center justify-center rounded-md text-[13px] transition-colors ${
                          d === value
                            ? "bg-indigo-600 font-semibold text-white shadow-sm"
                            : d === today
                              ? "font-semibold text-indigo-600 ring-1 ring-indigo-400"
                              : isSunday
                                ? "text-slate-400 hover:bg-indigo-50"
                                : "text-slate-700 hover:bg-indigo-50"
                        }`}
                      >
                        {Number(d.slice(8))}
                      </button>
                    );
                  })()
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}