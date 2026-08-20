import { RegistrationForm } from "@/components/RegistrationForm";

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto mb-6 max-w-md text-center">
        <h1 className="text-xl font-bold text-wuh-navy sm:text-2xl">
          ลงทะเบียนรถเข้าพื้นที่จอดรถ
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          โรงพยาบาลศูนย์การแพทย์มหาวิทยาลัยวลัยลักษณ์
        </p>
      </div>
      <RegistrationForm />
    </main>
  );
}
