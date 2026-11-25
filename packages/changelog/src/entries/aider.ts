import type { ChangelogEntry } from "../types";

export const aiderEntries: ChangelogEntry[] = [
  {
    id: "aider-cross-app-tools",
    date: "2026-08-29",
    kind: "new",
    title: "Ask about your other apps",
    description:
      "Aider can look things up in the other apps: your journal, your rankings, your workouts, your assets. Its answers come formatted, and it says which apps it checked.",
    apps: ["aider"],
  },
  {
    id: "aider-history",
    date: "2026-08-25",
    kind: "new",
    title: "Conversation history",
    description: "Your chats are saved in a sidebar, so you can pick one up where you left it.",
    apps: ["aider"],
  },
  {
    id: "aider-launch",
    date: "2026-08-23",
    kind: "new",
    title: "Aider is live",
    description:
      "An AI assistant running at home on a Raspberry Pi: slow, but nothing leaves the house. Pick a model and chat.",
    apps: ["aider"],
  },
];
