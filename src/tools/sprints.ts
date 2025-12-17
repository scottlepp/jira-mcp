import { z } from "zod";
import { JiraClient } from "../auth/jira-client.js";
import { JiraSprint, JiraIssue, PaginatedResponse } from "../types/jira.js";

// Tool definitions for sprints (Agile API)

export const sprintTools = [
  {
    name: "jira_list_sprints",
    description:
      "List all sprints for a board. Can filter by sprint state (active, closed, future).",
    inputSchema: {
      type: "object" as const,
      properties: {
        boardId: {
          type: "number",
          description: "The board ID to get sprints for",
        },
        state: {
          type: "string",
          description:
            "Filter by state: active, closed, future (comma-separated for multiple)",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results (default 50)",
        },
        startAt: {
          type: "number",
          description: "Index of the first result (default 0)",
        },
      },
      required: ["boardId"],
    },
  },
  {
    name: "jira_get_sprint",
    description: "Get detailed information about a specific sprint.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sprintId: {
          type: "number",
          description: "The sprint ID",
        },
      },
      required: ["sprintId"],
    },
  },
  {
    name: "jira_create_sprint",
    description: "Create a new sprint for a board.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Sprint name",
        },
        originBoardId: {
          type: "number",
          description: "The board ID this sprint belongs to",
        },
        goal: {
          type: "string",
          description: "Sprint goal",
        },
        startDate: {
          type: "string",
          description: "Start date (ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ)",
        },
        endDate: {
          type: "string",
          description: "End date (ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ)",
        },
      },
      required: ["name", "originBoardId"],
    },
  },
  {
    name: "jira_update_sprint",
    description:
      "Update a sprint's name, goal, dates, or state. Use state to start or complete a sprint.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sprintId: {
          type: "number",
          description: "The sprint ID",
        },
        name: {
          type: "string",
          description: "New sprint name",
        },
        goal: {
          type: "string",
          description: "New sprint goal",
        },
        state: {
          type: "string",
          description:
            "New state (active to start, closed to complete). Only future sprints can be started.",
        },
        startDate: {
          type: "string",
          description: "Start date (ISO 8601 format)",
        },
        endDate: {
          type: "string",
          description: "End date (ISO 8601 format)",
        },
      },
      required: ["sprintId"],
    },
  },
  {
    name: "jira_delete_sprint",
    description:
      "Delete a sprint. Only future sprints can be deleted. Issues in the sprint will be moved to the backlog.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sprintId: {
          type: "number",
          description: "The sprint ID to delete",
        },
      },
      required: ["sprintId"],
    },
  },
  {
    name: "jira_get_sprint_issues",
    description: "Get all issues in a specific sprint.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sprintId: {
          type: "number",
          description: "The sprint ID",
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
      required: ["sprintId"],
    },
  },
  {
    name: "jira_move_issues_to_sprint",
    description:
      "Move issues to a sprint. Issues will be removed from their current sprint if any.",
    inputSchema: {
      type: "object" as const,
      properties: {
        sprintId: {
          type: "number",
          description: "The sprint ID to move issues to",
        },
        issues: {
          type: "array",
          items: { type: "string" },
          description: "Array of issue keys to move",
        },
        rankBefore: {
          type: "string",
          description: "Issue key to rank the moved issues before",
        },
        rankAfter: {
          type: "string",
          description: "Issue key to rank the moved issues after",
        },
      },
      required: ["sprintId", "issues"],
    },
  },
  {
    name: "jira_move_issues_to_backlog",
    description: "Move issues to the backlog (remove from all sprints).",
    inputSchema: {
      type: "object" as const,
      properties: {
        issues: {
          type: "array",
          items: { type: "string" },
          description: "Array of issue keys to move to backlog",
        },
      },
      required: ["issues"],
    },
  },
];

// Input schemas for validation
const ListSprintsSchema = z.object({
  boardId: z.number(),
  state: z.string().optional(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
});

const GetSprintSchema = z.object({
  sprintId: z.number(),
});

const CreateSprintSchema = z.object({
  name: z.string(),
  originBoardId: z.number(),
  goal: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const UpdateSprintSchema = z.object({
  sprintId: z.number(),
  name: z.string().optional(),
  goal: z.string().optional(),
  state: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const DeleteSprintSchema = z.object({
  sprintId: z.number(),
});

const GetSprintIssuesSchema = z.object({
  sprintId: z.number(),
  jql: z.string().optional(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
  fields: z.array(z.string()).optional(),
  expand: z.string().optional(),
});

const MoveIssuesToSprintSchema = z.object({
  sprintId: z.number(),
  issues: z.array(z.string()),
  rankBefore: z.string().optional(),
  rankAfter: z.string().optional(),
});

const MoveIssuesToBacklogSchema = z.object({
  issues: z.array(z.string()),
});

// Tool handlers
export async function handleSprintTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_list_sprints": {
      const { boardId, state, maxResults, startAt } =
        ListSprintsSchema.parse(args);
      return client.agileGet<PaginatedResponse<JiraSprint>>(
        `/board/${boardId}/sprint`,
        {
          state,
          maxResults,
          startAt,
        }
      );
    }

    case "jira_get_sprint": {
      const { sprintId } = GetSprintSchema.parse(args);
      return client.agileGet<JiraSprint>(`/sprint/${sprintId}`);
    }

    case "jira_create_sprint": {
      const input = CreateSprintSchema.parse(args);
      return client.agilePost<JiraSprint>("/sprint", {
        name: input.name,
        originBoardId: input.originBoardId,
        goal: input.goal,
        startDate: input.startDate,
        endDate: input.endDate,
      });
    }

    case "jira_update_sprint": {
      const input = UpdateSprintSchema.parse(args);
      const body: Record<string, unknown> = {};

      if (input.name) body.name = input.name;
      if (input.goal !== undefined) body.goal = input.goal;
      if (input.state) body.state = input.state;
      if (input.startDate) body.startDate = input.startDate;
      if (input.endDate) body.endDate = input.endDate;

      return client.agilePut<JiraSprint>(`/sprint/${input.sprintId}`, body);
    }

    case "jira_delete_sprint": {
      const { sprintId } = DeleteSprintSchema.parse(args);
      await client.agileDelete(`/sprint/${sprintId}`);
      return { success: true, deleted: sprintId };
    }

    case "jira_get_sprint_issues": {
      const { sprintId, jql, maxResults, startAt, fields, expand } =
        GetSprintIssuesSchema.parse(args);
      return client.agileGet<PaginatedResponse<JiraIssue>>(
        `/sprint/${sprintId}/issue`,
        {
          jql,
          maxResults,
          startAt,
          fields: fields?.join(","),
          expand,
        }
      );
    }

    case "jira_move_issues_to_sprint": {
      const { sprintId, issues, rankBefore, rankAfter } =
        MoveIssuesToSprintSchema.parse(args);
      await client.agilePost(`/sprint/${sprintId}/issue`, {
        issues,
        rankBefore,
        rankAfter,
      });
      return { success: true, sprintId, issuesMoved: issues.length };
    }

    case "jira_move_issues_to_backlog": {
      const { issues } = MoveIssuesToBacklogSchema.parse(args);
      await client.agilePost("/backlog/issue", { issues });
      return { success: true, issuesMoved: issues.length };
    }

    default:
      throw new Error(`Unknown sprint tool: ${toolName}`);
  }
}
