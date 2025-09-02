import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    coverage: {
      exclude: [
        "dist/**/*",
        "examples/**/*",
        "eslint.config.mjs",
        "tsup.config.ts",
        "vitest.config.ts",
      ],
    },
  },
});
