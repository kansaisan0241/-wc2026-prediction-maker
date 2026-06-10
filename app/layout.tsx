import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2026 FIFA WORLD CUP 予想メーカー",
  description: "グループ順位と決勝トーナメントを予想しよう",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "WC2026予想",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0757A6"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
