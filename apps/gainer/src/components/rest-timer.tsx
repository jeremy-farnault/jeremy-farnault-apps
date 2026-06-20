"use client";

import { ActionModal, Button, TextInput } from "@jf/ui";
import { XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const PRESETS = [60, 90, 120, 180];
const DEFAULT_PRESET = 90;

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

export function RestTimer() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(DEFAULT_PRESET);
  const [customInput, setCustomInput] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedDuration = customInput ? Number.parseInt(customInput, 10) : selectedPreset;

  function startTimer(seconds: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemaining(seconds);
    // eslint-disable-next-line prefer-const
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(id);
          intervalRef.current = null;
          toast.info("Rest over!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    intervalRef.current = id;
  }

  function cancelTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRemaining(null);
  }

  function handleConfirm() {
    startTimer(selectedDuration);
    setPickerOpen(false);
    setCustomInput("");
  }

  function handleClose() {
    setPickerOpen(false);
    setCustomInput("");
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (remaining === 0) {
      const id = setTimeout(() => setRemaining(null), 3000);
      return () => clearTimeout(id);
    }
  }, [remaining]);

  return (
    <>
      <Button variant="outline" onClick={() => setPickerOpen(true)}>
        Rest
      </Button>

      <ActionModal
        isOpen={pickerOpen}
        onClose={handleClose}
        title="Rest timer"
        size="large"
        primaryButton={{
          label: "Start",
          onClick: handleConfirm,
          disabled: !selectedDuration || selectedDuration <= 0 || Number.isNaN(selectedDuration),
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: handleClose,
        }}
        closeOnBackdropClick
        closeOnEscapeKeyDown
        content={
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset);
                    setCustomInput("");
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    selectedPreset === preset && !customInput
                      ? "bg-(--primary) text-white"
                      : "bg-(--surface-150) text-(--grey-700) hover:bg-(--surface-200)"
                  }`}
                >
                  {formatTime(preset)}
                </button>
              ))}
            </div>
            <TextInput
              placeholder="Custom (s)"
              value={customInput}
              onChange={(value) => {
                setCustomInput(value);
                setSelectedPreset(0);
              }}
            />
          </div>
        }
      />

      {remaining !== null && (
        <div
          className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 h-14 px-6 rounded-xl bg-(--primary) text-white shadow-[0_25px_36px_0_rgba(0,0,0,0.25)]"
          style={{ animation: "cta-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
        >
          <span className="text-sm font-semibold tabular-nums">
            {remaining === 0 ? "Done!" : formatTime(remaining)}
          </span>
          {remaining > 0 && (
            <button
              type="button"
              onClick={cancelTimer}
              className="text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
