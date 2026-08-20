import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AdminTable } from "@/components/AdminTable";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  const isAuthenticated = verifyAdminSessionToken(token);

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gray-100 px-4">
        <AdminLoginForm />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <AdminTable />
    </main>
  );
}
