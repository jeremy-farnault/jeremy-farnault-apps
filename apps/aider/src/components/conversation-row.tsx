"use client";

import { useSidebar } from "@/components/sidebar-provider";
import { deleteConversation, updateConversationTitle } from "@/lib/actions";
import type { ConversationListItem } from "@/lib/queries";
import { ActionModal, TextInput, cn } from "@jf/ui";
import { DotsThreeIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ConversationRow({ conversation }: { conversation: ConversationListItem }) {
  const { activeId, setActiveId, setMobileOpen, renameInList, removeFromList } = useSidebar();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isActive = conversation.id === activeId;

  function startRename() {
    setDraft(conversation.title);
    setEditing(true);
    setMenuOpen(false);
  }

  async function commitRename() {
    if (!editing) return; // guard against Enter + blur double-fire
    setEditing(false);
    const title = draft.trim();
    if (!title || title === conversation.title) return;
    await updateConversationTitle(conversation.id, title);
    renameInList(conversation.id, title);
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteConversation(conversation.id);
      removeFromList(conversation.id);
      if (isActive) {
        setActiveId(undefined);
        router.push("/");
      }
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="px-1 py-0.5">
        <TextInput
          value={draft}
          onChange={setDraft}
          autoFocus
          className="h-9"
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commitRename();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="group relative flex items-center">
      <Link
        href={`/chat/${conversation.id}`}
        onClick={() => setMobileOpen(false)}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "block flex-1 min-w-0 truncate rounded-[10px] px-3 py-2 pr-8 text-sm text-(--grey-900) hover:bg-(--surface-150) transition-colors",
          isActive && "bg-(--surface-150)"
        )}
      >
        {conversation.title || "Untitled"}
      </Link>

      <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label="Conversation options"
            className={cn(
              "absolute right-1 flex h-7 w-7 items-center justify-center rounded-[8px] text-(--grey-700) transition-opacity",
              "hover:bg-(--surface-200) opacity-100 md:opacity-0 md:group-hover:opacity-100",
              menuOpen && "opacity-100"
            )}
          >
            <DotsThreeIcon size={18} weight="bold" />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={4}
            className={cn(
              "z-50 flex flex-col rounded-[14px] bg-(--card) p-1",
              "shadow-[0_25px_36px_0_rgba(0,0,0,0.25)]",
              "animate-[overlay-in_0.2s_ease-in-out] outline-none"
            )}
          >
            <button
              type="button"
              onClick={startRename}
              className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-left text-sm text-(--grey-900) hover:bg-(--surface-150) transition-colors"
            >
              <PencilSimpleIcon size={16} />
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
              className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-left text-sm text-(--red-500) hover:bg-(--surface-150) transition-colors"
            >
              <TrashIcon size={16} />
              Delete
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <ActionModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        size="small"
        title="Delete conversation?"
        paragraph="This permanently deletes the conversation and all its messages. This can't be undone."
        secondaryButton={{ label: "Cancel", onClick: () => setConfirmOpen(false) }}
        primaryButton={{ label: "Delete", loading: busy, onClick: () => void handleDelete() }}
      />
    </div>
  );
}
