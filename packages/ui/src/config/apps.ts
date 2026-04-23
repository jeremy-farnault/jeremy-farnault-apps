import type { Icon } from "@phosphor-icons/react";
import { ChecksIcon, NotepadIcon, StackIcon } from "@phosphor-icons/react";

export interface AppDefinition {
  id: string;
  name: string;
  icon: Icon;
  href: string;
  accentColor?: string;
}

export const apps: AppDefinition[] = [
  {
    id: "noter",
    name: "Noter",
    icon: NotepadIcon,
    href: process.env.NEXT_PUBLIC_NOTER_URL ?? "#",
    accentColor: "--magenta-400",
  },
  {
    id: "journaler",
    name: "Journaler",
    icon: StackIcon,
    href: process.env.NEXT_PUBLIC_JOURNALER_URL ?? "#",
    accentColor: "--teal-400",
  },
  {
    id: "routiner",
    name: "Routiner",
    icon: ChecksIcon,
    href: process.env.NEXT_PUBLIC_ROUTINER_URL ?? "#",
    accentColor: "--yellow-400",
  },
];
