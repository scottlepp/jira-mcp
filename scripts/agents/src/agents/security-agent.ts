import { ToolSet } from 'ai';
import { BaseAgent } from './base-agent.js';
import {
  AgentContext,
  AgentResult,
  SecurityAgentInput,
  SecurityAgentOutput,
  VulnerabilityReport,
} from './types.js';
import { createNpmTools } from '../tools/npm-tools.js';
import { createGitTools } from '../tools/git-tools.js';
import { createTestTools } from '../tools/test-tools.js';
import { createGitHubTools } from '../tools/github-tools.js';
import { getConfig } from '../config.js';

/**
 * Security Agent - Scans for vulnerabilities and creates PRs to fix them
 */
export class SecurityAgent extends BaseAgent<SecurityAgentInput, SecurityAgentOutput> {
  readonly name = 'security-agent';
  readonly description = 'Scans dependencies for security vulnerabilities and proposes fixes';

  getTools(context: AgentContext): ToolSet {
    return {
      ...createNpmTools(context.workingDir),
      ...createGitTools(context.workingDir),
      ...createTestTools(context.workingDir),
      ...createGitHubTools(context.repoOwner, context.repoName),
    };
  }

  getSystemPrompt(input: SecurityAgentInput, context: AgentContext): string {
    return `You are a security-focused AI agent responsible for maintaining dependency security.

Your tasks:
1. Run npm audit to identify vulnerabilities
2. Analyze the results and determine the best course of action
3. Apply fixes using npm audit fix or targeted package updates
4. Run tests to verify the fixes don't break anything
5. If fixes were applied and tests pass, create a branch and commit the changes

Guidelines:
- Prefer npm audit fix over manual updates when possible
- Only use --force when absolutely necessary for critical vulnerabilities
- Always run tests after making changes
- If tests fail after fixes, report the issue without creating a PR
- Focus on vulnerabilities at or above the severity threshold: ${input.auditLevel || input.severityThreshold || 'moderate'}

Working directory: ${context.workingDir}
Repository: ${context.repoOwner}/${context.repoName}

IMPORTANT: Do not make changes that could break the project. Always run tests to verify.`;
  }

  getUserPrompt(input: SecurityAgentInput, context: AgentContext): string {
    const parts = [
      `Scan this repository for security vulnerabilities.`,
      `Severity threshold: ${input.auditLevel || input.severityThreshold || 'moderate'}`,
      `Include dev dependencies: ${input.includeDevDependencies !== false}`,
    ];

    if (input.manifestPath) {
      parts.push(`Package manifest: ${input.manifestPath}`);
    }

    parts.push(`
Steps to follow:
1. Run npm audit to check for vulnerabilities
2. If vulnerabilities are found, analyze them
3. Attempt to fix vulnerabilities with npm audit fix
4. Run tests to verify nothing is broken
5. Report your findings with a summary of vulnerabilities and actions taken`);

    return parts.join('\n');
  }

