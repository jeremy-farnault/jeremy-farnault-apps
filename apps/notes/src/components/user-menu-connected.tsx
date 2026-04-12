"use client";

import { signOut, useSession } from "@jf/auth/client";
import { UserMenu } from "@jf/ui";
import { useRouter } from "next/navigation";

export function UserMenuConnected() {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session?.user?.email) return null;

  async function handleLogout() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return <UserMenu email={session.user.email} onLogout={handleLogout} />;
}
