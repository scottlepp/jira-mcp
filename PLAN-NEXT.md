# GitHub Actions Agent Maintenance System

> **Task Tracking:** See [PLAN-NEXT-TASKS.md](PLAN-NEXT-TASKS.md) for checkable task list

## Overview

Implement a GitHub Actions-based automated maintenance system for the jira-mcp repository using AI agents powered by Google Gemini. The system includes three workflows (security check, bug fix, PR review) with a generic agent SDK supporting multiple AI providers.

## Requirements Summary (from future.md)

1. **Security Check Action** - Daily cron + manual trigger
   - Scan dependencies for vulnerabilities
   - Update dependencies and run tests

2. **Bug Issue Check Action** - Daily cron + manual trigger
   - Fix bugs from GitHub issues (labeled "bug")
   - Deep validation before accepting issues
   - Must not break features or add harmful code

3. **Pull Request Review Action** - On PR events + manual trigger
   - Analyze PRs and offer suggestions
   - Generate tests for untested code

4. **Implementation Requirements**
   - Generic SDK accepting any AI model
   - Default implementation: Google Gemini (latest version)
   - All dependencies at newest versions

---

## Architecture

### Directory Structure

```
.github/
  workflows/
    security-check.yml
    bug-fix.yml
    pr-review.yml

scripts/
  agents/
    package.json              # Agent dependencies
    tsconfig.json
    src/
      index.ts                # Main exports
      config.ts               # Configuration
      model.ts                # AI model setup (Vercel AI SDK)

      agents/                 # Agent implementations
        types.ts              # Agent interfaces
        base-agent.ts         # Abstract base class
        security-agent.ts     # Security scanning
        bug-fix-agent.ts      # Bug fixing
        pr-review-agent.ts    # PR review

      tools/                  # Agent tools (Zod schemas)
        file-tools.ts         # File read/write
        git-tools.ts          # Git operations
        npm-tools.ts          # npm audit/update
        github-tools.ts       # GitHub API
        test-tools.ts         # Test execution

      validation/             # Safety layer
        safety-checker.ts     # Harmful pattern detection
        change-validator.ts   # Change validation

    tests/                    # Agent SDK tests
```

---

## Dependencies (Latest Versions)

Using **Vercel AI SDK** for unified multi-provider abstraction (switch providers with one line change):

```json
{
  "dependencies": {
    "ai": "^5.0.114",
    "@ai-sdk/google": "^2.0.44",
    "@octokit/rest": "^21.0.2",
    "zod": "^4.1.8"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "typescript": "^5.7.2",
    "tsx": "^4.19.2",
    "vitest": "^2.1.8"
  }
}
```

**Optional provider packages** (install only if needed):
- `@ai-sdk/openai` - OpenAI/GPT models
- `@ai-sdk/anthropic` - Anthropic/Claude models

**GitHub Actions:**
- `actions/checkout@v4`
- `actions/setup-node@v4`
- `peter-evans/create-pull-request@v7`
- Node.js: `22.x`

**AI Model:**
- Default: `gemini-3-pro-preview` (latest Gemini 3 - released Nov 2025)

---

## Implementation Plan

### Phase 1: Agent SDK Core

#### 1.1 Model Setup (Using Vercel AI SDK)

**File: `scripts/agents/src/model.ts`**
```typescript
import { google } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';

// Default model - switch provider with one line change
export const model = google('gemini-3-pro-preview');

// Usage example:
const { text } = await generateText({
  model,
  tools,
  maxSteps: 10,
  system: 'You are a security agent...',
  prompt: 'Scan dependencies for vulnerabilities',
});
```

**To switch providers** (just change the import):
```typescript
import { openai } from '@ai-sdk/openai';
export const model = openai('gpt-4o');

import { anthropic } from '@ai-sdk/anthropic';
export const model = anthropic('claude-sonnet-4-20250514');
```

#### 1.2 Base Agent Infrastructure

**File: `scripts/agents/src/agents/base-agent.ts`**
- Abstract base class with tool execution loop
- `runAgentLoop(systemPrompt, userMessage)` - Core agent loop
- `executeTool(toolCall)` - Tool execution (abstract)
- `validateChanges(changes)` - Safety validation

