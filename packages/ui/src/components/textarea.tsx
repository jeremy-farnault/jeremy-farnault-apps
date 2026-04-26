import { cn } from "../lib/utils";

interface TextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Textarea({ value, onChange, placeholder, disabled, className, id }: TextareaProps) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={3}
      className={cn(
        "w-full resize-y rounded-[10px] bg-(--surface-150) px-3 py-2 text-sm",
        "border-none outline-none ring-0 focus:outline-none focus:ring-0",
        "placeholder:text-(--grey-400)",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  );
}
