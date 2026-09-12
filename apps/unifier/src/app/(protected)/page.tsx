import { auth } from "@jf/auth";
import { headers } from "next/headers";

export default async function UnifierPage() {
  // Resolve the session so the page is scoped to the signed-in user, matching the
  // pattern used across the fleet. Nothing is rendered per-user yet — this is a
  // placeholder shell until the arc/person/orbit surfaces land.
  await auth.api.getSession({ headers: await headers() });

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold text-(--foreground)">Unifier</h1>
      <p className="max-w-md text-(--muted-foreground)">
        Keep your relationships in hand. Arcs, people, and the orbit are on their way.
      </p>
    </main>
  );
}
