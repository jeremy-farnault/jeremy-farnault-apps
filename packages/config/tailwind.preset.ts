import type { Config } from "tailwindcss";

export const tailwindPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: "oklch(97% 0.02 250)",
          100: "oklch(93% 0.05 250)",
          200: "oklch(86% 0.10 250)",
          300: "oklch(76% 0.14 250)",
          400: "oklch(65% 0.17 250)",
          500: "oklch(54% 0.19 250)",
          600: "oklch(45% 0.18 250)",
          700: "oklch(37% 0.15 250)",
          800: "oklch(28% 0.11 250)",
          900: "oklch(20% 0.07 250)",
          950: "oklch(14% 0.05 250)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
};
