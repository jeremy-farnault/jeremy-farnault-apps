import type { ReactNode } from "react";
import { AppBackground } from "./app-background";
import { AppFooter, type AppFooterPlacement, ProfileLinks } from "./app-footer";
import { AppSwitcher } from "./app-switcher";
import { FuryoBadge } from "./furyo-badge";

interface AppShellProps {
  appIcon: ReactNode;
  appName: string;
  children: ReactNode;
  currentAppId?: string;
  startSlot?: ReactNode;
  rightSlot?: ReactNode;
  titleHref?: string;
  // Pin the shell to the viewport (h-dvh + overflow-hidden) so inner regions own
  // their own scroll instead of the whole document scrolling. Opt-in: most apps
  // want normal page scroll; chat-style apps (aider) want a fixed frame.
  fullHeight?: boolean;
  // URL of the app's background scene, usually "/background.svg" in its public folder.
  background?: string;
  // Where the footer sits, which decides its links. Indexer passes "indexer"; apps keep "app".
  footer?: AppFooterPlacement;
}

export function AppShell({
  children,
  currentAppId,
  appName,
  appIcon,
  startSlot,
  rightSlot,
  titleHref,
  fullHeight = false,
  background,
  footer = "app",
}: AppShellProps) {
  return (
    <div
      // A scrolling page needs no bottom padding: the footer's own height (the floating-button
      // zone) keeps its end clear of the floating buttons and the furyo badge. The fixed frame
      // keeps a band on phones, so its content stays clear of the badge.
      className={`relative flex flex-col items-center justify-start w-full max-w-[1024px] ${
        fullHeight ? "h-dvh overflow-hidden pb-16 md:pb-0" : "min-h-screen"
      }`}
    >
      {background && <AppBackground src={background} />}
      <header className="sticky top-0 z-[4000] flex h-14 items-center justify-between px-4 w-full pt-3">
        {titleHref ? (
          <a
            href={titleHref}
            className="flex items-center gap-2 text-l font-semibold text-(--primary-foreground) hover:opacity-80 transition-opacity vivid bg-(--primary) px-4 py-1 rounded-xl"
          >
            {appIcon}
            {appName}
          </a>
        ) : (
          <div className="flex items-center gap-2 text-l font-semibold text-(--primary-foreground) vivid bg-(--primary) px-4 py-1 rounded-xl">
            {appIcon}
            {appName}
          </div>
        )}
        <div className="flex items-center gap-2">
          {startSlot}
          <AppSwitcher {...(currentAppId !== undefined && { currentAppId })} />
          {rightSlot}
        </div>
      </header>

      {children}
      {fullHeight ? (
        // A footer at the end of the page would never show in the fixed frame, so the profile
        // links are pinned to its bottom-left corner, mirroring the furyo badge: side by side in
        // the phone band, stacked on wider screens to fit a narrow rail (Aider's collapsed
        // conversation list). The apps keep their content clear of that corner.
        <ProfileLinks className="absolute bottom-5 left-4 z-[4500] flex gap-4 md:bottom-4 md:left-3 md:flex-col" />
      ) : (
        <div className="mt-auto w-full shrink-0">
          <AppFooter placement={footer} />
        </div>
      )}
      <FuryoBadge />
    </div>
  );
}
