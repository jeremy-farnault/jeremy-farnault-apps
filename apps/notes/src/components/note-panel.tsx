"use client";

import { createNote, updateNote } from "@/lib/actions";
import { DEFAULT_COLOR } from "@/lib/note-utils";
import type { Folder, Note } from "@/lib/queries";
import { ActionModal, TextInput, Textarea } from "@jf/ui";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
  // Ref mirrors state so async callbacks always read the latest value without stale closures
  const noteIdRef = useRef<string | null>(note?.id ?? null);
  const titleRef = useRef(title);
  const bodyRef = useRef(body);
  const colorRef = useRef(color);
  // Existing notes are already saved; new notes need an immediate first save
  const hasSavedRef = useRef(note !== null);

  // Keep refs in sync each render (safe: idempotent, not a side-effect)
  titleRef.current = title;
  bodyRef.current = body;
  colorRef.current = color;

  useEffect(() => {
    noteIdRef.current = noteId;
  }, [noteId]);

  // Color change: save immediately (only once note exists)
  // biome-ignore lint/correctness/useExhaustiveDependencies: router.refresh is stable; titleRef/bodyRef/noteIdRef are refs read at call time to avoid stale closures
  useEffect(() => {
    const currentNoteId = noteIdRef.current;
    if (!currentNoteId) return;
    updateNote(currentNoteId, titleRef.current || null, bodyRef.current || null, color)
      .then(() => router.refresh())
      .catch(() => {});
  }, [color]);

  // Content change: first change fires immediately, subsequent changes debounce at 500ms
  // biome-ignore lint/correctness/useExhaustiveDependencies: refs are read at call time; parentFolderId/router.refresh are intentionally excluded — parentFolderId is fixed for the panel's lifetime and must not re-trigger save logic
  useEffect(() => {
    const hasContent = title.trim() || body.trim();
    if (!hasContent && noteIdRef.current === null) return;

    async function save() {
      setIsSaving(true);
      try {
        const currentNoteId = noteIdRef.current;
        if (currentNoteId === null) {
          const id = await createNote(
            parentFolderId,
            titleRef.current || null,
            bodyRef.current || null,
            colorRef.current
          );
          setNoteId(id);
          noteIdRef.current = id;
          router.refresh();
          toast.success("Note created");
        } else {
          await updateNote(
            currentNoteId,
            titleRef.current || null,
            bodyRef.current || null,
            colorRef.current
          );
          router.refresh();
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save note");
      } finally {
        setIsSaving(false);
      }
    }

    if (!hasSavedRef.current) {
      // First change on a new note: fire immediately (Promise survives unmount)
      hasSavedRef.current = true;
      save();
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(save, 300);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, body]);

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
        <CircleNotchIcon
          size={14}
          className="absolute bottom-6 right-6 animate-spin text-(--grey-400)"
        />
      )}
    </div>
  );

  return <ActionModal isOpen onClose={onClose} size="large" content={content} />;
}
