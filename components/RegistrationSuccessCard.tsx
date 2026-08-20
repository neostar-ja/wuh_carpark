"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  CarFront,
  User,
  Briefcase,
  Building2,
  Phone,
  Palette,
  Tag,
  Clock,
  RotateCcw,
} from "lucide-react";
import type { RegistrationInput } from "@/lib/validation";

type Props = {
  referenceId: string;
  data: RegistrationInput;
  onReset: () => void;
};

const HOSPITAL_NAME_TH = "โรงพยาบาลศูนย์การแพทย์ มหาวิทยาลัยวลัยลักษณ์";
const HOSPITAL_NAME_EN = "Walailak University Hospital";

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

export function RegistrationSuccessCard({ referenceId, data, onReset }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const submittedAt = new Date().toLocaleString("th-TH", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    setDownloadError("");
    try {
      // html2canvas can snapshot mid-reflow if the web font hasn't finished
      // loading yet, producing ghosted/overlapping text in the output image.
      if (typeof document !== "undefined" && "fonts" in document) {
        await document.fonts.ready;
      }
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `parking-pass-${data.license_plate}.png`;
      link.click();
    } catch {
      setDownloadError("บันทึกรูปภาพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md animate-scale-in">
      <div className="mb-5 flex flex-col items-center text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">ลงทะเบียนสำเร็จ</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          กรุณาบันทึกบัตรจอดรถนี้ไว้เป็นหลักฐาน หรือแคปหน้าจอเก็บไว้
        </p>
      </div>

      {/* This card is intentionally kept light-mode-only (fixed white
          background) since it doubles as a printable/savable pass image —
          it should render the same regardless of the viewer's OS theme. */}
      <div
        ref={cardRef}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-wuh-700 via-wuh-800 to-accent-600 px-5 py-4 text-white">
          <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-10 -left-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight">{HOSPITAL_NAME_TH}</p>
              <p className="truncate text-[11px] text-wuh-100/80">{HOSPITAL_NAME_EN}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
              <CarFront className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-dashed border-slate-200 bg-wuh-50 px-5 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-wuh-700">ทะเบียนรถ</p>
            <p className="font-mono text-2xl font-bold tracking-wide text-wuh-950">
              {data.license_plate}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            รอดำเนินการ
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 py-5">
          <div className="col-span-2">
            <DetailRow icon={User} label="ชื่อ-นามสกุล" value={data.full_name_th} />
          </div>
          <DetailRow icon={Briefcase} label="ตำแหน่ง" value={data.position} />
          <DetailRow icon={Building2} label="หน่วยงาน" value={data.department} />
          <DetailRow icon={Phone} label="เบอร์โทรศัพท์" value={data.phone_number} />
          <DetailRow icon={Palette} label="สี / ประเภทรถ" value={`${data.car_color} · ${data.car_type}`} />
          <div className="col-span-2">
            <DetailRow icon={Tag} label="ประเภทป้ายทะเบียน" value={data.license_plate_type} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-dashed border-slate-200 px-5 py-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            {submittedAt}
          </div>
          <p className="font-mono text-[11px] text-slate-400">{referenceId.slice(0, 8)}</p>
        </div>
      </div>

      {downloadError && (
        <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400">{downloadError}</p>
      )}

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-wuh-700 to-accent-600 px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:brightness-110 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {downloading ? "กำลังบันทึก..." : "บันทึกรูปภาพ"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <RotateCcw className="h-4 w-4" />
          ลงทะเบียนคันถัดไป
        </button>
      </div>
    </div>
  );
}
