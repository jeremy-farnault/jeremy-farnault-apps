/**
 * Moves raw grey usages onto the role tokens from `@jf/ui` globals, so they follow the theme.
 *
 *   pnpm codemod:roles <dir> [--dry]
 *
 * Run it once per package (`packages/ui`, `apps/noter`…). It rewrites Tailwind utilities
 * (`text-(--grey-900)`, `hover:border-(--grey-200)`, `placeholder:text-(--grey-400)/50`…) and
 * plain CSS declarations (`color: var(--grey-900)`) through the mapping in
 * `lib/dark-mode-roles.ts`, then prints every raw colour it left alone so the rest can be fixed
 * by hand. Changed files are run through
 * `biome format`. Re-running it is a no-op: its output never matches its input.
 *
 * Not touched:
 * - Translucent `--surface-*` layers. They already flip to light ink in `.dark`, so they work
 *   in both modes as they are.
 * - Custom property declarations (`--text: var(--grey-900)`): that is where roles are defined.
 * - Any line carrying `dark-mode-fixed`, or following a comment line that does. Use it for a
 *   colour that must stay the same in both modes, with a short reason:
 *   `// dark-mode-fixed: dark text on a -200 highlight, which stays light in dark mode`.
 * - Test files.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  FIXED_MARKER,
  convertLine,
  fixedMarkerLine,
  isDefinitionOrComment,
} from "./lib/dark-mode-roles";

const EXTENSIONS = [".ts", ".tsx", ".css"];
const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo", "dist", "public"]);

// What is left after the rewrite and still needs a look.
const LEFTOVER_RE =
  /--grey-\d+|(?<=^|[\s"'`:!])(?:text|bg|border|ring|outline|fill|stroke|from|to|via)-(?:white|black)(?:\/\d+)?\b|#(?:000|fff|ccc)\b|["'](?:white|black)["']/gi;

type Leftover = { file: string; line: number; match: string; text: string };

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (EXTENSIONS.some((ext) => name.endsWith(ext)) && !/\.test\.tsx?$/.test(name))
      out.push(path);
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const dirs = args.filter((a) => !a.startsWith("--"));
  if (dirs.length === 0) {
    console.error("Usage: pnpm codemod:roles <dir> [--dry]");
    process.exit(1);
  }

  const changedFiles: string[] = [];
  let changedUsages = 0;
  const leftovers: Leftover[] = [];

  for (const file of dirs.flatMap((d) => walk(d))) {
    const lines = readFileSync(file, "utf8").split("\n");
    let changed = false;

    lines.forEach((line, i) => {
      if (fixedMarkerLine(lines, i) !== undefined) return;
      const next = convertLine(line);
      if (next !== line) {
        changedUsages +=
          (line.match(/--grey-\d+/g)?.length ?? 0) - (next.match(/--grey-\d+/g)?.length ?? 0);
        lines[i] = next;
        changed = true;
      }
      // Role definitions and comments are not usages.
      if (isDefinitionOrComment(next)) return;
      for (const match of next.matchAll(LEFTOVER_RE))
        leftovers.push({
          file: relative(process.cwd(), file),
          line: i + 1,
          match: match[0],
          text: next.trim(),
        });
    });

    if (changed) {
      changedFiles.push(file);
      if (!dry) writeFileSync(file, lines.join("\n"));
    }
  }

  // Roles are longer than the shades they replace, so a line can outgrow the formatter's width.
  if (!dry && changedFiles.length > 0)
    execFileSync("npx", ["biome", "format", "--write", ...changedFiles], { stdio: "ignore" });

  console.log(
    `${dry ? "Would convert" : "Converted"} ${changedUsages} usages in ${changedFiles.length} files.`
  );
  if (leftovers.length === 0) return;
  console.log(`\n${leftovers.length} raw colours left (fix by hand or mark ${FIXED_MARKER}):`);
  for (const l of leftovers)
    console.log(`  ${l.file}:${l.line}  ${l.match}\n      ${l.text.slice(0, 160)}`);
}

main();
