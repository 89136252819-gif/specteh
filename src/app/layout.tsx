import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Рэдианс-СпецТех — заявки спецтехники",
  description: "Учёт заявок, техники, счетов и актов ООО «Рэдианс»",
  icons: { icon: "/favicon.png?v=3", apple: "/logo.png?v=3" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen w-full max-w-full overflow-x-clip antialiased">{children}</body>
    </html>
  );
}
