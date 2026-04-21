import "@jf/ui/globals.css";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Routiner",
  description: "Habit tracker",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Routiner",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffaf51" },
    { media: "(prefers-color-scheme: dark)", color: "#ffaf51" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-(--surface-300) flex flex-col items-center justify-start`}
      >
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{ classNames: { toast: "!left-auto !right-8 !w-fit" } }}
        />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
