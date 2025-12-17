import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local from agents directory first, then fall back to root
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../../../.env.local') });
config({ path: resolve(__dirname, '../.env') });

export interface AgentConfig {
  // Google AI
  googleApiKey: string;

  // GitHub
  githubToken: string;
  repoOwner: string;
  repoName: string;

  // Test configuration
  testRepoOwner?: string;
  testRepoName?: string;

  // Optional overrides
  modelId?: string;
}

export function getConfig(): AgentConfig {
  const googleApiKey = process.env.GOOGLE_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!googleApiKey) {
    throw new Error('GOOGLE_API_KEY environment variable is required');
  }

  if (!githubToken) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  // Parse repo from GITHUB_REPOSITORY (owner/repo format) or use individual vars
  let repoOwner = process.env.REPO_OWNER || process.env.GITHUB_REPOSITORY_OWNER || '';
  let repoName = process.env.REPO_NAME || '';

  if (process.env.GITHUB_REPOSITORY && !repoOwner) {
    const [owner, name] = process.env.GITHUB_REPOSITORY.split('/');
    repoOwner = owner;
    repoName = name;
  }

  return {
    googleApiKey,
    githubToken,
    repoOwner,
    repoName,
    testRepoOwner: process.env.TEST_REPO_OWNER || repoOwner,
    testRepoName: process.env.TEST_REPO_NAME || repoName,
    modelId: process.env.GOOGLE_MODEL_ID,
  };
}

export function getTestConfig(): AgentConfig {
  const config = getConfig();
  return {
    ...config,
    repoOwner: config.testRepoOwner || config.repoOwner,
    repoName: config.testRepoName || config.repoName,
  };
}
