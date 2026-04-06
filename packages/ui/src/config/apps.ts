import type { Icon } from "@phosphor-icons/react";
import { Article, CheckSquare, NotePencil } from "@phosphor-icons/react";

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
    icon: NotePencil,
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
];
