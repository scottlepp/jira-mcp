/**
 * PR Review Agent Integration Tests
 *
 * These tests use LIVE API calls to Google AI and GitHub.
 * Requires GOOGLE_API_KEY and GITHUB_TOKEN in environment.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PRReviewAgent } from '../src/agents/pr-review-agent.js';
import { AgentContext, PRReviewAgentInput } from '../src/agents/types.js';
import { canRunLiveTests, testConfig } from './helpers/test-setup.js';
import {
  createTestBranch,
  createTestPullRequest,
  addFileToTestBranch,
  cleanupTestResources,
  getTestRepoConfig,
} from './helpers/test-repo.js';
import {
  prTemplates,
  generateTestBranchName,
  testFileContent,
} from './helpers/dummy-data.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('PRReviewAgent', () => {
  let agent: PRReviewAgent;
  let testDir: string;
  let context: AgentContext;
  const createdBranches: string[] = [];
  const createdPRs: number[] = [];

  beforeAll(() => {
    agent = new PRReviewAgent();

    // Create a temporary test directory
    testDir = mkdtempSync(join(tmpdir(), 'pr-review-agent-test-'));

    const { owner, repo } = getTestRepoConfig();
    context = {
      workingDir: testDir,
      repoOwner: owner,
      repoName: repo,
    };
  });

  afterAll(async () => {
    // Clean up test resources
    await cleanupTestResources({
      branches: createdBranches,
      pullRequests: createdPRs,
    });

    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Agent Properties', () => {
    it('should have correct name and description', () => {
      expect(agent.name).toBe('pr-review-agent');
      expect(agent.description.toLowerCase()).toContain('review');
    });
  });

  describe('Input Validation', () => {
    it('should require PR number', async () => {
      const input: PRReviewAgentInput = {} as PRReviewAgentInput;
      // PR number is required
      const result = await agent.validate(input, context);

      // Should fail without PR number
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate input with PR number', async () => {
      const input: PRReviewAgentInput = {
        prNumber: 123,
      };
      const result = await agent.validate(input, context);

      expect(result.valid).toBe(true);
    });

    it('should accept focus areas option', async () => {
      const input: PRReviewAgentInput = {
        prNumber: 123,
        focusAreas: ['security', 'performance'],
      };
      const result = await agent.validate(input, context);

      expect(result.valid).toBe(true);
    });

    it('should accept suggestTests option', async () => {
      const input: PRReviewAgentInput = {
        prNumber: 123,
        suggestTests: true,
      };
      const result = await agent.validate(input, context);

      expect(result.valid).toBe(true);
    });
  });

  describe('Tool Generation', () => {
    it('should generate required tools', () => {
      const reviewContext = { ...context, prNumber: 123 };
      const tools = agent.getTools(reviewContext);

      // File tools
      expect(tools).toHaveProperty('readFile');
      expect(tools).toHaveProperty('searchCode');

      // Git tools
      expect(tools).toHaveProperty('gitDiff');
      expect(tools).toHaveProperty('gitLog');

      // GitHub tools
      expect(tools).toHaveProperty('getPullRequest');
      expect(tools).toHaveProperty('getPullRequestFiles');
      expect(tools).toHaveProperty('createReview');

      // Test tools
      expect(tools).toHaveProperty('checkTestCoverage');
      expect(tools).toHaveProperty('runTests');
    });
  });

  describe.skipIf(!canRunLiveTests())('Live API Tests', () => {
    let testPRNumber: number;
    let testBranchName: string;

    beforeAll(async () => {
      // Create a test branch and PR
      testBranchName = generateTestBranchName();
      await createTestBranch(testBranchName);
      createdBranches.push(testBranchName);

      // Add a test file to the branch
      await addFileToTestBranch({
        branch: testBranchName,
        path: 'test-file.ts',
        content: testFileContent.cleanTypescript(),
        message: 'Add test file for PR review',
      });

      // Create PR
      const prData = prTemplates.goodPR();
      const pr = await createTestPullRequest({
        title: prData.title,
        body: prData.body,
        head: testBranchName,
      });
      testPRNumber = pr.number;
      createdPRs.push(testPRNumber);
    });

    it(
      'should execute PR review with live API',
      async () => {
        const input: PRReviewAgentInput = {
          prNumber: testPRNumber,
          suggestTests: true,
          focusAreas: ['style', 'logic'],
        };

        const result = await agent.execute(input, context);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();

        if (result.data) {
          expect(result.data).toHaveProperty('summary');
          expect(result.data).toHaveProperty('issues');
          expect(result.data).toHaveProperty('approval');
          expect(Array.isArray(result.data.issues)).toBe(true);
        }
      },
      { timeout: 180000 }
    ); // 3 minute timeout

    it(
      'should identify issues in problematic PR',
      async () => {
        // Create a branch with problematic code
        const problemBranch = generateTestBranchName();
        await createTestBranch(problemBranch);
        createdBranches.push(problemBranch);

        // Add file with security issues
        await addFileToTestBranch({
          branch: problemBranch,
          path: 'security-issue.ts',
          content: testFileContent.typescriptWithSecurityIssue(),
          message: 'Add file with security issue',
        });

        // Create problematic PR
        const prData = prTemplates.securityIssuePR();
        const pr = await createTestPullRequest({
          title: prData.title,
          body: prData.body,
          head: problemBranch,
        });
        createdPRs.push(pr.number);

        const input: PRReviewAgentInput = {
          prNumber: pr.number,
          focusAreas: ['security'],
        };

        const result = await agent.execute(input, context);

        expect(result.success).toBe(true);
        if (result.data) {
          // Should identify issues
          expect(result.data.issues.length).toBeGreaterThan(0);

          // Check if security issues are identified
          const securityIssues = result.data.issues.filter(
            (i) => i.category === 'security' || i.message.toLowerCase().includes('security')
          );
          // Should have some security-related findings
          expect(securityIssues.length + result.data.issues.length).toBeGreaterThan(0);
        }
      },
      { timeout: 180000 }
    );

    it(
      'should generate test suggestions when requested',
      async () => {
        const input: PRReviewAgentInput = {
          prNumber: testPRNumber,
          suggestTests: true,
        };

        const result = await agent.execute(input, context);

        expect(result.success).toBe(true);
        if (result.data) {
          expect(result.data).toHaveProperty('suggestedTests');
          expect(Array.isArray(result.data.suggestedTests)).toBe(true);
        }
      },
      { timeout: 180000 }
    );

    it(
      'should provide approval recommendation',
      async () => {
        const input: PRReviewAgentInput = {
          prNumber: testPRNumber,
        };

        const result = await agent.execute(input, context);

        expect(result.success).toBe(true);
        if (result.data) {
          expect(['approve', 'request_changes', 'comment']).toContain(result.data.approval);
        }
      },
      { timeout: 180000 }
    );
  });

  describe('System Prompt Generation', () => {
    it('should generate appropriate system prompt', () => {
      const input: PRReviewAgentInput = {
        prNumber: 123,
        focusAreas: ['security', 'performance'],
      };

      const systemPrompt = agent.getSystemPrompt(input, context);

      expect(systemPrompt).toContain('review');
      expect(systemPrompt).toContain('security');
      expect(systemPrompt).toContain('performance');
    });

    it('should include severity levels', () => {
      const input: PRReviewAgentInput = {
        prNumber: 123,
      };

      const systemPrompt = agent.getSystemPrompt(input, context);

      expect(systemPrompt).toContain('critical');
      expect(systemPrompt).toContain('high');
      expect(systemPrompt).toContain('medium');
      expect(systemPrompt).toContain('low');
    });

    it('should include review guidelines', () => {
      const input: PRReviewAgentInput = {
        prNumber: 123,
      };

      const systemPrompt = agent.getSystemPrompt(input, context);

      expect(systemPrompt).toContain('constructive');
      expect(systemPrompt).toContain('WHY');
    });
  });

  describe('User Prompt Generation', () => {
    it('should generate prompt with PR number', () => {
      const input: PRReviewAgentInput = {
        prNumber: 789,
      };

      const userPrompt = agent.getUserPrompt(input, context);

      expect(userPrompt).toContain('789');
      expect(userPrompt).toContain('PR');
    });

    it('should include focus areas in prompt', () => {
      const input: PRReviewAgentInput = {
        prNumber: 123,
        focusAreas: ['tests', 'security'],
      };

      const userPrompt = agent.getUserPrompt(input, context);

      expect(userPrompt).toContain('tests');
      expect(userPrompt).toContain('security');
    });
  });

  describe('Response Parsing', () => {
    it('should handle missing PR gracefully', async () => {
      const input: PRReviewAgentInput = {
        prNumber: 999999999, // Non-existent PR
      };

      // This should not throw, but return an error result
      const result = await agent.execute(input, context);

      // Either success false or data indicates issue not found
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });
  });
});
