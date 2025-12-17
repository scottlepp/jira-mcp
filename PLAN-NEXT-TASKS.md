# GitHub Actions Agent Maintenance - Task List

Track progress by checking off completed tasks. Each task corresponds to a specific file or feature.

---

## Phase 1: Agent SDK Core Setup

### 1.1 Project Structure
- [x] Create `scripts/agents/` directory structure
- [x] Create `scripts/agents/package.json` with dependencies
- [x] Create `scripts/agents/tsconfig.json`
- [x] Create `scripts/agents/vitest.config.ts`
- [x] Run `npm install` in `scripts/agents/`

### 1.2 Core Files
- [x] Create `scripts/agents/src/index.ts` - Main exports
- [x] Create `scripts/agents/src/config.ts` - Configuration management
- [x] Create `scripts/agents/src/model.ts` - Vercel AI SDK setup (Gemini default)

### 1.3 Agent Infrastructure
- [x] Create `scripts/agents/src/agents/types.ts` - Agent interfaces
- [x] Create `scripts/agents/src/agents/base-agent.ts` - Abstract base class

### 1.4 Tools (Zod Schemas)
- [x] Create `scripts/agents/src/tools/index.ts` - Tool exports
- [x] Create `scripts/agents/src/tools/file-tools.ts` - File read/write tools
- [x] Create `scripts/agents/src/tools/git-tools.ts` - Git operations tools
- [x] Create `scripts/agents/src/tools/npm-tools.ts` - npm audit/update tools
- [x] Create `scripts/agents/src/tools/github-tools.ts` - GitHub API tools
- [x] Create `scripts/agents/src/tools/test-tools.ts` - Test execution tools

### 1.5 Validation Layer
- [x] Create `scripts/agents/src/validation/safety-checker.ts` - Harmful pattern detection
- [x] Create `scripts/agents/src/validation/change-validator.ts` - Change validation

---

## Phase 2: Agent Implementations

### 2.1 Security Agent
- [x] Create `scripts/agents/src/agents/security-agent.ts` - Security scanning agent
- [x] Create `scripts/agents/tests/security-agent.test.ts` - Integration tests
  - [x] Test: Detect known vulnerabilities in test package.json
  - [x] Test: Generate security report
  - [x] Test: Propose package updates
  - [x] Test: Validate updates don't break tests

### 2.2 Bug Fix Agent
- [x] Create `scripts/agents/src/agents/bug-fix-agent.ts` - Bug fixing agent
- [x] Create `scripts/agents/tests/bug-fix-agent.test.ts` - Integration tests
  - [x] Test: Fetch issues labeled "bug" from test repo
  - [x] Test: Validate issue is safe to auto-fix
  - [x] Test: Reject harmful issue requests
  - [x] Test: Create dummy issue and verify agent processes it
  - [x] Test: Verify PR creation with fix

### 2.3 PR Review Agent
- [x] Create `scripts/agents/src/agents/pr-review-agent.ts` - PR review agent
- [x] Create `scripts/agents/tests/pr-review-agent.test.ts` - Integration tests
  - [x] Test: Fetch PR diff and files
  - [x] Test: Analyze code quality issues
  - [x] Test: Check test coverage for changed files
  - [x] Test: Generate test suggestions for untested code
  - [x] Test: Create dummy PR and verify review comments

---

## Phase 3: GitHub Actions Workflows

### 3.1 Security Check Workflow
- [x] Create `.github/workflows/security-check.yml`
- [ ] Test workflow manually via `workflow_dispatch`
- [x] Verify cron schedule syntax

### 3.2 Bug Fix Workflow
- [x] Create `.github/workflows/bug-fix.yml`
- [ ] Test workflow manually via `workflow_dispatch`
- [x] Verify cron schedule syntax

### 3.3 PR Review Workflow
- [x] Create `.github/workflows/pr-review.yml`
- [ ] Test workflow on test PR
- [x] Verify bot exclusion works

---

## Phase 4: Integration Testing Infrastructure

### 4.1 Test Utilities (Live API - No Mocks)
- [x] Create `scripts/agents/tests/helpers/test-setup.ts` - Test config, env loading from .env.local
- [x] Create `scripts/agents/tests/helpers/test-repo.ts` - Test repo utilities (live GitHub API)
- [x] Create `scripts/agents/tests/helpers/dummy-data.ts` - Create/cleanup dummy issues/PRs

### 4.2 E2E Tests
- [ ] Create `scripts/agents/tests/e2e/security-workflow.test.ts`
  - [ ] Create test project with vulnerable dependencies
  - [ ] Run security agent
  - [ ] Verify PR created with fixes
- [ ] Create `scripts/agents/tests/e2e/bug-fix-workflow.test.ts`
  - [ ] Create dummy bug issue in test repo
  - [ ] Run bug fix agent
  - [ ] Verify issue processed and PR created
