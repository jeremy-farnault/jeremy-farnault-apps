import { getClasserDetail } from "@/lib/queries";
import { getPublicImageUrl } from "@/lib/s3-url";
import { auth } from "@jf/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ClasserDetailClient } from "./classer-detail-client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ClasserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";

  const result = await getClasserDetail(userId, id);
  if (!result) notFound();
  if (result.classer.archivedAt !== null) notFound();

  return (
    <ClasserDetailClient
      classer={{
        id: result.classer.id,
        name: result.classer.name,
        description: result.classer.description,
        imageUrl: result.classer.imageKey ? getPublicImageUrl(result.classer.imageKey) : null,
      }}
      items={result.items.map((item) => ({
        ...item,
        imageUrl: item.imageKey ? getPublicImageUrl(item.imageKey) : null,
      }))}
    />
  );
}
