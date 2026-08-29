import "@jf/ui/globals.css";
import "./globals.css";
import { HeaderAuth } from "@/components/header-auth";
import { AppShell } from "@jf/ui";
import { ApertureIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Exposer",
  description: "A public-by-link photo portfolio",
};

export const viewport: Viewport = {
  themeColor: "#82499c",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-(--surface-300) flex flex-col items-center justify-start`}
      >
        <AppShell
          appIcon={<ApertureIcon className="text-white" size={26} weight="bold" />}
          appName="Exposer"
          currentAppId="exposer"
          titleHref="/"
          rightSlot={<HeaderAuth />}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
