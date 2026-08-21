"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  MapPin,
  Clock,
  Check,
  Trash2,
  Pencil,
  Loader2,
  Save,
} from "lucide-react";
import type { Registration } from "@/lib/types";
import {
  registrationSchema,
  CAR_TYPE_OPTIONS,
  LICENSE_PLATE_TYPE_OPTIONS,
  PROVINCE_OPTIONS,
} from "@/lib/validation";
import { ColorSelect } from "./ColorSelect";

const editSchema = registrationSchema.omit({ consent: true });
type EditInput = z.infer<typeof editSchema>;

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

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-wuh-600 focus:outline-none focus:ring-2 focus:ring-wuh-100";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";
const errorClass = "mt-1 text-xs text-red-600";

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

function EditField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
      {error && <p className={errorClass}>{error}</p>}
    </div>
  );
}

type Props = {
  registration: Registration;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onSaved: (updated: Registration) => void;
  busy: boolean;
};

export function RegistrationDetailModal({
  registration,
  onClose,
  onApprove,
  onReject,
  onDelete,
  onSaved,
  busy,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const defaultValues: EditInput = {
    license_plate: registration.license_plate,
    full_name_th: registration.full_name_th,
    full_name_en: registration.full_name_en,
    position: registration.position,
    department: registration.department,
    phone_number: registration.phone_number,
    province: registration.province as EditInput["province"],
    car_type: registration.car_type as EditInput["car_type"],
    car_color: registration.car_color as EditInput["car_color"],
    license_plate_type: registration.license_plate_type as EditInput["license_plate_type"],
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditInput>({
    resolver: zodResolver(editSchema),
    defaultValues,
  });

  const startEditing = () => {
    reset(defaultValues);
    setSaveError("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setSaveError("");
    setIsEditing(false);
  };

  const onSubmit = async (values: EditInput) => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: registration.id, ...values }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSaveError(data.error ?? "บันทึกข้อมูลไม่สำเร็จ");
        return;
      }
      onSaved({ ...registration, ...values });
      setIsEditing(false);
    } catch {
      setSaveError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={isEditing ? undefined : onClose}
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

        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
              <EditField label="ทะเบียนรถ" error={errors.license_plate?.message}>
                <input
                  className={inputClass}
                  {...register("license_plate", {
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/\s+/g, "");
                    },
                  })}
                />
              </EditField>
              <EditField label="จังหวัด" error={errors.province?.message}>
                <select className={inputClass} {...register("province")}>
                  {PROVINCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </EditField>
              <EditField label="ชื่อ-นามสกุล (ไทย)" error={errors.full_name_th?.message}>
                <input className={inputClass} {...register("full_name_th")} />
              </EditField>
              <EditField label="ชื่อ-นามสกุล (อังกฤษ)" error={errors.full_name_en?.message}>
                <input className={inputClass} {...register("full_name_en")} />
              </EditField>
              <EditField label="ตำแหน่ง" error={errors.position?.message}>
                <input className={inputClass} {...register("position")} />
              </EditField>
              <EditField label="หน่วยงาน" error={errors.department?.message}>
                <input className={inputClass} {...register("department")} />
              </EditField>
              <EditField label="เบอร์โทรศัพท์" error={errors.phone_number?.message}>
                <input
                  className={inputClass}
                  {...register("phone_number", {
                    onChange: (e) => {
                      e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                    },
                  })}
                />
              </EditField>
              <EditField label="ประเภทรถ" error={errors.car_type?.message}>
                <select className={inputClass} {...register("car_type")}>
                  {CAR_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </EditField>
              <EditField label="สีรถ" error={errors.car_color?.message}>
                <Controller
                  name="car_color"
                  control={control}
                  render={({ field }) => (
                    <ColorSelect value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                  )}
                />
              </EditField>
              <EditField label="ประเภทป้ายทะเบียน" error={errors.license_plate_type?.message}>
                <select className={inputClass} {...register("license_plate_type")}>
                  {LICENSE_PLATE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </EditField>
            </div>

            {saveError && (
              <div className="mx-6 mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {saveError}
              </div>
            )}

            <div className="flex flex-wrap gap-2.5 border-t border-slate-100 p-6 pt-5">
              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-wuh-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wuh-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                บันทึกการแก้ไข
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
              <DetailRow icon={User} label="ชื่อ-นามสกุล (ไทย)" value={registration.full_name_th} />
              <DetailRow icon={UserRound} label="ชื่อ-นามสกุล (อังกฤษ)" value={registration.full_name_en} />
              <DetailRow icon={AtSign} label="Username" value={registration.username ?? "-"} />
              <DetailRow icon={Phone} label="เบอร์โทรศัพท์" value={registration.phone_number} />
              <DetailRow icon={Briefcase} label="ตำแหน่ง" value={registration.position} />
              <DetailRow icon={Building2} label="หน่วยงาน" value={registration.department} />
              <DetailRow icon={CarFront} label="ประเภทรถ" value={registration.car_type} />
              <DetailRow icon={Palette} label="สีรถ" value={registration.car_color} />
              <DetailRow icon={Tag} label="ประเภทป้ายทะเบียน" value={registration.license_plate_type} />
              <DetailRow icon={MapPin} label="จังหวัด" value={registration.province} />
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
                onClick={startEditing}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-wuh-200 px-4 py-2.5 text-sm font-semibold text-wuh-700 transition hover:bg-wuh-50 disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" />
                แก้ไข
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
          </>
        )}
      </div>
    </div>
  );
}
