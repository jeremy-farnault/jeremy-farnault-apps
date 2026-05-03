export function computeFolderEffectiveDates(
  allFolders: { id: string; parentFolderId: string | null; updatedAt: Date; createdAt: Date }[],
  allNotes: { parentFolderId: string | null; updatedAt: Date }[]
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const folder of allFolders) {
    const descendants = new Set(getDescendantIds(folder.id, allFolders));
    let maxTime = folder.createdAt.getTime();
    for (const note of allNotes) {
      if (note.parentFolderId && descendants.has(note.parentFolderId)) {
        maxTime = Math.max(maxTime, note.updatedAt.getTime());
      }
    }
    result[folder.id] = maxTime;
  }

  return result;
}

export function getDescendantIds(
  folderId: string,
  allFolders: { id: string; parentFolderId: string | null }[]
): string[] {
  const children = allFolders.filter((f) => f.parentFolderId === folderId);
  return [folderId, ...children.flatMap((c) => getDescendantIds(c.id, allFolders))];
}

export function getFolderPath(
  parentFolderId: string | null,
  allFolders: { id: string; name: string; parentFolderId: string | null }[]
): string {
  if (!parentFolderId) return "Home";

  const segments: string[] = [];
  let currentId: string | null = parentFolderId;

  while (currentId) {
    const folder = allFolders.find((f) => f.id === currentId);
    if (!folder) break;
    segments.unshift(folder.name);
    currentId = folder.parentFolderId;
  }

  return segments.length > 0 ? segments.join(" / ") : "Home";
}