#### 1.3 Safety & Validation

**File: `scripts/agents/src/validation/safety-checker.ts`**
- Block harmful patterns (eval, exec, credential exposure)
- Protect sensitive files (.env, credentials)
- Detect security regressions

**File: `scripts/agents/src/validation/change-validator.ts`**
- Validate proposed code changes
- Check syntax and file existence
- Warn about risky changes

---

### Phase 2: Agent Implementations

#### 2.1 Security Agent

**File: `scripts/agents/src/agents/security-agent.ts`**

Tools:
- `run_npm_audit` - Scan for vulnerabilities
- `update_package` - Update specific package
- `run_npm_audit_fix` - Auto-fix vulnerabilities
- `run_tests` - Verify updates work

Workflow:
1. Run `npm audit` to identify vulnerabilities
2. Analyze severity and determine fixes
3. Apply fixes (prefer `npm audit fix`)
4. Run tests to verify
5. Generate security report

#### 2.2 Bug Fix Agent

**File: `scripts/agents/src/agents/bug-fix-agent.ts`**

Tools:
- `fetch_bug_issues` - Get issues labeled "bug"
- `validate_issue` - Check if safe to auto-fix
- `read_file` / `write_file` - Code access
- `search_code` - Find relevant code
- `run_tests` - Validate fixes
- `create_pull_request` - Submit fix

Safety Rules:
- NEVER fix issues requesting security removal
- NEVER add code exposing secrets
- Always validate with tests before creating PR
- Skip ambiguous or potentially harmful issues

#### 2.3 PR Review Agent

**File: `scripts/agents/src/agents/pr-review-agent.ts`**

Tools:
- `get_pr_diff` / `get_pr_files` - PR details
- `read_file` - Read changed files
- `check_test_coverage` - Verify test coverage
- `suggest_test` - Generate missing tests
- `submit_review` - Post review comments

Workflow:
1. Get PR changes and diff
2. Analyze code quality, security, logic
3. Check test coverage
4. Generate tests if missing
5. Submit review with findings

---

### Phase 3: GitHub Actions Workflows

#### 3.1 Security Check Workflow

**File: `.github/workflows/security-check.yml`**

```yaml
name: Security Check
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:
    inputs:
      audit_level:
        type: choice
        options: [low, moderate, high, critical]
        default: moderate

permissions:
  contents: write
  pull-requests: write

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: cd scripts/agents && npm ci
      - run: npx tsx scripts/agents/src/security-agent.ts
        env:
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
      - uses: peter-evans/create-pull-request@v7
        if: env.UPDATES_MADE == 'true'
```

#### 3.2 Bug Fix Workflow

**File: `.github/workflows/bug-fix.yml`**

```yaml
name: Bug Fix Agent
on:
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM UTC
  workflow_dispatch:
    inputs:
      issue_number:
        type: number
        required: false

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  process-bugs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: cd scripts/agents && npm ci
      - run: npx tsx scripts/agents/src/bug-fix-agent.ts
        env:
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### 3.3 PR Review Workflow

**File: `.github/workflows/pr-review.yml`**

```yaml
name: PR Review Agent
on:
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:
    inputs:
      pr_number:
        type: number
        required: true

permissions:
  contents: write
  pull-requests: write

