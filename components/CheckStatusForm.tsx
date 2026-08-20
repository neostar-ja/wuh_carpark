"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IdCard,
  Phone,
  Loader2,
  Search,
  CheckCircle2,
  Clock3,
  XCircle,
  HelpCircle,
  MapPin,
  CarFront,
  Palette,
  Tag,
  User,
  RotateCcw,
} from "lucide-react";
import { checkStatusSchema } from "@/lib/validation";
import { z } from "zod";

type FormInput = z.infer<typeof checkStatusSchema>;

type ResultData = {
  license_plate: string;
  full_name_th: string;
  province: string;
  car_type: string;
  car_color: string;
  license_plate_type: string;
  status: string;
  created_at: string;
};

type QueryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; data: ResultData }
  | { status: "not-found" }
  | { status: "error"; message: string };

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  pending: {
    label: "รอดำเนินการ",
    icon: Clock3,
    className: "bg-amber-100 text-amber-700",
  },
  approved: {
    label: "อนุมัติแล้ว",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-700",
  },
  rejected: {
    label: "ไม่อนุมัติ",
    icon: XCircle,
    className: "bg-red-100 text-red-700",
  },
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-wuh-600 focus:outline-none focus:ring-2 focus:ring-wuh-100";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";
const errorClass = "mt-1.5 text-sm text-red-600";

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
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-wuh-600" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export function CheckStatusForm() {
  const [result, setResult] = useState<QueryState>({ status: "idle" });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(checkStatusSchema),
    defaultValues: { license_plate: "", phone_number: "" },
  });

  const onSubmit = async (values: FormInput) => {
    setResult({ status: "loading" });
    try {
      const params = new URLSearchParams({
        plate: values.license_plate,
        phone: values.phone_number,
      });
      const res = await fetch(`/api/check-status?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setResult({ status: "error", message: data.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" });
        return;
      }

      if (!data.found) {
        setResult({ status: "not-found" });
        return;
      }

      setResult({ status: "found", data: data.data });
    } catch {
      setResult({ status: "error", message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง" });
    }
  };

  if (result.status === "found") {
    const config = STATUS_CONFIG[result.data.status] ?? {
      label: result.data.status,
      icon: HelpCircle,
      className: "bg-slate-100 text-slate-700",
    };
    const StatusIcon = config.icon;

    return (
      <div className="mx-auto w-full max-w-md animate-scale-in">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="relative overflow-hidden bg-gradient-to-br from-wuh-700 via-wuh-800 to-accent-600 px-5 py-5 text-white">
            <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/10" />
            <p className="relative text-[11px] font-medium uppercase tracking-wide text-white/70">
              ทะเบียนรถ
            </p>
            <p className="relative text-3xl font-bold tracking-[0.12em]">{result.data.license_plate}</p>
          </div>

          <div className="flex items-center justify-center gap-2 border-b border-dashed border-slate-200 bg-wuh-50 px-5 py-5">
            <span
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${config.className}`}
            >
              <StatusIcon className="h-4 w-4" />
              {config.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 py-5">
            <div className="col-span-2">
              <DetailRow icon={User} label="ชื่อ-นามสกุล" value={result.data.full_name_th} />
            </div>
            <DetailRow icon={MapPin} label="จังหวัด" value={result.data.province} />
            <DetailRow icon={CarFront} label="ประเภทรถ" value={result.data.car_type} />
            <DetailRow icon={Palette} label="สีรถ" value={result.data.car_color} />
            <DetailRow icon={Tag} label="ประเภทป้าย" value={result.data.license_plate_type} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            reset();
            setResult({ status: "idle" });
          }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          ตรวจสอบรายการอื่น
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="animate-fade-in space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-7"
        noValidate
      >
        <div>
          <label htmlFor="license_plate" className={labelClass}>
            ทะเบียนรถ <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <IdCard className="h-[18px] w-[18px]" />
            </span>
            <input
              id="license_plate"
              type="text"
              placeholder="เช่น กข1234"
              className={inputClass}
              {...register("license_plate", {
                onChange: (e) => {
                  e.target.value = e.target.value.replace(/\s+/g, "");
                },
              })}
            />
          </div>
          {errors.license_plate && <p className={errorClass}>{errors.license_plate.message}</p>}
        </div>

        <div>
          <label htmlFor="phone_number" className={labelClass}>
            เบอร์โทรศัพท์ <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Phone className="h-[18px] w-[18px]" />
            </span>
            <input
              id="phone_number"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="0812345678"
              className={inputClass}
              {...register("phone_number", {
                onChange: (e) => {
                  e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                },
              })}
            />
          </div>
          {errors.phone_number && <p className={errorClass}>{errors.phone_number.message}</p>}
        </div>

        {result.status === "not-found" && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50 p-3.5 text-sm text-amber-800">
            <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
            ไม่พบข้อมูลการลงทะเบียน กรุณาตรวจสอบทะเบียนรถและเบอร์โทรศัพท์อีกครั้ง
          </div>
        )}

        {result.status === "error" && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-700">
            {result.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || result.status === "loading"}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-wuh-700 to-accent-600 px-4 py-3 text-base font-semibold text-white shadow-card transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {result.status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังตรวจสอบ...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              ตรวจสอบสถานะ
            </>
          )}
        </button>
      </form>
    </div>
  );
}
