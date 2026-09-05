"use client";

import { CircleNotchIcon, XIcon } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";

interface PrimaryButton {
  label: string;
  loading?: boolean;
  disabled?: boolean;
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
  /**
   * Extra controls rendered in the top-right corner, left of the close button.
   * Passing this also forces the close (X) button to stay visible at all
   * breakpoints regardless of `closeOnBackdropClick`.
   */
  headerActions?: ReactNode;
  primaryButton?: PrimaryButton;
  secondaryButton?: SecondaryButton;
  size: "small" | "large";
  closeOnBackdropClick?: boolean;
  closeOnEscapeKeyDown?: boolean;
  mobilePosition?: "center" | "top";
  fitMobileViewport?: boolean;
  borderColor?: string;
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
  headerActions,
  primaryButton,
  secondaryButton,
  size,
  closeOnBackdropClick = true,
  closeOnEscapeKeyDown = true,
  mobilePosition = "center",
  fitMobileViewport = false,
  borderColor,
}: ActionModalProps) {
  const hasButtons = primaryButton || secondaryButton;

  // Close (X) button visibility. It shows at all breakpoints when the backdrop
  // can't dismiss the modal or when header actions are present; otherwise it's a
  // mobile-only affordance for the fit-viewport variant. Preserves prior behaviour
  // for callers that don't pass `headerActions`.
  const showCloseAllBreakpoints = !closeOnBackdropClick || !!headerActions;
  const showCloseMobileOnly = !showCloseAllBreakpoints && fitMobileViewport && closeOnBackdropClick;
  const showCloseButton = showCloseAllBreakpoints || showCloseMobileOnly;
  const showHeaderCluster = showCloseButton || !!headerActions;

  // Track the visual viewport height (accounts for soft keyboard on mobile).
  // dvh alone is unreliable in iOS Safari standalone/PWA mode.
  const [mobileHeight, setMobileHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!fitMobileViewport) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      setMobileHeight(window.innerWidth < 640 ? vv.height : undefined);
    };
    update();
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, [fitMobileViewport]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-[9000] flex justify-center bg-[rgba(34,34,38,0.30)] backdrop-blur-[13px] animate-[overlay-in_0.3s_ease-in-out]",
            mobilePosition === "top"
              ? fitMobileViewport
                ? "items-start sm:items-center sm:pt-0"
                : "items-start pt-2 sm:items-center sm:pt-0"
              : "items-center"
          )}
        >
          <Dialog.Content
            {...(!closeOnEscapeKeyDown && {
              onEscapeKeyDown: (e: KeyboardEvent) => e.preventDefault(),
            })}
            {...(!closeOnBackdropClick && { onInteractOutside: (e: Event) => e.preventDefault() })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && primaryButton && !primaryButton.loading) {
                e.preventDefault();
                primaryButton.onClick();
              }
            }}
            className={cn(
              "relative flex flex-col bg-(--card) p-8",
              fitMobileViewport ? "rounded-none sm:rounded-[22px]" : "rounded-[22px]",
              "shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] outline-none",
              fitMobileViewport
                ? "w-full max-w-none sm:max-w-[calc(100vw-2rem)]"
                : "w-full max-w-[calc(100vw-2rem)]",
              fitMobileViewport && "overflow-hidden sm:h-auto",
              borderColor && "border-2",
              SIZE_CLASSES[size],
              "animate-[modal-in_0.3s_ease-in-out]"
            )}
            style={{
              ...(mobileHeight !== undefined ? { height: `${mobileHeight}px` } : {}),
              ...(borderColor ? { borderColor } : {}),
            }}
          >
            {showHeaderCluster && (
              <div
                className={cn(
                  "absolute top-4 right-4 z-10 flex items-center gap-1",
                  showCloseMobileOnly && "sm:hidden"
                )}
              >
                {headerActions}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-(--grey-500) hover:text-(--grey-900)"
                    type="button"
                  >
                    <XIcon size={16} weight="bold" />
                  </button>
                )}
              </div>
            )}

            <div className={cn("flex flex-col gap-4", fitMobileViewport && "flex-1 min-h-0")}>
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
                    className="flex-1"
                    disabled={primaryButton.loading || primaryButton.disabled}
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
