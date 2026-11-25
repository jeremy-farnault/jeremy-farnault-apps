import { AppGrid } from "@/components/app-grid";
import { PortfolioGrid } from "@/components/portfolio-grid";
import { getPortfolioProjects } from "@/lib/portfolio";
import { getShowcaseApps } from "@/lib/showcase";

export default function HomePage() {
  const apps = getShowcaseApps();
  const projects = getPortfolioProjects();

  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center px-4 py-12">
      <AppGrid apps={apps} />
      {/* A plain link, not <Link>: @modal/(.)[appId] would catch a client-side navigation. */}
      <a
        href="/changelog"
        className="mt-10 text-sm font-semibold text-(--text) underline underline-offset-4 hover:opacity-80"
      >
        See what's new across the apps
      </a>
      <hr className="my-14 w-full max-w-4xl border-(--border)" />
      <PortfolioGrid projects={projects} />
    </main>
  );
}
