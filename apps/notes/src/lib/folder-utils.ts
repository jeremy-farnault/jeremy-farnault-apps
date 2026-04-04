export function getDescendantIds(
  folderId: string,
  allFolders: { id: string; parentFolderId: string | null }[],
): string[] {
  const children = allFolders.filter((f) => f.parentFolderId === folderId);
  return [folderId, ...children.flatMap((c) => getDescendantIds(c.id, allFolders))];
}

export function getFolderPath(
  parentFolderId: string | null,
  allFolders: { id: string; name: string; parentFolderId: string | null }[],
): string {
  if (!parentFolderId) return "Root";

  const segments: string[] = [];
  let currentId: string | null = parentFolderId;

  while (currentId) {
    const folder = allFolders.find((f) => f.id === currentId);
    if (!folder) break;
    segments.unshift(folder.name);
    currentId = folder.parentFolderId;
  }

  return segments.length > 0 ? segments.join(" / ") : "Root";
}
