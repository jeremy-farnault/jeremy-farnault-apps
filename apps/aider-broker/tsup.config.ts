import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  // CJS, not ESM: bundled CJS deps (ws, transitively via @jf/db) contain
  // require() calls that only work with a real `require` at runtime — an
  // ESM bundle has none, so those throw "Dynamic require is not supported".
  format: ["cjs"],
  target: "node22",
  platform: "node",
  bundle: true,
  // Deploys as a single file to the Pi with no node_modules alongside it
  // (see scripts/deploy.sh) — everything, including workspace/npm deps like
  // @jf/db, drizzle-orm, and their own deps, must be inlined.
  noExternal: [/.*/],
  clean: true,
  sourcemap: true,
  minify: false,
  outDir: "dist",
});
