"use client";

import {
  X,
  CarFront,
  User,
  UserRound,
  AtSign,
  Briefcase,
  Building2,
  Phone,
  Palette,
  Tag,
  Clock,
  Check,
  Trash2,
} from "lucide-react";
import type { Registration } from "@/lib/types";

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

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-wuh-50 text-wuh-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="break-words text-sm font-medium text-slate-800">{value || "-"}</p>
      </div>
    </div>
  );
}

type Props = {
  registration: Registration;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  busy: boolean;
};

export function RegistrationDetailModal({
  registration,
  onClose,
  onApprove,
  onReject,
  onDelete,
  busy,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg animate-scale-in overflow-y-auto rounded-t-3xl bg-white shadow-card-hover sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-wuh-700 via-wuh-800 to-accent-600 px-6 py-5 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <CarFront className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">ทะเบียนรถ</p>
              <p className="font-mono text-2xl font-bold tracking-wide">{registration.license_plate}</p>
            </div>
          </div>
          <span
            className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[registration.status] ?? "bg-white/20 text-white"}`}
          >
            {STATUS_LABEL[registration.status] ?? registration.status}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
          <DetailRow icon={User} label="ชื่อ-นามสกุล (ไทย)" value={registration.full_name_th} />
          <DetailRow icon={UserRound} label="ชื่อ-นามสกุล (อังกฤษ)" value={registration.full_name_en} />
          <DetailRow icon={AtSign} label="Username" value={registration.username ?? "-"} />
          <DetailRow icon={Phone} label="เบอร์โทรศัพท์" value={registration.phone_number} />
          <DetailRow icon={Briefcase} label="ตำแหน่ง" value={registration.position} />
          <DetailRow icon={Building2} label="หน่วยงาน" value={registration.department} />
          <DetailRow icon={CarFront} label="ประเภทรถ" value={registration.car_type} />
          <DetailRow icon={Palette} label="สีรถ" value={registration.car_color} />
          <div className="sm:col-span-2">
            <DetailRow icon={Tag} label="ประเภทป้ายทะเบียน" value={registration.license_plate_type} />
          </div>
          <div className="sm:col-span-2">
            <DetailRow
              icon={Clock}
              label="วันที่ลงทะเบียน"
              value={new Date(registration.created_at).toLocaleString("th-TH", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 border-t border-slate-100 p-6 pt-5">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy || registration.status === "approved"}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            อนุมัติ
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={busy || registration.status === "rejected"}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            ไม่อนุมัติ
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            ลบ
          </button>
        </div>
      </div>
    </div>
  );
}
