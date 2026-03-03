import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["../../tests/grammy/**/*.test.ts"],
    timeout: 10_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/main.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
