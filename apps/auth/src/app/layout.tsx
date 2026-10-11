import "@jf/ui/globals.css";
import { ThemeScript, ThemedToaster } from "@jf/ui";
import type { Metadata } from "next";
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
  title: "Outils",
  description: "Sign in to Outils",
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
        <ThemedToaster toastOptions={{ classNames: { toast: "!w-fit" } }} />
      </body>
    </html>
  );
}
