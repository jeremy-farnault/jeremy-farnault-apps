import { AppGrid } from "@/components/app-grid";
import { getShowcaseApps } from "@/lib/showcase";

export default function HomePage() {
  const apps = getShowcaseApps();

  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center px-4 py-12">
      <AppGrid apps={apps} />
    </main>
  );
}
