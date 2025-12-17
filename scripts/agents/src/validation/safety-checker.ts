import { ProposedChange, AgentContext } from '../agents/types.js';

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
  severity?: 'warning' | 'error' | 'critical';
}

/**
 * Patterns that indicate potentially harmful code
 */
const HARMFUL_PATTERNS: Array<{ pattern: RegExp; description: string; severity: 'warning' | 'error' | 'critical' }> = [
  // Shell injection
  { pattern: /eval\s*\(/, description: 'eval() can execute arbitrary code', severity: 'critical' },
  { pattern: /new\s+Function\s*\(/, description: 'new Function() can execute arbitrary code', severity: 'critical' },
  { pattern: /child_process\.exec\s*\(/, description: 'exec() with unsanitized input', severity: 'error' },

  // File system attacks
  { pattern: /\.\.\/\.\.\/\.\./, description: 'Path traversal attack pattern', severity: 'critical' },
  { pattern: /\/etc\/passwd/, description: 'Sensitive system file access', severity: 'critical' },
  { pattern: /\/etc\/shadow/, description: 'Sensitive system file access', severity: 'critical' },

  // Credential exposure
  { pattern: /password\s*[:=]\s*['"][^'"]{8,}['"]/, description: 'Hardcoded password detected', severity: 'critical' },
  { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]{16,}['"]/, description: 'Hardcoded API key detected', severity: 'critical' },
  { pattern: /secret\s*[:=]\s*['"][^'"]{16,}['"]/, description: 'Hardcoded secret detected', severity: 'critical' },
  { pattern: /private[_-]?key\s*[:=]\s*['"]-----BEGIN/, description: 'Private key in code', severity: 'critical' },

  // Network attacks
  { pattern: /0\.0\.0\.0.*listen/, description: 'Listening on all interfaces', severity: 'warning' },

  // SQL injection patterns
  { pattern: /`\s*SELECT.*\$\{/, description: 'Potential SQL injection in template literal', severity: 'error' },
  { pattern: /'\s*\+\s*.*\+\s*'.*(?:SELECT|INSERT|UPDATE|DELETE)/i, description: 'Potential SQL injection via concatenation', severity: 'error' },

  // XSS patterns
  { pattern: /innerHTML\s*=\s*[^'"]+(?:req|user|input|param)/, description: 'Potential XSS via innerHTML', severity: 'error' },
  { pattern: /dangerouslySetInnerHTML/, description: 'Using dangerouslySetInnerHTML', severity: 'warning' },
];

/**
 * Files that should never be modified by agents
 */
const PROTECTED_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'credentials.json',
  'secrets.json',
  'service-account.json',
  '.git/config',
  '.npmrc',
  '.yarnrc',
];

/**
 * Patterns for protected paths
 */
const PROTECTED_PATH_PATTERNS = [
  /^\.ssh\//,
  /^\.aws\//,
  /^\.gcloud\//,
  /secrets?\//i,
  /credentials?\//i,
  /private[_-]?keys?\//i,
];

/**
 * Sensitive tool names that require extra scrutiny
 */
const SENSITIVE_TOOLS = [
  'writeFile',
  'gitCommit',
  'gitPush',
  'createPullRequest',
  'npmAuditFix',
  'npmUpdate',
];

/**
 * Safety checker for validating agent actions and proposed changes
 */
export class SafetyChecker {
  /**
   * Check if a tool call is safe to execute
   */
  async checkToolCall(
    toolName: string,
    args: Record<string, unknown>,
    context: AgentContext
  ): Promise<SafetyCheckResult> {
    // Check for sensitive tools
    if (SENSITIVE_TOOLS.includes(toolName)) {
      const argsStr = JSON.stringify(args);

      // Check for harmful patterns in arguments
      for (const { pattern, description, severity } of HARMFUL_PATTERNS) {
        if (pattern.test(argsStr)) {
          return {
            safe: false,
            reason: `${description} detected in tool arguments`,
            severity,
          };
        }
      }

      // Check for protected file access
      const filePath = (args.path || args.filePath) as string | undefined;
      if (filePath) {
        const protectedCheck = this.checkProtectedFile(filePath);
        if (!protectedCheck.safe) {
          return protectedCheck;
        }
      }
    }

    return { safe: true };
  }

  /**
   * Check if a proposed change is safe to apply
   */
  async checkChange(change: ProposedChange): Promise<SafetyCheckResult> {
    // Check protected files
    const protectedCheck = this.checkProtectedFile(change.filePath);
    if (!protectedCheck.safe) {
      return protectedCheck;
    }

    // Check for harmful patterns in new content
    if (change.newContent) {
      for (const { pattern, description, severity } of HARMFUL_PATTERNS) {
        if (pattern.test(change.newContent)) {
          return {
            safe: false,
            reason: `${description} in proposed change`,
            severity,
          };
        }
      }
    }

    // Check for security regressions
    if (change.changeType === 'modify' && change.originalContent && change.newContent) {
      const regressionCheck = this.checkSecurityRegression(
        change.originalContent,
        change.newContent
      );
      if (!regressionCheck.safe) {
        return regressionCheck;
      }
    }

    return { safe: true };
  }

  /**
   * Check if a file path is protected
   */
  private checkProtectedFile(filePath: string): SafetyCheckResult {
    // Check exact protected files
    for (const protectedFile of PROTECTED_FILES) {
      if (filePath === protectedFile || filePath.endsWith(`/${protectedFile}`)) {
        return {
          safe: false,
          reason: `Cannot modify protected file: ${filePath}`,
          severity: 'critical',
        };
      }
    }

    // Check protected path patterns
    for (const pattern of PROTECTED_PATH_PATTERNS) {
      if (pattern.test(filePath)) {
        return {
          safe: false,
          reason: `Cannot modify files in protected path: ${filePath}`,
          severity: 'critical',
        };
      }
    }

    return { safe: true };
  }

  /**
   * Check if a change removes security measures
   */
  private checkSecurityRegression(
    original: string,
    modified: string
  ): SafetyCheckResult {
    // Security-related patterns to check
    const securityPatterns = [
      { pattern: /validate/gi, name: 'validation' },
      { pattern: /sanitize/gi, name: 'sanitization' },
      { pattern: /escape/gi, name: 'escaping' },
      { pattern: /authenticate/gi, name: 'authentication' },
      { pattern: /authorize/gi, name: 'authorization' },
      { pattern: /csrf/gi, name: 'CSRF protection' },
      { pattern: /xss/gi, name: 'XSS protection' },
      { pattern: /helmet/gi, name: 'security headers' },
      { pattern: /rateLimit/gi, name: 'rate limiting' },
    ];

    for (const { pattern, name } of securityPatterns) {
      const originalMatches = (original.match(pattern) || []).length;
      const modifiedMatches = (modified.match(pattern) || []).length;

      if (originalMatches > 0 && modifiedMatches < originalMatches) {
        return {
          safe: false,
          reason: `Potential security regression: ${name} code was reduced or removed`,
          severity: 'warning',
        };
      }
    }

    return { safe: true };
  }

  /**
   * Validate an issue description to ensure it's safe to auto-fix
   */
  validateIssueForAutoFix(title: string, body: string): SafetyCheckResult {
    const combinedText = `${title} ${body}`.toLowerCase();

    // Patterns that indicate potentially harmful requests
    const harmfulRequestPatterns = [
      { pattern: /bypass.*auth/i, description: 'Request to bypass authentication' },
      { pattern: /disable.*security/i, description: 'Request to disable security' },
      { pattern: /remove.*validation/i, description: 'Request to remove validation' },
      { pattern: /add.*backdoor/i, description: 'Request to add backdoor' },
      { pattern: /expose.*secret/i, description: 'Request to expose secrets' },
      { pattern: /skip.*check/i, description: 'Request to skip checks' },
      { pattern: /hardcode.*password/i, description: 'Request to hardcode passwords' },
      { pattern: /remove.*auth/i, description: 'Request to remove authentication' },
      { pattern: /disable.*csrf/i, description: 'Request to disable CSRF protection' },
      { pattern: /ignore.*ssl/i, description: 'Request to ignore SSL' },
    ];

    for (const { pattern, description } of harmfulRequestPatterns) {
      if (pattern.test(combinedText)) {
        return {
          safe: false,
          reason: `Potentially harmful request detected: ${description}`,
          severity: 'critical',
        };
      }
    }

    // Check if it appears to be a code-related bug
    const codeIndicators = [
      /error/i, /bug/i, /crash/i, /exception/i,
      /fix/i, /broken/i, /doesn'?t work/i, /fails/i,
      /undefined/i, /null/i, /NaN/i,
      /line \d+/i, /\.ts/i, /\.js/i, /function/i,
      /return/i, /import/i, /export/i,
    ];

    const isCodeRelated = codeIndicators.some((p) => p.test(combinedText));

    if (!isCodeRelated) {
      return {
        safe: false,
        reason: 'Issue does not appear to be code-related',
        severity: 'warning',
      };
    }

    return { safe: true };
  }
}
