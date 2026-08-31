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
    "AI assistant, running at home on a Raspberry Pi, so it's slow, but nothing ever leaves the house. Chat with a local model, or ask it questions about your data across the other apps.",
  classer:
    "Rank anything. Build ordered rankings for the things you care about (films, restaurants, games...) and revisit them as your taste changes.",
  doser:
    "Track medications and symptoms. Log your doses, note how you feel over time, and see the patterns between the two.",
  exposer:
    "A photo portfolio that you can share publicly. Publish chronological collections of your visual work as a showcase.",
  financer:
    "Track your finances. Follow assets, income and spending, with charts that show where it all goes and how it evolves over time.",
  gainer:
    "Log your workouts. Record sets and reps, cardio sessions or bodyweight exercises, and visualize how your strength evolves over time.",
  journaler:
    "Log the media you consume, describe and rank it. Movies, TV shows, books, games or manga: keep track of everything you've been through.",
  noter:
    "Organize your thoughts into folders, format them the way you need, pin the important ones and set reminders for key dates.",
  placer:
    "Save the places that matter. Pin spots on the map and keep lists of where you've been and where you want to go.",
  routiner:
    "Build routines that fit you: done or not, amount of time achieved, or time-based. Set up your daily checklist and keep your streaks strong.",
};
