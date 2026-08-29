import { ChatShell } from "@/components/chat-shell";
import { getConversationWithMessages } from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const data = await getConversationWithMessages(session.user.id, id);
  if (!data) redirect("/");

  return (
    <main className="w-full flex flex-col flex-1 px-4 pb-4">
      <ChatShell
        userName={session.user.name}
        initialConversationId={data.conversation.id}
        initialModel={data.conversation.model}
        initialMessages={data.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          ...(m.toolName
            ? {
                tool: {
                  name: m.toolName,
                  ...(m.toolArguments ? { arguments: m.toolArguments } : {}),
                },
              }
            : {}),
        }))}
      />
    </main>
  );
}
