"use client";

import { ClasserFormModal } from "@/components/classer-form-modal";
import type { ClasserForEdit } from "@/components/classer-form-modal";
import { FloatingCTA } from "@jf/ui";
import { RankingIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ClasserPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClasser, setEditingClasser] = useState<ClasserForEdit | undefined>();

  function openCreate() {
    setEditingClasser(undefined);
    setModalOpen(true);
  }

  return (
    <main className="w-full px-4 pt-6 pb-24">
      <FloatingCTA icon={<RankingIcon size={24} />} onClick={openCreate} />
      <ClasserFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          router.refresh();
        }}
        classer={editingClasser}
      />
    </main>
  );
}
