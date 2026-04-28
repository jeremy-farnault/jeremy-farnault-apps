"use client";

import { deleteClasserAction, restoreClasserAction } from "@/lib/actions";
import { ActionModal, Grid } from "@jf/ui";
import { ArchiveIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { ArchivedClasserCard } from "./archived-classer-card";
import { Breadcrumb } from "./breadcrumb";
import type { ClasserCardData } from "./classer-card";

type Props = {
  classers: ClasserCardData[];
};

export function ArchivedClassersGrid({ classers: initialClassers }: Props) {
  const [localClassers, setLocalClassers] = useState<ClasserCardData[]>(initialClassers);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function remove(id: string) {
    setLocalClassers((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleRestore(id: string) {
    remove(id);
    await restoreClasserAction(id);
  }

  async function handleDeleteConfirm() {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    const id = deleteTargetId;
    remove(id);
    try {
      await deleteClasserAction(id);
    } finally {
      setDeleteTargetId(null);
      setIsDeleting(false);
    }
  }

  return (
    <div className="w-full px-4 pt-6 pb-24">
      <Breadcrumb crumbs={[{ label: "Archived" }]} />

      {localClassers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-(--grey-500)">
          <ArchiveIcon size={40} weight="thin" />
          <p className="text-sm">No archived classers.</p>
        </div>
      ) : (
        <Grid>
          {localClassers.map((c) => (
            <ArchivedClasserCard
              key={c.id}
              classer={c}
              onRestore={handleRestore}
              onDelete={setDeleteTargetId}
            />
          ))}
        </Grid>
      )}

      <ActionModal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        size="small"
        title="Delete classer"
        paragraph="This will permanently delete the classer and all its items. This cannot be undone."
        primaryButton={{ label: "Delete", loading: isDeleting, onClick: handleDeleteConfirm }}
        secondaryButton={{ label: "Cancel", onClick: () => setDeleteTargetId(null) }}
      />
    </div>
  );
}
