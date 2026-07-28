import baseConfig from "@jf/testing/vitest";
import { defineConfig } from "vitest/config";

// Not using mergeConfig here: it concatenates array fields rather than replacing them, and
// @jf/testing's setupFiles path is relative to that package's own directory, which only resolves
// correctly when its config is loaded directly (as tracer's standalone config does), not when
// merged into a consumer's own vitest.config.ts. No Doser tests need the jest-dom matchers it
// provides yet — revisit this once a component test actually needs them.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    passWithNoTests: true,
    setupFiles: [],
  },
});
