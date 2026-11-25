import type { Icon } from "@phosphor-icons/react";
import { GithubLogoIcon, LinkedinLogoIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { GITHUB_URL, INDEXER_URL, LINKEDIN_URL } from "../config/links";
import { cn } from "../lib/utils";

/**
 * Where the footer sits, which decides the links it shows:
 * - `"app"`: in an app's shell. Changelog opens the app's changelog modal.
 * - `"changelog"`: on the logged-out changelog page, so no Changelog link.
 * - `"indexer"`: on Indexer, so no All apps link. Changelog is the combined one.
 */
export type AppFooterPlacement = "app" | "changelog" | "indexer";

const textLink = "text-(--text-muted) hover:text-(--text) transition-colors";

export function AppFooter({
  placement,
  className,
}: {
  placement: AppFooterPlacement;
  // Fits the footer to a frame, like the shell's fixed-height mode.
  className?: string;
}) {
  return (
    <footer
      className={cn("flex w-full items-center justify-between gap-4 px-4 py-6 text-sm", className)}
    >
      <nav aria-label="Footer" className="flex items-center gap-2">
        {placement === "app" && (
          // A client-side link, so the app's intercepting route opens the changelog modal.
          <Link href="/changelog" className={textLink}>
            Changelog
          </Link>
        )}
        {placement === "indexer" && (
          // A plain link: Indexer's @modal/(.)[appId] route would catch a client-side one.
          <a href="/changelog" className={textLink}>
            Changelog
          </a>
        )}
        {placement === "app" && (
          <span aria-hidden className="text-(--text-muted)">
            ·
          </span>
        )}
        {placement !== "indexer" && (
          <a href={INDEXER_URL} className={textLink}>
            All apps
          </a>
        )}
      </nav>
      <div className="flex items-center gap-3">
        <ProfileLink href={GITHUB_URL} label="GitHub" icon={GithubLogoIcon} />
        <ProfileLink href={LINKEDIN_URL} label="LinkedIn" icon={LinkedinLogoIcon} />
      </div>
    </footer>
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
      <IconComponent size={18} weight="fill" aria-hidden />
    </a>
  );
}
