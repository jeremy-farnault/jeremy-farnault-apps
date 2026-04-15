import { auth } from "@jf/auth";
import { headers } from "next/headers";

export default async function JournalerPage() {
  await auth.api.getSession({ headers: await headers() });

  return (
    <main className="flex flex-1 items-center justify-center">
      <p className="text-(--text-tertiary) text-sm">No entries yet.</p>
    </main>
  );
}
