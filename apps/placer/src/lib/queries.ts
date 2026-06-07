import { db, placerCategories, placerSpots } from "@jf/db";
import { eq } from "drizzle-orm";
import { getPublicImageUrl } from "./s3-url";

export type CategoryRow = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

export type SpotRow = {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  lat: number;
  lng: number;
  category: { id: string; name: string; color: string; icon: string } | null;
};

export async function getCategories(userId: string): Promise<CategoryRow[]> {
  const rows = await db
    .select({
      id: placerCategories.id,
      name: placerCategories.name,
      color: placerCategories.color,
      icon: placerCategories.icon,
      createdAt: placerCategories.createdAt,
    })
    .from(placerCategories)
    .where(eq(placerCategories.userId, userId));

  return rows
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(({ createdAt: _, ...r }) => r);
}

export async function getSpots(userId: string): Promise<SpotRow[]> {
  const rows = await db
    .select({
      id: placerSpots.id,
      name: placerSpots.name,
      description: placerSpots.description,
      photoKey: placerSpots.photoKey,
      lat: placerSpots.lat,
      lng: placerSpots.lng,
      createdAt: placerSpots.createdAt,
      categoryId: placerCategories.id,
      categoryName: placerCategories.name,
      categoryColor: placerCategories.color,
      categoryIcon: placerCategories.icon,
    })
    .from(placerSpots)
    .leftJoin(placerCategories, eq(placerSpots.categoryId, placerCategories.id))
    .where(eq(placerSpots.userId, userId));

  return rows
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(
      ({
        createdAt: _,
        photoKey,
        categoryId,
        categoryName,
        categoryColor,
        categoryIcon,
        ...r
      }) => ({
        ...r,
        photoUrl: photoKey ? getPublicImageUrl(photoKey) : null,
        category: categoryId
          ? { id: categoryId, name: categoryName!, color: categoryColor!, icon: categoryIcon! }
          : null,
      })
    );
}
