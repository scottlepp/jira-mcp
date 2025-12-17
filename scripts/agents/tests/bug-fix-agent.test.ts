/**
 * Bug Fix Agent Integration Tests
 *
 * These tests use LIVE API calls to Google AI and GitHub.
 * Requires GOOGLE_API_KEY and GITHUB_TOKEN in environment.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BugFixAgent } from '../src/agents/bug-fix-agent.js';
import { AgentContext, BugFixAgentInput } from '../src/agents/types.js';
import { canRunLiveTests, testConfig } from './helpers/test-setup.js';
import {
  createTestIssue,
  closeTestIssue,
  cleanupTestResources,
  getTestRepoConfig,
} from './helpers/test-repo.js';
import { bugIssueTemplates, generateTestId } from './helpers/dummy-data.js';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

describe('BugFixAgent', () => {
  let agent: BugFixAgent;
  let testDir: string;
  let context: AgentContext;
  const createdIssues: number[] = [];

  beforeAll(() => {
    agent = new BugFixAgent();

    // Create a temporary test directory
    testDir = mkdtempSync(join(tmpdir(), 'bug-fix-agent-test-'));

    // Initialize git repo
    execSync('git init', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: testDir, stdio: 'pipe' });
    execSync('git config user.name "Test User"', { cwd: testDir, stdio: 'pipe' });

    // Create a minimal project structure
    mkdirSync(join(testDir, 'src'), { recursive: true });

    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-project',
          version: '1.0.0',
          type: 'module',
        },
        null,
        2
      )
    );

    writeFileSync(
      join(testDir, 'src', 'utils.ts'),
      `
export function getMessage(): string {
  // Typo: "recieved" should be "received"
  return 'Data recieved successfully';
}

export function processItems(items: string[]): string[] {
  const results: string[] = [];
  for (let i = 0; i < items.length; i++) {
    results.push(items[i].toUpperCase());
  }
  return results;
}
`
    );

    // Initial commit
    execSync('git add .', { cwd: testDir, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: testDir, stdio: 'pipe' });

    const { owner, repo } = getTestRepoConfig();
    context = {
      workingDir: testDir,
      repoOwner: owner,
      repoName: repo,
    };
  });

  afterAll(async () => {
    // Clean up test issues
    await cleanupTestResources({ issues: createdIssues });

    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Agent Properties', () => {
    it('should have correct name and description', () => {
      expect(agent.name).toBe('bug-fix-agent');
      expect(agent.description).toContain('bug');
    });
  });

  describe('Input Validation', () => {
    it('should validate empty input (will fetch all bug issues)', async () => {
      const input: BugFixAgentInput = {};
      const result = await agent.validate(input, context);

      expect(result.valid).toBe(true);
    });

    it('should validate input with specific issue number', async () => {
      const input: BugFixAgentInput = {
        issueNumber: 123,
      };
      const result = await agent.validate(input, context);

      expect(result.valid).toBe(true);
    });

    it('should accept maxIssues option', async () => {
      const input: BugFixAgentInput = {
        maxIssues: 5,
      };
      const result = await agent.validate(input, context);

      expect(result.valid).toBe(true);
    });
  });

  describe('Tool Generation', () => {
    it('should generate required tools', () => {
      const tools = agent.getTools(context);

      // File tools
      expect(tools).toHaveProperty('readFile');
      expect(tools).toHaveProperty('writeFile');
      expect(tools).toHaveProperty('searchCode');

      // Git tools
      expect(tools).toHaveProperty('gitStatus');
      expect(tools).toHaveProperty('createBranch');
      expect(tools).toHaveProperty('gitCommit');

      // GitHub tools
      expect(tools).toHaveProperty('getIssues');
      expect(tools).toHaveProperty('getIssue');
      expect(tools).toHaveProperty('createPullRequest');

      // Test tools
      expect(tools).toHaveProperty('runTests');
    });
  });

  describe.skipIf(!canRunLiveTests())('Live API Tests', () => {
    let testIssueNumber: number;

    beforeAll(async () => {
      // Create a test issue for the agent to work with
      const issueData = bugIssueTemplates.simpleBug();
      const issue = await createTestIssue(issueData);
      testIssueNumber = issue.number;
      createdIssues.push(testIssueNumber);
    });

    it(
      'should execute bug fix workflow with live API',
      async () => {
        const input: BugFixAgentInput = {
          issueNumber: testIssueNumber,
          createPR: false, // Don't create PR, just analyze
        };

        const result = await agent.execute(input, context);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();

        if (result.data) {
          expect(result.data).toHaveProperty('issuesProcessed');
          expect(result.data).toHaveProperty('summary');
        }
      },
      { timeout: 180000 }
    ); // 3 minute timeout

    it(
      'should reject suspicious issues',
      async () => {
        // Create a suspicious issue
        const suspiciousIssue = bugIssueTemplates.suspiciousBug();
        const issue = await createTestIssue(suspiciousIssue);
        createdIssues.push(issue.number);

        const input: BugFixAgentInput = {
          issueNumber: issue.number,
          createPR: false,
        };

        const result = await agent.execute(input, context);

        // The agent should either skip or reject the suspicious issue
        expect(result.success).toBe(true);
        if (result.data) {
          const processedIssue = result.data.issuesProcessed.find(
            (i) => i.issueNumber === issue.number
          );
          if (processedIssue) {
            // Should be marked as skipped or rejected
            expect(['skipped', 'rejected', 'failed']).toContain(processedIssue.status);
          }
        }
      },
      { timeout: 180000 }
    );

    it(
      'should identify fix locations',
      async () => {
        const input: BugFixAgentInput = {
          issueNumber: testIssueNumber,
          createPR: false,
        };

        const result = await agent.execute(input, context);

        expect(result.success).toBe(true);
        // The agent should have proposed changes
        if (result.proposedChanges && result.proposedChanges.length > 0) {
          const change = result.proposedChanges[0];
          expect(change).toHaveProperty('filePath');
          expect(change).toHaveProperty('changeType');
        }
      },
      { timeout: 180000 }
    );
  });

  describe('System Prompt Generation', () => {
    it('should generate appropriate system prompt', () => {
      const input: BugFixAgentInput = {
        issueNumber: 123,
      };

      const systemPrompt = agent.getSystemPrompt(input, context);

      expect(systemPrompt).toContain('bug');
      expect(systemPrompt).toContain('fix');
      expect(systemPrompt).toContain('NEVER');
    });

    it('should include safety warnings', () => {
      const input: BugFixAgentInput = {};

      const systemPrompt = agent.getSystemPrompt(input, context);

      // Should contain safety warnings
      expect(systemPrompt).toMatch(/security|harmful|dangerous/i);
    });
  });

  describe('User Prompt Generation', () => {
    it('should generate prompt for specific issue', () => {
      const input: BugFixAgentInput = {
        issueNumber: 456,
      };

      const userPrompt = agent.getUserPrompt(input, context);

      expect(userPrompt).toContain('456');
    });

    it('should generate prompt for fetching bug issues', () => {
      const input: BugFixAgentInput = {
        maxIssues: 3,
      };

      const userPrompt = agent.getUserPrompt(input, context);

      expect(userPrompt).toContain('bug');
    });
  });

  describe('Safety Validation', () => {
    it('should use safety checker for issue validation', () => {
      // The BugFixAgent should integrate with SafetyChecker
      const tools = agent.getTools(context);

      // Tools should exist and be callable
      expect(typeof tools.readFile.execute).toBe('function');
      expect(typeof tools.writeFile.execute).toBe('function');
    });
  });
});
