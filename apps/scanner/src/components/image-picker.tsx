"use client";

import { cn } from "@jf/ui";
import { ImageIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

type Choice = "found" | "upload" | "none";

type Props = {
  /** The image the shop's page shows, if Scanner found one. */
  foundUrl: string | null;
  choice: Choice;
  file: File | null;
  onChoice: (choice: Choice) => void;
  onFile: (file: File | null) => void;
};

/**
 * The image choice in the add preview: the shop's image, one of your own, or none. The
 * shop's image is shown straight from the shop here; it is copied into Scanner's storage
 * only once the item is added.
 */
export function ImagePicker({ foundUrl, choice, file, onChoice, onFile }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [foundBroken, setFoundBroken] = useState(false);

  useEffect(() => {
    if (!file) {
      setFileUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const found = foundUrl && !foundBroken ? foundUrl : null;
  const shown = choice === "upload" ? fileUrl : choice === "found" ? found : null;

  const option = (value: Choice, label: string, disabled = false) => (
    <label
      className={cn(
        "flex items-center gap-2 text-sm",
        disabled ? "opacity-50" : "cursor-pointer",
        choice === value ? "text-(--text)" : "text-(--text-secondary)"
      )}
    >
      <input
        type="radio"
        name="image"
        checked={choice === value}
        disabled={disabled}
        onChange={() => (value === "upload" && !file ? input.current?.click() : onChoice(value))}
      />
      {label}
    </label>
  );

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-(--surface-sunken) text-(--text-subtle)">
        {shown ? (
          <img
            src={shown}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => choice === "found" && setFoundBroken(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          <ImageIcon size={28} aria-hidden />
        )}
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="sr-only">Image</legend>
        {option("found", "Use the shop's image", !found)}
        <div className="flex items-center gap-2">
          {option("upload", file ? "My own image" : "Upload my own…")}
          {file && (
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="text-xs text-(--text-muted) underline"
            >
              change
            </button>
          )}
        </div>
        {option("none", "No image")}
      </fieldset>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
