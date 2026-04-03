export function getDescendantIds(
  folderId: string,
  allFolders: { id: string; parentFolderId: string | null }[],
): string[] {
  const children = allFolders.filter((f) => f.parentFolderId === folderId);
  return [folderId, ...children.flatMap((c) => getDescendantIds(c.id, allFolders))];
}
