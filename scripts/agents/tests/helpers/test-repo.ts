/**
 * Test repository utilities for creating and cleaning up test data
 * All operations use LIVE GitHub API calls
 */

import { Octokit } from '@octokit/rest';
import { getTestConfig } from '../../src/config.js';

let octokit: Octokit | null = null;

function getOctokit(): Octokit {
  if (!octokit) {
    const config = getTestConfig();
    octokit = new Octokit({ auth: config.githubToken });
  }
  return octokit;
}

/**
 * Get test repository configuration
 */
export function getTestRepoConfig() {
  const config = getTestConfig();
  return {
    owner: config.repoOwner,
    repo: config.repoName,
  };
}

/**
 * Create a test issue for bug-fix agent testing
 */
export async function createTestIssue(options: {
  title: string;
  body: string;
  labels?: string[];
}): Promise<{ number: number; url: string }> {
  const { owner, repo } = getTestRepoConfig();
  const client = getOctokit();

  const response = await client.issues.create({
    owner,
    repo,
    title: options.title,
    body: options.body,
    labels: options.labels || ['bug', 'test-issue'],
  });

  return {
    number: response.data.number,
    url: response.data.html_url,
  };
}

/**
 * Close and clean up a test issue
 */
export async function closeTestIssue(issueNumber: number): Promise<void> {
  const { owner, repo } = getTestRepoConfig();
  const client = getOctokit();

  await client.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    state: 'closed',
  });
}

/**
 * Create a test branch for PR testing
 */
export async function createTestBranch(branchName: string): Promise<string> {
  const { owner, repo } = getTestRepoConfig();
  const client = getOctokit();

  // Get the default branch's latest commit
  const { data: defaultBranch } = await client.repos.get({ owner, repo });
  const baseBranch = defaultBranch.default_branch;

  const { data: ref } = await client.git.getRef({
    owner,
    repo,
    ref: `heads/${baseBranch}`,
  });

  // Create new branch from that commit
  await client.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: ref.object.sha,
  });

  return branchName;
}

/**
 * Delete a test branch
 */
export async function deleteTestBranch(branchName: string): Promise<void> {
  const { owner, repo } = getTestRepoConfig();
  const client = getOctokit();

  try {
    await client.git.deleteRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
    });
  } catch (error) {
    // Branch might not exist, ignore
    console.log(`Note: Could not delete branch ${branchName}`, error);
  }
}

/**
 * Create a test pull request
 */
export async function createTestPullRequest(options: {
  title: string;
  body: string;
  head: string;
  base?: string;
}): Promise<{ number: number; url: string }> {
  const { owner, repo } = getTestRepoConfig();
  const client = getOctokit();

  // Get default branch if not specified
  let base = options.base;
  if (!base) {
    const { data: repoData } = await client.repos.get({ owner, repo });
    base = repoData.default_branch;
  }

  const response = await client.pulls.create({
    owner,
    repo,
    title: options.title,
    body: options.body,
    head: options.head,
    base,
  });

  return {
    number: response.data.number,
    url: response.data.html_url,
  };
}

/**
 * Close a test pull request
 */
export async function closeTestPullRequest(prNumber: number): Promise<void> {
  const { owner, repo } = getTestRepoConfig();
  const client = getOctokit();

  await client.pulls.update({
    owner,
    repo,
    pull_number: prNumber,
    state: 'closed',
  });
}

/**
 * Add a file to a branch (for creating PRs with changes)
 */
export async function addFileToTestBranch(options: {
  branch: string;
  path: string;
  content: string;
  message: string;
}): Promise<void> {
  const { owner, repo } = getTestRepoConfig();
  const client = getOctokit();

  // Check if file exists
  let sha: string | undefined;
  try {
    const { data: existingFile } = await client.repos.getContent({
      owner,
      repo,
      path: options.path,
      ref: options.branch,
    });
    if (!Array.isArray(existingFile)) {
      sha = existingFile.sha;
    }
  } catch {
    // File doesn't exist, that's fine
  }

  await client.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: options.path,
    message: options.message,
    content: Buffer.from(options.content).toString('base64'),
    branch: options.branch,
    sha,
  });
}

/**
 * Clean up all test resources
 */
export async function cleanupTestResources(resources: {
  issues?: number[];
  branches?: string[];
  pullRequests?: number[];
}): Promise<void> {
  const errors: Error[] = [];

  // Close issues
  for (const issue of resources.issues || []) {
    try {
      await closeTestIssue(issue);
    } catch (error) {
      errors.push(error as Error);
    }
  }

  // Close PRs
  for (const pr of resources.pullRequests || []) {
    try {
      await closeTestPullRequest(pr);
    } catch (error) {
      errors.push(error as Error);
    }
  }

  // Delete branches (do this after closing PRs)
  for (const branch of resources.branches || []) {
    try {
      await deleteTestBranch(branch);
    } catch (error) {
      errors.push(error as Error);
    }
  }

  if (errors.length > 0) {
    console.warn(`Cleanup completed with ${errors.length} error(s)`);
  }
}
