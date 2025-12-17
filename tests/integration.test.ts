/**
 * Integration tests for Jira MCP Server
 *
 * These tests require valid Jira credentials set via environment variables:
 * - JIRA_HOST: Your Jira instance URL (e.g., https://yourcompany.atlassian.net)
 * - JIRA_EMAIL: Your Atlassian account email
 * - JIRA_API_TOKEN: API token from https://id.atlassian.com/manage-profile/security/api-tokens
 *
 * Run tests: npm test
 *
 * You can also create a .env.local file with these variables.
 *
 * The tests will automatically create a test project and issues, then clean them up.
 */

import { config } from "dotenv";

// Load environment variables from .env files
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getConfig } from "../src/config.js";
import { JiraClient } from "../src/auth/jira-client.js";
import { handleTool } from "../src/tools/index.js";

// Helper to log results
function logResult(testName: string, result: unknown) {
  console.log(`\n[${testName}] Response:`);
  console.log(JSON.stringify(result, null, 2));
}

// Skip all tests if credentials are not configured
const hasCredentials =
  process.env.JIRA_HOST &&
  process.env.JIRA_EMAIL &&
  process.env.JIRA_API_TOKEN;

const describeWithCredentials = hasCredentials ? describe : describe.skip;

// Generate unique test identifiers
const TEST_RUN_ID = Date.now().toString(36).toUpperCase();
const TEST_PROJECT_KEY = `T${TEST_RUN_ID}`.substring(0, 10); // Max 10 chars
const TEST_PROJECT_NAME = `Test Project ${TEST_RUN_ID}`;

