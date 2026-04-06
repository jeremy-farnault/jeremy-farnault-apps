import Link from "next/link";

type Crumb = { id: string; name: string };

type Props = {
  crumbs: Crumb[];
};

export function Breadcrumb({ crumbs }: Props) {
  return (
    <nav>
      <Link href="/">Root</Link>
      {crumbs.map((crumb) => (
        <span key={crumb.id}>
          {" > "}
          <Link href={`/${crumb.id}`}>{crumb.name}</Link>
        </span>
      ))}
    </nav>
  );
}
