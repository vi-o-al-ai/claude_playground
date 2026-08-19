import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Explicit test discovery: co-located __tests__ directories in every workspace root.
    include: ["{games,apps,packages,scripts}/**/__tests__/**/*.test.js"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    // Default environment is node; individual files opt into jsdom with a
    // `// @vitest-environment jsdom` docblock at the top of the file.
    environment: "node",
  },
});
