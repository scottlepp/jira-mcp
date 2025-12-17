import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    testTimeout: 60000, // 60s for live API calls
    hookTimeout: 60000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Avoid rate limiting with sequential execution
      },
    },
    setupFiles: ['./tests/helpers/test-setup.ts'],
  },
});
