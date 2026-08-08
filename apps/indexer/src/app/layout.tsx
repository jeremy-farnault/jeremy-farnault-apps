import "@jf/ui/globals.css";
import "./globals.css";
import { HeaderAuth } from "@/components/header-auth";
import { AppShell } from "@jf/ui";
import { InfinityIcon } from "@phosphor-icons/react/dist/ssr";
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
  title: "Indexer",
  description: "One place for all your apps",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Indexer",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d3d8d9" },
    { media: "(prefers-color-scheme: dark)", color: "#3a3a41" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-(--surface-300) flex flex-col items-center justify-start`}
      >
        <AppShell
          appIcon={<InfinityIcon className="text-(--grey-900)" size={26} weight="bold" />}
          appName="Indexer"
          rightSlot={<HeaderAuth />}
        >
          {children}
          {modal}
        </AppShell>
      </body>
    </html>
  );
}
