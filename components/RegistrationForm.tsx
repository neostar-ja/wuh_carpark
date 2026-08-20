"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  registrationSchema,
  RegistrationInput,
  CAR_TYPE_OPTIONS,
  CAR_COLOR_OPTIONS,
  LICENSE_PLATE_TYPE_OPTIONS,
} from "@/lib/validation";
import { TurnstileWidget } from "./TurnstileWidget";

const CONSENT_TEXT =
  "ข้าพเจ้ายินยอมให้หน่วยงานเก็บและใช้ข้อมูลข้างต้นเพื่อวัตถุประสงค์การควบคุมพื้นที่จอดรถ";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; referenceId: string }
  | { status: "error"; message: string };

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
      full_name_en: "",
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

      setSubmitState({ status: "success", referenceId: data.referenceId });
      reset();
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
      <div className="mx-auto max-w-md rounded-lg border border-green-200 bg-green-50 p-6 text-center shadow-sm">
        <div className="mb-3 text-4xl">✅</div>
        <h2 className="mb-2 text-lg font-semibold text-green-800">ลงทะเบียนสำเร็จ</h2>
        <p className="mb-4 text-sm text-gray-600">กรุณาเก็บหมายเลขอ้างอิงนี้ไว้เป็นหลักฐาน</p>
        <div className="mb-4 rounded-md bg-white p-3 font-mono text-sm text-gray-800 break-all">
          {submitState.referenceId}
        </div>
        <button
          type="button"
          onClick={() => setSubmitState({ status: "idle" })}
          className="rounded-md bg-wuh-blue px-4 py-2 text-sm font-medium text-white hover:bg-wuh-navy"
        >
          ลงทะเบียนคันถัดไป
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto max-w-md space-y-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
      noValidate
    >
      <div>
        <label htmlFor="license_plate" className="mb-1 block text-sm font-medium text-gray-700">
          ทะเบียนรถ <span className="text-red-500">*</span>
        </label>
        <input
          id="license_plate"
          type="text"
          inputMode="text"
          placeholder="เช่น กข1234"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-wuh-blue focus:outline-none focus:ring-1 focus:ring-wuh-blue"
          {...register("license_plate", {
            onChange: (e) => {
              e.target.value = e.target.value.replace(/\s+/g, "");
            },
          })}
        />
        {errors.license_plate && (
          <p className="mt-1 text-sm text-red-600">{errors.license_plate.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="full_name_en" className="mb-1 block text-sm font-medium text-gray-700">
          ชื่อ-นามสกุล (ภาษาอังกฤษ) <span className="text-red-500">*</span>
        </label>
        <input
          id="full_name_en"
          type="text"
          placeholder="e.g. Somchai Jaidee"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-wuh-blue focus:outline-none focus:ring-1 focus:ring-wuh-blue"
          {...register("full_name_en")}
        />
        {errors.full_name_en && (
          <p className="mt-1 text-sm text-red-600">{errors.full_name_en.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone_number" className="mb-1 block text-sm font-medium text-gray-700">
          เบอร์โทรศัพท์ <span className="text-red-500">*</span>
        </label>
        <input
          id="phone_number"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="0812345678"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-wuh-blue focus:outline-none focus:ring-1 focus:ring-wuh-blue"
          {...register("phone_number", {
            onChange: (e) => {
              e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
            },
          })}
        />
        {errors.phone_number && (
          <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="car_type" className="mb-1 block text-sm font-medium text-gray-700">
          ประเภทรถ <span className="text-red-500">*</span>
        </label>
        <select
          id="car_type"
          defaultValue=""
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base focus:border-wuh-blue focus:outline-none focus:ring-1 focus:ring-wuh-blue"
          {...register("car_type")}
        >
          <option value="" disabled>
            -- เลือกประเภทรถ --
          </option>
          {CAR_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.car_type && <p className="mt-1 text-sm text-red-600">{errors.car_type.message}</p>}
      </div>

      <div>
        <label htmlFor="car_color" className="mb-1 block text-sm font-medium text-gray-700">
          สีรถ <span className="text-red-500">*</span>
        </label>
        <select
          id="car_color"
          defaultValue=""
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base focus:border-wuh-blue focus:outline-none focus:ring-1 focus:ring-wuh-blue"
          {...register("car_color")}
        >
          <option value="" disabled>
            -- เลือกสีรถ --
          </option>
          {CAR_COLOR_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {errors.car_color && <p className="mt-1 text-sm text-red-600">{errors.car_color.message}</p>}
      </div>

      <div>
        <label
          htmlFor="license_plate_type"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          ประเภทป้ายทะเบียน <span className="text-red-500">*</span>
        </label>
        <select
          id="license_plate_type"
          defaultValue=""
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base focus:border-wuh-blue focus:outline-none focus:ring-1 focus:ring-wuh-blue"
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
        {errors.license_plate_type && (
          <p className="mt-1 text-sm text-red-600">{errors.license_plate_type.message}</p>
        )}
      </div>

      <div className="flex items-start gap-2">
        <input
          id="consent"
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-wuh-blue focus:ring-wuh-blue"
          {...register("consent")}
        />
        <label htmlFor="consent" className="text-sm text-gray-600">
          {CONSENT_TEXT}
        </label>
      </div>
      {errors.consent && <p className="-mt-3 text-sm text-red-600">{errors.consent.message}</p>}

      <TurnstileWidget
        onVerify={(token) => {
          setTurnstileToken(token);
          setTurnstileError("");
        }}
        onExpire={() => setTurnstileToken("")}
      />
      {turnstileError && <p className="text-sm text-red-600">{turnstileError}</p>}

      {submitState.status === "error" && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{submitState.message}</div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || submitState.status === "submitting"}
        className="w-full rounded-md bg-wuh-blue px-4 py-2.5 text-base font-medium text-white transition hover:bg-wuh-navy disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitState.status === "submitting" ? "กำลังส่งข้อมูล..." : "ลงทะเบียน"}
      </button>
    </form>
  );
}
