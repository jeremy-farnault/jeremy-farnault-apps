import { cn } from "../lib/utils";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TextInput({ value, onChange, placeholder, disabled, className }: TextInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "h-11 w-full rounded-[10px] bg-(--surface-100) px-3 text-sm",
        "border-none outline-none ring-0 focus:outline-none focus:ring-0",
        "placeholder:text-(--grey-400)",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  );
}
