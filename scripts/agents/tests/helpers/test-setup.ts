/**
 * Test setup file - runs before all tests
 * Loads environment variables and configures test environment
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables from .env.local files
config({ path: resolve(__dirname, '../../.env.local') });
config({ path: resolve(__dirname, '../../../../.env.local') });
config({ path: resolve(__dirname, '../../.env') });

// Validate required environment variables for live API tests
const requiredEnvVars = ['GOOGLE_API_KEY', 'GITHUB_TOKEN'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(
      `Warning: ${envVar} is not set. Some tests may fail without this environment variable.`
    );
  }
}

// Set default test timeout (60 seconds for live API calls)
if (typeof vi !== 'undefined') {
  vi.setConfig({ testTimeout: 60000 });
}

// Export test configuration
export const testConfig = {
  hasGoogleApiKey: !!process.env.GOOGLE_API_KEY,
  hasGithubToken: !!process.env.GITHUB_TOKEN,
  testRepoOwner: process.env.TEST_REPO_OWNER || process.env.REPO_OWNER || 'test-owner',
  testRepoName: process.env.TEST_REPO_NAME || process.env.REPO_NAME || 'test-repo',
};

/**
 * Skip test if required environment variable is missing
 */
export function skipIfMissingEnv(envVar: string): void {
  if (!process.env[envVar]) {
    console.log(`Skipping test: ${envVar} not set`);
  }
}

/**
 * Check if all required environment variables are available for live tests
 */
export function canRunLiveTests(): boolean {
  return testConfig.hasGoogleApiKey && testConfig.hasGithubToken;
}
