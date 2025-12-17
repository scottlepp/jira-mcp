import { z } from "zod";
import { JiraClient } from "../auth/jira-client.js";
import { JiraFilter, PaginatedResponse } from "../types/jira.js";

// Tool definitions for filters

export const filterTools = [
  {
    name: "jira_list_filters",
    description:
      "Search for and list saved filters. Returns filters that the user owns or has permission to view.",
    inputSchema: {
      type: "object" as const,
      properties: {
        filterName: {
          type: "string",
          description: "Filter by name (contains match)",
        },
        accountId: {
          type: "string",
          description: "Filter by owner account ID",
        },
        groupname: {
          type: "string",
          description: "Filter by group permission",
        },
        projectId: {
          type: "number",
          description: "Filter by project ID",
        },
        orderBy: {
          type: "string",
          description:
            "Order by field: name, description, owner, favourite_count, is_favourite, id (prefix with - for descending)",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results (default 50)",
        },
        startAt: {
          type: "number",
          description: "Index of the first result (default 0)",
        },
        expand: {
          type: "string",
          description:
            "Comma-separated list of fields to expand (e.g., description,owner,jql,viewUrl,searchUrl,favourite,favouritedCount,sharePermissions)",
        },
      },
      required: [],
    },
  },
  {
    name: "jira_get_filter",
    description: "Get a specific saved filter by its ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        filterId: {
          type: "string",
          description: "The filter ID",
        },
        expand: {
          type: "string",
          description: "Comma-separated list of fields to expand",
        },
      },
      required: ["filterId"],
    },
  },
  {
    name: "jira_create_filter",
    description:
      "Create a new saved filter with a JQL query. The filter can be shared with others.",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Filter name",
        },
        jql: {
          type: "string",
          description: "The JQL query for the filter",
        },
        description: {
          type: "string",
          description: "Filter description",
        },
        favourite: {
          type: "boolean",
          description: "Whether to mark as favourite (default false)",
        },
        sharePermissions: {
          type: "array",
          description:
            "Array of share permissions (e.g., [{type: 'project', projectId: '10000'}])",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                description: "Permission type (global, project, group, user)",
              },
              projectId: { type: "string" },
              groupname: { type: "string" },
              accountId: { type: "string" },
            },
          },
        },
      },
      required: ["name", "jql"],
    },
  },
  {
    name: "jira_update_filter",
    description: "Update an existing saved filter.",
    inputSchema: {
      type: "object" as const,
      properties: {
        filterId: {
          type: "string",
          description: "The filter ID to update",
        },
        name: {
          type: "string",
          description: "New filter name",
        },
        jql: {
          type: "string",
          description: "New JQL query",
        },
        description: {
          type: "string",
          description: "New filter description",
        },
        favourite: {
          type: "boolean",
          description: "Whether to mark as favourite",
        },
        sharePermissions: {
          type: "array",
          description: "New share permissions",
          items: {
            type: "object",
          },
        },
      },
      required: ["filterId"],
    },
  },
  {
    name: "jira_delete_filter",
    description: "Delete a saved filter.",
    inputSchema: {
      type: "object" as const,
      properties: {
        filterId: {
          type: "string",
          description: "The filter ID to delete",
        },
      },
      required: ["filterId"],
    },
  },
  {
    name: "jira_get_favourite_filters",
    description: "Get the list of filters marked as favourite by the current user.",
    inputSchema: {
      type: "object" as const,
      properties: {
        expand: {
          type: "string",
          description: "Comma-separated list of fields to expand",
        },
      },
      required: [],
    },
  },
];

// Input schemas for validation
const ListFiltersSchema = z.object({
  filterName: z.string().optional(),
  accountId: z.string().optional(),
  groupname: z.string().optional(),
  projectId: z.number().optional(),
  orderBy: z.string().optional(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
  expand: z.string().optional(),
});

const GetFilterSchema = z.object({
  filterId: z.string(),
  expand: z.string().optional(),
});

const CreateFilterSchema = z.object({
  name: z.string(),
  jql: z.string(),
  description: z.string().optional(),
  favourite: z.boolean().optional(),
  sharePermissions: z
    .array(
      z.object({
        type: z.string(),
        projectId: z.string().optional(),
        groupname: z.string().optional(),
        accountId: z.string().optional(),
      })
    )
    .optional(),
});

const UpdateFilterSchema = z.object({
  filterId: z.string(),
  name: z.string().optional(),
  jql: z.string().optional(),
  description: z.string().optional(),
  favourite: z.boolean().optional(),
  sharePermissions: z.array(z.record(z.string(), z.unknown())).optional(),
});

const DeleteFilterSchema = z.object({
  filterId: z.string(),
});

const GetFavouriteFiltersSchema = z.object({
  expand: z.string().optional(),
});

// Tool handlers
export async function handleFilterTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_list_filters": {
      const input = ListFiltersSchema.parse(args);
      return client.get<PaginatedResponse<JiraFilter>>("/filter/search", {
        filterName: input.filterName,
        accountId: input.accountId,
        groupname: input.groupname,
        projectId: input.projectId,
        orderBy: input.orderBy,
        maxResults: input.maxResults,
        startAt: input.startAt,
        expand: input.expand,
      });
    }

    case "jira_get_filter": {
      const { filterId, expand } = GetFilterSchema.parse(args);
      return client.get<JiraFilter>(`/filter/${filterId}`, { expand });
    }

    case "jira_create_filter": {
      const input = CreateFilterSchema.parse(args);
      return client.post<JiraFilter>("/filter", {
        name: input.name,
        jql: input.jql,
        description: input.description,
        favourite: input.favourite,
        sharePermissions: input.sharePermissions,
      });
    }

    case "jira_update_filter": {
      const input = UpdateFilterSchema.parse(args);
      const body: Record<string, unknown> = {};

      if (input.name) body.name = input.name;
      if (input.jql) body.jql = input.jql;
      if (input.description !== undefined) body.description = input.description;
      if (input.favourite !== undefined) body.favourite = input.favourite;
      if (input.sharePermissions)
        body.sharePermissions = input.sharePermissions;

      return client.put<JiraFilter>(`/filter/${input.filterId}`, body);
    }

    case "jira_delete_filter": {
      const { filterId } = DeleteFilterSchema.parse(args);
      await client.delete(`/filter/${filterId}`);
      return { success: true, deleted: filterId };
    }

    case "jira_get_favourite_filters": {
      const { expand } = GetFavouriteFiltersSchema.parse(args);
      return client.get<JiraFilter[]>("/filter/favourite", { expand });
    }

    default:
      throw new Error(`Unknown filter tool: ${toolName}`);
  }
}
