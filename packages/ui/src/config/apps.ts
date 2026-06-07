import type { Icon } from "@phosphor-icons/react";
import {
  ChecksIcon,
  CoinsIcon,
  MapPinIcon,
  NotepadIcon,
  RankingIcon,
  StackIcon,
} from "@phosphor-icons/react";

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
  {
    id: "classer",
    name: "Classer",
    icon: RankingIcon,
    href: process.env.NEXT_PUBLIC_CLASSER_URL ?? "#",
    accentColor: "--green-400",
  },
  {
    id: "financer",
    name: "Financer",
    icon: CoinsIcon,
    href: process.env.NEXT_PUBLIC_FINANCER_URL ?? "#",
    accentColor: "--purple-400",
  },
  {
    id: "placer",
    name: "Placer",
    icon: MapPinIcon,
    href: process.env.NEXT_PUBLIC_PLACER_URL ?? "#",
    accentColor: "--blue-400",
  },
];
