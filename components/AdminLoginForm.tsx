"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck, Loader2 } from "lucide-react";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "เข้าสู่ระบบไม่สำเร็จ");
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-wuh-900 via-wuh-800 to-accent-700 px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-medium text-white/85 backdrop-blur-sm transition hover:bg-white/15 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับหน้าแรก
        </Link>
      </div>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm animate-scale-in space-y-5 rounded-2xl border border-white/10 bg-white p-7 shadow-card"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-wuh-50">
            <ShieldCheck className="h-6 w-6 text-wuh-800" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">เข้าสู่ระบบผู้ดูแล</h1>
          <p className="mt-1 text-sm text-slate-500">ระบบลงทะเบียนที่จอดรถ WUH</p>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
            รหัสผ่าน
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Lock className="h-[18px] w-[18px]" />
            </span>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-base text-slate-900 shadow-sm transition focus:border-wuh-600 focus:outline-none focus:ring-2 focus:ring-wuh-100"
              autoFocus
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-wuh-700 to-accent-600 px-4 py-3 text-base font-semibold text-white shadow-card transition hover:brightness-110 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังเข้าสู่ระบบ...
            </>
          ) : (
            "เข้าสู่ระบบ"
          )}
        </button>
      </form>
    </div>
  );
}
