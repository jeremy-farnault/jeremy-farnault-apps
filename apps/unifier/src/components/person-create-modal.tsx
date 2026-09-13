"use client";

import { ActionModal, Select, SelectItem, TextInput } from "@jf/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
  arcs: { id: string; name: string }[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: { arcId: string; name: string }) => Promise<void>;
};

/**
 * Adds a person from anywhere in the app — the primary CTA. A person always belongs to
 * exactly one arc, so the arc is picked here; with a single arc there is nothing to
 * choose and the picker is hidden.
 *
 * Enter is handled by ActionModal alone, so the submit can't fire twice.
 */
export function PersonCreateModal({ arcs, isOpen, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [arcId, setArcId] = useState<string>(arcs[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  // Reset between openings so a cancelled entry doesn't linger.
  useEffect(() => {
    if (isOpen) {
      setName("");
      setArcId(arcs[0]?.id ?? "");
    }
  }, [isOpen, arcs]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || !arcId || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ arcId, name: trimmed });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add a person"
      size="small"
      content={
        <div className="flex flex-col gap-3">
          <TextInput value={name} onChange={setName} placeholder="Name" autoFocus />
          {arcs.length > 1 && (
            <Select value={arcId} onValueChange={setArcId} placeholder="Choose an arc">
              {arcs.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </Select>
          )}
        </div>
      }
      primaryButton={{
        label: "Add",
        onClick: () => void submit(),
        loading: submitting,
        disabled: !name.trim() || !arcId,
      }}
      secondaryButton={{ label: "Cancel", onClick: onClose }}
    />
  );
}
