import { z } from "zod";
import { JiraClient } from "../auth/jira-client.js";
import {
  JiraIssue,
  JiraTransition,
  JiraChangelog,
  PaginatedResponse,
} from "../types/jira.js";

// Tool definitions for issues

export const issueTools = [
  {
    name: "jira_get_issue",
    description:
      "Get detailed information about a specific Jira issue by its key or ID. Returns all fields including summary, description, status, assignee, comments, and custom fields.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        expand: {
          type: "string",
          description:
            "Comma-separated list of fields to expand (e.g., changelog,transitions,renderedFields)",
        },
        fields: {
          type: "string",
          description:
            "Comma-separated list of fields to return (use * for all, -field to exclude)",
        },
      },
      required: ["issueIdOrKey"],
    },
  },
  {
    name: "jira_create_issue",
    description:
      "Create a new Jira issue. Requires at minimum a project key, issue type, and summary.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectKey: {
          type: "string",
          description: "The project key (e.g., PROJ)",
        },
        issueType: {
          type: "string",
          description:
            "The issue type name (e.g., Bug, Task, Story, Epic) or ID",
        },
        summary: {
          type: "string",
          description: "The issue summary/title",
        },
        description: {
          type: "string",
          description: "The issue description (plain text, will be converted to ADF)",
        },
        assigneeAccountId: {
          type: "string",
          description: "Account ID of the assignee",
        },
        priority: {
          type: "string",
          description: "Priority name (e.g., High, Medium, Low) or ID",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Array of labels to add to the issue",
        },
        components: {
          type: "array",
          items: { type: "string" },
          description: "Array of component names or IDs",
        },
        parentKey: {
          type: "string",
          description: "Parent issue key for subtasks or issues in next-gen projects",
        },
        customFields: {
          type: "object",
          description:
            "Object of custom field IDs to values (e.g., {customfield_10001: 'value'})",
        },
      },
      required: ["projectKey", "issueType", "summary"],
    },
  },
  {
    name: "jira_update_issue",
    description:
      "Update an existing Jira issue. Only specified fields will be updated.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        summary: {
          type: "string",
          description: "New summary/title",
        },
        description: {
          type: "string",
          description: "New description (plain text)",
        },
        assigneeAccountId: {
          type: "string",
          description: "Account ID of the new assignee (use null to unassign)",
        },
        priority: {
          type: "string",
          description: "Priority name or ID",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "New array of labels (replaces existing)",
        },
        components: {
          type: "array",
          items: { type: "string" },
          description: "New array of component names or IDs",
        },
        customFields: {
          type: "object",
          description: "Object of custom field IDs to values",
        },
      },
      required: ["issueIdOrKey"],
    },
  },
  {
    name: "jira_delete_issue",
    description:
      "Delete a Jira issue. Use with caution as this cannot be undone.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        deleteSubtasks: {
          type: "boolean",
          description: "Whether to delete subtasks (default false)",
        },
      },
      required: ["issueIdOrKey"],
    },
  },
  {
    name: "jira_bulk_create_issues",
    description:
      "Create multiple Jira issues in a single request. Maximum 50 issues per request.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issues: {
          type: "array",
          description: "Array of issue objects to create",
          items: {
            type: "object",
            properties: {
              projectKey: { type: "string" },
              issueType: { type: "string" },
              summary: { type: "string" },
              description: { type: "string" },
              assigneeAccountId: { type: "string" },
              priority: { type: "string" },
              labels: { type: "array", items: { type: "string" } },
            },
            required: ["projectKey", "issueType", "summary"],
          },
        },
      },
      required: ["issues"],
    },
  },
  {
    name: "jira_get_issue_transitions",
    description:
      "Get available workflow transitions for an issue. Returns the transitions that can be performed on the issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
      },
      required: ["issueIdOrKey"],
    },
  },
  {
    name: "jira_transition_issue",
    description:
      "Perform a workflow transition on an issue to change its status.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        transitionId: {
          type: "string",
          description:
            "The ID of the transition to perform (get IDs from jira_get_issue_transitions)",
        },
        comment: {
          type: "string",
          description: "Optional comment to add during transition",
        },
        resolution: {
          type: "string",
          description: "Resolution name or ID (required for some transitions)",
        },
        fields: {
          type: "object",
          description: "Additional fields to update during transition",
        },
      },
      required: ["issueIdOrKey", "transitionId"],
    },
  },
  {
    name: "jira_assign_issue",
    description: "Assign an issue to a user or unassign it.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        accountId: {
          type: "string",
          description:
            "Account ID of the user to assign (use null or -1 to unassign, use empty string for automatic assignment)",
        },
      },
      required: ["issueIdOrKey"],
    },
  },
  {
    name: "jira_get_issue_changelogs",
    description: "Get the changelog/history of changes made to an issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results (default 100)",
        },
        startAt: {
          type: "number",
          description: "Index of the first result (default 0)",
        },
      },
      required: ["issueIdOrKey"],
    },
  },
];

