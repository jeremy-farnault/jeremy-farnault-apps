import "@jf/ui/globals.css";
import { ThemeScript, ThemedToaster } from "@jf/ui";
import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  axes: ["opsz"],
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
        className={`${bricolage.variable} ${geistMono.variable} font-sans antialiased bg-(--surface-200) flex flex-col items-center justify-start`}
      >
        {children}
        <ThemedToaster toastOptions={{ classNames: { toast: "!w-fit" } }} />
      </body>
    </html>
  );
}
