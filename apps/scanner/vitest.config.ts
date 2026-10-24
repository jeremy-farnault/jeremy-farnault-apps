import baseConfig from "@jf/testing/vitest";
import { defineConfig } from "vitest/config";

// Mirrors Doser's config: @jf/testing's setupFiles path only resolves when its config is
// loaded directly, so it is cleared here. Revisit once a component test needs jest-dom.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    passWithNoTests: true,
    setupFiles: [],
  },
});
