import "@jf/ui/globals.css";
import { ThemeScript, ThemedToaster } from "@jf/ui";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
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
  title: "Tracer",
  description: "Tokyo territory game",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#b63a3a" },
    { media: "(prefers-color-scheme: dark)", color: "#28282a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-(--surface-200) flex flex-col items-center justify-start`}
      >
        {children}
        <ThemedToaster
          position="top-right"
          toastOptions={{ classNames: { toast: "!left-auto !right-8 !w-fit" } }}
        />
      </body>
    </html>
  );
}
