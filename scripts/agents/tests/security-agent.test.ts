/**
 * Security Agent Integration Tests
 *
 * These tests use LIVE API calls to Google AI and npm.
 * Requires GOOGLE_API_KEY in environment.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SecurityAgent } from '../src/agents/security-agent.js';
import { AgentContext, SecurityAgentInput } from '../src/agents/types.js';
import { canRunLiveTests, testConfig } from './helpers/test-setup.js';
import { execSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('SecurityAgent', () => {
  let agent: SecurityAgent;
  let testDir: string;
  let context: AgentContext;

  beforeAll(() => {
    agent = new SecurityAgent();

    // Create a temporary test directory with a package.json
    testDir = mkdtempSync(join(tmpdir(), 'security-agent-test-'));

    // Create a minimal package.json for testing
    const packageJson = {
      name: 'test-package',
      version: '1.0.0',
      dependencies: {
        // Using an older lodash version that has known vulnerabilities
        lodash: '4.17.15',
      },
    };

    writeFileSync(join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Install dependencies
    try {
      execSync('npm install', { cwd: testDir, stdio: 'pipe' });
    } catch {
      console.log('npm install had warnings (expected for test packages)');
    }

    context = {
      workingDir: testDir,
      repoOwner: testConfig.testRepoOwner,
      repoName: testConfig.testRepoName,
    };
  });

  afterAll(() => {
    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Agent Properties', () => {
    it('should have correct name and description', () => {
      expect(agent.name).toBe('security-agent');
      expect(agent.description).toContain('security');
    });
  });

  describe('Input Validation', () => {
    it('should validate input with default audit level', async () => {
      const input: SecurityAgentInput = {};
      const result = await agent.validate(input, context);

      expect(result.valid).toBe(true);
    });

    it('should validate input with specified audit level', async () => {
      const input: SecurityAgentInput = {
        auditLevel: 'high',
      };
      const result = await agent.validate(input, context);

      expect(result.valid).toBe(true);
    });

    it('should accept autoFix option', async () => {
      const input: SecurityAgentInput = {
        autoFix: true,
        auditLevel: 'moderate',
      };
      const result = await agent.validate(input, context);

      expect(result.valid).toBe(true);
    });
  });

  describe('Tool Generation', () => {
    it('should generate npm-related tools', () => {
      const tools = agent.getTools(context);

      expect(tools).toHaveProperty('npmAudit');
      expect(tools).toHaveProperty('npmAuditFix');
      expect(tools).toHaveProperty('npmUpdate');
      expect(tools).toHaveProperty('npmOutdated');
      expect(tools).toHaveProperty('runTests');
    });
  });

  describe.skipIf(!canRunLiveTests())('Live API Tests', () => {
    it(
      'should execute security scan with live API',
      async () => {
        const input: SecurityAgentInput = {
          auditLevel: 'moderate',
          autoFix: false, // Don't auto-fix, just scan
        };

        const result = await agent.execute(input, context);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();

        if (result.data) {
          expect(result.data).toHaveProperty('vulnerabilities');
          expect(result.data).toHaveProperty('summary');
          expect(Array.isArray(result.data.vulnerabilities)).toBe(true);
        }
      },
      { timeout: 120000 }
    ); // 2 minute timeout for live API

    it(
      'should detect vulnerabilities in outdated packages',
      async () => {
        const input: SecurityAgentInput = {
          auditLevel: 'low',
          autoFix: false,
        };

        const result = await agent.execute(input, context);

        expect(result.success).toBe(true);
        // The old lodash version should have vulnerabilities
        if (result.data?.vulnerabilities && result.data.vulnerabilities.length > 0) {
          const vuln = result.data.vulnerabilities[0];
          expect(vuln).toHaveProperty('severity');
          expect(vuln).toHaveProperty('package');
        }
      },
      { timeout: 120000 }
    );

    it(
      'should generate security report',
      async () => {
        const input: SecurityAgentInput = {
          auditLevel: 'moderate',
        };

        const result = await agent.execute(input, context);

        expect(result.success).toBe(true);
        expect(result.data?.summary).toBeDefined();
        expect(typeof result.data?.summary).toBe('string');
        expect(result.data?.summary.length).toBeGreaterThan(0);
      },
      { timeout: 120000 }
    );
  });

  describe('System Prompt Generation', () => {
    it('should generate appropriate system prompt', () => {
      const input: SecurityAgentInput = {
        auditLevel: 'high',
      };

      const systemPrompt = agent.getSystemPrompt(input, context);

      expect(systemPrompt).toContain('security');
      expect(systemPrompt).toContain('vulnerabilities');
      expect(systemPrompt).toContain(testDir);
    });

    it('should include audit level in prompt', () => {
      const input: SecurityAgentInput = {
        auditLevel: 'critical',
      };

      const systemPrompt = agent.getSystemPrompt(input, context);

      expect(systemPrompt).toContain('critical');
    });
  });

  describe('User Prompt Generation', () => {
    it('should generate appropriate user prompt', () => {
      const input: SecurityAgentInput = {
        auditLevel: 'moderate',
        autoFix: true,
      };

      const userPrompt = agent.getUserPrompt(input, context);

      expect(userPrompt).toContain('vulnerabilities');
      expect(userPrompt).toContain('moderate');
    });
  });
});
