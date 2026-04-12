import { cn } from "../lib/utils";

interface TextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Textarea({ value, onChange, placeholder, disabled, className }: TextareaProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={3}
      className={cn(
        "w-full resize-none rounded-[10px] bg-(--surface-150) px-3 py-2 text-sm",
        "border-none outline-none ring-0 focus:outline-none focus:ring-0",
        "placeholder:text-(--grey-400)",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  );
}
