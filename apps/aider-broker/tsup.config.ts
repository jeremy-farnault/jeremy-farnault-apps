import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  bundle: true,
  clean: true,
  sourcemap: true,
  minify: false,
  outDir: "dist",
});
