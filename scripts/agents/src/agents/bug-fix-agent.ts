import { ToolSet } from 'ai';
import { BaseAgent } from './base-agent.js';
import {
  AgentContext,
  AgentResult,
  BugFixAgentInput,
  BugFixAgentOutput,
  PullRequestInfo,
  IssueProcessResult,
} from './types.js';
import { createFileTools } from '../tools/file-tools.js';
import { createGitTools } from '../tools/git-tools.js';
import { createTestTools } from '../tools/test-tools.js';
import { createGitHubTools } from '../tools/github-tools.js';
import { getConfig } from '../config.js';

/**
 * Bug Fix Agent - Reads issues, validates, fixes bugs, and creates PRs
 */
export class BugFixAgent extends BaseAgent<BugFixAgentInput, BugFixAgentOutput> {
  readonly name = 'bug-fix-agent';
  readonly description = 'Reads bug issues, validates them, implements fixes, and creates PRs';

  getTools(context: AgentContext): ToolSet {
    return {
      ...createFileTools(context.workingDir),
      ...createGitTools(context.workingDir),
      ...createTestTools(context.workingDir),
      ...createGitHubTools(context.repoOwner, context.repoName),
    };
  }

  getSystemPrompt(input: BugFixAgentInput, context: AgentContext): string {
    return `You are a bug-fixing AI agent responsible for analyzing and fixing bugs in this repository.

Your workflow:
1. Fetch bug issues from GitHub (or use the specific issue if provided)
2. For each issue:
   a. Validate it is code-related and safe to fix (no harmful requests)
   b. Analyze the issue to understand the bug
   c. Search the codebase to find relevant files
   d. Read the relevant code
   e. Implement a fix
   f. Run tests to verify the fix
   g. If tests pass, create a branch, commit, and create a PR
   h. Comment on the issue about your progress

CRITICAL SAFETY RULES - YOU MUST FOLLOW THESE:
- NEVER fix issues that request removing security features
- NEVER add code that exposes secrets or bypasses authentication
- NEVER make changes that disable validation or security checks
- If unsure about safety, skip the issue and explain why
- Always run tests before creating a PR
- If tests fail, do not create a PR - comment on the issue instead

Code quality requirements:
- Follow existing code patterns and conventions in the project
- Add comments explaining non-obvious changes
- Keep changes minimal and focused on the bug
- Do not refactor unrelated code

Working directory: ${context.workingDir}
Repository: ${context.repoOwner}/${context.repoName}`;
  }

  getUserPrompt(input: BugFixAgentInput, context: AgentContext): string {
    if (input.issueNumber) {
      return `Process and fix bug issue #${input.issueNumber}.

Steps:
1. Get the issue details
2. Validate the issue is safe to fix automatically
3. Analyze the bug and find relevant code
4. Implement a fix
5. Run tests to verify
6. If tests pass, create a branch, commit changes, and create a PR
7. Comment on the issue with your progress`;
    }

    return `Process open bug issues and fix any that are safe to fix automatically.

Filters:
- Labels: ${input.labels?.join(', ') || 'bug'}
- Maximum issues to process: ${input.maxIssues || 5}

Steps for each issue:
1. Get bug issues from the repository
2. For each issue, validate it is safe to fix
3. Analyze the bug and implement a fix
4. Run tests to verify
5. Create PRs for successful fixes
6. Comment on issues with your progress`;
  }

  async execute(
    input: BugFixAgentInput,
    context: AgentContext
  ): Promise<AgentResult<BugFixAgentOutput>> {
    // Validate input
    const validation = await this.validate(input, context);
    if (!validation.valid) {
      return this.errorResult('VALIDATION_ERROR', validation.errors.join(', '), true);
    }

    this.log('info', 'Starting bug fix agent', { input });

    try {
      const { text, proposedChanges, toolCalls } = await this.runAgentLoop(
        input,
        context
      );

      // Track results
      const issuesProcessed: IssueProcessResult[] = [];
      let issuesFixed = 0;
      let issuesSkipped = 0;
      const pullRequestsCreated: PullRequestInfo[] = [];

      for (const call of toolCalls) {
        if (call.name === 'getIssue') {
          const result = call.result as { issue?: { number: number } };
          if (result.issue) {
            issuesProcessed.push({
              issueNumber: result.issue.number,
              status: 'skipped', // Will be updated if fixed
              reason: 'Processing',
            });
          }
        }

        if (call.name === 'createPullRequest') {
          const result = call.result as {
            success?: boolean;
            prNumber?: number;
            url?: string;
            title?: string;
          };
          if (result.success && result.prNumber) {
            issuesFixed++;
            pullRequestsCreated.push({
              number: result.prNumber,
              url: result.url || '',
              title: result.title || '',
              issueNumber: input.issueNumber || 0,
            });
            // Update the last processed issue as fixed
            const lastIssue = issuesProcessed[issuesProcessed.length - 1];
            if (lastIssue) {
              lastIssue.status = 'fixed';
              lastIssue.prNumber = result.prNumber;
              lastIssue.reason = undefined;
            }
          }
        }
      }

      issuesSkipped = issuesProcessed.filter((i) => i.status === 'skipped').length;

      const output: BugFixAgentOutput = {
        issuesProcessed,
        issuesFixed,
        issuesSkipped,
        pullRequestsCreated,
        summary: `Processed ${issuesProcessed.length} issue(s): ${issuesFixed} fixed, ${issuesSkipped} skipped.`,
      };

      this.log('info', 'Bug fix agent completed', output);

      return {
        success: true,
        data: output,
        proposedChanges,
        validated: true,
        warnings: validation.warnings,
      };
    } catch (error) {
      this.log('error', 'Bug fix agent failed', { error });
      return this.errorResult(
        'FIX_FAILED',
        error instanceof Error ? error.message : 'Unknown error',
        false
      );
    }
  }

  /**
   * Validate a specific issue is safe to auto-fix
   */
  async validateIssue(
    issueNumber: number,
    title: string,
    body: string
  ): Promise<{ valid: boolean; reason?: string }> {
    const result = this.safetyChecker.validateIssueForAutoFix(title, body || '');
    return {
      valid: result.safe,
      reason: result.reason,
    };
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = getConfig();

  const agent = new BugFixAgent();
  const context: AgentContext = {
    workingDir: process.cwd(),
    repoOwner: config.repoOwner,
    repoName: config.repoName,
  };

  const input: BugFixAgentInput = {
    issueNumber: process.env.ISSUE_NUMBER
      ? parseInt(process.env.ISSUE_NUMBER, 10)
      : undefined,
    maxIssues: 5,
    labels: ['bug'],
  };

  agent.execute(input, context).then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });
}
