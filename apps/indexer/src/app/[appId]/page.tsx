import { AppShowcase } from "@/components/app-showcase";
import { getShowcaseApp } from "@/lib/showcase";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AppShowcasePage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = getShowcaseApp(appId);
  if (!app) notFound();

  return (
    <main className="flex w-full flex-1 flex-col items-center px-4 py-6">
      <div className="mb-4 w-full max-w-[860px]">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-(--grey-600) transition-colors hover:text-(--grey-900)"
        >
          <CaretLeftIcon size={16} weight="bold" />
          All apps
        </Link>
      </div>
      <div className="h-[600px] max-h-[80vh] w-full max-w-[860px] overflow-hidden rounded-[24px] bg-(--card) shadow-[0_25px_60px_0_rgba(0,0,0,0.15)]">
        <AppShowcase app={app} />
      </div>
    </main>
  );
}
