export type Operator = {
  id: string;
  label: string;
};

export const OPERATORS = [
  { id: "jr-east", label: "JR East" },
  { id: "tokyo-metro", label: "Tokyo Metro" },
  { id: "toei", label: "Toei" },
  { id: "tokyu", label: "Tokyu" },
] as const satisfies readonly Operator[];

export type OperatorId = (typeof OPERATORS)[number]["id"];

export type Line = {
  id: string;
  label: string;
  code: string;
  color: string;
  operator: OperatorId;
};

export const LINES = [
  {
    id: "yamanote",
    label: "Yamanote Line",
    code: "JY",
    color: "#9ACD32",
    operator: "jr-east",
  },
  {
    id: "keihin-tohoku",
    label: "Keihin-Tohoku Line",
    code: "JK",
    color: "#00B2E5",
    operator: "jr-east",
  },
  {
    id: "saikyo",
    label: "Saikyo Line",
    code: "JA",
    color: "#00AC9B",
    operator: "jr-east",
  },
  {
    id: "namboku",
    label: "Namboku Line",
    code: "N",
    color: "#00AC84",
    operator: "tokyo-metro",
  },
  {
    id: "den-en-toshi",
    label: "Den-en-toshi Line",
    code: "DT",
    color: "#F39700",
    operator: "tokyu",
  },
] as const satisfies readonly Line[];

export type LineId = (typeof LINES)[number]["id"];