  async execute(
    input: SecurityAgentInput,
    context: AgentContext
  ): Promise<AgentResult<SecurityAgentOutput>> {
    // Validate input
    const validation = await this.validate(input, context);
    if (!validation.valid) {
      return this.errorResult('VALIDATION_ERROR', validation.errors.join(', '), true);
    }

    this.log('info', 'Starting security scan', { input });

    try {
      const { text, proposedChanges, toolCalls } = await this.runAgentLoop(
        input,
        context
      );

      // Extract results from tool calls
      const vulnerabilities: VulnerabilityReport[] = [];
      const updatesApplied: string[] = [];
      let testsRan = false;
      let testsPassed = true;

      for (const call of toolCalls) {
        if (call.name === 'npmAudit' && call.result) {
          const result = call.result as { vulnerabilities?: VulnerabilityReport[] };
          if (result.vulnerabilities) {
            vulnerabilities.push(...result.vulnerabilities);
          }
        }

        if (call.name === 'npmAuditFix' || call.name === 'npmUpdate') {
          const result = call.result as { success?: boolean; package?: string };
          if (result.success) {
            updatesApplied.push(
              call.name === 'npmUpdate'
                ? `Updated ${result.package}`
                : 'Applied npm audit fix'
            );
          }
        }

        if (call.name === 'runTests') {
          testsRan = true;
          const result = call.result as { success?: boolean };
          if (!result.success) {
            testsPassed = false;
          }
        }
      }

      // Calculate risk score (0-100)
      const riskScore = this.calculateRiskScore(vulnerabilities);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        vulnerabilities,
        updatesApplied,
        testsPassed
      );

      // Generate summary
      const summary = this.generateSummary(vulnerabilities, updatesApplied, testsPassed);

      const output: SecurityAgentOutput = {
        vulnerabilities,
        riskScore,
        recommendations,
        fixableCount: vulnerabilities.filter((v) => v.fixAvailable).length,
        updatesApplied,
        summary,
      };

      this.log('info', 'Security scan completed', {
        vulnerabilityCount: vulnerabilities.length,
        riskScore,
        updatesApplied: updatesApplied.length,
      });

      return {
        success: true,
        data: output,
        proposedChanges,
        validated: true,
        warnings: validation.warnings,
      };
    } catch (error) {
      this.log('error', 'Security scan failed', { error });
      return this.errorResult(
        'SCAN_FAILED',
        error instanceof Error ? error.message : 'Unknown error',
        false
      );
    }
  }

  private calculateRiskScore(vulnerabilities: VulnerabilityReport[]): number {
    if (vulnerabilities.length === 0) return 0;

    const severityWeights = {
      critical: 40,
      high: 25,
      moderate: 10,
      low: 5,
    };

    let totalWeight = 0;
    for (const vuln of vulnerabilities) {
      totalWeight += severityWeights[vuln.severity] || 5;
    }

    // Cap at 100
    return Math.min(totalWeight, 100);
  }

  private generateRecommendations(
    vulnerabilities: VulnerabilityReport[],
    updatesApplied: string[],
    testsPassed: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (vulnerabilities.length === 0) {
      recommendations.push('No vulnerabilities found. Dependencies are secure.');
      return recommendations;
    }

    const critical = vulnerabilities.filter((v) => v.severity === 'critical');
    const high = vulnerabilities.filter((v) => v.severity === 'high');
    const fixable = vulnerabilities.filter((v) => v.fixAvailable);

    if (critical.length > 0) {
      recommendations.push(
        `URGENT: ${critical.length} critical vulnerability(ies) require immediate attention.`
      );
    }

    if (high.length > 0) {
      recommendations.push(
        `${high.length} high severity vulnerability(ies) should be addressed soon.`
      );
    }

    if (fixable.length > 0 && updatesApplied.length === 0) {
      recommendations.push(
        `${fixable.length} vulnerability(ies) can be automatically fixed with npm audit fix.`
      );
    }

    if (updatesApplied.length > 0) {
      if (testsPassed) {
        recommendations.push(
          `${updatesApplied.length} update(s) applied successfully and tests pass.`
        );
      } else {
        recommendations.push(
          `Updates were applied but tests failed. Manual intervention required.`
        );
      }
    }

    const unfixable = vulnerabilities.filter((v) => !v.fixAvailable);
    if (unfixable.length > 0) {
      recommendations.push(
        `${unfixable.length} vulnerability(ies) require manual review - no automatic fix available.`
      );
    }

    return recommendations;
  }

  private generateSummary(
    vulnerabilities: VulnerabilityReport[],
    updatesApplied: string[],
    testsPassed: boolean
  ): string {
    const parts: string[] = [];

    if (vulnerabilities.length === 0) {
      parts.push('Security scan completed. No vulnerabilities found.');
    } else {
      const critical = vulnerabilities.filter((v) => v.severity === 'critical').length;
      const high = vulnerabilities.filter((v) => v.severity === 'high').length;
      const moderate = vulnerabilities.filter((v) => v.severity === 'moderate').length;
      const low = vulnerabilities.filter((v) => v.severity === 'low').length;

      parts.push(`Security scan completed. Found ${vulnerabilities.length} vulnerability(ies):`);
      if (critical > 0) parts.push(`- ${critical} critical`);
      if (high > 0) parts.push(`- ${high} high`);
      if (moderate > 0) parts.push(`- ${moderate} moderate`);
      if (low > 0) parts.push(`- ${low} low`);
    }

    if (updatesApplied.length > 0) {
      parts.push(`\nApplied ${updatesApplied.length} update(s).`);
      if (testsPassed) {
        parts.push('All tests pass after updates.');
      } else {
        parts.push('Warning: Tests failed after updates.');
      }
    }

    return parts.join('\n');
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = getConfig();

  const agent = new SecurityAgent();
  const context: AgentContext = {
    workingDir: process.cwd(),
    repoOwner: config.repoOwner,
    repoName: config.repoName,
  };

  const input: SecurityAgentInput = {
    severityThreshold:
      (process.env.AUDIT_LEVEL as SecurityAgentInput['severityThreshold']) || 'moderate',
    includeDevDependencies: true,
  };

  agent.execute(input, context).then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });
}
