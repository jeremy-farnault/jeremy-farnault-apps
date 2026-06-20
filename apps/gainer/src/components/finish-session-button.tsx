"use client";

import { finishSession } from "@/lib/actions";
import { ActionModal, Button } from "@jf/ui";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface FinishSessionButtonProps {
  sessionId: string;
}

export function FinishSessionButton({ sessionId }: FinishSessionButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await finishSession(sessionId);
        setModalOpen(false);
      } catch {
        toast.error("Failed to finish session");
      }
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setModalOpen(true)}>
        Finish session
      </Button>
      <ActionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Finish session?"
        paragraph="This will close the current session. You won't be able to add more sets after."
        size="small"
        primaryButton={{
          label: "Finish",
          loading: isPending,
          onClick: handleConfirm,
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: () => setModalOpen(false),
        }}
        closeOnBackdropClick={!isPending}
        closeOnEscapeKeyDown={!isPending}
      />
    </>
  );
}
