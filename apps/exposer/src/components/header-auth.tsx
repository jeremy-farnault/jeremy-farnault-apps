"use client";

import { signOut, useSession } from "@jf/auth/client";
import { Button, UserMenu } from "@jf/ui";
import { GearSixIcon } from "@phosphor-icons/react";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3003";
const EXPOSER_URL = process.env.NEXT_PUBLIC_EXPOSER_URL ?? "http://localhost:3016";

export function HeaderAuth() {
  const { data: session, isPending } = useSession();

  // Avoid flashing "Sign in" before the session resolves.
  if (isPending) {
    return <div className="h-10 w-10" aria-hidden />;
  }

  if (session?.user?.email) {
    async function handleLogout() {
      await signOut();
      window.location.href = `${AUTH_URL}/login`;
    }

    return (
      <div className="flex items-center gap-1">
        <a
          href="/settings"
          aria-label="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-full text-(--grey-600) hover:bg-(--surface-200) hover:text-(--grey-900)"
        >
          <GearSixIcon size={20} />
        </a>
        <UserMenu
          email={session.user.email}
          name={session.user.name ?? undefined}
          {...(session.user.image ? { image: session.user.image } : {})}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  const loginHref = `${AUTH_URL}/login?redirect=${encodeURIComponent(EXPOSER_URL)}`;

  return (
    <Button asChild size="sm">
      <a href={loginHref}>Sign in</a>
    </Button>
  );
}
