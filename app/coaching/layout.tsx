import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "コーチング記録",
  description: "ラグビー部のコーチング日・移動手段・駐車場利用をカレンダーで記録するアプリ",
  appleWebApp: {
    capable: true,
    title: "コーチング記録",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function CoachingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
