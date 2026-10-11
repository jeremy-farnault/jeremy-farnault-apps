/**
 * How raw grey shades map onto the role tokens from `@jf/ui` globals. Shared by the codemod
 * (`scripts/dark-mode-codemod.ts`), which rewrites usages, and the lint check
 * (`scripts/check-raw-colors.ts`), which suggests the rewrite for any that come back.
 *
 * The role list and what each role is for: the comment block at the top of the token section
 * in `packages/ui/src/globals.css`.
 */

type Utility = "text" | "bg" | "border" | "fill" | "stroke";

/**
 * Raw grey shade → role, per utility. A shade with no entry for a utility is reported, not
 * guessed: the same grey means a different role depending on what it colours.
 */
const MAPPING: Record<Utility, Record<string, string>> = {
  text: {
    "900": "text",
    "850": "text",
    "800": "text",
    "700": "text-secondary",
    "600": "text-secondary",
    "500": "text-muted",
    "400": "text-subtle",
  },
  bg: {
    "150": "surface-sunken",
    // Hairline separators (`h-px`) and disabled fills: both are border-weight surfaces.
    "200": "border",
  },
  border: {
    "200": "border",
    "300": "border-strong",
  },
  // SVG and chart props: axis ticks and labels read as text, grid lines as borders.
  fill: {
    "900": "text",
    "500": "text-muted",
    "400": "text-subtle",
  },
  stroke: {
    "900": "text",
    "300": "border-strong",
    "200": "border",
  },
};

/** Tailwind prefixes and the table each one reads. Side variants share `border`. */
const UTILITY_OF: Record<string, Utility> = {
  text: "text",
  bg: "bg",
  border: "border",
  "border-t": "border",
  "border-r": "border",
  "border-b": "border",
  "border-l": "border",
  "border-x": "border",
  "border-y": "border",
  divide: "border",
  fill: "fill",
  stroke: "stroke",
};

/**
 * CSS properties (and their React style / SVG prop spellings) and the table each one reads.
 * Border shorthands count: `border: "1px solid var(--grey-300)"`.
 */
const PROPERTY_OF: Record<string, Utility> = {
  color: "text",
  background: "bg",
  "background-color": "bg",
  backgroundColor: "bg",
  fill: "fill",
  stroke: "stroke",
};
for (const side of ["", "-top", "-right", "-bottom", "-left"]) {
  const camel = side && side[1]?.toUpperCase() + side.slice(2);
  PROPERTY_OF[`border${side}`] = "border";
  PROPERTY_OF[`border${side}-color`] = "border";
  PROPERTY_OF[`border${camel}`] = "border";
  PROPERTY_OF[`border${camel}Color`] = "border";
}

/**
 * Marks a colour that must stay the same in both modes, on its line or on a comment line just
 * above, with a short reason:
 * `// dark-mode-fixed: dark text on a -200 highlight, which stays light in dark mode`.
 */
export const FIXED_MARKER = "dark-mode-fixed";

// A utility starts after whitespace, a quote, a backtick or a variant's `:`.
const UTILITY_RE =
  /(?<=^|[\s"'`:!])(text|bg|border(?:-[trblxy])?|divide|fill|stroke)-\(--grey-(\d+)\)/g;
// `prop: var(..)` in CSS, `prop: "var(..)"` in a style object, `prop="var(..)"` on an SVG
// element. The middle group keeps a shorthand's leading values (`1px solid `).
const DECLARATION_RE =
  /(?<![\w-])([a-zA-Z-]+)(\s*[:=]\s*["'`]?)([^"'`;{}()]*?)var\(--grey-(\d+)\)/g;

/** The comment line carrying the marker, if `lines[i]` is opted out. */
export function fixedMarkerLine(lines: string[], i: number): string | undefined {
  if (lines[i]?.includes(FIXED_MARKER)) return lines[i];
  const previous = lines[i - 1]?.trim() ?? "";
  const isComment = /^(\/\/|\/\*|\*|\{\/\*)/.test(previous);
  return isComment && previous.includes(FIXED_MARKER) ? previous : undefined;
}

/** Whether a line only defines tokens or comments: neither is a usage. */
export function isDefinitionOrComment(line: string): boolean {
  return /^\s*(--[\w-]+\s*:|\/\/|\/\*|\*)/.test(line);
}

/** `line` with every raw grey the mapping knows moved onto its role. */
export function convertLine(line: string): string {
  const withUtilities = line.replace(UTILITY_RE, (match, prefix: string, shade: string) => {
    const utility = UTILITY_OF[prefix];
    const role = utility && MAPPING[utility][shade];
    return role ? `${prefix}-(--${role})` : match;
  });
  // Custom property declarations define the roles themselves; leave them be.
  if (/^\s*--[\w-]+\s*:/.test(withUtilities)) return withUtilities;
  return withUtilities.replace(
    DECLARATION_RE,
    (match, property: string, separator: string, leading: string, shade: string) => {
      const utility = PROPERTY_OF[property];
      const role = utility && MAPPING[utility][shade];
      return role ? `${property}${separator}${leading}var(--${role})` : match;
    }
  );
}
