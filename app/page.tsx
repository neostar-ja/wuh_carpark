import { CarFront, ShieldCheck, Sparkles } from "lucide-react";
import { RegistrationForm } from "@/components/RegistrationForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-wuh-900 via-wuh-800 to-wuh-50">
      <div className="relative overflow-hidden px-4 pb-24 pt-10 sm:pb-28 sm:pt-14">
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/5 blur-2xl" />
        <div className="pointer-events-none absolute -right-10 top-24 h-48 w-48 rounded-full bg-wuh-400/10 blur-2xl" />

        <div className="relative mx-auto max-w-md text-center text-white">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <CarFront className="h-7 w-7" strokeWidth={2} />
          </div>
          <p className="mb-1 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-widest text-wuh-100/80">
            <Sparkles className="h-3.5 w-3.5" />
            ระบบลงทะเบียนที่จอดรถ
          </p>
          <h1 className="text-2xl font-bold leading-snug sm:text-[28px]">
            โรงพยาบาลศูนย์การแพทย์
            <br />
            มหาวิทยาลัยวลัยลักษณ์
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-sm text-wuh-100/80">
            กรอกข้อมูลด้านล่างเพื่อลงทะเบียนรถเข้าพื้นที่จอดรถของโรงพยาบาล
          </p>
          <div className="mx-auto mt-4 flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-wuh-100/90 backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            ข้อมูลของท่านได้รับการคุ้มครองตาม PDPA
          </div>
        </div>
      </div>

      <div className="relative -mt-16 px-4 pb-14 sm:-mt-20">
        <RegistrationForm />
      </div>
    </main>
  );
}
