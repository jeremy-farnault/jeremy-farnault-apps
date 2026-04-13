import { cn } from "../lib/utils";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  type?: "text" | "email" | "password";
  required?: boolean;
  name?: string;
}

export function TextInput({ value, onChange, placeholder, disabled, className, type = "text", required, name }: TextInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      name={name}
      className={cn(
        "h-11 w-full rounded-[10px] bg-(--surface-150) px-3 text-sm",
        "border-none outline-none ring-0 focus:outline-none focus:ring-0",
        "placeholder:text-(--grey-400)",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  );
}
