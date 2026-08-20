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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
    { media: "(prefers-color-scheme: dark)", color: "#4c1d95" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${ibmPlexSans.variable} ${ibmPlexSansThai.variable}`}>
      <body>{children}</body>
    </html>
  );
}
