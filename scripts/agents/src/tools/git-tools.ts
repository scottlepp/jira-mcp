import { tool } from 'ai';
import { z } from 'zod';
import { execSync } from 'child_process';

/**
 * Git tools for repository operations
 */
export function createGitTools(workingDir: string) {
  const exec = (cmd: string): string => {
    return execSync(cmd, { cwd: workingDir, encoding: 'utf-8' });
  };

  return {
    /**
     * Get git status
     */
    gitStatus: tool({
      description: 'Get the current git status showing modified, staged, and untracked files',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const status = exec('git status --porcelain');
          const lines = status.trim().split('\n').filter(Boolean);

          const files = lines.map((line) => ({
            status: line.substring(0, 2).trim(),
            path: line.substring(3),
          }));

          return {
            success: true,
            files,
            clean: files.length === 0,
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to get git status: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),

    /**
     * Get git diff
     */
    gitDiff: tool({
      description: 'Get the diff of changes in the repository',
      inputSchema: z.object({
        staged: z.boolean().default(false).describe('Show only staged changes'),
        file: z.string().optional().describe('Show diff for a specific file'),
      }),
      execute: async ({ staged, file }: { staged: boolean; file?: string }) => {
        try {
          let cmd = 'git diff';
          if (staged) cmd += ' --staged';
          if (file) cmd += ` -- "${file}"`;

          const diff = exec(cmd);
          return { success: true, diff };
        } catch (error) {
          return {
            success: false,
            error: `Failed to get git diff: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),

    /**
     * Create a new branch
     */
    createBranch: tool({
      description: 'Create and checkout a new git branch',
      inputSchema: z.object({
        branchName: z.string().describe('Name of the new branch'),
        baseBranch: z.string().default('main').describe('Base branch to create from'),
      }),
      execute: async ({ branchName, baseBranch }: { branchName: string; baseBranch: string }) => {
        try {
          exec(`git checkout ${baseBranch}`);
          exec(`git pull origin ${baseBranch}`);
          exec(`git checkout -b ${branchName}`);
          return { success: true, branch: branchName };
        } catch (error) {
          return {
            success: false,
            error: `Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),

    /**
     * Stage files
     */
    gitAdd: tool({
      description: 'Stage files for commit',
      inputSchema: z.object({
        files: z.array(z.string()).default([]).describe('Files to stage (empty for all)'),
      }),
      execute: async ({ files }: { files: string[] }) => {
        try {
          if (files.length === 0) {
            exec('git add -A');
          } else {
            exec(`git add ${files.map((f) => `"${f}"`).join(' ')}`);
          }
          return { success: true, staged: files.length === 0 ? 'all' : files };
        } catch (error) {
          return {
            success: false,
            error: `Failed to stage files: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),

    /**
     * Commit changes
     */
    gitCommit: tool({
      description: 'Commit staged changes',
      inputSchema: z.object({
        message: z.string().describe('Commit message'),
      }),
      execute: async ({ message }: { message: string }) => {
        try {
          exec(`git commit -m "${message.replace(/"/g, '\\"')}"`);
          const sha = exec('git rev-parse HEAD').trim();
          return { success: true, sha, message };
        } catch (error) {
          return {
            success: false,
            error: `Failed to commit: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),

    /**
     * Push branch to remote
     */
    gitPush: tool({
      description: 'Push current branch to remote',
      inputSchema: z.object({
        setUpstream: z.boolean().default(true).describe('Set upstream tracking'),
      }),
      execute: async ({ setUpstream }: { setUpstream: boolean }) => {
        try {
          const branch = exec('git branch --show-current').trim();
          const cmd = setUpstream
            ? `git push -u origin ${branch}`
            : `git push origin ${branch}`;
          exec(cmd);
          return { success: true, branch };
        } catch (error) {
          return {
            success: false,
            error: `Failed to push: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),

    /**
     * Get recent commits
     */
    gitLog: tool({
      description: 'Get recent commit history',
      inputSchema: z.object({
        count: z.number().default(10).describe('Number of commits to show'),
        oneline: z.boolean().default(true).describe('Show one line per commit'),
      }),
      execute: async ({ count, oneline }: { count: number; oneline: boolean }) => {
        try {
          const format = oneline ? '--oneline' : '--format=%H|%an|%ae|%s|%ci';
          const log = exec(`git log -${count} ${format}`);

          const commits = log
            .trim()
            .split('\n')
            .filter(Boolean)
            .map((line) => {
              if (oneline) {
                const [sha, ...messageParts] = line.split(' ');
                return { sha, message: messageParts.join(' ') };
              } else {
                const [sha, author, email, message, date] = line.split('|');
                return { sha, author, email, message, date };
              }
            });

          return { success: true, commits };
        } catch (error) {
          return {
            success: false,
            error: `Failed to get log: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),

    /**
     * Get current branch
     */
    getCurrentBranch: tool({
      description: 'Get the name of the current branch',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const branch = exec('git branch --show-current').trim();
          return { success: true, branch };
        } catch (error) {
          return {
            success: false,
            error: `Failed to get current branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      },
    }),
  };
}
