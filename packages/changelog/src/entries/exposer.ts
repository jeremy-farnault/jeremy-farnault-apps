import type { ChangelogEntry } from "../types";

export const exposerEntries: ChangelogEntry[] = [
  {
    id: "exposer-mobile-post",
    date: "2026-10-10",
    kind: "fixed",
    title: "Posts fit your phone",
    description: "On mobile, a post opens full screen and the draft switch no longer overflows.",
    apps: ["exposer"],
  },
  {
    id: "exposer-launch",
    date: "2026-08-30",
    kind: "new",
    title: "Exposer is live",
    description:
      "A photo portfolio you can share. Publish collections of your work on your own public page, at your own handle.",
    apps: ["exposer"],
  },
];
