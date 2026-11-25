import type { ChangelogEntry } from "../types";

export const noterEntries: ChangelogEntry[] = [
  {
    id: "noter-instant-pin-archive",
    date: "2026-11-05",
    kind: "improved",
    title: "Pin and archive instantly",
    description:
      "Pinning or archiving a note moves it straight away, without waiting for the server.",
    apps: ["noter"],
  },
  {
    id: "noter-dividers-dark",
    date: "2026-11-03",
    kind: "fixed",
    title: "Dividers show in dark mode",
    description: "Lines between sections no longer disappear on a dark background.",
    apps: ["noter"],
  },
  {
    id: "noter-reminders",
    date: "2026-05-21",
    kind: "new",
    title: "Reminders",
    description:
      "Add a date to a note to get a push notification when it's due. The bell shows what's coming up, and due notes stand out.",
    apps: ["noter"],
  },
  {
    id: "noter-mobile-editor",
    date: "2026-05-19",
    kind: "improved",
    title: "Full-screen notes on mobile",
    description: "On a phone, a note opens full screen and stays clear of the keyboard.",
    apps: ["noter"],
  },
  {
    id: "noter-folder-colours",
    date: "2026-05-05",
    kind: "new",
    title: "Colourful folders",
    description:
      "Give each folder a colour. Folders sort by your latest edit, and cards sit two to a row on mobile.",
    apps: ["noter"],
  },
  {
    id: "noter-rich-text",
    date: "2026-05-04",
    kind: "new",
    title: "Format your notes",
    description: "Bold, italic, headings and lists, plus checklists you can tick off as you go.",
    apps: ["noter"],
  },
  {
    id: "noter-redesign",
    date: "2026-04-23",
    kind: "improved",
    title: "A cleaner look",
    description: "A redesigned main page and archive, with a new header.",
    apps: ["noter"],
  },
  {
    id: "noter-launch",
    date: "2026-04-14",
    kind: "new",
    title: "Noter is live",
    description:
      "Notes in folders. Pin the ones that matter, archive the rest, and install it on your phone.",
    apps: ["noter"],
  },
];
