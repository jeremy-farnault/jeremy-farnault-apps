import { defineConfig } from "vitest/config";

// The live check (`pnpm live-check`): reads real store pages, so it is run by hand and never
// in CI, where a store being slow or changing its page would fail unrelated work.
export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: {
    environment: "node",
    include: ["src/**/*.live.ts"],
    testTimeout: 30_000,
  },
});
