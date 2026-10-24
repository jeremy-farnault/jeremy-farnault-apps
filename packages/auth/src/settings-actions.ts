"use server";

import { SUPPORTED_CURRENCIES, type SupportedCurrency, db, userSettings } from "@jf/db";
import { THEME_COOKIE, type Theme, isTheme } from "@jf/ui/theme";
import { cookies, headers } from "next/headers";
import { auth } from "./auth";
import { getUserSettings, isSupportedCurrency, themeCookieOptions } from "./settings";

/**
 * Saves the signed-in user's theme and rewrites the theme cookie in the same step. The value
 * arrives from the client, so it is checked before anything else: an invalid one touches
 * neither the row nor the cookie.
 */
export async function setTheme(theme: Theme): Promise<void> {
  if (!isTheme(theme)) throw new Error("Invalid theme");

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  await db
    .insert(userSettings)
    .values({ userId: session.user.id, theme })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { theme, updatedAt: new Date() },
    });

  (await cookies()).set(THEME_COOKIE, theme, themeCookieOptions());
}

/**
 * Brings the theme cookie in line with the saved row: rewrites it when it is missing or holds
 * another value (changed on another device, cleared, or set by hand), and returns the saved
 * theme so the open page can switch to it. Signed out, it does nothing and returns null.
 */
export async function syncThemeCookie(): Promise<Theme | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { theme } = await getUserSettings(session.user.id);
  const store = await cookies();
  if (store.get(THEME_COOKIE)?.value !== theme)
    store.set(THEME_COOKIE, theme, themeCookieOptions());
  return theme;
}

/**
 * The signed-in user's home currency, with the currencies they can pick from, for the user
 * menu. Signed out, it returns null.
 */
export async function getHomeCurrencySetting(): Promise<{
  currency: SupportedCurrency;
  options: readonly SupportedCurrency[];
} | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { homeCurrency } = await getUserSettings(session.user.id);
  return { currency: homeCurrency, options: SUPPORTED_CURRENCIES };
}

/**
 * Saves the signed-in user's home currency, used by every app that converts amounts. The
 * value arrives from the client, so it is checked before anything is written.
 */
export async function setHomeCurrency(currency: string): Promise<void> {
  if (!isSupportedCurrency(currency)) throw new Error("Invalid currency");

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  await db
    .insert(userSettings)
    .values({ userId: session.user.id, homeCurrency: currency })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { homeCurrency: currency, updatedAt: new Date() },
    });
}
