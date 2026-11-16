import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Runs a CLI the way `pnpm seed:demo` and `pnpm screenshots` do: Node through tsx, not Vitest's
 * bundler. A module that only loads under the bundler (like a named import from a package that
 * isn't an ES module) fails here, before the CLI reaches its environment checks.
 */
async function runCli(file: string, env: Record<string, string>) {
  try {
    await run("npx", ["tsx", path.join(here, file)], {
      env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ...env },
    });
    return { code: 0, stderr: "" };
  } catch (error) {
    const { code, stderr } = error as { code: number; stderr: string };
    return { code, stderr };
  }
}

describe("CLIs load under Node", () => {
  it("seed:demo gets as far as asking for the database", async () => {
    const { code, stderr } = await runCli("seed.ts", { DEMO_PASSWORD: "x" });
    expect(code).toBe(1);
    expect(stderr).toContain("DATABASE_URL is not set.");
  }, 30_000);

  it("screenshots gets as far as asking for the password", async () => {
    const { code, stderr } = await runCli("screenshots.ts", {});
    expect(code).toBe(1);
    expect(stderr).toContain("DEMO_PASSWORD is not set");
  }, 30_000);
});
