import type { ChangelogEntry } from "../types";

/** Changes to shared code that every app got. */
export const sharedEntries: ChangelogEntry[] = [
  {
    id: "all-footer",
    date: "2026-11-25",
    kind: "new",
    title: "A footer on every page",
    description:
      "Every app now ends with links to its changelog, to all the other apps, and to Jérémy's GitHub and LinkedIn.",
    apps: "all",
  },
  {
    id: "all-changelog",
    date: "2026-11-25",
    kind: "new",
    title: "What's new, in every app",
    description:
      "Each app has a changelog of what's changed, and Indexer gathers them all in one place.",
    apps: "all",
  },
  {
    id: "all-furyo-badge",
    date: "2026-11-22",
    kind: "new",
    title: "Furyodachi in every app",
    description:
      "A small furyo sits in the corner. Tap him to check on him in Furyodachi without leaving what you're doing.",
    apps: [
      "aider",
      "classer",
      "doser",
      "exposer",
      "financer",
      "gainer",
      "indexer",
      "journaler",
      "noter",
      "organiser",
      "placer",
      "routiner",
      "scanner",
      "unifier",
    ],
  },
  {
    id: "all-dark-mode-reliable",
    date: "2026-11-05",
    kind: "fixed",
    title: "Dark mode stays put",
    description: "Your theme no longer flips back to light after a page loads.",
    apps: "all",
  },
  {
    id: "all-new-look",
    date: "2026-10-25",
    kind: "improved",
    title: "A fresh look",
    description: "A new typeface, and each app gets its own line-art scene behind the page.",
    apps: [
      "aider",
      "classer",
      "doser",
      "exposer",
      "financer",
      "gainer",
      "indexer",
      "journaler",
      "noter",
      "organiser",
      "routiner",
      "scanner",
      "unifier",
    ],
  },
  {
    id: "all-dark-mode",
    date: "2026-10-14",
    kind: "new",
    title: "Dark mode",
    description:
      "Every app now comes in light and dark. Pick one from the user menu, or let it follow your system.",
    apps: "all",
  },
  {
    id: "all-rich-text-editor",
    date: "2026-10-03",
    kind: "improved",
    title: "More ways to format",
    description:
      "Strikethrough, links, quotes, code and dividers from the toolbar, or by typing / in the editor. They now show in previews too.",
    apps: ["noter", "organiser", "exposer"],
  },
  {
    id: "all-google-sign-in",
    date: "2026-04-26",
    kind: "new",
    title: "Sign in with Google",
    description: "Use your Google account to sign in to every app, no new password needed.",
    apps: "all",
  },
];
