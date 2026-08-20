"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-24 max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h1 className="text-lg font-semibold text-wuh-navy">เข้าสู่ระบบผู้ดูแล</h1>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
          รหัสผ่าน
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-base focus:border-wuh-blue focus:outline-none focus:ring-1 focus:ring-wuh-blue"
          autoFocus
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-wuh-blue px-4 py-2.5 text-base font-medium text-white hover:bg-wuh-navy disabled:opacity-60"
      >
        {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