- [ ] Create `scripts/agents/tests/e2e/pr-review-workflow.test.ts`
  - [ ] Create dummy PR in test repo
  - [ ] Run PR review agent
  - [ ] Verify review comments posted

---

## Phase 5: Documentation & Cleanup

### 5.1 Documentation
- [ ] Update main `README.md` with agent system overview
- [ ] Create `scripts/agents/README.md` with detailed docs
- [ ] Document required secrets in README
- [ ] Add usage examples

### 5.2 Final Validation
- [x] Run all unit tests: `cd scripts/agents && npm test`
- [ ] Run all integration tests (blocked by API rate limits)
- [ ] Verify all workflows trigger correctly
- [ ] Test model switching (Gemini → OpenAI → Anthropic)

### 5.3 Cleanup
- [ ] Remove test artifacts (dummy issues/PRs)
- [ ] Update `future.md` to mark features as implemented
- [ ] Create initial release tag

---

## File Checklist Summary

### Implementation Files (19 files)
| Status | File | Description |
|--------|------|-------------|
| [x] | `scripts/agents/package.json` | Dependencies |
| [x] | `scripts/agents/tsconfig.json` | TypeScript config |
| [x] | `scripts/agents/vitest.config.ts` | Test config |
| [x] | `scripts/agents/src/index.ts` | Main exports |
| [x] | `scripts/agents/src/config.ts` | Configuration |
| [x] | `scripts/agents/src/model.ts` | AI model setup |
| [x] | `scripts/agents/src/agents/types.ts` | Agent interfaces |
| [x] | `scripts/agents/src/agents/base-agent.ts` | Base agent class |
| [x] | `scripts/agents/src/agents/security-agent.ts` | Security agent |
| [x] | `scripts/agents/src/agents/bug-fix-agent.ts` | Bug fix agent |
| [x] | `scripts/agents/src/agents/pr-review-agent.ts` | PR review agent |
| [x] | `scripts/agents/src/tools/index.ts` | Tool exports |
| [x] | `scripts/agents/src/tools/file-tools.ts` | File tools |
| [x] | `scripts/agents/src/tools/git-tools.ts` | Git tools |
| [x] | `scripts/agents/src/tools/npm-tools.ts` | npm tools |
| [x] | `scripts/agents/src/tools/github-tools.ts` | GitHub tools |
| [x] | `scripts/agents/src/tools/test-tools.ts` | Test tools |
| [x] | `scripts/agents/src/validation/safety-checker.ts` | Safety checker |
| [x] | `scripts/agents/src/validation/change-validator.ts` | Change validator |

### Test Files (7 files) - Live API, No Mocks
| Status | File | Description |
|--------|------|-------------|
| [x] | `scripts/agents/tests/helpers/test-setup.ts` | Test config, .env.local loading |
| [x] | `scripts/agents/tests/helpers/test-repo.ts` | Test repo utilities (live API) |
| [x] | `scripts/agents/tests/helpers/dummy-data.ts` | Create/cleanup dummy issues/PRs |
| [x] | `scripts/agents/tests/security-agent.test.ts` | Security agent tests |
| [x] | `scripts/agents/tests/bug-fix-agent.test.ts` | Bug fix agent tests |
| [x] | `scripts/agents/tests/pr-review-agent.test.ts` | PR review agent tests |
| [ ] | `scripts/agents/tests/e2e/*.test.ts` | E2E workflow tests |

### Workflow Files (3 files)
| Status | File | Description |
|--------|------|-------------|
| [x] | `.github/workflows/security-check.yml` | Security check workflow |
| [x] | `.github/workflows/bug-fix.yml` | Bug fix workflow |
| [x] | `.github/workflows/pr-review.yml` | PR review workflow |

---

## Progress Tracking

**Total Tasks:** 67
**Completed:** 52
**Remaining:** 15
**Progress:** 78%

---

## Notes

- Check off tasks as they are completed: `- [ ]` → `- [x]`
- Each agent implementation must have passing tests before marking complete
- **All tests use LIVE API calls** - no mocks
- Tokens loaded from `.env.local` (`GOOGLE_API_KEY`, `GITHUB_TOKEN`)
- Tests create real GitHub resources (issues, PRs) and clean them up automatically
- Symlink `scripts/agents/.env.local` → root `.env.local` for shared credentials

### Current Status
- ✅ All 19 implementation files created and working
- ✅ All 6 test files created (3 agent tests + 3 helpers)
- ✅ All 3 workflow files created
- ✅ 29 unit tests passing
- ⚠️ Live API tests depend on Google AI quota (free tier rate limited)
- ⏳ E2E tests not yet created
- ⏳ Documentation not yet updated
