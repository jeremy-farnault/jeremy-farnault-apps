/**
 * The last apps-repo commit the `/changelog` skill reviewed. The skill reads the commits after
 * it and moves it in the same commit as the entries it adds. `null`: never run, so the next
 * run reads the full history.
 */
export const reviewedThrough: string | null = null;
