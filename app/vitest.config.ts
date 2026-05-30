import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["src/__tests__/setup.ts"],
    globals: true,
    coverage: { reporter: ["text", "html"], include: ["src/lib/**", "src/app/api/**"] },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
