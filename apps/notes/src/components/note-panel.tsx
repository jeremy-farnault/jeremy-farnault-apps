"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionModal, TextInput, Textarea } from "@jf/ui";
import type { Folder, Note } from "@/lib/queries";
import { createNote, updateNote } from "@/lib/actions";
import { toast } from "sonner";
import { DEFAULT_COLOR } from "@/lib/note-utils";
import { ColorPicker } from "./color-picker";

type Props = {
  note: Note | null;
  parentFolderId: string | null;
  allFolders: Folder[];
  onClose: () => void;
};

export function NotePanel({ note, parentFolderId, onClose }: Props) {
  const router = useRouter();
  const [noteId, setNoteId] = useState<string | null>(note?.id ?? null);
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [color, setColor] = useState(note?.backgroundColor ?? DEFAULT_COLOR);
  const [isSaving, setIsSaving] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hasContent = title.trim() || body.trim();
    if (!hasContent && noteId === null) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        if (noteId === null) {
          const id = await createNote(parentFolderId, title || null, body || null, color);
          setNoteId(id);
          router.refresh();
          toast.success("Note created");
        } else {
          await updateNote(noteId, title || null, body || null, color);
          router.refresh();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save note");
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, body, color]);

  const content = (
    <div className="flex flex-col gap-4">
      <TextInput
        value={title}
        onChange={setTitle}
        placeholder="Title"
        className="text-base font-semibold"
      />
      <Textarea
        value={body}
        onChange={setBody}
        placeholder="Write something…"
        className="min-h-[200px]"
      />
      <ColorPicker value={color} onChange={setColor} />
      {isSaving && (
        <p className="text-xs text-(--grey-400)">Saving…</p>
      )}
    </div>
  );

  return (
    <ActionModal
      isOpen
      onClose={onClose}
      size="large"
      content={content}
    />
  );
}
