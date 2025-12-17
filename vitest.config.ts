import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30000, // 30 second timeout for API calls
    hookTimeout: 30000,
    // Don't run tests in parallel to avoid rate limiting
    pool: "forks",
    singleFork: true,
  },
});
