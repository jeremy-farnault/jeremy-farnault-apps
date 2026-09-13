import { getPersonDetail } from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PersonDetailClient } from "./person-detail-client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";

  const detail = await getPersonDetail(userId, id);
  if (!detail) notFound();

  return (
    <PersonDetailClient
      person={detail.person}
      arc={detail.arc}
      slots={detail.slots}
      values={detail.values}
      touches={detail.touches}
    />
  );
}
