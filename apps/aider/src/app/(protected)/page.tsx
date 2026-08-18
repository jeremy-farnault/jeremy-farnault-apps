import { ChatShell } from "@/components/chat-shell";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

export default async function AiderPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main className="w-full flex flex-col flex-1 px-4 pb-4">
      <ChatShell userName={session?.user.name} />
    </main>
  );
}
