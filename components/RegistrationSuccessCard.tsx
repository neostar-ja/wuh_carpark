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
  MapPin,
  Clock,
  RotateCcw,
} from "lucide-react";
import type { RegistrationInput } from "@/lib/validation";
import { InfoDetailRow } from "./InfoDetailRow";

type Props = {
  referenceId: string;
  data: RegistrationInput;
  onReset: () => void;
};

const HOSPITAL_NAME_TH = "โรงพยาบาลศูนย์การแพทย์ มหาวิทยาลัยวลัยลักษณ์";
const HOSPITAL_NAME_EN = "Walailak University Hospital";

// html2canvas has real, proven trouble with combining Thai vowel/tone marks
// in *every* self-hosted webfont we've tried here (IBM Plex Sans Thai, then
// Sarabun) — marks like the thanthakhat get silently dropped in the saved
// PNG even though the live page looks fine. Tahoma is a long-standing
// system font (no @font-face loading involved at all, so no timing/hinting
// surprises for html2canvas to trip over) and is the only option that has
// actually been confirmed correct end-to-end by the person using this
// feature. Do not swap this for a self-hosted webfont again without
// re-verifying an *actual* downloaded PNG — the live on-screen render
// looking right is not sufficient evidence, both prior regressions looked
// fine live and only broke in the captured image.
const SAFE_THAI_FONT_STACK =
  "Tahoma, 'Leelawadee UI', 'Noto Sans Thai', 'Segoe UI', Arial, sans-serif";

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
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" strokeWidth={2} />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">ลงทะเบียนสำเร็จ</h2>
        <p className="mt-1 text-sm text-slate-500">
          กรุณาบันทึกบัตรจอดรถนี้ไว้เป็นหลักฐาน หรือแคปหน้าจอเก็บไว้
        </p>
      </div>

      {/* Intentionally kept light-mode-only and pinned to a safe system font
          (see SAFE_THAI_FONT_STACK) since this doubles as a printable/savable
          pass image — it should render identically regardless of the
          viewer's OS theme or which webfonts happen to be loaded. Nothing in
          the header row competes with the hospital name for width (no
          badges, no truncate) — a previous version clipped the name against
          a decorative badge sharing the same row. */}
      <div
        ref={cardRef}
        style={{ fontFamily: SAFE_THAI_FONT_STACK }}
        className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-card-hover"
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-wuh-700 via-wuh-800 to-accent-600 px-6 py-6 text-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-14 -left-6 h-28 w-28 rounded-full bg-white/10" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <CarFront className="h-5 w-5" />
            </div>
            <div className="min-w-0 py-0.5">
              <p className="text-[13px] font-semibold leading-[2]">{HOSPITAL_NAME_TH}</p>
              <p className="text-[11px] leading-[2] text-wuh-100/80">{HOSPITAL_NAME_EN}</p>
            </div>
          </div>

          <div className="relative mt-6">
            <p className="text-[11px] font-medium uppercase leading-[1.8] tracking-widest text-white/70">
              ทะเบียนรถ
            </p>
            <div className="mt-1 flex items-end justify-between gap-3">
              <p className="text-4xl font-bold leading-normal tracking-[0.1em]">{data.license_plate}</p>
              <span className="mb-1 flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400/90 px-3 py-1.5 text-xs font-semibold leading-[1.8] text-amber-950">
                รอดำเนินการ
              </span>
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-xs leading-[1.8] text-white/75">
              <MapPin className="h-3 w-3" />
              จังหวัด{data.province}
            </p>
          </div>
        </div>

        <div className="border-t border-dashed border-slate-200" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-5 px-6 py-6">
          <div className="col-span-2">
            <InfoDetailRow icon={User} label="ชื่อ-นามสกุล" value={data.full_name_th} />
          </div>
          <InfoDetailRow icon={Briefcase} label="ตำแหน่ง" value={data.position} />
          <InfoDetailRow icon={Building2} label="หน่วยงาน" value={data.department} />
          <InfoDetailRow icon={Phone} label="เบอร์โทรศัพท์" value={data.phone_number} />
          <InfoDetailRow icon={Palette} label="สี / ประเภทรถ" value={`${data.car_color} · ${data.car_type}`} />
          <div className="col-span-2">
            <InfoDetailRow icon={Tag} label="ประเภทป้ายทะเบียน" value={data.license_plate_type} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-dashed border-slate-200 bg-wuh-50/60 px-6 py-4">
          <div className="flex items-center gap-1.5 text-[11px] leading-[1.8] text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            {submittedAt}
          </div>
          <p className="rounded-md bg-white px-2 py-1 font-mono text-[11px] leading-[1.8] text-slate-400 shadow-sm">
            #{referenceId.slice(0, 8)}
          </p>
        </div>
      </div>

      {downloadError && (
        <p className="mt-3 text-center text-sm text-red-600">{downloadError}</p>
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
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          ลงทะเบียนคันถัดไป
        </button>
      </div>
    </div>
  );
}
