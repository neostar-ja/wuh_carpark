"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Download,
  LogOut,
  Check,
  X,
  CarFront,
  Loader2,
} from "lucide-react";

type Registration = {
  id: string;
  license_plate: string;
  full_name_th: string;
  full_name_en: string;
  position: string;
  department: string;
  phone_number: string;
  car_type: string;
  car_color: string;
  license_plate_type: string;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "รอดำเนินการ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

export function AdminTable() {
  const router = useRouter();
  const [rows, setRows] = useState<Registration[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRows = useCallback(async (searchTerm: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      const res = await fetch(`/api/admin?${params.toString()}`);
      if (res.status === 401) {
        router.refresh();
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "โหลดข้อมูลไม่สำเร็จ");
        return;
      }
      setRows(data.data ?? []);
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchRows(search), 300);
    return () => clearTimeout(timeout);
  }, [search, fetchRows]);

  const handleStatusChange = async (id: string, status: "approved" | "rejected") => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "อัปเดตสถานะไม่สำเร็จ");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.refresh();
  };

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-wuh-700 to-accent-600 text-white">
              <CarFront className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">รายการลงทะเบียนรถ</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ระบบลงทะเบียนที่จอดรถ · โรงพยาบาลศูนย์การแพทย์ มหาวิทยาลัยวลัยลักษณ์
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/admin?action=export"
              className="flex items-center gap-1.5 rounded-lg border border-wuh-200 px-3 py-2 text-sm font-medium text-wuh-800 transition hover:bg-wuh-50 dark:border-wuh-800 dark:text-wuh-300 dark:hover:bg-wuh-900/40"
            >
              <Download className="h-4 w-4" />
              ส่งออก CSV
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-5 grid grid-cols-3 gap-3 sm:max-w-md">
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-400 dark:text-slate-500">ทั้งหมด</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{rows.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-400 dark:text-slate-500">รอดำเนินการ</p>
            <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">{pendingCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-400 dark:text-slate-500">อนุมัติแล้ว</p>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
              {rows.filter((r) => r.status === "approved").length}
            </p>
          </div>
        </div>

        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="ค้นหาทะเบียนรถหรือชื่อ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm focus:border-wuh-600 focus:outline-none focus:ring-2 focus:ring-wuh-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-wuh-500 dark:focus:ring-wuh-900/60"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="thin-scrollbar overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">ทะเบียนรถ</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">ชื่อ-นามสกุล</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">ตำแหน่ง</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">หน่วยงาน</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">เบอร์โทร</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">ประเภทรถ</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">สีรถ</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">ประเภทป้าย</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">สถานะ</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">วันที่ลงทะเบียน</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {row.license_plate}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">
                      <div>{row.full_name_th}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{row.full_name_en}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">{row.position}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">{row.department}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">{row.phone_number}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">{row.car_type}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">{row.car_color}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">{row.license_plate_type}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[row.status] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
                      >
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(row.created_at).toLocaleString("th-TH")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleStatusChange(row.id, "approved")}
                          disabled={updatingId === row.id || row.status === "approved"}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          อนุมัติ
                        </button>
                        <button
                          onClick={() => handleStatusChange(row.id, "rejected")}
                          disabled={updatingId === row.id || row.status === "rejected"}
                          className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          ไม่อนุมัติ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
