/**
 * Work outside the monorepo, shown as cards below the app grid.
 *
 * Descriptions are first-draft copy — edit freely.
 * The array order is the display order: put what you like best first.
 *
 * Covers are NOT listed here: the first image file (png/jpg/webp, sorted by
 * filename) in
 *   apps/indexer/public/portfolio/<id>/
 * becomes the card's 16:9 cover (~1600×900, e.g. 01-cover.webp). Until one
 * exists, the card shows a placeholder in its accent colour with its icon.
 */

import type { Icon } from "@phosphor-icons/react";
import { BookOpenIcon, EggIcon, MicrophoneIcon, SwordIcon } from "@phosphor-icons/react/dist/ssr";

export interface PortfolioLink {
  label: string;
  href: string;
}

export interface PortfolioEntry {
  id: string;
  name: string;
  description: string;
  stack: string[];
  /** CSS custom property name from @jf/ui, e.g. "--green-400". */
  accentColor: string;
  /** Shown on the placeholder while there's no cover. */
  icon: Icon;
  link?: PortfolioLink;
}

export interface PortfolioProject extends PortfolioEntry {
  /** Public path, resolved from the filesystem at request time. */
  cover?: string | undefined;
}

export const portfolio: PortfolioEntry[] = [
  {
    id: "unto-her-void",
    name: "Unto Her Void",
    description:
      "A grimdark turn-based tactics game in 1-bit pixel art. Muster a small army, then fight seeded battles on a grid against an enemy that plans its moves from the same rules you play by. In development.",
    stack: ["Phaser 3", "TypeScript", "Vite"],
    accentColor: "--red-600",
    icon: SwordIcon,
  },
  {
    // First draft from very little: rewrite once the rebuild settles.
    id: "furyodachi",
    name: "Furyodachi",
    description:
      "A Tamagotchi-style pet game for mobile. Look after a small creature that lives in your pocket. Currently being rebuilt.",
    stack: ["Godot 4.5"],
    accentColor: "--yellow-400",
    icon: EggIcon,
  },
  {
    // First draft: check the wording.
    id: "manga-pipeline",
    name: "Manga Pipeline",
    description:
      "Turns a series into e-reader-ready volumes. Nine steps from one terminal menu: split the chapters into volumes, find and pick a cover for each, then embed the metadata so the e-reader shows them properly.",
    stack: ["Python", "Playwright", "SerpAPI"],
    accentColor: "--purple-400",
    icon: BookOpenIcon,
  },
  {
    id: "briefing",
    name: "Morning Briefing",
    description:
      "A podcast written for me every morning: my day from my notes and calendar, the weather for the bike ride, and the news I care about, filtered by a profile that learns from my feedback. A Claude Code skill that runs on a schedule.",
    stack: ["Claude Code", "TypeScript", "RSS"],
    accentColor: "--blue-400",
    icon: MicrophoneIcon,
    link: {
      label: "View on GitHub",
      href: "https://github.com/jeremy-farnault/claude-skills/tree/main/briefing",
    },
  },
];
