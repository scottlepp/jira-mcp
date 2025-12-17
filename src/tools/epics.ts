import { z } from "zod";
import { JiraClient } from "../auth/jira-client.js";
import { JiraEpic, JiraIssue, PaginatedResponse } from "../types/jira.js";

// Tool definitions for epics (Agile API)

export const epicTools = [
  {
    name: "jira_get_epic",
    description: "Get detailed information about a specific epic.",
    inputSchema: {
      type: "object" as const,
      properties: {
        epicIdOrKey: {
          type: "string",
          description: "The epic ID or issue key",
        },
      },
      required: ["epicIdOrKey"],
    },
  },
  {
    name: "jira_get_epic_issues",
    description: "Get all issues that belong to an epic.",
    inputSchema: {
      type: "object" as const,
      properties: {
        epicIdOrKey: {
          type: "string",
          description: "The epic ID or issue key",
        },
        jql: {
          type: "string",
          description: "Additional JQL filter",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results (default 50)",
        },
        startAt: {
          type: "number",
          description: "Index of the first result (default 0)",
        },
        fields: {
          type: "array",
          items: { type: "string" },
          description: "List of fields to return",
        },
        expand: {
          type: "string",
          description: "Comma-separated list of expansions",
        },
      },
      required: ["epicIdOrKey"],
    },
  },
  {
    name: "jira_move_issues_to_epic",
    description: "Move issues to an epic. Issues will be removed from their current epic if any.",
    inputSchema: {
      type: "object" as const,
      properties: {
        epicIdOrKey: {
          type: "string",
          description: "The epic ID or issue key to move issues to",
        },
        issues: {
          type: "array",
          items: { type: "string" },
          description: "Array of issue keys to move to the epic",
        },
      },
      required: ["epicIdOrKey", "issues"],
    },
  },
  {
    name: "jira_remove_issues_from_epic",
    description: "Remove issues from their epic (move them to no epic).",
    inputSchema: {
      type: "object" as const,
      properties: {
        issues: {
          type: "array",
          items: { type: "string" },
          description: "Array of issue keys to remove from their epic",
        },
      },
      required: ["issues"],
    },
  },
];

// Input schemas for validation
const GetEpicSchema = z.object({
  epicIdOrKey: z.string(),
});

const GetEpicIssuesSchema = z.object({
  epicIdOrKey: z.string(),
  jql: z.string().optional(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
  fields: z.array(z.string()).optional(),
  expand: z.string().optional(),
});

const MoveIssuesToEpicSchema = z.object({
  epicIdOrKey: z.string(),
  issues: z.array(z.string()),
});

const RemoveIssuesFromEpicSchema = z.object({
  issues: z.array(z.string()),
});

// Tool handlers
export async function handleEpicTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_get_epic": {
      const { epicIdOrKey } = GetEpicSchema.parse(args);
      return client.agileGet<JiraEpic>(`/epic/${epicIdOrKey}`);
    }

    case "jira_get_epic_issues": {
      const { epicIdOrKey, jql, maxResults, startAt, fields, expand } =
        GetEpicIssuesSchema.parse(args);
      return client.agileGet<PaginatedResponse<JiraIssue>>(
        `/epic/${epicIdOrKey}/issue`,
        {
          jql,
          maxResults,
          startAt,
          fields: fields?.join(","),
          expand,
        }
      );
    }

    case "jira_move_issues_to_epic": {
      const { epicIdOrKey, issues } = MoveIssuesToEpicSchema.parse(args);
      await client.agilePost(`/epic/${epicIdOrKey}/issue`, { issues });
      return { success: true, epicKey: epicIdOrKey, issuesMoved: issues.length };
    }

    case "jira_remove_issues_from_epic": {
      const { issues } = RemoveIssuesFromEpicSchema.parse(args);
      // Moving to "none" epic removes issues from their current epic
      await client.agilePost("/epic/none/issue", { issues });
      return { success: true, issuesRemoved: issues.length };
    }

    default:
      throw new Error(`Unknown epic tool: ${toolName}`);
  }
}
