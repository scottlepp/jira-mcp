import { tool } from 'ai';
import { z } from 'zod';
import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { ProposedChange } from '../agents/types.js';

/**
 * File tools for reading and writing files
 */
export function createFileTools(workingDir: string) {
  return {
    /**
     * Read a file from the repository
     */
    readFile: tool({
      description: 'Read the contents of a file from the repository',
      inputSchema: z.object({
        path: z.string().describe('Relative path to the file from the repository root'),
      }),
      execute: async ({ path }: { path: string }) => {
        const fullPath = join(workingDir, path);
        try {
          const content = await readFile(fullPath, 'utf-8');
          return { success: true, content, path };
        } catch (error) {
          return {
            success: false,
            error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            path,
          };
        }
      },
    }),

    /**
     * Write content to a file (creates a proposed change)
     */
    writeFile: tool({
      description: 'Write content to a file. This creates a proposed change that will be reviewed.',
      inputSchema: z.object({
        path: z.string().describe('Relative path to the file'),
        content: z.string().describe('Content to write to the file'),
        description: z.string().describe('Description of what this change does'),
      }),
      execute: async ({ path, content, description }: { path: string; content: string; description: string }) => {
        const fullPath = join(workingDir, path);
        let originalContent: string | undefined;
        let changeType: 'create' | 'modify' = 'create';

        try {
          await access(fullPath);
          originalContent = await readFile(fullPath, 'utf-8');
          changeType = 'modify';
        } catch {
          // File doesn't exist, will create
        }

        const proposedChange: ProposedChange = {
          filePath: path,
          changeType,
          originalContent,
          newContent: content,
          description,
          riskLevel: 'medium',
        };

        return {
          success: true,
          message: `Proposed ${changeType} for ${path}`,
          proposedChange,
        };
      },
    }),

    /**
     * Check if a file exists
     */
    fileExists: tool({
      description: 'Check if a file exists in the repository',
      inputSchema: z.object({
        path: z.string().describe('Relative path to the file'),
      }),
      execute: async ({ path }: { path: string }) => {
        const fullPath = join(workingDir, path);
        try {
          await access(fullPath);
          return { exists: true, path };
        } catch {
          return { exists: false, path };
        }
      },
    }),

    /**
     * List files matching a pattern
     */
    listFiles: tool({
      description: 'List files in a directory',
      inputSchema: z.object({
        directory: z.string().default('.').describe('Directory to list'),
        pattern: z.string().optional().describe('Glob pattern to match'),
      }),
      execute: async ({ directory, pattern }: { directory: string; pattern?: string }) => {
        const { execSync } = await import('child_process');
        const fullPath = join(workingDir, directory);

        try {
          let cmd: string;
          if (pattern) {
            cmd = `find ${fullPath} -name "${pattern}" -type f 2>/dev/null | head -100`;
          } else {
            cmd = `find ${fullPath} -type f -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -100`;
          }

          const result = execSync(cmd, { encoding: 'utf-8' });
          const files = result
            .trim()
            .split('\n')
            .filter(Boolean)
            .map((f) => f.replace(workingDir + '/', ''));

          return { success: true, files, directory };
        } catch (error) {
          return {
            success: false,
            error: `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`,
            files: [],
          };
        }
      },
    }),

    /**
     * Search for content in files
     */
    searchCode: tool({
      description: 'Search for a pattern in the codebase',
      inputSchema: z.object({
        pattern: z.string().describe('Search pattern (regex supported)'),
        filePattern: z.string().optional().describe('File pattern to filter (e.g., "*.ts")'),
        maxResults: z.number().default(50).describe('Maximum number of results'),
      }),
      execute: async ({ pattern, filePattern, maxResults }: { pattern: string; filePattern?: string; maxResults: number }) => {
        const { execSync } = await import('child_process');

        try {
          const includeArg = filePattern ? `--include="${filePattern}"` : '';
          const cmd = `grep -rn ${includeArg} "${pattern}" ${workingDir} --exclude-dir=node_modules --exclude-dir=.git 2>/dev/null | head -${maxResults}`;

          const result = execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
          const matches = result
            .trim()
            .split('\n')
            .filter(Boolean)
            .map((line) => {
              const [fullPath, ...rest] = line.split(':');
              const relativePath = fullPath.replace(workingDir + '/', '');
              const lineNum = rest[0];
              const content = rest.slice(1).join(':');
              return { file: relativePath, line: parseInt(lineNum, 10), content };
            });

          return { success: true, matches, count: matches.length };
        } catch {
          return { success: true, matches: [], count: 0 };
        }
      },
    }),
  };
}
