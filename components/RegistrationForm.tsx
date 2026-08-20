"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IdCard,
  User,
  UserRound,
  Briefcase,
  Building2,
  Phone,
  CarFront,
  Palette,
  Tag,
  ShieldCheck,
  Loader2,
  UserCircle2,
  ClipboardCheck,
} from "lucide-react";
import {
  registrationSchema,
  RegistrationInput,
  CAR_TYPE_OPTIONS,
  CAR_COLOR_OPTIONS,
  LICENSE_PLATE_TYPE_OPTIONS,
} from "@/lib/validation";
import { TurnstileWidget } from "./TurnstileWidget";
import { RegistrationSuccessCard } from "./RegistrationSuccessCard";

const CONSENT_TEXT =
  "ข้าพเจ้ายินยอมให้หน่วยงานเก็บและใช้ข้อมูลข้างต้นเพื่อวัตถุประสงค์การควบคุมพื้นที่จอดรถ";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; referenceId: string; data: RegistrationInput }
  | { status: "error"; message: string };

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-wuh-600 focus:outline-none focus:ring-2 focus:ring-wuh-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-wuh-500 dark:focus:ring-wuh-900/60";
const selectClass =
  "w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-base text-slate-900 shadow-sm transition focus:border-wuh-600 focus:outline-none focus:ring-2 focus:ring-wuh-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-wuh-500 dark:focus:ring-wuh-900/60";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";
const errorClass = "mt-1.5 text-sm text-red-600 dark:text-red-400";

function FieldIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-wuh-100 text-wuh-700 dark:bg-wuh-900/50 dark:text-wuh-300">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

