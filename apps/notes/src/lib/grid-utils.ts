import type { Folder, Note } from "./queries";

export type SortOption = "modified-desc" | "alpha-asc" | "alpha-desc" | "type";

export type GridItem =
  | { kind: "folder"; data: Folder }
  | { kind: "note"; data: Note };

export function sortItems(
  folderList: Folder[],
  noteList: Note[],
  sort: SortOption,
): GridItem[] {
  const pinnedNotes = noteList.filter((n) => n.pinned);
  const unpinnedNotes = noteList.filter((n) => !n.pinned);

  const pinnedItems: GridItem[] = pinnedNotes.map((n) => ({ kind: "note", data: n }));
  const folderItems: GridItem[] = folderList.map((f) => ({ kind: "folder", data: f }));
  const unpinnedItems: GridItem[] = unpinnedNotes.map((n) => ({ kind: "note", data: n }));

  const label = (item: GridItem) =>
    item.kind === "folder"
      ? item.data.name
      : (item.data.title ?? "Untitled");

  const updatedAt = (item: GridItem) => item.data.updatedAt.getTime();

  switch (sort) {
    case "alpha-asc":
      return [
        ...pinnedItems.sort((a, b) => label(a).localeCompare(label(b))),
        ...[...folderItems, ...unpinnedItems].sort((a, b) =>
          label(a).localeCompare(label(b)),
        ),
      ];
    case "alpha-desc":
      return [
        ...pinnedItems.sort((a, b) => label(b).localeCompare(label(a))),
        ...[...folderItems, ...unpinnedItems].sort((a, b) =>
          label(b).localeCompare(label(a)),
        ),
      ];
    case "type":
      return [
        ...pinnedItems.sort((a, b) => label(a).localeCompare(label(b))),
        ...folderItems.sort((a, b) => label(a).localeCompare(label(b))),
        ...unpinnedItems.sort((a, b) => label(a).localeCompare(label(b))),
      ];
    case "modified-desc":
    default:
      return [
        ...pinnedItems.sort((a, b) => updatedAt(b) - updatedAt(a)),
        ...[...folderItems, ...unpinnedItems].sort(
          (a, b) => updatedAt(b) - updatedAt(a),
        ),
      ];
  }
}

export function splitItems(
  folderList: Folder[],
  noteList: Note[],
  sort: SortOption,
): { pinnedItems: GridItem[]; normalItems: GridItem[] } {
  const pinnedNotes = noteList.filter((n) => n.pinned);
  const unpinnedNotes = noteList.filter((n) => !n.pinned);

  const pinnedItems: GridItem[] = pinnedNotes.map((n) => ({ kind: "note", data: n }));
  const folderItems: GridItem[] = folderList.map((f) => ({ kind: "folder", data: f }));
  const unpinnedItems: GridItem[] = unpinnedNotes.map((n) => ({ kind: "note", data: n }));

  const label = (item: GridItem) =>
    item.kind === "folder" ? item.data.name : (item.data.title ?? "Untitled");
  const updatedAt = (item: GridItem) => item.data.updatedAt.getTime();

  switch (sort) {
    case "alpha-asc":
      return {
        pinnedItems: pinnedItems.sort((a, b) => label(a).localeCompare(label(b))),
        normalItems: [...folderItems, ...unpinnedItems].sort((a, b) =>
          label(a).localeCompare(label(b)),
        ),
      };
    case "alpha-desc":
      return {
        pinnedItems: pinnedItems.sort((a, b) => label(b).localeCompare(label(a))),
        normalItems: [...folderItems, ...unpinnedItems].sort((a, b) =>
          label(b).localeCompare(label(a)),
        ),
      };
    case "type":
      return {
        pinnedItems: pinnedItems.sort((a, b) => label(a).localeCompare(label(b))),
        normalItems: [
          ...folderItems.sort((a, b) => label(a).localeCompare(label(b))),
          ...unpinnedItems.sort((a, b) => label(a).localeCompare(label(b))),
        ],
      };
    case "modified-desc":
    default:
      return {
        pinnedItems: pinnedItems.sort((a, b) => updatedAt(b) - updatedAt(a)),
        normalItems: [...folderItems, ...unpinnedItems].sort(
          (a, b) => updatedAt(b) - updatedAt(a),
        ),
      };
  }
}
