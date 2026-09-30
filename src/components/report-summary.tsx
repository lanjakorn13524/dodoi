"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui-components";

interface Report {
  month: string;
  bookingsCount: number;
  bookedNights: number;
  occupancy: number;
  daysInMonth: number;
  activeRooms: number;
  perRoom: { room_name: string; bookings: number; nights: number }[];
  recent: {
    id: number;
    customer_name: string;
    room_name: string;
    check_in_date: string;
    check_out_date: string;
  }[];
}

export default function ReportSummary({ month, showRecent }: { month: string; showRecent: boolean }) {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/reports?month=${month}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setReport(d);
      });
    return () => {
      alive = false;
    };
  }, [month]);

  if (!report)
    return <p className="text-center text-slate-400 py-6 text-sm">กำลังโหลดข้อมูล...</p>;

  const cards = [
    { label: "จำนวนการจอง", value: `${report.bookingsCount} รายการ`, cls: "text-indigo-600" },
    { label: "คืนที่เข้าพัก", value: `${report.bookedNights} คืน`, cls: "text-emerald-600" },
    { label: "อัตราการเข้าพัก", value: `${report.occupancy}%`, cls: "text-blue-600" },
    { label: "ห้องที่ใช้งาน", value: `${report.activeRooms} ห้อง`, cls: "text-slate-700" },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className={`text-xl font-bold mt-1 ${c.cls}`}>{c.value}</div>
          </Card>
        ))}
      </div>

      <div className={showRecent ? "grid md:grid-cols-2 gap-4" : "grid gap-4"}>
        <Card className="p-4">
          <h2 className="font-semibold mb-3">สถิติต่อห้อง</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="py-2">ห้อง</th>
                <th className="py-2 text-right">จำนวนครั้ง</th>
                <th className="py-2 text-right">คืนที่เข้าพัก</th>
              </tr>
            </thead>
            <tbody>
              {report.perRoom.map((r) => (
                <tr key={r.room_name} className="border-b border-slate-100">
                  <td className="py-2 font-medium">ห้อง {r.room_name}</td>
                  <td className="py-2 text-right">{r.bookings}</td>
                  <td className="py-2 text-right font-medium">{r.nights ?? 0} คืน</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {showRecent && (
          <Card className="p-4">
            <h2 className="font-semibold mb-3">การจองล่าสุดในเดือนนี้</h2>
            {report.recent.length === 0 ? (
              <p className="text-sm text-slate-400">ยังไม่มีการจอง</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {report.recent.map((b) => (
                  <li key={b.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{b.customer_name} · ห้อง {b.room_name}</div>
                      <div className="text-xs text-slate-400">{b.check_in_date} → {b.check_out_date}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}