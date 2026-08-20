import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ลงทะเบียนรถเข้าพื้นที่จอดรถ | โรงพยาบาลศูนย์การแพทย์มหาวิทยาลัยวลัยลักษณ์",
  description: "ระบบลงทะเบียนรถสำหรับเจ้าหน้าที่และผู้มาติดต่อ โรงพยาบาลศูนย์การแพทย์มหาวิทยาลัยวลัยลักษณ์",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
