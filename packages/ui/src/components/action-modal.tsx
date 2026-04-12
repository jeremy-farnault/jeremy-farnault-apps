"use client";

import { CircleNotchIcon, XIcon } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";

interface PrimaryButton {
  label: string;
  loading?: boolean;
  onClick: () => void;
}

interface SecondaryButton {
  label: string;
  onClick: () => void;
}

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  paragraph?: string;
  icon?: ReactNode;
  content?: ReactNode;
  primaryButton?: PrimaryButton;
  secondaryButton?: SecondaryButton;
  size: "small" | "large";
  closeOnBackdropClick?: boolean;
  closeOnEscapeKeyDown?: boolean;
}

const SIZE_CLASSES = {
  small: "w-[340px]",
  large: "w-[600px]",
} as const;

export function ActionModal({
  isOpen,
  onClose,
  title,
  paragraph,
  icon,
  content,
  primaryButton,
  secondaryButton,
  size,
  closeOnBackdropClick = true,
  closeOnEscapeKeyDown = true,
}: ActionModalProps) {
  const hasButtons = primaryButton || secondaryButton;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(34,34,38,0.30)] backdrop-blur-[13px] animate-[overlay-in_0.3s_ease-in-out]"
          onClick={closeOnBackdropClick ? undefined : (e) => e.stopPropagation()}
        >
          <Dialog.Content
            {...(!closeOnEscapeKeyDown && {
              onEscapeKeyDown: (e: KeyboardEvent) => e.preventDefault(),
            })}
            {...(!closeOnBackdropClick && { onInteractOutside: (e: Event) => e.preventDefault() })}
            className={cn(
              "relative flex flex-col rounded-[22px] bg-(--card) p-8",
              "shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] outline-none",
              "w-full max-w-[calc(100vw-2rem)]",
              SIZE_CLASSES[size],
              "animate-[modal-in_0.3s_ease-in-out]"
            )}
          >
            {!closeOnBackdropClick && (
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-(--grey-500) hover:text-(--grey-900)"
                type="button"
              >
                <XIcon size={16} weight="bold" />
              </button>
            )}

            <div className="flex flex-col gap-4">
              {icon}
              {title ? (
                <Dialog.Title className="text-base font-semibold text-(--grey-900)">
                  {title}
                </Dialog.Title>
              ) : (
                <Dialog.Title className="sr-only" />
              )}
              {paragraph && <p className="text-sm text-(--grey-600)">{paragraph}</p>}
              {content}
            </div>

            {hasButtons && (
              <div className={cn("mt-6 flex gap-2", size === "large" && "gap-4")}>
                {secondaryButton && (
                  <Button variant="outline" className="flex-1" onClick={secondaryButton.onClick}>
                    {secondaryButton.label}
                  </Button>
                )}
                {primaryButton && (
                  <Button
                    className="flex-1 bg-(--grey-900) text-white hover:bg-(--grey-700)"
                    disabled={primaryButton.loading}
                    onClick={primaryButton.onClick}
                  >
                    {primaryButton.loading && (
                      <CircleNotchIcon size={16} className="animate-spin" />
                    )}
                    {primaryButton.label}
                  </Button>
                )}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