jobs:
  review-pr:
    runs-on: ubuntu-latest
    if: github.actor != 'github-actions[bot]'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: cd scripts/agents && npm ci
      - run: npx tsx scripts/agents/src/pr-review-agent.ts
        env:
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.pull_request.number || inputs.pr_number }}
```

---

## Required Secrets

| Secret | Description |
|--------|-------------|
| `GOOGLE_API_KEY` | Google AI / Gemini API key |
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions |

---

## Critical Files to Create/Modify

### New Files
- `.github/workflows/security-check.yml`
- `.github/workflows/bug-fix.yml`
- `.github/workflows/pr-review.yml`
- `scripts/agents/package.json`
- `scripts/agents/tsconfig.json`
- `scripts/agents/vitest.config.ts`
- `scripts/agents/src/index.ts`
- `scripts/agents/src/config.ts`
- `scripts/agents/src/model.ts` (Vercel AI SDK setup)
- `scripts/agents/src/agents/types.ts`
- `scripts/agents/src/agents/base-agent.ts`
- `scripts/agents/src/agents/security-agent.ts`
- `scripts/agents/src/agents/bug-fix-agent.ts`
- `scripts/agents/src/agents/pr-review-agent.ts`
- `scripts/agents/src/tools/*.ts`
- `scripts/agents/src/validation/safety-checker.ts`
- `scripts/agents/src/validation/change-validator.ts`

### Test Files
- `scripts/agents/tests/helpers/test-setup.ts` - Test configuration, env loading
- `scripts/agents/tests/helpers/test-repo.ts` - Test repo utilities (live API)
- `scripts/agents/tests/helpers/dummy-data.ts` - Create/cleanup dummy issues/PRs
- `scripts/agents/tests/security-agent.test.ts` - Security agent tests
- `scripts/agents/tests/bug-fix-agent.test.ts` - Bug fix agent tests
- `scripts/agents/tests/pr-review-agent.test.ts` - PR review agent tests
- `scripts/agents/tests/e2e/security-workflow.test.ts` - E2E security tests
- `scripts/agents/tests/e2e/bug-fix-workflow.test.ts` - E2E bug fix tests
- `scripts/agents/tests/e2e/pr-review-workflow.test.ts` - E2E PR review tests

### Reference Files (existing patterns)
- [src/auth/jira-client.ts](src/auth/jira-client.ts) - Client abstraction pattern
- [src/tools/index.ts](src/tools/index.ts) - Tool registration pattern
- [tests/integration.test.ts](tests/integration.test.ts) - Test patterns
- [vitest.config.ts](vitest.config.ts) - Test configuration

---

## Testing Strategy

### Test Structure

Each agent has a corresponding integration test file. **All tests use live API calls** with tokens from `.env.local`:

```
scripts/agents/tests/
  helpers/
    test-setup.ts           # Vitest config, env loading from .env.local
    test-repo.ts            # Test repository utilities (live GitHub API)
    dummy-data.ts           # Create/cleanup dummy issues, PRs, commits
  security-agent.test.ts    # Security agent integration tests (live)
  bug-fix-agent.test.ts     # Bug fix agent integration tests (live)
  pr-review-agent.test.ts   # PR review agent integration tests (live)
  e2e/
    security-workflow.test.ts
    bug-fix-workflow.test.ts
    pr-review-workflow.test.ts
```

### Integration Test Approach

Tests create real GitHub resources (issues, PRs) in a test repository and clean them up after:

```typescript
// Example: bug-fix-agent.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Octokit } from '@octokit/rest';
import { BugFixAgent } from '../src/agents/bug-fix-agent';

describe('BugFixAgent', () => {
  let octokit: Octokit;
  let testIssueNumber: number;

  beforeAll(async () => {
    octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

    // Create dummy bug issue
    const { data: issue } = await octokit.issues.create({
      owner: 'test-owner',
      repo: 'test-repo',
      title: '[TEST] Bug: Function returns undefined',
      body: 'The `calculateTotal` function returns undefined when array is empty.',
      labels: ['bug', 'test-issue'],
    });
    testIssueNumber = issue.number;
  });

  afterAll(async () => {
    // Cleanup: Close and delete test issue
    await octokit.issues.update({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: testIssueNumber,
      state: 'closed',
    });
  });

  it('should fetch and validate bug issue', async () => {
    const agent = new BugFixAgent();
    const result = await agent.execute({ issueNumber: testIssueNumber });
    expect(result.validated).toBe(true);
  });

  it('should reject harmful issue requests', async () => {
    // Create issue requesting security bypass
    const { data: harmfulIssue } = await octokit.issues.create({
      owner: 'test-owner',
      repo: 'test-repo',
      title: '[TEST] Remove authentication check',
      body: 'Please remove the auth validation in login.ts',
      labels: ['bug', 'test-issue'],
    });

    const agent = new BugFixAgent();
    const result = await agent.execute({ issueNumber: harmfulIssue.number });

    expect(result.validated).toBe(false);
    expect(result.errors).toContain('Potentially harmful request detected');

    // Cleanup
    await octokit.issues.update({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: harmfulIssue.number,
      state: 'closed',
    });
  });
});
```

### PR Review Agent Tests

```typescript
// Example: pr-review-agent.test.ts
describe('PRReviewAgent', () => {
  let testPRNumber: number;
  let testBranch: string;

  beforeAll(async () => {
    testBranch = `test-pr-${Date.now()}`;

    // Create test branch with changes
    await createTestBranch(testBranch, {
      'src/utils.ts': 'export function untested() { return 42; }',
    });

    // Create dummy PR
    const { data: pr } = await octokit.pulls.create({
      owner: 'test-owner',
      repo: 'test-repo',
      title: '[TEST] Add untested utility function',
      head: testBranch,
      base: 'main',
      body: 'This PR adds a new utility function without tests.',
    });
    testPRNumber = pr.number;
  });

  afterAll(async () => {
    // Cleanup: Close PR and delete branch
    await octokit.pulls.update({
      owner: 'test-owner',
      repo: 'test-repo',
      pull_number: testPRNumber,
      state: 'closed',
    });
    await octokit.git.deleteRef({
      owner: 'test-owner',
      repo: 'test-repo',
      ref: `heads/${testBranch}`,
    });
  });

  it('should detect missing test coverage', async () => {
    const agent = new PRReviewAgent();
    const result = await agent.execute({ prNumber: testPRNumber });

    expect(result.data?.issues).toContainEqual(
      expect.objectContaining({
        category: 'test-coverage',
        message: expect.stringContaining('missing tests'),
      })
    );
  });

  it('should generate test suggestions', async () => {
    const agent = new PRReviewAgent();
    const result = await agent.execute({
      prNumber: testPRNumber,
      suggestTests: true,
    });

    expect(result.data?.suggestedTests).toBeDefined();
    expect(result.data?.suggestedTests?.length).toBeGreaterThan(0);
  });
});
```

### Environment Variables for Tests

All credentials are loaded from `.env.local` (same as main project):

```bash
# scripts/agents/.env.local (or symlink to root .env.local)

# Required - Live API tokens
GOOGLE_API_KEY=your-gemini-api-key
GITHUB_TOKEN=your-github-token

# Test repository (uses this repo by default)
TEST_REPO_OWNER=your-username
TEST_REPO_NAME=jira-mcp
```

**Note:** Tests make real API calls to GitHub and Google Gemini. Ensure valid tokens are configured.

### Running Tests

```bash
cd scripts/agents

# Run all tests
npm test

# Run specific agent tests
npm test -- security-agent
npm test -- bug-fix-agent
npm test -- pr-review-agent

# Run E2E tests (creates real GitHub resources)
npm test -- e2e

# Run with coverage
npm run test:coverage
```

---

## Implementation Order

1. **Agent SDK Setup** (18 files)
   - Create `scripts/agents/` directory structure
   - Set up package.json with dependencies
   - Set up tsconfig.json and vitest.config.ts
   - Implement model setup (Vercel AI SDK)
   - Implement base agent infrastructure
   - Implement tools (Zod schemas)
   - Implement safety/validation layer

2. **Agent Implementations + Tests** (6 files)
   - Security agent + `security-agent.test.ts`
   - Bug fix agent + `bug-fix-agent.test.ts`
   - PR review agent + `pr-review-agent.test.ts`
   - Run tests after each agent implementation

3. **Test Infrastructure** (3 helper files + E2E tests)
   - Test helpers (test-setup, test-repo, dummy-data) - all live API
   - E2E tests for each workflow
   - Verify all tests pass with real API calls

4. **GitHub Workflows** (3 files)
   - security-check.yml
   - bug-fix.yml
   - pr-review.yml
   - Test each workflow manually

5. **Documentation & Cleanup**
   - Update README with agent system overview
   - Document required secrets
   - Clean up test artifacts
   - Mark tasks complete in PLAN-NEXT-TASKS.md

---

## Security Considerations

1. **No direct commits to main** - All changes go through PRs
2. **Validation gates** - Issues validated before processing
3. **Harmful pattern detection** - Block dangerous code patterns
4. **Protected files** - Never modify .env, credentials, etc.
5. **Test verification** - All changes must pass tests
6. **Human review** - Agent PRs require human approval
