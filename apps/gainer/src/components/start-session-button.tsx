"use client";

import { startSession } from "@/lib/actions";
import { Button } from "@jf/ui";
import { useTransition } from "react";
import { toast } from "sonner";

export function StartSessionButton() {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await startSession();
      } catch {
        toast.error("Failed to start session");
      }
    });
  }

  return (
    <Button onClick={handleClick} disabled={isPending}>
      {isPending ? "Starting…" : "Start session"}
    </Button>
  );
}
