import Link from "next/link";
import { ArrowLeft, CarFront, Sparkles } from "lucide-react";
import { RegistrationForm } from "@/components/RegistrationForm";
import { Footer } from "@/components/Footer";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-wuh-50">
      <div className="relative overflow-hidden bg-gradient-to-br from-wuh-700 via-wuh-800 to-accent-600 px-4 pb-20 pt-12 sm:pb-24 sm:pt-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-10 top-16 h-56 w-56 rounded-full bg-accent-300/25 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-wuh-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-md">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับหน้าแรก
          </Link>
          <div className="text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-lg shadow-black/10 ring-1 ring-white/20 backdrop-blur-sm">
              <CarFront className="h-8 w-8" strokeWidth={2} />
            </div>
            <p className="mb-1.5 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white/85">
              <Sparkles className="h-3.5 w-3.5" />
              ระบบลงทะเบียนที่จอดรถ
            </p>
            <h1 className="text-2xl font-bold leading-snug sm:text-[28px]">
              โรงพยาบาลศูนย์การแพทย์
              <br />
              มหาวิทยาลัยวลัยลักษณ์
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-white/80">
              กรอกข้อมูลด้านล่างเพื่อลงทะเบียนรถเข้าพื้นที่จอดรถของโรงพยาบาล
            </p>
          </div>
        </div>
      </div>

      <svg
        viewBox="0 0 1440 60"
        className="relative -mt-1 block w-full text-wuh-50"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M0,32 C240,64 480,0 720,16 C960,32 1200,64 1440,32 L1440,60 L0,60 Z"
        />
      </svg>

      <div className="relative -mt-10 px-4 pb-8 sm:-mt-14">
        <RegistrationForm />
      </div>

      <Footer />
    </main>
  );
}
