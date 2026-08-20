"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Registration = {
  id: string;
  license_plate: string;
  full_name_en: string;
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
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-wuh-navy">รายการลงทะเบียนรถ</h1>
        <div className="flex items-center gap-2">
          <a
            href="/api/admin?action=export"
            className="rounded-md border border-wuh-blue px-3 py-2 text-sm font-medium text-wuh-blue hover:bg-blue-50"
          >
            ส่งออก CSV
          </a>
          <button
            onClick={handleLogout}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="ค้นหาทะเบียนรถหรือชื่อ..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-wuh-blue focus:outline-none focus:ring-1 focus:ring-wuh-blue"
      />

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500">ทะเบียนรถ</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">ชื่อ-นามสกุล</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">เบอร์โทร</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">ประเภทรถ</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">สีรถ</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">ประเภทป้าย</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">สถานะ</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">วันที่ลงทะเบียน</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-gray-400">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-gray-400">
                  ไม่พบข้อมูล
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-gray-900">
                    {row.license_plate}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{row.full_name_en}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{row.phone_number}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{row.car_type}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{row.car_color}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-700">{row.license_plate_type}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[row.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                    {new Date(row.created_at).toLocaleString("th-TH")}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatusChange(row.id, "approved")}
                        disabled={updatingId === row.id || row.status === "approved"}
                        className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        อนุมัติ
                      </button>
                      <button
                        onClick={() => handleStatusChange(row.id, "rejected")}
                        disabled={updatingId === row.id || row.status === "rejected"}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
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
  );
}
