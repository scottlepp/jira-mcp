import { tool } from 'ai';
import { z } from 'zod';
import { execSync } from 'child_process';
import { access } from 'fs/promises';
import { join } from 'path';
import { TestResult } from '../agents/types.js';

/**
 * Test tools for running and analyzing tests
 */
export function createTestTools(workingDir: string) {
  const exec = (cmd: string, options?: { timeout?: number }): string => {
    return execSync(cmd, {
      cwd: workingDir,
      encoding: 'utf-8',
      timeout: options?.timeout || 300000, // 5 minute default
      maxBuffer: 10 * 1024 * 1024,
    });
  };

  return {
    /**
     * Run the test suite
     */
    runTests: tool({
      description: 'Run the project test suite',
      inputSchema: z.object({
        testPattern: z.string().optional().describe('Pattern to match test files'),
        watch: z.boolean().default(false).describe('Run in watch mode'),
      }),
      execute: async ({ testPattern, watch }: { testPattern?: string; watch: boolean }) => {
        try {
          let cmd = 'npm test';
          if (testPattern) cmd += ` -- ${testPattern}`;
          if (watch) cmd += ' -- --watch';

          const output = exec(cmd, { timeout: 600000 }); // 10 minute timeout

          // Parse test results if possible
          const results: TestResult[] = [];
          const passMatch = output.match(/(\d+) passed/);
          const failMatch = output.match(/(\d+) failed/);

          return {
            success: true,
            output,
            passed: passMatch ? parseInt(passMatch[1], 10) : undefined,
            failed: failMatch ? parseInt(failMatch[1], 10) : undefined,
            results,
          };
        } catch (error: unknown) {
          const err = error as { stdout?: string; stderr?: string; message?: string };
          return {
            success: false,
            error: `Tests failed: ${err.message || 'Unknown error'}`,
            output: err.stdout || err.stderr || '',
          };
        }
      },
    }),

    /**
     * Run a specific test file
     */
    runTestFile: tool({
      description: 'Run tests in a specific file',
      inputSchema: z.object({
        filePath: z.string().describe('Path to the test file'),
      }),
      execute: async ({ filePath }: { filePath: string }) => {
        try {
          const output = exec(`npm test -- ${filePath}`, { timeout: 300000 });

          return {
            success: true,
            output,
            file: filePath,
          };
        } catch (error: unknown) {
          const err = error as { stdout?: string; stderr?: string; message?: string };
          return {
            success: false,
            error: `Test failed: ${err.message || 'Unknown error'}`,
            output: err.stdout || err.stderr || '',
          };
        }
      },
    }),

    /**
     * Check if a file has tests
     */
    checkTestCoverage: tool({
      description: 'Check if a source file has corresponding tests',
      inputSchema: z.object({
        filePath: z.string().describe('Path to the source file'),
      }),
      execute: async ({ filePath }: { filePath: string }) => {
        // Skip non-source files
        if (
          filePath.includes('.test.') ||
          filePath.includes('.spec.') ||
          !filePath.match(/\.(ts|tsx|js|jsx)$/)
        ) {
          return {
            hasTests: true,
            reason: 'File is a test file or non-source file',
            filePath,
          };
        }

        // Check common test file patterns
        const testPatterns = [
          filePath.replace(/\.(ts|tsx|js|jsx)$/, '.test.$1'),
          filePath.replace(/\.(ts|tsx|js|jsx)$/, '.spec.$1'),
          filePath.replace(/src\//, 'tests/').replace(/\.(ts|tsx|js|jsx)$/, '.test.$1'),
          filePath.replace(/src\//, 'test/').replace(/\.(ts|tsx|js|jsx)$/, '.test.$1'),
          filePath
            .replace(/src\//, '__tests__/')
            .replace(/\.(ts|tsx|js|jsx)$/, '.test.$1'),
        ];

        for (const pattern of testPatterns) {
          try {
            await access(join(workingDir, pattern));
            return {
              hasTests: true,
              testFile: pattern,
              filePath,
            };
          } catch {
            // File doesn't exist, continue
          }
        }

        return {
          hasTests: false,
          reason: 'No corresponding test file found',
          filePath,
          suggestedTestPath: testPatterns[0],
        };
      },
    }),

    /**
     * Run tests with coverage
     */
    runTestsWithCoverage: tool({
      description: 'Run tests with coverage report',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const output = exec('npm run test:coverage', { timeout: 600000 });

          // Parse coverage summary if available
          const coverageMatch = output.match(
            /All files[^\n]*\n[^\d]*(\d+\.?\d*)/
          );
          const coverage = coverageMatch
            ? parseFloat(coverageMatch[1])
            : undefined;

          return {
            success: true,
            output,
            coverage,
          };
        } catch (error: unknown) {
          const err = error as { stdout?: string; stderr?: string; message?: string };
          return {
            success: false,
            error: `Coverage run failed: ${err.message || 'Unknown error'}`,
            output: err.stdout || err.stderr || '',
          };
        }
      },
    }),

    /**
     * Build the project
     */
    buildProject: tool({
      description: 'Build the project to check for compile errors',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const output = exec('npm run build', { timeout: 300000 });

          return {
            success: true,
            output,
          };
        } catch (error: unknown) {
          const err = error as { stdout?: string; stderr?: string; message?: string };
          return {
            success: false,
            error: `Build failed: ${err.message || 'Unknown error'}`,
            output: err.stdout || err.stderr || '',
          };
        }
      },
    }),

    /**
     * Type check the project
     */
    typeCheck: tool({
      description: 'Run TypeScript type checking',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const output = exec('npx tsc --noEmit', { timeout: 120000 });

          return {
            success: true,
            output,
            errors: 0,
          };
        } catch (error: unknown) {
          const err = error as { stdout?: string; stderr?: string; message?: string };
          const output = err.stdout || err.stderr || '';

          // Count type errors
          const errorCount = (output.match(/error TS\d+/g) || []).length;

          return {
            success: false,
            error: `Type check failed with ${errorCount} errors`,
            output,
            errors: errorCount,
          };
        }
      },
    }),
  };
}
