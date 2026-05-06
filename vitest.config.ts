import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/unit/**/*.test.ts", "src/**/*.test.ts"],
    setupFiles: ["tests/setup/vitest.ts"],
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts", "src/modules/**/*.ts"],
      exclude: ["src/modules/**/components/**", "src/**/*.d.ts"],
    },
  },
});
