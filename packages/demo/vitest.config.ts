import baseConfig from "@jf/testing/vitest";
import { defineConfig } from "vitest/config";

// Mirrors @jf/auth's config: @jf/testing's setupFiles path only resolves when its config is
// loaded directly, so it is cleared here. The fixtures are pure data, so no DOM is needed.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    environment: "node",
    setupFiles: [],
  },
});