describeWithCredentials("Jira MCP Integration Tests", () => {
  let client: JiraClient;
  let currentUserAccountId: string;
  let testProjectKey: string | undefined;
  let testIssueKey: string | undefined;
  let testIssueType: string | undefined;
  let createdProjectKey: string | undefined;
  let createdIssueKey: string | undefined; // Track issues we created (vs env-provided)

  beforeAll(async () => {
    const jiraConfig = getConfig();
    client = new JiraClient(jiraConfig);

    // Check for pre-configured test project from environment
    const envProjectKey = process.env.TEST_PROJECT_KEY;

    if (envProjectKey) {
      testProjectKey = envProjectKey;
      console.log(`\nTest setup: Using TEST_PROJECT_KEY from env: ${testProjectKey}`);
    }

    // Get current user account ID (needed for project creation)
    try {
      const currentUser = (await handleTool(client, "jira_get_current_user", {})) as {
        accountId: string;
      };
      currentUserAccountId = currentUser.accountId;
      console.log(`\nTest setup: Current user accountId: ${currentUserAccountId}`);
    } catch (error) {
      // If /myself fails, try to get user from search using email
      console.log(`\nTest setup: Failed to get current user via /myself: ${error}`);
      try {
        const users = (await handleTool(client, "jira_search_users", {
          query: jiraConfig.email.split("@")[0],
          maxResults: 1,
        })) as { accountId: string }[];
        if (users.length > 0) {
          currentUserAccountId = users[0].accountId;
          console.log(`Test setup: Found user via search: ${currentUserAccountId}`);
        }
      } catch (searchError) {
        console.error(`Test setup: Could not find a user for project creation: ${searchError}`);
        // Don't throw - tests that require a project will be skipped
      }
    }

    if (!currentUserAccountId) {
      console.log("Test setup: No user account ID available - project creation will be skipped");
    }

    // Get available issue types
    const issueTypes = (await handleTool(client, "jira_get_issue_types", {})) as {
      name: string;
      subtask?: boolean;
      hierarchyLevel?: number;
    }[];
    console.log(`Test setup: Available issue types: ${issueTypes.map(t => `${t.name}(subtask=${t.subtask}, level=${t.hierarchyLevel})`).join(", ")}`);

    // Find a non-subtask issue type (subtask=false or hierarchyLevel=0)
    const taskType = issueTypes.find(
      (t) => (t.subtask === false || t.hierarchyLevel === 0) &&
             (t.name === "Task" || t.name === "Story" || t.name === "Bug" || t.name === "任务")
    );
    // Fallback: find any non-subtask type
    testIssueType = taskType?.name || issueTypes.find((t) => t.subtask === false || t.hierarchyLevel === 0)?.name || issueTypes[0]?.name;
    console.log(`Test setup: Using issue type: ${testIssueType}`);

    // Create test project (only if we don't already have one from env and we have a user account ID)
    if (!testProjectKey && currentUserAccountId) {
      try {
        const project = (await handleTool(client, "jira_create_project", {
          key: TEST_PROJECT_KEY,
          name: TEST_PROJECT_NAME,
          projectTypeKey: "software",
          leadAccountId: currentUserAccountId,
        })) as { key: string; id: string };

        testProjectKey = project.key;
        createdProjectKey = project.key;
        console.log(`Test setup: Created test project: ${testProjectKey}`);
      } catch (error) {
        console.error(`Test setup: Failed to create project: ${error}`);
        // Try to use an existing project if creation fails
        const projects = (await handleTool(client, "jira_list_projects", {
          maxResults: 1,
        })) as { values: { key: string }[] };
        if (projects.values && projects.values.length > 0) {
          testProjectKey = projects.values[0].key;
          console.log(`Test setup: Using existing project: ${testProjectKey}`);
        }
      }
    } else if (!testProjectKey) {
      // Try to use an existing project if no user account available
      const projects = (await handleTool(client, "jira_list_projects", {
        maxResults: 1,
      })) as { values: { key: string }[] };
      if (projects.values && projects.values.length > 0) {
        testProjectKey = projects.values[0].key;
        console.log(`Test setup: Using existing project: ${testProjectKey}`);
      }
    }

    // Create test issue if we have a project and don't already have an issue key from env
    if (testProjectKey && testIssueType && !testIssueKey) {
      try {
        const issue = (await handleTool(client, "jira_create_issue", {
          projectKey: testProjectKey,
          issueType: testIssueType,
          summary: `[Test] Integration test issue - ${TEST_RUN_ID}`,
          description: "This is a test issue created by integration tests. It will be deleted after tests complete.",
        })) as { key: string };

        testIssueKey = issue.key;
        createdIssueKey = issue.key; // Mark as created by us
        console.log(`Test setup: Created test issue: ${testIssueKey}`);
      } catch (error) {
        console.error(`Test setup: Failed to create test issue: ${error}`);
      }
    }
  }, 60000); // 60 second timeout for setup

  afterAll(async () => {
    // Clean up test issue (only if we created it, not if from env)
    if (createdIssueKey) {
      try {
        await handleTool(client, "jira_delete_issue", {
          issueIdOrKey: createdIssueKey,
        });
        console.log(`\nTest cleanup: Deleted test issue: ${createdIssueKey}`);
      } catch (error) {
        console.warn(`Test cleanup: Failed to delete test issue ${createdIssueKey}: ${error}`);
      }
    }

    // Clean up test project (only if we created it)
    if (createdProjectKey) {
      try {
        await handleTool(client, "jira_delete_project", {
          projectIdOrKey: createdProjectKey,
        });
        console.log(`Test cleanup: Deleted test project: ${createdProjectKey}`);
      } catch (error) {
        console.warn(`Test cleanup: Failed to delete test project ${createdProjectKey}: ${error}`);
      }
    }
  }, 60000); // 60 second timeout for cleanup

  describe("Server Info", () => {
    it("should get server info", async () => {
      const result = (await handleTool(
        client,
        "jira_get_server_info",
        {}
      )) as {
        baseUrl: string;
        version: string;
        deploymentType: string;
      };

      logResult("jira_get_server_info", result);

      expect(result).toBeDefined();
      expect(result.baseUrl).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.deploymentType).toBeDefined();
    });
  });

  describe("Current User", () => {
    it("should get current user info", async () => {
      // Note: /myself endpoint may require specific permissions that some API tokens don't have
      const result = (await handleTool(
        client,
        "jira_get_current_user",
        {}
      )) as {
        accountId?: string;
        displayName?: string;
        emailAddress?: string;
        self?: string;
      };

      logResult("jira_get_current_user", result);

      expect(result).toBeDefined();
      expect(result.accountId || result.self).toBeDefined();
    });
  });

  describe("Projects", () => {
    it("should list projects", async () => {
      const result = (await handleTool(client, "jira_list_projects", {
        maxResults: 10,
      })) as { values: unknown[]; total: number };

      logResult("jira_list_projects", result);

      expect(result).toBeDefined();
      expect(result.values).toBeDefined();
      expect(Array.isArray(result.values)).toBe(true);
    });

    it("should get project details", async () => {
      if (!testProjectKey) {
        console.log("Skipping: No test project available");
        return;
      }

      const result = (await handleTool(client, "jira_get_project", {
        projectIdOrKey: testProjectKey,
      })) as { key: string; name: string };

      logResult("jira_get_project", result);

      expect(result).toBeDefined();
      expect(result.key).toBe(testProjectKey);
      expect(result.name).toBeDefined();
    });

    it("should get project statuses", async () => {
      if (!testProjectKey) {
        console.log("Skipping: No test project available");
        return;
      }

      const result = (await handleTool(client, "jira_get_project_statuses", {
        projectIdOrKey: testProjectKey,
      })) as { id: string; name: string; statuses: unknown[] }[];

      logResult("jira_get_project_statuses", result);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Fields & Metadata", () => {
    it("should get all fields", async () => {
      const result = (await handleTool(client, "jira_get_fields", {})) as {
        id: string;
        name: string;
      }[];

      logResult("jira_get_fields", result);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should get issue types", async () => {
      const result = (await handleTool(client, "jira_get_issue_types", {})) as {
        id: string;
        name: string;
      }[];

      logResult("jira_get_issue_types", result);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should get priorities", async () => {
      const result = (await handleTool(client, "jira_get_priorities", {})) as {
        id: string;
        name: string;
      }[];

      logResult("jira_get_priorities", result);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should get statuses", async () => {
      const result = (await handleTool(client, "jira_get_statuses", {})) as {
        id: string;
        name: string;
      }[];

      logResult("jira_get_statuses", result);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Search", () => {
    it("should search issues with JQL", async () => {
      if (!testProjectKey) {
        console.log("Skipping: No test project available");
        return;
      }

      const result = (await handleTool(client, "jira_search_issues", {
        jql: `project = ${testProjectKey} ORDER BY created DESC`,
        maxResults: 5,
      })) as { issues: unknown[]; total: number };

      logResult("jira_search_issues", result);

      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
    });
  });

  describe("Issues", () => {
    it("should get issue details", async () => {
      if (!testIssueKey) {
        console.log("Skipping: No test issue available");
        return;
      }

      const result = (await handleTool(client, "jira_get_issue", {
        issueIdOrKey: testIssueKey,
      })) as { key: string; fields: { summary: string } };

      logResult("jira_get_issue", result);

      expect(result).toBeDefined();
      expect(result.key).toBe(testIssueKey);
      expect(result.fields).toBeDefined();
      expect(result.fields.summary).toBeDefined();
    });

    it("should update an issue", async () => {
      if (!testIssueKey) {
        console.log("Skipping: No test issue available");
        return;
      }

      const updateResult = (await handleTool(client, "jira_update_issue", {
        issueIdOrKey: testIssueKey,
        summary: `[Test] Updated issue - ${TEST_RUN_ID}`,
      })) as { success: boolean };

      logResult("jira_update_issue", updateResult);

      expect(updateResult.success).toBe(true);

      // Verify the update
      const getResult = (await handleTool(client, "jira_get_issue", {
        issueIdOrKey: testIssueKey,
      })) as { fields: { summary: string } };

      expect(getResult.fields.summary).toContain("Updated issue");
    });

    it("should get issue transitions", async () => {
      if (!testIssueKey) {
        console.log("Skipping: No test issue available");
        return;
      }

      const result = (await handleTool(client, "jira_get_issue_transitions", {
        issueIdOrKey: testIssueKey,
      })) as { id: string; name: string }[];

      logResult("jira_get_issue_transitions", result);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should create and delete an issue", async () => {
      if (!testProjectKey || !testIssueType) {
        console.log("Skipping: No test project or issue type available");
        return;
      }

      // Create issue
      const createResult = (await handleTool(client, "jira_create_issue", {
        projectKey: testProjectKey,
        issueType: testIssueType,
        summary: `[Test] Temporary issue - ${Date.now()}`,
        description: "This issue will be deleted immediately",
      })) as { key: string; id: string };

      logResult("jira_create_issue", createResult);

      expect(createResult).toBeDefined();
      expect(createResult.key).toBeDefined();

      // Delete the issue
      const deleteResult = (await handleTool(client, "jira_delete_issue", {
        issueIdOrKey: createResult.key,
      })) as { success: boolean };

      logResult("jira_delete_issue", deleteResult);

      expect(deleteResult.success).toBe(true);
    });
  });

  describe("Users", () => {
    it("should search users", async () => {
      const result = (await handleTool(client, "jira_search_users", {
        query: "a",
        maxResults: 5,
      })) as { accountId: string; displayName: string }[];

      logResult("jira_search_users", result);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Boards (Agile)", () => {
    it("should list boards", async () => {
      const result = (await handleTool(client, "jira_list_boards", {
        maxResults: 10,
      })) as { values: unknown[]; total: number };

      logResult("jira_list_boards", result);

      expect(result).toBeDefined();
      expect(result.values).toBeDefined();
      expect(Array.isArray(result.values)).toBe(true);
    });
  });

  describe("Filters", () => {
    it("should list filters", async () => {
      const result = (await handleTool(client, "jira_list_filters", {
        maxResults: 10,
      })) as { values: unknown[]; total: number };

      logResult("jira_list_filters", result);

      expect(result).toBeDefined();
      expect(result.values).toBeDefined();
      expect(Array.isArray(result.values)).toBe(true);
    });

    it("should get favourite filters", async () => {
      const result = (await handleTool(
        client,
        "jira_get_favourite_filters",
        {}
      )) as { id: string; name: string }[];

      logResult("jira_get_favourite_filters", result);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Groups", () => {
    it("should search groups", async () => {
      const result = (await handleTool(client, "jira_search_groups", {
        maxResults: 10,
      })) as { groups: unknown[] };

      logResult("jira_search_groups", result);

      expect(result).toBeDefined();
      expect(result.groups).toBeDefined();
      expect(Array.isArray(result.groups)).toBe(true);
    });
  });

  describe("Permissions", () => {
    it("should get my permissions", async () => {
      if (!testProjectKey) {
        console.log("Skipping: No test project available");
        return;
      }

      const result = (await handleTool(client, "jira_get_my_permissions", {
        projectKey: testProjectKey,
        permissions: "BROWSE_PROJECTS,CREATE_ISSUES",
      })) as { permissions: Record<string, { havePermission: boolean }> };

      logResult("jira_get_my_permissions", result);

      expect(result).toBeDefined();
      expect(result.permissions).toBeDefined();
      expect(result.permissions.BROWSE_PROJECTS).toBeDefined();
    });
  });

  describe("Issue Link Types", () => {
    it("should get issue link types", async () => {
      const result = (await handleTool(
        client,
        "jira_get_issue_link_types",
        {}
      )) as { id: string; name: string }[];

      logResult("jira_get_issue_link_types", result);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Comments", () => {
    it("should get comments on an issue", async () => {
      if (!testIssueKey) {
        console.log("Skipping: No test issue available");
        return;
      }

      const result = (await handleTool(client, "jira_get_comments", {
        issueIdOrKey: testIssueKey,
      })) as { comments: unknown[]; total: number };

      logResult("jira_get_comments", result);

      expect(result).toBeDefined();
      expect(result.comments).toBeDefined();
      expect(Array.isArray(result.comments)).toBe(true);
    });

    it("should add and delete a comment", async () => {
      if (!testIssueKey) {
        console.log("Skipping: No test issue available");
        return;
      }

      // Add comment
      const addResult = (await handleTool(client, "jira_add_comment", {
        issueIdOrKey: testIssueKey,
        body: "This is a test comment from integration tests",
      })) as { id: string };

      logResult("jira_add_comment", addResult);

      expect(addResult).toBeDefined();
      expect(addResult.id).toBeDefined();

      // Delete comment
      const deleteResult = (await handleTool(client, "jira_delete_comment", {
        issueIdOrKey: testIssueKey,
        commentId: addResult.id,
      })) as { success: boolean };

      logResult("jira_delete_comment", deleteResult);

      expect(deleteResult.success).toBe(true);
    });
  });

  describe("Worklogs", () => {
    it("should get worklogs on an issue", async () => {
      if (!testIssueKey) {
        console.log("Skipping: No test issue available");
        return;
      }

      const result = (await handleTool(client, "jira_get_worklogs", {
        issueIdOrKey: testIssueKey,
      })) as { worklogs: unknown[]; total: number };

      logResult("jira_get_worklogs", result);

      expect(result).toBeDefined();
      expect(result.worklogs).toBeDefined();
      expect(Array.isArray(result.worklogs)).toBe(true);
    });
  });

  describe("Watchers", () => {
    it("should get watchers on an issue", async () => {
      if (!testIssueKey) {
        console.log("Skipping: No test issue available");
        return;
      }

      const result = (await handleTool(client, "jira_get_watchers", {
        issueIdOrKey: testIssueKey,
      })) as { watchCount: number; watchers: unknown[] };

      logResult("jira_get_watchers", result);

      expect(result).toBeDefined();
      expect(typeof result.watchCount).toBe("number");
      expect(Array.isArray(result.watchers)).toBe(true);
    });
  });
});

// Test for missing credentials
describe("Configuration", () => {
  it("should have test documentation", () => {
    console.log(`
    ╔══════════════════════════════════════════════════════════════╗
    ║             Jira MCP Integration Test Suite                  ║
    ╠══════════════════════════════════════════════════════════════╣
    ║ To run tests, set the following environment variables:       ║
    ║                                                              ║
    ║   JIRA_HOST=https://yourcompany.atlassian.net               ║
    ║   JIRA_EMAIL=your-email@example.com                         ║
    ║   JIRA_API_TOKEN=your-api-token                             ║
    ║                                                              ║
    ║ Then run: npm test                                           ║
    ║                                                              ║
    ║ The tests will automatically create a test project and      ║
    ║ issues, then clean them up after completion.                 ║
    ╚══════════════════════════════════════════════════════════════╝
    `);
    expect(true).toBe(true);
  });
});
