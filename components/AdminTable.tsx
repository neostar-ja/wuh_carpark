"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Download,
  LogOut,
  Check,
  X,
  Trash2,
  CarFront,
  Loader2,
  Eye,
  AtSign,
  FileCheck2,
} from "lucide-react";
import type { Registration } from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { RegistrationDetailModal } from "./RegistrationDetailModal";
import { Footer } from "./Footer";

const STATUS_LABEL: Record<string, string> = {
  pending: "รอดำเนินการ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

async function downloadCsv(url: string, filename: string): Promise<{ error?: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    return { error: data?.error ?? "ส่งออกไม่สำเร็จ" };
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
  return {};
}

export function AdminTable() {
  const router = useRouter();
  const [rows, setRows] = useState<Registration[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Registration | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Registration | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const fetchRows = useCallback(
    async (searchTerm: string) => {
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
    },
    [router]
  );

  useEffect(() => {
    const timeout = setTimeout(() => fetchRows(search), 300);
    return () => clearTimeout(timeout);
  }, [search, fetchRows]);

  // Selection is a working set for export — drop anything no longer visible
  // in the current (possibly search-filtered) rows.
  useEffect(() => {
    setCheckedIds((prev) => {
      const visibleIds = new Set(rows.map((r) => r.id));
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

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
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pendingDelete.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "ลบข้อมูลไม่สำเร็จ");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      setSelected((prev) => (prev && prev.id === pendingDelete.id ? null : prev));
      setPendingDelete(null);
    } finally {
      setDeleting(false);
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

  const toggleRow = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allChecked = rows.length > 0 && checkedIds.size === rows.length;
  const toggleAll = () => {
    setCheckedIds(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
  };

  const handleExportAll = async () => {
    setExporting(true);
    setError("");
    const { error: err } = await downloadCsv(
      "/api/admin?action=export",
      `car_registrations_all_${Date.now()}.csv`
    );
    if (err) setError(err);
    setExporting(false);
  };

  const handleExportSelected = async () => {
    if (checkedIds.size === 0) return;
    setExporting(true);
    setError("");
    const params = new URLSearchParams({ action: "export", ids: Array.from(checkedIds).join(",") });
    const { error: err } = await downloadCsv(
      `/api/admin?${params.toString()}`,
      `car_registrations_selected_${Date.now()}.csv`
    );
    if (err) {
      setError(err);
    } else {
      // Exported rows are auto-approved server-side — refresh to reflect it.
      setCheckedIds(new Set());
      fetchRows(search);
    }
    setExporting(false);
  };

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-wuh-700 to-accent-600 text-white shadow-sm">
              <CarFront className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900">แผงควบคุมผู้ดูแลระบบ</h1>
              <p className="text-xs text-slate-500">
                ระบบลงทะเบียนที่จอดรถ · โรงพยาบาลศูนย์การแพทย์ มหาวิทยาลัยวลัยลักษณ์
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAll}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-lg border border-wuh-200 px-3 py-2 text-sm font-medium text-wuh-800 transition hover:bg-wuh-50 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              ส่งออกทั้งหมด
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-5 grid grid-cols-3 gap-3 sm:max-w-md">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">ทั้งหมด</p>
            <p className="text-lg font-semibold text-slate-900">{rows.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">รอดำเนินการ</p>
            <p className="text-lg font-semibold text-amber-600">{pendingCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">อนุมัติแล้ว</p>
            <p className="text-lg font-semibold text-emerald-600">
              {rows.filter((r) => r.status === "approved").length}
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาทะเบียนรถหรือชื่อ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm focus:border-wuh-600 focus:outline-none focus:ring-2 focus:ring-wuh-100"
            />
          </div>

          {checkedIds.size > 0 && (
            <button
              onClick={handleExportSelected}
              disabled={exporting}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-wuh-700 to-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:brightness-110 disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
              ส่งออกที่เลือก ({checkedIds.size}) — อนุมัติอัตโนมัติ
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="thin-scrollbar overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-wuh-700 focus:ring-wuh-500"
                    aria-label="เลือกทั้งหมด"
                  />
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500">ทะเบียนรถ</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500">ชื่อ-นามสกุล</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500">Username</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500">ตำแหน่ง</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500">หน่วยงาน</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500">เบอร์โทร</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500">ประเภทรถ</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500">สถานะ</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500">วันที่ลงทะเบียน</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-slate-400">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelected(row)}
                    className={`cursor-pointer transition hover:bg-wuh-50/60 ${checkedIds.has(row.id) ? "bg-wuh-50/40" : ""}`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checkedIds.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        className="h-4 w-4 rounded border-slate-300 text-wuh-700 focus:ring-wuh-500"
                        aria-label={`เลือก ${row.license_plate}`}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-slate-900">
                      {row.license_plate}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      <div>{row.full_name_th}</div>
                      <div className="text-xs text-slate-400">{row.full_name_en}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {row.username ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                          <AtSign className="h-3 w-3" />
                          {row.username}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.position}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.department}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.phone_number}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.car_type}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[row.status] ?? "bg-slate-100 text-slate-700"}`}
                      >
                        {STATUS_LABEL[row.status] ?? row.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {new Date(row.created_at).toLocaleString("th-TH")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setSelected(row)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          ดู
                        </button>
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
                        <button
                          onClick={() => setPendingDelete(row)}
                          className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Footer />

      {selected && (
        <RegistrationDetailModal
          registration={selected}
          onClose={() => setSelected(null)}
          onApprove={() => handleStatusChange(selected.id, "approved")}
          onReject={() => handleStatusChange(selected.id, "rejected")}
          onDelete={() => {
            setPendingDelete(selected);
          }}
          busy={updatingId === selected.id}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="ลบข้อมูลลงทะเบียนนี้?"
        description={
          pendingDelete
            ? `ทะเบียน ${pendingDelete.license_plate} ของ ${pendingDelete.full_name_th} จะถูกลบออกจากระบบถาวร ไม่สามารถกู้คืนได้`
            : ""
        }
        confirmLabel="ลบข้อมูล"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
