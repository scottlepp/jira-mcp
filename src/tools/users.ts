import { z } from "zod";
import { JiraClient } from "../auth/jira-client.js";
import { JiraUser } from "../types/jira.js";

// Tool definitions for users

export const userTools = [
  {
    name: "jira_get_current_user",
    description:
      "Get information about the currently authenticated user (the user whose credentials are being used).",
    inputSchema: {
      type: "object" as const,
      properties: {
        expand: {
          type: "string",
          description: "Comma-separated list of fields to expand (e.g., groups, applicationRoles)",
        },
      },
      required: [],
    },
  },
  {
    name: "jira_search_users",
    description:
      "Search for users by name, email, or other criteria. Useful for finding users to assign to issues.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query (matches name, email, or displayName)",
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
    name: "jira_get_user",
    description: "Get detailed information about a specific user by account ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        accountId: {
          type: "string",
          description: "The user's account ID",
        },
        expand: {
          type: "string",
          description: "Comma-separated list of fields to expand",
        },
      },
      required: ["accountId"],
    },
  },
  {
    name: "jira_get_assignable_users",
    description:
      "Find users who can be assigned to issues in a project or to a specific issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectKey: {
          type: "string",
          description: "Project key to find assignable users for",
        },
        issueKey: {
          type: "string",
          description: "Issue key to find assignable users for (overrides projectKey)",
        },
        query: {
          type: "string",
          description: "Filter users by name/email",
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
    name: "jira_bulk_get_users",
    description: "Get multiple users by their account IDs in a single request.",
    inputSchema: {
      type: "object" as const,
      properties: {
        accountIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of account IDs to look up",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results (default 10, max 200)",
        },
        startAt: {
          type: "number",
          description: "Index of the first result (default 0)",
        },
      },
      required: ["accountIds"],
    },
  },
];

// Input schemas for validation
const GetCurrentUserSchema = z.object({
  expand: z.string().optional(),
});

const SearchUsersSchema = z.object({
  query: z.string().optional(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
});

const GetUserSchema = z.object({
  accountId: z.string(),
  expand: z.string().optional(),
});

const GetAssignableUsersSchema = z.object({
  projectKey: z.string().optional(),
  issueKey: z.string().optional(),
  query: z.string().optional(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
});

const BulkGetUsersSchema = z.object({
  accountIds: z.array(z.string()),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
});

// Tool handlers
export async function handleUserTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_get_current_user": {
      const { expand } = GetCurrentUserSchema.parse(args);
      return client.get<JiraUser>("/myself", { expand });
    }

    case "jira_search_users": {
      const { query, maxResults, startAt } = SearchUsersSchema.parse(args);
      return client.get<JiraUser[]>("/user/search", {
        query,
        maxResults,
        startAt,
      });
    }

    case "jira_get_user": {
      const { accountId, expand } = GetUserSchema.parse(args);
      return client.get<JiraUser>("/user", { accountId, expand });
    }

    case "jira_get_assignable_users": {
      const { projectKey, issueKey, query, maxResults, startAt } =
        GetAssignableUsersSchema.parse(args);

      const params: Record<string, string | number | boolean | undefined> = {
        query,
        maxResults,
        startAt,
      };

      if (issueKey) {
        params.issueKey = issueKey;
      } else if (projectKey) {
        params.project = projectKey;
      }

      return client.get<JiraUser[]>("/user/assignable/search", params);
    }

    case "jira_bulk_get_users": {
      const { accountIds, maxResults, startAt } = BulkGetUsersSchema.parse(args);
      return client.get<{ values: JiraUser[] }>("/user/bulk", {
        accountId: accountIds.join(","),
        maxResults,
        startAt,
      });
    }

    default:
      throw new Error(`Unknown user tool: ${toolName}`);
  }
}
