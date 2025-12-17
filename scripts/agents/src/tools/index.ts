export { createFileTools } from './file-tools.js';
export { createGitTools } from './git-tools.js';
export { createNpmTools } from './npm-tools.js';
export { createGitHubTools } from './github-tools.js';
export { createTestTools } from './test-tools.js';

import { createFileTools } from './file-tools.js';
import { createGitTools } from './git-tools.js';
import { createNpmTools } from './npm-tools.js';
import { createGitHubTools } from './github-tools.js';
import { createTestTools } from './test-tools.js';
import { AgentContext } from '../agents/types.js';

/**
 * Create all tools for an agent context
 */
export function createAllTools(context: AgentContext) {
  return {
    ...createFileTools(context.workingDir),
    ...createGitTools(context.workingDir),
    ...createNpmTools(context.workingDir),
    ...createGitHubTools(context.repoOwner, context.repoName),
    ...createTestTools(context.workingDir),
  };
}
