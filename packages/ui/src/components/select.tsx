"use client";

import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import * as SelectPrimitive from "@radix-ui/react-select";
import type { ComponentType, SVGProps } from "react";
import { cn } from "../lib/utils";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  disabled?: boolean;
  placeholder?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
  className?: string;
}

function Select({
  value,
  onValueChange,
  defaultValue,
  disabled,
  placeholder,
  icon: Icon,
  children,
  className,
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      {...(value !== undefined && { value })}
      {...(onValueChange !== undefined && { onValueChange })}
      {...(defaultValue !== undefined && { defaultValue })}
    >
      <SelectTrigger
        {...(disabled !== undefined && { disabled })}
        {...(Icon !== undefined && { icon: Icon })}
        {...(className !== undefined && { className })}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
      </SelectTrigger>
      <SelectPrimitive.Portal>
        <SelectContent>{children}</SelectContent>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

interface SelectTriggerProps {
  disabled?: boolean;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
  className?: string;
}

function SelectTrigger({ disabled, icon: Icon, children, className }: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      disabled={disabled}
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-[10px]",
        "bg-(--surface-150) px-3 text-sm text-(--grey-900)",
        "hover:bg-(--surface-200) focus:outline-none focus:ring-0",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[&>span]:truncate",
        className
      )}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        {Icon ? (
          <Icon width={16} height={16} className="shrink-0 text-(--grey-700)" />
        ) : (
          <CaretDownIcon size={16} className="shrink-0 text-(--grey-700)" />
        )}
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

function SelectContent({ children, className }: SelectContentProps) {
  return (
    <SelectPrimitive.Content
      position="popper"
      sideOffset={6}
      className={cn(
        "z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden",
        "rounded-[16px] bg-(--card) p-4",
        "shadow-[0_24px_36px_0_rgba(0,0,0,0.25)]",
        "animate-[overlay-in_0.3s_ease-in-out]",
        className
      )}
    >
      <SelectPrimitive.Viewport className="flex flex-col gap-2">
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  className?: string;
}

function SelectItem({ value, children, icon: Icon, className }: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      value={value}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5",
        "text-sm text-(--grey-900) outline-none",
        "hover:bg-(--surface-150) focus:bg-(--surface-150)",
        "data-[state=checked]:font-medium",
        className
      )}
    >
      {Icon && <Icon width={16} height={16} className="shrink-0" />}
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="ml-auto">
        <CheckIcon size={14} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectTrigger, SelectContent, SelectItem };
