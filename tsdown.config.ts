import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    deps: {
      neverBundle: true,
    },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
  },
]);
