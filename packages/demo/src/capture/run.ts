import { mkdir, mkdtemp, readdir, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
  chromium,
} from "@playwright/test";

import { DEMO_USER, isDemoEmail } from "../identity";
import {
  MANIFESTS,
  type Shot,
  type ShotContext,
  type Theme,
  type Viewport,
  fileNames,
  makeShotContext,
  withDarkShot,
} from "./manifest";

/** Where Indexer reads each app's screenshots from. */
const SCREENSHOTS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../apps/indexer/public/screenshots"
);

const VIEWPORTS: Record<Viewport, BrowserContextOptions> = {
  desktop: { viewport: { width: 1280, height: 960 }, deviceScaleFactor: 2 },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};

// The demo user has no theme setting, so the apps follow the browser's colour scheme.
const COMMON: BrowserContextOptions = {
  reducedMotion: "reduce",
  locale: "en-GB",
};

export class CaptureError extends Error {}

function requireUrl(name: string): string {
  const value = process.env[name];
  if (!value) throw new CaptureError(`${name} is not set.`);
  return value.replace(/\/+$/, "");
}

export function appUrl(app: string): string {
  return requireUrl(`NEXT_PUBLIC_${app.toUpperCase()}_URL`);
}

/**
 * Signs in through the auth app's email-and-password endpoint, the same one its login form
 * calls, and checks the session belongs to the demo user. Returns the session (cookies) to
 * reuse in every context, and the demo user's id.
 */
async function signIn(browser: Browser, password: string) {
  const authUrl = requireUrl("NEXT_PUBLIC_AUTH_URL");
  const context = await browser.newContext();
  try {
    const response = await context.request.post(`${authUrl}/api/auth/sign-in/email`, {
      data: { email: DEMO_USER.email, password },
      headers: { Origin: authUrl },
    });
    if (!response.ok()) {
      throw new CaptureError(
        `Sign-in as ${DEMO_USER.email} failed (${response.status()}): ${await response.text()}. Run pnpm seed:demo first.`
      );
    }
    const session = await context.request.get(`${authUrl}/api/auth/get-session`);
    const body = (await session.json().catch(() => null)) as {
      user?: { id: string; email: string };
    } | null;
    if (!body?.user || !isDemoEmail(body.user.email)) {
      throw new CaptureError("Signed in, but the session isn't the demo user's.");
    }
    return { storageState: await context.storageState(), userId: body.user.id };
  } finally {
    await context.close();
  }
}

/** Waits until data has loaded: no network traffic, no skeletons, fonts ready. */
async function settle(page: Page, extraMs: number) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll(".animate-pulse")).every(
        (element) => (element as HTMLElement).offsetParent === null
      ),
    undefined,
    { timeout: 15_000 }
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(extraMs);
}

const ERROR_TEXTS = ["Application error", "This page could not be found", "Internal Server Error"];

async function captureShot(
  context: BrowserContext,
  baseUrl: string,
  shot: Shot,
  shotContext: ShotContext,
  file: string
) {
  const page = await context.newPage();
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  try {
    const target = `${baseUrl}${typeof shot.path === "string" ? shot.path : shot.path(shotContext)}`;
    const response = await page.goto(target, { waitUntil: "domcontentloaded" });
    const fail = (reason: string) => new CaptureError(`Shot "${shot.name}" (${target}): ${reason}`);

    if (!response?.ok()) throw fail(`the page answered ${response?.status() ?? "nothing"}`);
    if (new URL(page.url()).origin !== new URL(baseUrl).origin) {
      throw fail(`redirected to ${page.url()}, so the session wasn't accepted`);
    }
    await settle(page, shot.settleMs ?? 500);
    if (shot.before) {
      await shot.before(page);
      await settle(page, shot.settleMs ?? 500);
    }
    const bodyText = await page.locator("body").innerText();
    const errorText = ERROR_TEXTS.find((text) => bodyText.includes(text));
    if (errorText) throw fail(`the page shows "${errorText}"`);
    if (pageErrors.length > 0) throw fail(`the page threw: ${pageErrors[0]}`);

    await page.screenshot({ path: file, animations: "disabled", caret: "hide" });
  } finally {
    await page.close();
  }
}

/** Replaces the app's folder only once every shot succeeded, so a failure keeps the old ones. */
async function replaceFolder(app: string, staged: string) {
  const target = path.join(SCREENSHOTS_DIR, app);
  await mkdir(target, { recursive: true });
  for (const file of await readdir(target)) await rm(path.join(target, file), { recursive: true });
  for (const file of await readdir(staged))
    await rename(path.join(staged, file), path.join(target, file));
}

/** Captures each app's shots. Returns the apps that failed, after trying all of them. */
export async function captureApps(apps: readonly string[], password: string): Promise<string[]> {
  // CHROMIUM_PATH points at a Chrome binary when Playwright's own download isn't installed.
  const executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const failed: string[] = [];
  try {
    const { storageState, userId } = await signIn(browser, password);
    const shotContext = makeShotContext(userId);
    // One context per viewport and theme, opened on first use, all sharing the session.
    const contexts = new Map<string, BrowserContext>();
    const contextFor = async (viewport: Viewport, theme: Theme) => {
      const key = `${viewport}:${theme}`;
      let context = contexts.get(key);
      if (!context) {
        context = await browser.newContext({
          ...COMMON,
          ...VIEWPORTS[viewport],
          colorScheme: theme,
          storageState,
        });
        contexts.set(key, context);
      }
      return context;
    };

    for (const app of apps) {
      const shots = withDarkShot(MANIFESTS[app] ?? []);
      const names = fileNames(shots);
      const staged = await mkdtemp(path.join(tmpdir(), `screenshots-${app}-`));
      try {
        const baseUrl = appUrl(app);
        for (const [index, shot] of shots.entries()) {
          const name = names[index] ?? `${shot.name}.png`;
          await captureShot(
            await contextFor(shot.viewport, shot.theme ?? "light"),
            baseUrl,
            shot,
            shotContext,
            path.join(staged, name)
          );
        }
        await replaceFolder(app, staged);
        console.log(`  ✓ ${app}: ${names.join(", ")}`);
      } catch (error) {
        failed.push(app);
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  ✗ ${app}: ${message.replace(/\.$/, "")}. Its old screenshots are kept.`);
      } finally {
        await rm(staged, { recursive: true, force: true });
      }
    }
  } finally {
    await browser.close();
  }
  return failed;
}
