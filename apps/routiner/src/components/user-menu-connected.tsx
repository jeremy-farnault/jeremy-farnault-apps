"use client";

import { signOut, useSession } from "@jf/auth/client";
import { UserMenu } from "@jf/ui";

export function UserMenuConnected() {
  const { data: session } = useSession();

  if (!session?.user?.email) return null;

  async function handleLogout() {
    await signOut();
    const authUrl = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3003";
    window.location.href = `${authUrl}/login`;
  }

  return (
    <UserMenu
      email={session.user.email}
      name={session.user.name ?? undefined}
      onLogout={handleLogout}
    />
  );
}
