"use client";

import { Breadcrumb } from "@/components/breadcrumb";
import { ColorPicker } from "@/components/color-picker";
import { NoteActionsMenu } from "@/components/note-actions-menu";
import { RichTextEditor } from "@/components/rich-text-editor";
import { createNote, updateNote } from "@/lib/actions";
import { DEFAULT_COLOR } from "@/lib/note-utils";
import type { Folder, Note } from "@/lib/queries";
import { TextInput } from "@jf/ui";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Props = {
  note: Note;
  crumbs: { id: string; name: string; href?: string }[];
  allFolders: Folder[];
};

export function NotePageClient({ note, crumbs, allFolders }: Props) {
  const router = useRouter();
  const [noteId, setNoteId] = useState<string | null>(note?.id ?? null);
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [color, setColor] = useState(note?.backgroundColor ?? DEFAULT_COLOR);
  const [isSaving, setIsSaving] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteIdRef = useRef<string | null>(note?.id ?? null);
  const titleRef = useRef(title);
  const bodyRef = useRef(body);
  const colorRef = useRef(color);
  const hasSavedRef = useRef(note !== null);

  titleRef.current = title;
  bodyRef.current = body;
  colorRef.current = color;

  useEffect(() => {
    noteIdRef.current = noteId;
  }, [noteId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: router.refresh is stable; titleRef/bodyRef/noteIdRef are refs read at call time to avoid stale closures
  useEffect(() => {
    if (color === (note.backgroundColor ?? DEFAULT_COLOR)) return;
    const currentNoteId = noteIdRef.current;
    if (!currentNoteId) return;
    updateNote(currentNoteId, titleRef.current || null, bodyRef.current || null, color)
      .then(() => router.refresh())
      .catch(() => {});
  }, [color]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refs are read at call time; parentFolderId/router.refresh are intentionally excluded
  useEffect(() => {
    if (title === (note.title ?? "") && body === (note.body ?? "")) return;

    const hasContent = title.trim() || body.trim();
    if (!hasContent && noteIdRef.current === null) return;

    async function save() {
      setIsSaving(true);
      try {
        const currentNoteId = noteIdRef.current;
        if (currentNoteId === null) {
          const id = await createNote(
            note.parentFolderId,
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

  return (
    <div className="w-full px-4 pt-6 pb-6">
      <Breadcrumb crumbs={crumbs} />

      <div className="flex flex-col gap-4">
        <TextInput
          value={title}
          onChange={setTitle}
          placeholder="Title"
          className="text-base font-semibold"
        />
        <RichTextEditor
          initialContent={note.body}
          onChange={setBody}
          placeholder="Write something…"
          className="min-h-[calc(100dvh-328px)] sm:min-h-[50vh]"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ColorPicker value={color} onChange={setColor} />
          <div className="flex items-center gap-2">
            <NoteActionsMenu note={note} allFolders={allFolders} alwaysVisible />
            {isSaving && <CircleNotchIcon size={14} className="animate-spin text-(--grey-400)" />}
          </div>
        </div>
      </div>
    </div>
  );
}
