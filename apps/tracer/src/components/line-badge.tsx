"use client";

interface Props {
  code: string;
  color: string;
  enabled: boolean;
  title?: string;
  onClick?: () => void;
}

export function LineBadge({ code, color, enabled, title, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={enabled}
      className="flex items-center justify-center w-7 h-7 rounded-md text-white text-[10px] font-bold tabular-nums cursor-pointer transition-opacity"
      style={{
        backgroundColor: color,
        opacity: enabled ? 1 : 0.3,
        textShadow: "0 1px 1px rgba(0,0,0,0.35)",
      }}
    >
      {code}
    </button>
  );
}
