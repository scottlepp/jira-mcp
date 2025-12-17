import { tool } from 'ai';
import { z } from 'zod';
import { execSync } from 'child_process';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { VulnerabilityReport } from '../agents/types.js';

/**
 * NPM tools for package management and security scanning
 */
export function createNpmTools(workingDir: string) {
  const exec = (cmd: string, options?: { timeout?: number }): string => {
    return execSync(cmd, {
      cwd: workingDir,
      encoding: 'utf-8',
      timeout: options?.timeout || 120000, // 2 minute default
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
  };

  return {
    /**
     * Run npm audit to check for vulnerabilities
     */
    npmAudit: tool({
      description: 'Run npm audit to check for security vulnerabilities in dependencies',
      inputSchema: z.object({
        auditLevel: z
          .enum(['low', 'moderate', 'high', 'critical'])
          .default('moderate')
          .describe('Minimum severity level to report'),
      }),
      execute: async ({ auditLevel }: { auditLevel: 'low' | 'moderate' | 'high' | 'critical' }) => {
        try {
          // npm audit exits with non-zero when vulnerabilities found
          let auditJson: string;
          try {
            auditJson = exec(`npm audit --json --audit-level=${auditLevel}`);
          } catch (error: unknown) {
            // npm audit returns non-zero exit code when vulnerabilities exist
            if (error && typeof error === 'object' && 'stdout' in error) {
              auditJson = (error as { stdout: string }).stdout;
            } else {
              throw error;
            }
          }

          const audit = JSON.parse(auditJson);
          const vulnerabilities: VulnerabilityReport[] = [];

          // Parse vulnerabilities from npm audit output
          if (audit.vulnerabilities) {
            for (const [pkgName, vuln] of Object.entries(audit.vulnerabilities)) {
              const v = vuln as {
                severity: string;
                via: Array<{ title?: string; url?: string; source?: number } | string>;
                fixAvailable: boolean | { name: string; version: string };
              };

              const viaInfo = v.via[0];
              const title =
                typeof viaInfo === 'object' && viaInfo.title
                  ? viaInfo.title
                  : `Vulnerability in ${pkgName}`;

              vulnerabilities.push({
                id:
                  typeof viaInfo === 'object' && viaInfo.source
                    ? String(viaInfo.source)
                    : pkgName,
                package: pkgName,
                severity: v.severity as VulnerabilityReport['severity'],
                title,
                description: title,
                fixAvailable: !!v.fixAvailable,
                fixedIn:
                  typeof v.fixAvailable === 'object'
                    ? v.fixAvailable.version
                    : undefined,
              });
            }
          }

          return {
            success: true,
            vulnerabilities,
            totalVulnerabilities: vulnerabilities.length,
            metadata: audit.metadata,
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to run npm audit: ${error instanceof Error ? error.message : 'Unknown error'}`,
            vulnerabilities: [],
          };
        }
      },
    }),

    /**
     * Run npm audit fix
     */
    npmAuditFix: tool({
      description: 'Run npm audit fix to automatically fix vulnerabilities',
      inputSchema: z.object({
        force: z
          .boolean()
          .default(false)
          .describe('Force fix (may include breaking changes)'),
        dryRun: z
          .boolean()
          .default(false)
          .describe('Show what would be changed without making changes'),
      }),
      execute: async ({ force, dryRun }: { force: boolean; dryRun: boolean }) => {
        try {
          let cmd = 'npm audit fix';
          if (force) cmd += ' --force';
          if (dryRun) cmd += ' --dry-run';

          const output = exec(cmd, { timeout: 300000 }); // 5 minute timeout

          return {
            success: true,
            output,
            dryRun,
            force,
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to run npm audit fix: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),

    /**
     * Update a specific package
     */
    npmUpdate: tool({
      description: 'Update a specific npm package',
      inputSchema: z.object({
        packageName: z.string().describe('Name of the package to update'),
        version: z.string().optional().describe('Specific version to update to'),
      }),
      execute: async ({ packageName, version }: { packageName: string; version?: string }) => {
        try {
          const cmd = version
            ? `npm install ${packageName}@${version}`
            : `npm update ${packageName}`;

          const output = exec(cmd, { timeout: 120000 });

          return {
            success: true,
            package: packageName,
            version,
            output,
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to update package: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),

    /**
     * Get outdated packages
     */
    npmOutdated: tool({
      description: 'List outdated packages in the project',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          let outdatedJson: string;
          try {
            outdatedJson = exec('npm outdated --json');
          } catch (error: unknown) {
            // npm outdated returns non-zero exit when packages are outdated
            if (error && typeof error === 'object' && 'stdout' in error) {
              outdatedJson = (error as { stdout: string }).stdout || '{}';
            } else {
              outdatedJson = '{}';
            }
          }

          const outdated = JSON.parse(outdatedJson || '{}');
          const packages = Object.entries(outdated).map(([name, info]) => {
            const i = info as { current: string; wanted: string; latest: string };
            return {
              name,
              current: i.current,
              wanted: i.wanted,
              latest: i.latest,
            };
          });

          return {
            success: true,
            packages,
            count: packages.length,
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to check outdated packages: ${error instanceof Error ? error.message : 'Unknown error'}`,
            packages: [],
          };
        }
      },
    }),

    /**
     * Read package.json
     */
    readPackageJson: tool({
      description: 'Read the package.json file',
      inputSchema: z.object({
        path: z.string().default('package.json').describe('Path to package.json'),
      }),
      execute: async ({ path }: { path: string }) => {
        try {
          const content = await readFile(join(workingDir, path), 'utf-8');
          const pkg = JSON.parse(content);

          return {
            success: true,
            name: pkg.name,
            version: pkg.version,
            dependencies: pkg.dependencies || {},
            devDependencies: pkg.devDependencies || {},
            scripts: pkg.scripts || {},
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to read package.json: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),

    /**
     * Install dependencies
     */
    npmInstall: tool({
      description: 'Run npm install to install dependencies',
      inputSchema: z.object({
        clean: z.boolean().default(false).describe('Run npm ci instead of npm install'),
      }),
      execute: async ({ clean }: { clean: boolean }) => {
        try {
          const cmd = clean ? 'npm ci' : 'npm install';
          const output = exec(cmd, { timeout: 300000 }); // 5 minute timeout

          return {
            success: true,
            output,
            command: cmd,
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to install dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),
  };
}
