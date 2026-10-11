/**
 * Fails when app or package code uses a raw grey shade (`text-(--grey-700)`,
 * `color: "var(--grey-900)"`…). Greys stay the same in dark mode, so a raw grey is a colour
 * that won't follow the theme. Use a role token instead.
 *
 *   pnpm lint:colors [file or dir…]
 *
 * With no arguments it checks every `apps/<app>/src` and `packages/<pkg>/src`. Given paths (as
 * lint-staged passes them), it checks the `.ts` / `.tsx` files among them that live there.
 *
 * Allowed:
 * - Role tokens, hue shades (`--green-400`) and the translucent `--surface-*` layers, which
 *   already flip in dark mode.
 * - Comments, and custom property declarations, where tokens are defined.
 * - A colour that must stay the same in both modes, marked on its line or on a comment line
 *   just above with a reason: `// dark-mode-fixed: a dark chip over the photo, in both modes.`
 * - Test files.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  FIXED_MARKER,
  convertLine,
  fixedMarkerLine,
  isDefinitionOrComment,
} from "./lib/dark-mode-roles";

const ROOT = resolve(__dirname, "..");
const ROLES_DOC = "packages/ui/src/globals.css (the comment block at the top of the token section)";
const ROLES =
  "--text, --text-secondary, --text-muted, --text-subtle, --text-inverse, --text-on-strong-hue, " +
  "--surface, --surface-raised, --surface-sunken, --border, --border-strong";

const SKIP_DIRS = new Set(["node_modules", ".next", ".turbo", "dist", "public"]);
const RAW_GREY_RE = /--grey-\d+/g;
const MARKER_WITH_REASON = new RegExp(`${FIXED_MARKER}:\\s*\\S`);

type Problem = { file: string; line: number; text: string; message: string };

function inScope(path: string): boolean {
  const rel = relative(ROOT, path);
  return (
    /^(apps|packages)\/[^/]+\/src\//.test(rel) &&
    /\.tsx?$/.test(rel) &&
    !/\.test\.tsx?$/.test(rel) &&
    !rel.split("/").some((part) => SKIP_DIRS.has(part))
  );
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function defaultRoots(): string[] {
  return ["apps", "packages"].flatMap((group) =>
    readdirSync(join(ROOT, group))
      .map((name) => join(ROOT, group, name, "src"))
      .filter((src) => {
        try {
          return statSync(src).isDirectory();
        } catch {
          return false;
        }
      })
  );
}

function check(file: string): Problem[] {
  const lines = readFileSync(file, "utf8").split("\n");
  const problems: Problem[] = [];
  lines.forEach((line, i) => {
    if (!RAW_GREY_RE.test(line)) return;
    RAW_GREY_RE.lastIndex = 0;
    if (isDefinitionOrComment(line)) return;
    const at = { file: relative(ROOT, file), line: i + 1, text: line.trim() };

    const marker = fixedMarkerLine(lines, i);
    if (marker !== undefined) {
      if (!MARKER_WITH_REASON.test(marker))
        problems.push({ ...at, message: `"${FIXED_MARKER}" needs a reason after a colon.` });
      return;
    }

    const suggestion = convertLine(line).trim();
    problems.push({
      ...at,
      message:
        suggestion !== at.text
          ? `Raw grey. Use the role instead:\n      ${suggestion}`
          : `Raw grey with no direct role. Pick one of ${ROLES},\n      or mark it "// ${FIXED_MARKER}: <reason>" if it must stay the same in both modes.`,
    });
  });
  return problems;
}

function main() {
  const args = process.argv.slice(2);
  const files =
    args.length > 0
      ? args.flatMap((arg) => {
          const path = resolve(arg);
          return statSync(path).isDirectory() ? walk(path) : [path];
        })
      : defaultRoots().flatMap((root) => walk(root));

  const problems = files.filter(inScope).flatMap(check);
  if (problems.length === 0) return;

  for (const p of problems)
    console.error(`${p.file}:${p.line}\n      ${p.text}\n    ${p.message}\n`);
  console.error(
    `${problems.length} raw grey usage${problems.length === 1 ? "" : "s"}: these don't follow dark mode.\nRoles and what each is for: ${ROLES_DOC}.\nFix a whole package at once with: pnpm codemod:roles <dir>`
  );
  process.exit(1);
}

main();
