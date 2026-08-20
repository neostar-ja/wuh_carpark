import type { Metadata, Viewport } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ระบบลงทะเบียนที่จอดรถ | โรงพยาบาลศูนย์การแพทย์ มหาวิทยาลัยวลัยลักษณ์",
  description:
    "ระบบลงทะเบียนรถเข้าพื้นที่จอดรถสำหรับบุคลากรและผู้มาติดต่อ โรงพยาบาลศูนย์การแพทย์ มหาวิทยาลัยวลัยลักษณ์",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b5ea8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={prompt.variable}>
      <body>{children}</body>
    </html>
  );
}
