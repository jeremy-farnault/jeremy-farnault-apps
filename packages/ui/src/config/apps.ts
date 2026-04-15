import type { Icon } from "@phosphor-icons/react";
import { Article, CheckSquare, NotepadIcon, StackIcon } from "@phosphor-icons/react";

export interface AppDefinition {
  id: string;
  name: string;
  icon: Icon;
  href: string;
}

export const apps: AppDefinition[] = [
  {
    id: "notes",
    name: "Notes",
    icon: NotepadIcon,
    href: process.env.NEXT_PUBLIC_NOTES_URL ?? "#",
  },
  {
    id: "blog",
    name: "Blog",
    icon: Article,
    href: "#",
  },
  {
    id: "ticked",
    name: "Ticked",
    icon: CheckSquare,
    href: "#",
  },
  {
    id: "journaler",
    name: "Journaler",
    icon: StackIcon,
    href: process.env.NEXT_PUBLIC_JOURNALER_URL ?? "#",
  },
];
