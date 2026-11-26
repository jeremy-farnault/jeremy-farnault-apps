import type { Icon } from "@phosphor-icons/react";
import { GithubLogoIcon, LinkedinLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { GITHUB_URL, INDEXER_URL, LINKEDIN_URL } from "../config/links";
import { cn } from "../lib/utils";

/**
 * Where the footer sits, which decides the links it shows:
 * - `"app"`: in an app's shell. Only GitHub and LinkedIn: the account menu has the rest.
 * - `"changelog"`: on the logged-out changelog page, so no Changelog link.
 * - `"indexer"`: on Indexer, so no All apps link. Changelog is the combined one.
 */
export type AppFooterPlacement = "app" | "changelog" | "indexer";

const textLink = "text-(--text-muted) hover:text-(--text) transition-colors";

/**
 * The footer: one row at the bottom left, text links first, then GitHub and LinkedIn. In an app
 * the Changelog and All apps links live in the account menu instead, so the row is just the
 * icons. Its height is the floating-button zone (bottom-8 + h-14 + the same gap above), with the
 * row centred in it, so at the end of a page the row sits level with the floating buttons and
 * the buttons never cover the content.
 */
export function AppFooter({
  placement,
  className,
}: {
  placement: AppFooterPlacement;
  // Fits the footer to a frame, like the shell's fixed-height mode.
  className?: string;
}) {
  return (
    <footer className={cn("flex h-30 w-full items-center gap-6 px-4 text-sm", className)}>
      {placement !== "app" && (
        <nav aria-label="Footer" className="flex items-center gap-2">
          {placement === "indexer" && (
            // A plain link: Indexer's @modal/(.)[appId] route would catch a client-side one.
            <a href="/changelog" className={textLink}>
              Changelog
            </a>
          )}
          {placement === "changelog" && (
            <a href={INDEXER_URL} className={textLink}>
              All apps
            </a>
          )}
        </nav>
      )}
      <ProfileLinks className="flex items-center gap-4" />
    </footer>
  );
}

/** GitHub and LinkedIn on their own. */
function ProfileLinks({ className }: { className?: string }) {
  return (
    <div className={className}>
      <ProfileLink href={GITHUB_URL} label="GitHub" icon={GithubLogoIcon} />
      <ProfileLink href={LINKEDIN_URL} label="LinkedIn" icon={LinkedinLogoIcon} />
    </div>
  );
}
function ProfileLink({
  href,
  label,
  icon: IconComponent,
}: { href: string; label: string; icon: Icon }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="text-(--primary) hover:opacity-80 transition-opacity"
    >
      <IconComponent size={24} weight="fill" aria-hidden />
    </a>
  );
}
