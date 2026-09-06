import { BoardClient } from "@/components/board-client";
import { getOrCreateBoard } from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

export default async function OrganiserPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";

  const { boardId, columns, cards, tags, cardTagIds } = await getOrCreateBoard(userId);

  return (
    <BoardClient
      boardId={boardId}
      columns={columns}
      cards={cards}
      tags={tags}
      cardTagIds={cardTagIds}
    />
  );
}
