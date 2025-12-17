import { z } from "zod";
import { JiraClient } from "../auth/jira-client.js";
import { JiraBoard, JiraIssue, JiraEpic, PaginatedResponse } from "../types/jira.js";

// Tool definitions for boards (Agile API)

export const boardTools = [
  {
    name: "jira_list_boards",
    description:
      "List all boards (Scrum and Kanban) that the user has access to. Supports filtering by project, name, and type.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectKeyOrId: {
          type: "string",
          description: "Filter boards by project key or ID",
        },
        name: {
          type: "string",
          description: "Filter boards by name (contains match)",
        },
        type: {
          type: "string",
          description: "Filter by board type (scrum, kanban, simple)",
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
      required: [],
    },
  },
  {
    name: "jira_get_board",
    description: "Get detailed information about a specific board.",
    inputSchema: {
      type: "object" as const,
      properties: {
        boardId: {
          type: "number",
          description: "The board ID",
        },
      },
      required: ["boardId"],
    },
  },
  {
    name: "jira_create_board",
    description:
      "Create a new Scrum or Kanban board. Requires a saved filter.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Board name",
        },
        type: {
          type: "string",
          description: "Board type (scrum or kanban)",
        },
        filterId: {
          type: "number",
          description: "ID of the saved filter to use for the board",
        },
        projectKeyOrId: {
          type: "string",
          description: "Project key or ID for the board location",
        },
      },
      required: ["name", "type", "filterId"],
    },
  },
  {
    name: "jira_delete_board",
    description: "Delete a board. This does not delete the issues on the board.",
    inputSchema: {
      type: "object" as const,
      properties: {
        boardId: {
          type: "number",
          description: "The board ID to delete",
        },
      },
      required: ["boardId"],
    },
  },
  {
    name: "jira_get_board_configuration",
    description:
      "Get the configuration of a board including columns, estimation, and ranking settings.",
    inputSchema: {
      type: "object" as const,
      properties: {
        boardId: {
          type: "number",
          description: "The board ID",
        },
      },
      required: ["boardId"],
    },
  },
  {
    name: "jira_get_board_issues",
    description: "Get all issues on a board.",
    inputSchema: {
      type: "object" as const,
      properties: {
        boardId: {
          type: "number",
          description: "The board ID",
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
      required: ["boardId"],
    },
  },
  {
    name: "jira_get_board_backlog",
    description:
      "Get all issues in the backlog of a board (issues not in any sprint).",
    inputSchema: {
      type: "object" as const,
      properties: {
        boardId: {
          type: "number",
          description: "The board ID",
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
      },
      required: ["boardId"],
    },
  },
  {
    name: "jira_get_board_epics",
    description: "Get all epics on a board.",
    inputSchema: {
      type: "object" as const,
      properties: {
        boardId: {
          type: "number",
          description: "The board ID",
        },
        done: {
          type: "boolean",
          description: "Filter by completion status",
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
];

// Input schemas for validation
const ListBoardsSchema = z.object({
  projectKeyOrId: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
});

const GetBoardSchema = z.object({
  boardId: z.number(),
});

const CreateBoardSchema = z.object({
  name: z.string(),
  type: z.string(),
  filterId: z.number(),
  projectKeyOrId: z.string().optional(),
});

const DeleteBoardSchema = z.object({
  boardId: z.number(),
});

const GetBoardConfigSchema = z.object({
  boardId: z.number(),
});

const GetBoardIssuesSchema = z.object({
  boardId: z.number(),
  jql: z.string().optional(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
  fields: z.array(z.string()).optional(),
  expand: z.string().optional(),
});

const GetBoardBacklogSchema = z.object({
  boardId: z.number(),
  jql: z.string().optional(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
  fields: z.array(z.string()).optional(),
});

const GetBoardEpicsSchema = z.object({
  boardId: z.number(),
  done: z.boolean().optional(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
});

// Tool handlers
export async function handleBoardTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_list_boards": {
      const { projectKeyOrId, name, type, maxResults, startAt } =
        ListBoardsSchema.parse(args);
      return client.agileGet<PaginatedResponse<JiraBoard>>("/board", {
        projectKeyOrId,
        name,
        type,
        maxResults,
        startAt,
      });
    }

    case "jira_get_board": {
      const { boardId } = GetBoardSchema.parse(args);
      return client.agileGet<JiraBoard>(`/board/${boardId}`);
    }

    case "jira_create_board": {
      const { name, type, filterId, projectKeyOrId } =
        CreateBoardSchema.parse(args);
      const body: Record<string, unknown> = {
        name,
        type,
        filterId,
      };
      if (projectKeyOrId) {
        body.location = { type: "project", projectKeyOrId };
      }
      return client.agilePost<JiraBoard>("/board", body);
    }

    case "jira_delete_board": {
      const { boardId } = DeleteBoardSchema.parse(args);
      await client.agileDelete(`/board/${boardId}`);
      return { success: true, deleted: boardId };
    }

    case "jira_get_board_configuration": {
      const { boardId } = GetBoardConfigSchema.parse(args);
      return client.agileGet(`/board/${boardId}/configuration`);
    }

    case "jira_get_board_issues": {
      const { boardId, jql, maxResults, startAt, fields, expand } =
        GetBoardIssuesSchema.parse(args);
      return client.agileGet<PaginatedResponse<JiraIssue>>(
        `/board/${boardId}/issue`,
        {
          jql,
          maxResults,
          startAt,
          fields: fields?.join(","),
          expand,
        }
      );
    }

    case "jira_get_board_backlog": {
      const { boardId, jql, maxResults, startAt, fields } =
        GetBoardBacklogSchema.parse(args);
      return client.agileGet<PaginatedResponse<JiraIssue>>(
        `/board/${boardId}/backlog`,
        {
          jql,
          maxResults,
          startAt,
          fields: fields?.join(","),
        }
      );
    }

    case "jira_get_board_epics": {
      const { boardId, done, maxResults, startAt } =
        GetBoardEpicsSchema.parse(args);
      return client.agileGet<PaginatedResponse<JiraEpic>>(
        `/board/${boardId}/epic`,
        {
          done,
          maxResults,
          startAt,
        }
      );
    }

    default:
      throw new Error(`Unknown board tool: ${toolName}`);
  }
}
