/**
 * Marketing content for the Indexer landing page.
 *
 * Descriptions are first-draft copy — edit freely.
 *
 * Screenshots are NOT listed here: drop image files (png/jpg/webp) into
 *   apps/indexer/public/screenshots/<appId>/
 * and they are picked up automatically, sorted by filename. Name them
 * with a numeric prefix to control order, e.g. 01-home.png, 02-detail.png.
 */

export interface ShowcaseApp {
  id: string;
  name: string;
  href: string;
  /** CSS custom property name from @jf/ui, e.g. "--green-400". */
  accentColor: string;
  description: string;
  /** Public paths, resolved from the filesystem at request time. */
  screenshots: string[];
}

/** Apps intentionally hidden from the landing grid. */
export const EXCLUDED_APP_IDS = new Set<string>(["tracer"]);

export const descriptions: Record<string, string> = {
  aider:
    "Your private AI assistant. Chat with a locally-hosted model, or ask about your own data across the other @jf apps.",
  classer:
    "Rank anything. Build tier lists and ordered rankings for the things you care about — films, restaurants, ideas — and revisit them as your taste changes.",
  doser:
    "Track medications and symptoms. Log your doses, note how you feel over time, and see the patterns between the two.",
  financer:
    "Keep an eye on your money. Follow balances, income and spending across accounts, with charts that show where it all goes.",
  gainer:
    "Plan and log your workouts. Build routines, record sets and reps, and watch your strength climb over time.",
  journaler:
    "A daily journal. Capture how your days go with quick entries, and look back to see how things have changed.",
  noter:
    "Notes that stay out of your way. Organise thoughts into folders, format them richly, and set reminders so nothing slips.",
  placer:
    "Save the places that matter. Pin spots on the map and keep lists of where you've been and where you want to go.",
  routiner:
    "Build routines that stick. Set up daily checklists and habits, and keep your streaks alive.",
};
