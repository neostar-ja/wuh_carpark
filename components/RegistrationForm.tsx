"use client";

import { useEffect, useState } from "react";
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
  CheckCircle2,
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

const PLATE_FORMAT_REGEX = /^[ก-ฮ]{1,3}[0-9]{1,4}$/;

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; referenceId: string; data: RegistrationInput }
  | { status: "error"; message: string };

type PlateCheckState = "idle" | "checking" | "available" | "taken" | "error";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-wuh-600 focus:outline-none focus:ring-2 focus:ring-wuh-100";
const selectClass =
  "w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-base text-slate-900 shadow-sm transition focus:border-wuh-600 focus:outline-none focus:ring-2 focus:ring-wuh-100";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";
const errorClass = "mt-1.5 text-sm text-red-600";

function FieldIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

function SectionHeader({
  step,
  icon: Icon,
  title,
  subtitle,
}: {
  step: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-wuh-600 to-accent-500 text-white shadow-sm">
        <Icon className="h-5 w-5" />
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-wuh-900 text-[10px] font-bold">
          {step}
        </span>
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

const sectionCardClass =
  "animate-fade-in rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6";

export function RegistrationForm() {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileError, setTurnstileError] = useState<string>("");
  const [plateCheck, setPlateCheck] = useState<PlateCheckState>("idle");

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    watch,
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

  const licensePlateValue = watch("license_plate");

  // Real-time duplicate check while typing, so a taken plate shows up before
  // the user ever reaches the anti-bot / submit step.
  useEffect(() => {
    const value = (licensePlateValue ?? "").replace(/\s+/g, "");

    if (!PLATE_FORMAT_REGEX.test(value)) {
      setPlateCheck("idle");
      return;
    }

    setPlateCheck("checking");
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/register?plate=${encodeURIComponent(value)}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setPlateCheck("error");
          return;
        }

        if (data.exists) {
          setPlateCheck("taken");
          setError("license_plate", { type: "manual", message: "ทะเบียนนี้ลงทะเบียนแล้ว" });
        } else {
          setPlateCheck("available");
          clearErrors("license_plate");
        }
      } catch {
        setPlateCheck("error");
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [licensePlateValue, setError, clearErrors]);

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
        setPlateCheck("taken");
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
          setPlateCheck("idle");
          setSubmitState({ status: "idle" });
        }}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto w-full max-w-md space-y-5" noValidate>
      {/* Section 1: ข้อมูลผู้ลงทะเบียน */}
      <section className={sectionCardClass}>
        <SectionHeader step={1} icon={UserCircle2} title="ข้อมูลผู้ลงทะเบียน" subtitle="ข้อมูลส่วนตัวและหน่วยงาน" />
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

      {/* Section 2: ข้อมูลรถยนต์ */}
      <section className={sectionCardClass}>
        <SectionHeader step={2} icon={CarFront} title="ข้อมูลรถยนต์" subtitle="ทะเบียนและรายละเอียดรถ" />
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
              {plateCheck === "checking" && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                </span>
              )}
              {plateCheck === "available" && !errors.license_plate && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                  <CheckCircle2 className="h-[18px] w-[18px]" />
                </span>
              )}
            </div>
            {errors.license_plate ? (
              <p className={errorClass}>{errors.license_plate.message}</p>
            ) : plateCheck === "available" ? (
              <p className="mt-1.5 flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                ทะเบียนนี้ยังไม่ถูกใช้งาน
              </p>
            ) : null}
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

      {/* Section 3: ยืนยันการลงทะเบียน */}
      <section className={sectionCardClass}>
        <SectionHeader step={3} icon={ClipboardCheck} title="ยืนยันการลงทะเบียน" subtitle="ตรวจสอบและยืนยันความยินยอม" />
        <div className="space-y-4">
          <label
            htmlFor="consent"
            className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-slate-50 p-3.5"
          >
            <input
              id="consent"
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-wuh-700 focus:ring-wuh-500"
              {...register("consent")}
            />
            <span className="text-sm leading-relaxed text-slate-600">{CONSENT_TEXT}</span>
          </label>
          {errors.consent && <p className={errorClass}>{errors.consent.message}</p>}

          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <ShieldCheck className="h-4 w-4 text-wuh-700" />
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
            <div className="rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-700">
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
