import { z } from "zod";
import { JiraClient } from "../auth/jira-client.js";
import { JiraGroup, JiraUser, JiraPermission } from "../types/jira.js";

// Tool definitions for groups and permissions

export const groupTools = [
  {
    name: "jira_search_groups",
    description:
      "Search for groups by name. Useful for finding groups to assign permissions or share filters with.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query to filter groups by name",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results (default 25)",
        },
        exclude: {
          type: "array",
          items: { type: "string" },
          description: "Group names to exclude from results",
        },
      },
      required: [],
    },
  },
  {
    name: "jira_get_group_members",
    description: "Get the members of a specific group.",
    inputSchema: {
      type: "object" as const,
      properties: {
        groupname: {
          type: "string",
          description: "The name of the group",
        },
        groupId: {
          type: "string",
          description: "The ID of the group (alternative to groupname)",
        },
        includeInactiveUsers: {
          type: "boolean",
          description: "Whether to include inactive users (default false)",
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
    name: "jira_get_my_permissions",
    description:
      "Get the permissions the current user has for specific projects or issues. Useful for checking what actions are allowed.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectKey: {
          type: "string",
          description: "Project key to check permissions for",
        },
        projectId: {
          type: "string",
          description: "Project ID to check permissions for",
        },
        issueKey: {
          type: "string",
          description: "Issue key to check permissions for",
        },
        issueId: {
          type: "string",
          description: "Issue ID to check permissions for",
        },
        permissions: {
          type: "string",
          description:
            "Comma-separated list of permission keys to check (e.g., BROWSE_PROJECTS,CREATE_ISSUES,EDIT_ISSUES)",
        },
      },
      required: [],
    },
  },
];

// Input schemas for validation
const SearchGroupsSchema = z.object({
  query: z.string().optional(),
  maxResults: z.number().optional(),
  exclude: z.array(z.string()).optional(),
});

const GetGroupMembersSchema = z.object({
  groupname: z.string().optional(),
  groupId: z.string().optional(),
  includeInactiveUsers: z.boolean().optional(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
});

const GetMyPermissionsSchema = z.object({
  projectKey: z.string().optional(),
  projectId: z.string().optional(),
  issueKey: z.string().optional(),
  issueId: z.string().optional(),
  permissions: z.string().optional(),
});

interface GroupPickerResult {
  header: string;
  total: number;
  groups: JiraGroup[];
}

interface GroupMembersResult {
  self: string;
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
  values: JiraUser[];
}

interface PermissionsResult {
  permissions: Record<string, JiraPermission>;
}

// Tool handlers
export async function handleGroupTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_search_groups": {
      const { query, maxResults, exclude } = SearchGroupsSchema.parse(args);
      return client.get<GroupPickerResult>("/groups/picker", {
        query,
        maxResults,
        exclude: exclude?.join(","),
      });
    }

    case "jira_get_group_members": {
      const { groupname, groupId, includeInactiveUsers, maxResults, startAt } =
        GetGroupMembersSchema.parse(args);

      if (!groupname && !groupId) {
        throw new Error("Either groupname or groupId must be provided");
      }

      return client.get<GroupMembersResult>("/group/member", {
        groupname,
        groupId,
        includeInactiveUsers,
        maxResults,
        startAt,
      });
    }

    case "jira_get_my_permissions": {
      const input = GetMyPermissionsSchema.parse(args);
      return client.get<PermissionsResult>("/mypermissions", {
        projectKey: input.projectKey,
        projectId: input.projectId,
        issueKey: input.issueKey,
        issueId: input.issueId,
        permissions: input.permissions,
      });
    }

    default:
      throw new Error(`Unknown group tool: ${toolName}`);
  }
}
