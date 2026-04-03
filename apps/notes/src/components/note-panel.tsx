"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";
import type { Folder, Note } from "@/lib/queries";
import { createNote, updateNote } from "@/lib/actions";
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
  const [isEditing, setIsEditing] = useState(note === null);
  const [isSaving, setIsSaving] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstSaveRef = useRef(note === null);

  // Auto-save with 1s debounce
  useEffect(() => {
    // Skip on initial render for existing notes
    if (!isEditing) return;
    // Don't save if nothing has been typed yet for new notes
    const hasContent = title.trim() || body.trim();
    if (!hasContent && noteId === null) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        if (noteId === null) {
          const id = await createNote(parentFolderId, title || null, body || null, color);
          setNoteId(id);
          isFirstSaveRef.current = false;
          router.refresh();
        } else {
          await updateNote(noteId, title || null, body || null, color);
        }
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, body, color, isEditing]);

  return (
    <div style={{ width: 400, borderLeft: "1px solid #e5e7eb", padding: 16, backgroundColor: color }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <button type="button" onClick={onClose}>
          Close
        </button>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{isSaving ? "Saving…" : ""}</span>
        <button type="button" onClick={() => setIsEditing((v) => !v)}>
          {isEditing ? "Done" : "Edit"}
        </button>
      </div>

      {isEditing ? (
        <>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ display: "block", width: "100%", marginBottom: 8, fontSize: 18, fontWeight: "bold" }}
          />
          <textarea
            placeholder="Write something…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            style={{ display: "block", width: "100%", marginBottom: 8, resize: "vertical" }}
          />
          <ColorPicker value={color} onChange={setColor} />
        </>
      ) : (
        <>
          {title && <h2 style={{ marginBottom: 8 }}>{title}</h2>}
          {body ? (
            <ReactMarkdown>{body}</ReactMarkdown>
          ) : (
            <p style={{ color: "#9ca3af" }}>Empty note</p>
          )}
        </>
      )}
    </div>
  );
}
