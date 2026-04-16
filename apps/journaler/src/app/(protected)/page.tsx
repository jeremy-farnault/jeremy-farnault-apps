import { auth } from "@jf/auth";
import { headers } from "next/headers";
import { EntryCard } from "@/components/entry-card";
import type { CardEntry } from "@/components/entry-card";

const MOCK_ENTRIES: CardEntry[] = [
  {
    id: "1",
    title: "Dune: Part Two",
    category: "Movie",
    date: "2024-03-01",
    comment: null,
    rating: 9,
    imageUrl: null,
  },
  {
    id: "2",
    title: "The Last of Us",
    category: "TV Show",
    date: "2024-02-15",
    comment: null,
    rating: 10,
    imageUrl: null,
  },
  {
    id: "3",
    title: "Elden Ring",
    category: "Game",
    date: "2024-01-10",
    comment: null,
    rating: 10,
    imageUrl: null,
  },
  {
    id: "4",
    title: "Shogun",
    category: "Book",
    date: "2024-03-20",
    comment: null,
    rating: 8,
    imageUrl: null,
  },
  {
    id: "5",
    title: "Berserk",
    category: "Manga",
    date: "2024-03-10",
    comment: null,
    rating: 10,
    imageUrl: null,
  },
  {
    id: "6",
    title: "Blade Runner 2049",
    category: "Movie",
    date: "2024-02-01",
    comment: null,
    rating: 9,
    imageUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&h=400&fit=crop",
  },
];

export default async function JournalerPage() {
  await auth.api.getSession({ headers: await headers() });

  return (
    <main className="p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl">
        {MOCK_ENTRIES.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onEdit={(e) => console.log("edit", e.id)}
            onDelete={(e) => console.log("delete", e.id)}
          />
        ))}
      </div>
    </main>
  );
}
