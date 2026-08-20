import Link from "next/link";
import { CarFront, Search, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { Footer } from "@/components/Footer";

const SHORTCUTS = [
  {
    href: "/register",
    icon: CarFront,
    title: "ลงทะเบียนรถ",
    description: "กรอกข้อมูลเพื่อลงทะเบียนรถเข้าพื้นที่จอดรถของโรงพยาบาล",
    accent: "from-wuh-600 to-wuh-800",
  },
  {
    href: "/check-status",
    icon: Search,
    title: "ตรวจสอบผลการลงทะเบียน",
    description: "ตรวจสอบสถานะล่าสุดด้วยทะเบียนรถและเบอร์โทรศัพท์",
    accent: "from-accent-500 to-accent-700",
  },
  {
    href: "/admin",
    icon: ShieldCheck,
    title: "สำหรับผู้ดูแลระบบ",
    description: "เข้าสู่ระบบจัดการคำขอลงทะเบียนรถ (สำหรับเจ้าหน้าที่)",
    accent: "from-wuh-800 to-wuh-950",
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-wuh-50">
      <div className="relative overflow-hidden bg-gradient-to-br from-wuh-700 via-wuh-800 to-accent-600 px-4 pb-24 pt-14 sm:pb-28 sm:pt-20">
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

        <div className="relative mx-auto max-w-xl text-center text-white">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-lg shadow-black/10 ring-1 ring-white/20 backdrop-blur-sm">
            <CarFront className="h-8 w-8" strokeWidth={2} />
          </div>
          <p className="mb-1.5 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white/85">
            <Sparkles className="h-3.5 w-3.5" />
            ระบบลงทะเบียนที่จอดรถ
          </p>
          <h1 className="text-3xl font-bold leading-snug sm:text-4xl">
            โรงพยาบาลศูนย์การแพทย์
            <br />
            มหาวิทยาลัยวลัยลักษณ์
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
            ระบบลงทะเบียนและตรวจสอบสิทธิ์เข้าพื้นที่จอดรถ สำหรับบุคลากรและผู้มาติดต่อ
          </p>
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

      <div className="relative -mt-12 px-4 pb-12 sm:-mt-16">
        <div className="mx-auto grid w-full max-w-4xl gap-4 sm:grid-cols-3">
          {SHORTCUTS.map(({ href, icon: Icon, title, description, accent }) => (
            <Link
              key={href}
              href={href}
              className="group flex animate-fade-in flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-card-hover"
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">{title}</h2>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-500">{description}</p>
              <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-wuh-700 transition group-hover:gap-2.5">
                ไปที่หน้านี้
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
