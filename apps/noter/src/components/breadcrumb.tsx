import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

type Crumb = { id: string; name: string; href?: string };

type Props = {
  crumbs: Crumb[];
};

export function Breadcrumb({ crumbs }: Props) {
  return (
    <div className="mb-5 inline-flex rounded-[12px] border border-(--border) bg-(--surface-150) px-4 py-2">
      <nav className="flex items-center gap-1 text-sm text-(--text-muted)">
        <Link href="/" className="hover:text-(--text) transition-colors">
          Home
        </Link>
        {crumbs.map((crumb) => (
          <span key={crumb.id} className="flex items-center gap-1">
            <CaretRightIcon size={12} className="shrink-0" />
            <Link
              href={crumb.href ?? `/${crumb.id}`}
              className="hover:text-(--text) transition-colors"
            >
              {crumb.name}
            </Link>
          </span>
        ))}
      </nav>
    </div>
  );
}
