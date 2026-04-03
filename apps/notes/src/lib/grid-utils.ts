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
  const folderItems: GridItem[] = folderList.map((f) => ({ kind: "folder", data: f }));
  const noteItems: GridItem[] = noteList.map((n) => ({ kind: "note", data: n }));

  const label = (item: GridItem) =>
    item.kind === "folder"
      ? item.data.name
      : (item.data.title ?? "Untitled");

  const updatedAt = (item: GridItem) => item.data.updatedAt.getTime();

  switch (sort) {
    case "alpha-asc":
      return [...folderItems, ...noteItems].sort((a, b) =>
        label(a).localeCompare(label(b)),
      );
    case "alpha-desc":
      return [...folderItems, ...noteItems].sort((a, b) =>
        label(b).localeCompare(label(a)),
      );
    case "type":
      return [
        ...folderItems.sort((a, b) => label(a).localeCompare(label(b))),
        ...noteItems.sort((a, b) => label(a).localeCompare(label(b))),
      ];
    case "modified-desc":
    default:
      return [...folderItems, ...noteItems].sort(
        (a, b) => updatedAt(b) - updatedAt(a),
      );
  }
}
