import type { PortfolioProject } from "@/config/portfolio";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";

function Cover({ project }: { project: PortfolioProject }) {
  if (project.cover) {
    return (
      <Image
        src={project.cover}
        alt={`${project.name} screenshot`}
        fill
        sizes="(min-width: 640px) 450px, 100vw"
        className="object-cover"
      />
    );
  }

  const accent = `var(${project.accentColor})`;
  const ProjectIcon = project.icon;
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 45%, transparent), color-mix(in srgb, ${accent} 10%, transparent))`,
        color: accent,
      }}
    >
      <ProjectIcon size={72} weight="duotone" aria-hidden />
    </div>
  );
}

function PortfolioCard({ project }: { project: PortfolioProject }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-[20px] border border-(--card-edge) bg-(--card) shadow-[0_10px_24px_0_rgba(0,0,0,0.08)]">
      <div className="relative aspect-video w-full overflow-hidden bg-(--surface-150)">
        <Cover project={project} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-lg font-semibold text-(--text)">{project.name}</h3>
        <p className="text-[15px] leading-relaxed text-(--text-secondary)">{project.description}</p>
        <ul className="mt-auto flex flex-wrap gap-2 pt-1">
          {project.stack.map((tech) => (
            <li
              key={tech}
              className="rounded-full bg-(--surface-150) px-2.5 py-1 text-xs font-medium text-(--text-muted)"
            >
              {tech}
            </li>
          ))}
        </ul>
        {project.link && (
          <a
            href={project.link.href}
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-1.5 text-sm font-medium text-(--text) underline-offset-4 hover:underline"
          >
            {project.link.label}
            <ArrowSquareOutIcon size={16} weight="bold" />
          </a>
        )}
      </div>
    </article>
  );
}

export function PortfolioGrid({ projects }: { projects: PortfolioProject[] }) {
  if (projects.length === 0) return null;

  return (
    <div className="grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
      {projects.map((project) => (
        <PortfolioCard key={project.id} project={project} />
      ))}
    </div>
  );
}