// Input schemas for validation
const GetIssueSchema = z.object({
  issueIdOrKey: z.string(),
  expand: z.string().optional(),
  fields: z.string().optional(),
});

const CreateIssueSchema = z.object({
  projectKey: z.string(),
  issueType: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  assigneeAccountId: z.string().optional(),
  priority: z.string().optional(),
  labels: z.array(z.string()).optional(),
  components: z.array(z.string()).optional(),
  parentKey: z.string().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

const UpdateIssueSchema = z.object({
  issueIdOrKey: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  assigneeAccountId: z.string().nullable().optional(),
  priority: z.string().optional(),
  labels: z.array(z.string()).optional(),
  components: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

const DeleteIssueSchema = z.object({
  issueIdOrKey: z.string(),
  deleteSubtasks: z.boolean().optional(),
});

const BulkCreateIssuesSchema = z.object({
  issues: z.array(
    z.object({
      projectKey: z.string(),
      issueType: z.string(),
      summary: z.string(),
      description: z.string().optional(),
      assigneeAccountId: z.string().optional(),
      priority: z.string().optional(),
      labels: z.array(z.string()).optional(),
    })
  ),
});

const GetTransitionsSchema = z.object({
  issueIdOrKey: z.string(),
});

const TransitionIssueSchema = z.object({
  issueIdOrKey: z.string(),
  transitionId: z.string(),
  comment: z.string().optional(),
  resolution: z.string().optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
});

const AssignIssueSchema = z.object({
  issueIdOrKey: z.string(),
  accountId: z.string().nullable().optional(),
});

const GetChangelogsSchema = z.object({
  issueIdOrKey: z.string(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
});

// Helper function to convert plain text to ADF
function textToAdf(text: string): unknown {
  return {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: text,
          },
        ],
      },
    ],
  };
}

// Tool handlers
export async function handleIssueTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_get_issue": {
      const { issueIdOrKey, expand, fields } = GetIssueSchema.parse(args);
      return client.get<JiraIssue>(`/issue/${issueIdOrKey}`, {
        expand,
        fields,
      });
    }

    case "jira_create_issue": {
      const input = CreateIssueSchema.parse(args);
      const fields: Record<string, unknown> = {
        project: { key: input.projectKey },
        issuetype: { name: input.issueType },
        summary: input.summary,
      };

      if (input.description) {
        fields.description = textToAdf(input.description);
      }
      if (input.assigneeAccountId) {
        fields.assignee = { accountId: input.assigneeAccountId };
      }
      if (input.priority) {
        fields.priority = { name: input.priority };
      }
      if (input.labels) {
        fields.labels = input.labels;
      }
      if (input.components) {
        fields.components = input.components.map((c) => ({ name: c }));
      }
      if (input.parentKey) {
        fields.parent = { key: input.parentKey };
      }
      if (input.customFields) {
        Object.assign(fields, input.customFields);
      }

      return client.post<JiraIssue>("/issue", { fields });
    }

    case "jira_update_issue": {
      const input = UpdateIssueSchema.parse(args);
      const fields: Record<string, unknown> = {};

      if (input.summary !== undefined) {
        fields.summary = input.summary;
      }
      if (input.description !== undefined) {
        fields.description = textToAdf(input.description);
      }
      if (input.assigneeAccountId !== undefined) {
        fields.assignee = input.assigneeAccountId
          ? { accountId: input.assigneeAccountId }
          : null;
      }
      if (input.priority !== undefined) {
        fields.priority = { name: input.priority };
      }
      if (input.labels !== undefined) {
        fields.labels = input.labels;
      }
      if (input.components !== undefined) {
        fields.components = input.components.map((c) => ({ name: c }));
      }
      if (input.customFields) {
        Object.assign(fields, input.customFields);
      }

      await client.put(`/issue/${input.issueIdOrKey}`, { fields });
      return { success: true, issueKey: input.issueIdOrKey };
    }

    case "jira_delete_issue": {
      const { issueIdOrKey, deleteSubtasks } = DeleteIssueSchema.parse(args);
      await client.delete(`/issue/${issueIdOrKey}`, {
        deleteSubtasks: deleteSubtasks ? "true" : "false",
      });
      return { success: true, deleted: issueIdOrKey };
    }

    case "jira_bulk_create_issues": {
      const { issues } = BulkCreateIssuesSchema.parse(args);
      const issueUpdates = issues.map((issue) => {
        const fields: Record<string, unknown> = {
          project: { key: issue.projectKey },
          issuetype: { name: issue.issueType },
          summary: issue.summary,
        };

        if (issue.description) {
          fields.description = textToAdf(issue.description);
        }
        if (issue.assigneeAccountId) {
          fields.assignee = { accountId: issue.assigneeAccountId };
        }
        if (issue.priority) {
          fields.priority = { name: issue.priority };
        }
        if (issue.labels) {
          fields.labels = issue.labels;
        }

        return { fields };
      });

      return client.post("/issue/bulk", { issueUpdates });
    }

    case "jira_get_issue_transitions": {
      const { issueIdOrKey } = GetTransitionsSchema.parse(args);
      const result = await client.get<{ transitions: JiraTransition[] }>(
        `/issue/${issueIdOrKey}/transitions`
      );
      return result.transitions;
    }

    case "jira_transition_issue": {
      const input = TransitionIssueSchema.parse(args);
      const body: Record<string, unknown> = {
        transition: { id: input.transitionId },
      };

      if (input.fields || input.resolution) {
        body.fields = { ...input.fields };
        if (input.resolution) {
          (body.fields as Record<string, unknown>).resolution = {
            name: input.resolution,
          };
        }
      }

      if (input.comment) {
        body.update = {
          comment: [
            {
              add: {
                body: textToAdf(input.comment),
              },
            },
          ],
        };
      }

      await client.post(`/issue/${input.issueIdOrKey}/transitions`, body);
      return { success: true, issueKey: input.issueIdOrKey };
    }

    case "jira_assign_issue": {
      const { issueIdOrKey, accountId } = AssignIssueSchema.parse(args);
      await client.put(`/issue/${issueIdOrKey}/assignee`, {
        accountId: accountId === null ? null : accountId || null,
      });
      return { success: true, issueKey: issueIdOrKey, assignee: accountId };
    }

    case "jira_get_issue_changelogs": {
      const { issueIdOrKey, maxResults, startAt } =
        GetChangelogsSchema.parse(args);
      return client.get<PaginatedResponse<JiraChangelog>>(
        `/issue/${issueIdOrKey}/changelog`,
        { maxResults, startAt }
      );
    }

    default:
      throw new Error(`Unknown issue tool: ${toolName}`);
  }
}
