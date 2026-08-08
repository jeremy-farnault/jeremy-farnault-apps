import { ShowcaseModal } from "@/components/showcase-modal";
import { getShowcaseApp } from "@/lib/showcase";
import { notFound } from "next/navigation";

export default async function InterceptedAppModal({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = getShowcaseApp(appId);
  if (!app) notFound();

  return <ShowcaseModal app={app} />;
}
