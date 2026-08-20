import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans-thai",
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
  themeColor: "#7c3aed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${ibmPlexSans.variable} ${ibmPlexSansThai.variable}`}>
      <body>{children}</body>
    </html>
  );
}
