export type Line = {
  id: string;
  label: string;
};

export const LINES = [
  { id: "yamanote", label: "Yamanote Line" },
  { id: "saikyo", label: "Saikyo Line" },
  { id: "keihin-tohoku", label: "Keihin-Tohoku Line" },
  { id: "namboku", label: "Namboku Line" },
  { id: "den-en-toshi", label: "Den-en-toshi Line" },
] as const satisfies readonly Line[];

export type LineId = (typeof LINES)[number]["id"];
