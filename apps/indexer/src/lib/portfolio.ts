import { readdirSync } from "node:fs";
import path from "node:path";
import { type PortfolioProject, portfolio } from "@/config/portfolio";

const IMAGE_RE = /\.(png|jpe?g|webp|avif)$/i;

function readCover(id: string): string | undefined {
  try {
    const dir = path.join(process.cwd(), "public", "portfolio", id);
    const file = readdirSync(dir)
      .filter((name) => IMAGE_RE.test(name))
      .sort()[0];
    return file ? `/portfolio/${id}/${file}` : undefined;
  } catch {
    // Directory doesn't exist yet — the card shows its placeholder.
    return undefined;
  }
}

/** Projects outside the monorepo, in config order, each with its cover if there is one. */
export function getPortfolioProjects(): PortfolioProject[] {
  return portfolio.map((entry) => ({ ...entry, cover: readCover(entry.id) }));
}
