import { cn } from "../lib/utils";

interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  if (!label) {
    return <hr className={cn("border-t border-(--grey-100)", className)} />;
  }
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <hr className="flex-1 border-t border-(--border)" />
      <span className="text-sm text-(--grey-400)">{label}</span>
      <hr className="flex-1 border-t border-(--border)" />
    </div>
  );
}
