import "@jf/ui/globals.css";
import { ThemeScript, ThemedToaster } from "@jf/ui";
import "@/app/globals.css";
import type { Metadata, Viewport } from "next";
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

// Manifest, icons and splash screens come with the PWA setup, Scanner ticket 14.
export const metadata: Metadata = {
  title: "Scanner",
  description: "Track the things you want to buy and see where each one is cheapest right now.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#b0367f" },
    { media: "(prefers-color-scheme: dark)", color: "#28282a" },
  ],
  viewportFit: "cover",
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
