import { CarFront, Sparkles } from "lucide-react";
import { RegistrationForm } from "@/components/RegistrationForm";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-wuh-50 via-white to-white dark:from-wuh-950 dark:via-slate-950 dark:to-slate-950">
      <div className="relative overflow-hidden bg-gradient-to-br from-wuh-700 via-wuh-800 to-accent-600 px-4 pb-24 pt-10 sm:pb-28 sm:pt-14">
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-10 top-24 h-56 w-56 rounded-full bg-accent-400/20 blur-2xl" />

        <div className="relative mx-auto max-w-md text-center text-white">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <CarFront className="h-7 w-7" strokeWidth={2} />
          </div>
          <p className="mb-1 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-widest text-white/80">
            <Sparkles className="h-3.5 w-3.5" />
            ระบบลงทะเบียนที่จอดรถ
          </p>
          <h1 className="text-2xl font-bold leading-snug sm:text-[28px]">
            โรงพยาบาลศูนย์การแพทย์
            <br />
            มหาวิทยาลัยวลัยลักษณ์
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm text-white/80">
            กรอกข้อมูลด้านล่างเพื่อลงทะเบียนรถเข้าพื้นที่จอดรถของโรงพยาบาล
          </p>
        </div>
      </div>

      <div className="relative -mt-16 px-4 pb-6 sm:-mt-20">
        <RegistrationForm />
      </div>

      <Footer />
    </main>
  );
}