export function RegistrationForm() {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileError, setTurnstileError] = useState<string>("");

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      license_plate: "",
      full_name_th: "",
      full_name_en: "",
      position: "",
      department: "",
      phone_number: "",
      consent: false,
    },
  });

  const onSubmit = async (values: RegistrationInput) => {
    setTurnstileError("");
    const requiresTurnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
    if (requiresTurnstile && !turnstileToken) {
      setTurnstileError("กรุณายืนยันตัวตน (anti-bot) ก่อนส่งข้อมูล");
      return;
    }

    setSubmitState({ status: "submitting" });

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, turnstileToken }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError("license_plate", { message: data.error ?? "ทะเบียนนี้ลงทะเบียนแล้ว" });
        setSubmitState({ status: "idle" });
        return;
      }

      if (!res.ok || !data.success) {
        setSubmitState({
          status: "error",
          message: data.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        });
        return;
      }

      setSubmitState({ status: "success", referenceId: data.referenceId, data: values });
      setTurnstileToken("");
    } catch {
      setSubmitState({
        status: "error",
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง",
      });
    }
  };

  if (submitState.status === "success") {
    return (
      <RegistrationSuccessCard
        referenceId={submitState.referenceId}
        data={submitState.data}
        onReset={() => {
          reset();
          setSubmitState({ status: "idle" });
        }}
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto w-full max-w-md animate-fade-in space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900 sm:p-7"
      noValidate
    >
      {/* Section: ข้อมูลผู้ลงทะเบียน */}
      <section>
        <SectionHeader icon={UserCircle2} title="ข้อมูลผู้ลงทะเบียน" subtitle="ข้อมูลส่วนตัวและหน่วยงาน" />
        <div className="space-y-5">
          <div>
            <label htmlFor="full_name_th" className={labelClass}>
              ชื่อ-นามสกุล (ภาษาไทย) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FieldIcon icon={User} />
              <input
                id="full_name_th"
                type="text"
                placeholder="เช่น สมชาย ใจดี"
                className={inputClass}
                {...register("full_name_th")}
              />
            </div>
            {errors.full_name_th && <p className={errorClass}>{errors.full_name_th.message}</p>}
          </div>

          <div>
            <label htmlFor="full_name_en" className={labelClass}>
              ชื่อ-นามสกุล (ภาษาอังกฤษ) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FieldIcon icon={UserRound} />
              <input
                id="full_name_en"
                type="text"
                placeholder="e.g. Somchai Jaidee"
                className={inputClass}
                {...register("full_name_en")}
              />
            </div>
            {errors.full_name_en && <p className={errorClass}>{errors.full_name_en.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="position" className={labelClass}>
                ตำแหน่ง <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FieldIcon icon={Briefcase} />
                <input
                  id="position"
                  type="text"
                  placeholder="เช่น พยาบาลวิชาชีพ"
                  className={inputClass}
                  {...register("position")}
                />
              </div>
              {errors.position && <p className={errorClass}>{errors.position.message}</p>}
            </div>

            <div>
              <label htmlFor="department" className={labelClass}>
                หน่วยงาน <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FieldIcon icon={Building2} />
                <input
                  id="department"
                  type="text"
                  placeholder="เช่น แผนกผู้ป่วยนอก"
                  className={inputClass}
                  {...register("department")}
                />
              </div>
              {errors.department && <p className={errorClass}>{errors.department.message}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="phone_number" className={labelClass}>
              เบอร์โทรศัพท์ <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FieldIcon icon={Phone} />
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
        </div>
      </section>

      <div className="border-t border-dashed border-slate-200 dark:border-slate-800" />

      {/* Section: ข้อมูลรถยนต์ */}
      <section>
        <SectionHeader icon={CarFront} title="ข้อมูลรถยนต์" subtitle="ทะเบียนและรายละเอียดรถ" />
        <div className="space-y-5">
          <div>
            <label htmlFor="license_plate" className={labelClass}>
              ทะเบียนรถ <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FieldIcon icon={IdCard} />
              <input
                id="license_plate"
                type="text"
                inputMode="text"
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
            <label htmlFor="car_type" className={labelClass}>
              ประเภทรถ <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FieldIcon icon={CarFront} />
              <select id="car_type" defaultValue="" className={selectClass} {...register("car_type")}>
                <option value="" disabled>
                  -- เลือกประเภทรถ --
                </option>
                {CAR_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            {errors.car_type && <p className={errorClass}>{errors.car_type.message}</p>}
          </div>

          <div>
            <label htmlFor="car_color" className={labelClass}>
              สีรถ <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FieldIcon icon={Palette} />
              <select id="car_color" defaultValue="" className={selectClass} {...register("car_color")}>
                <option value="" disabled>
                  -- เลือกสีรถ --
                </option>
                {CAR_COLOR_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            {errors.car_color && <p className={errorClass}>{errors.car_color.message}</p>}
          </div>

          <div>
            <label htmlFor="license_plate_type" className={labelClass}>
              ประเภทป้ายทะเบียน <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FieldIcon icon={Tag} />
              <select
                id="license_plate_type"
                defaultValue=""
                className={selectClass}
                {...register("license_plate_type")}
              >
                <option value="" disabled>
                  -- เลือกประเภทป้ายทะเบียน --
                </option>
                {LICENSE_PLATE_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            {errors.license_plate_type && (
              <p className={errorClass}>{errors.license_plate_type.message}</p>
            )}
          </div>
        </div>
      </section>

      <div className="border-t border-dashed border-slate-200 dark:border-slate-800" />

      {/* Section: ยืนยันการลงทะเบียน */}
      <section>
        <SectionHeader icon={ClipboardCheck} title="ยืนยันการลงทะเบียน" subtitle="ตรวจสอบและยืนยันความยินยอม" />
        <div className="space-y-4">
          <label
            htmlFor="consent"
            className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/40"
          >
            <input
              id="consent"
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-wuh-700 focus:ring-wuh-500 dark:border-slate-600 dark:bg-slate-700"
              {...register("consent")}
            />
            <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {CONSENT_TEXT}
            </span>
          </label>
          {errors.consent && <p className={errorClass}>{errors.consent.message}</p>}

          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              <ShieldCheck className="h-4 w-4 text-wuh-700 dark:text-wuh-400" />
              ยืนยันว่าไม่ใช่บอท
            </div>
            <TurnstileWidget
              onVerify={(token) => {
                setTurnstileToken(token);
                setTurnstileError("");
              }}
              onExpire={() => setTurnstileToken("")}
            />
            {turnstileError && <p className={errorClass}>{turnstileError}</p>}
          </div>

          {submitState.status === "error" && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
              {submitState.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || submitState.status === "submitting"}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-wuh-700 to-accent-600 px-4 py-3 text-base font-semibold text-white shadow-card transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitState.status === "submitting" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                กำลังส่งข้อมูล...
              </>
            ) : (
              "ลงทะเบียน"
            )}
          </button>
        </div>
      </section>
    </form>
  );
}
