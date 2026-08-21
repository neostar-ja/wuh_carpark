"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Download,
  Upload,
  FileSpreadsheet,
  LogOut,
  Check,
  X,
  Trash2,
  CarFront,
  Loader2,
  AtSign,
  FileCheck2,
  ArrowLeft,
} from "lucide-react";
import type { Registration } from "@/lib/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { RegistrationDetailModal } from "./RegistrationDetailModal";
import { Footer } from "./Footer";

type GateImportResult = {
  totalRows: number;
  updatedCount: number;
  skipped: { plate: string; reason: string }[];
};

type RosterImportResult = {
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skipped: { plate: string; reason: string }[];
  renamed: { plate: string; from: string; to: string }[];
};

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

async function downloadFile(url: string, filename: string): Promise<{ error?: string }> {
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
  const [gateImporting, setGateImporting] = useState(false);
  const [gateImportResult, setGateImportResult] = useState<GateImportResult | null>(null);
  const gateFileInputRef = useRef<HTMLInputElement>(null);
  const [rosterImporting, setRosterImporting] = useState(false);
  const [rosterImportResult, setRosterImportResult] = useState<RosterImportResult | null>(null);
  const rosterFileInputRef = useRef<HTMLInputElement>(null);

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
    const { error: err } = await downloadFile(
      "/api/admin?action=export",
      `car_registrations_all_${Date.now()}.xlsx`
    );
    if (err) setError(err);
    setExporting(false);
  };

  const handleExportSelected = async () => {
    if (checkedIds.size === 0) return;
    setExporting(true);
    setError("");
    const params = new URLSearchParams({ action: "export", ids: Array.from(checkedIds).join(",") });
    const { error: err } = await downloadFile(
      `/api/admin?${params.toString()}`,
      `car_registrations_selected_${Date.now()}.xlsx`
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

  const handleDownloadGateTemplate = async () => {
    setError("");
    const { error: err } = await downloadFile("/api/admin?action=template", "gate_import_template.xlsx");
    if (err) setError(err);
  };

  const handleGateImportClick = () => {
    setGateImportResult(null);
    setError("");
    gateFileInputRef.current?.click();
  };

  const handleGateImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    setGateImporting(true);
    setError("");
    setGateImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "นำเข้าไฟล์ไม่สำเร็จ");
        return;
      }
      setGateImportResult({
        totalRows: data.totalRows,
        updatedCount: data.updatedCount,
        skipped: data.skipped ?? [],
      });
      fetchRows(search);
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setGateImporting(false);
    }
  };

  const handleDownloadRosterTemplate = async () => {
    setError("");
    const { error: err } = await downloadFile(
      "/api/admin?action=roster-template",
      "roster_template.xlsx"
    );
    if (err) setError(err);
  };

  const handleRosterImportClick = () => {
    setRosterImportResult(null);
    setError("");
    rosterFileInputRef.current?.click();
  };

  const handleRosterImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setRosterImporting(true);
    setError("");
    setRosterImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/import-roster", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? "นำเข้าไฟล์ไม่สำเร็จ");
        return;
      }
      setRosterImportResult({
        totalRows: data.totalRows,
        createdCount: data.createdCount,
        updatedCount: data.updatedCount,
        skipped: data.skipped ?? [],
        renamed: data.renamed ?? [],
      });
      fetchRows(search);
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setRosterImporting(false);
    }
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
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              กลับหน้าแรก
            </Link>
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

        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              นำเข้ารายชื่อใหม่ (สร้างทะเบียนใหม่)
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                ref={rosterFileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleRosterImportFileChange}
              />
              <button
                onClick={handleDownloadRosterTemplate}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                เทมเพลต
              </button>
              <button
                onClick={handleRosterImportClick}
                disabled={rosterImporting}
                className="flex items-center gap-1.5 rounded-lg border border-wuh-200 px-3 py-1.5 text-xs font-medium text-wuh-800 transition hover:bg-wuh-50 disabled:opacity-60"
              >
                {rosterImporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                นำเข้าไฟล์
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              ซิงก์กับระบบประตู (อัปเดตของเดิมเท่านั้น)
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                ref={gateFileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleGateImportFileChange}
              />
              <button
                onClick={handleDownloadGateTemplate}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                เทมเพลต
              </button>
              <button
                onClick={handleGateImportClick}
                disabled={gateImporting}
                className="flex items-center gap-1.5 rounded-lg border border-wuh-200 px-3 py-1.5 text-xs font-medium text-wuh-800 transition hover:bg-wuh-50 disabled:opacity-60"
              >
                {gateImporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                นำเข้าไฟล์
              </button>
            </div>
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

        {rosterImportResult && (
          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
            <button
              type="button"
              onClick={() => setRosterImportResult(null)}
              className="float-right text-emerald-600 hover:text-emerald-800"
              aria-label="ปิด"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="font-medium">
              นำเข้ารายชื่อ: สร้างใหม่ {rosterImportResult.createdCount} · อัปเดต{" "}
              {rosterImportResult.updatedCount} จากทั้งหมด {rosterImportResult.totalRows} รายการ
            </p>
            {rosterImportResult.renamed.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  ปรับ Username ให้ไม่ซ้ำ {rosterImportResult.renamed.length} รายการ:
                </p>
                <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-xs text-emerald-700">
                  {rosterImportResult.renamed.map((r, i) => (
                    <li key={i}>
                      {r.plate}: {r.from} → {r.to}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {rosterImportResult.skipped.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  ข้าม {rosterImportResult.skipped.length} รายการ:
                </p>
                <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-xs text-emerald-700">
                  {rosterImportResult.skipped.map((s, i) => (
                    <li key={i}>
                      {s.plate} — {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {gateImportResult && (
          <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
            <button
              type="button"
              onClick={() => setGateImportResult(null)}
              className="float-right text-emerald-600 hover:text-emerald-800"
              aria-label="ปิด"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="font-medium">
              ซิงก์ระบบประตูสำเร็จ {gateImportResult.updatedCount} จาก {gateImportResult.totalRows} รายการ
            </p>
            {gateImportResult.skipped.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                  ข้าม {gateImportResult.skipped.length} รายการ:
                </p>
                <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-xs text-emerald-700">
                  {gateImportResult.skipped.map((s, i) => (
                    <li key={i}>
                      {s.plate} — {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
                <th className="whitespace-nowrap px-4 py-3 text-left font-medium text-slate-500">จังหวัด</th>
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
                  <td colSpan={12} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-slate-400">
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
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.province}</td>
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
          onSaved={(updated) => {
            setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setSelected(updated);
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
