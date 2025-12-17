import { z } from "zod";
import { JiraClient } from "../auth/jira-client.js";
import {
  JiraField,
  JiraIssueType,
  JiraPriority,
  JiraStatus,
  JiraResolution,
} from "../types/jira.js";

// Tool definitions for fields and metadata

export const fieldTools = [
  {
    name: "jira_get_fields",
    description:
      "Get all fields (both standard and custom) available in the Jira instance. Useful for understanding what fields can be used when creating or updating issues.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "jira_get_issue_types",
    description:
      "Get all issue types available in the Jira instance (e.g., Bug, Task, Story, Epic).",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "jira_get_priorities",
    description:
      "Get all priority levels available in the Jira instance (e.g., High, Medium, Low).",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "jira_get_statuses",
    description:
      "Get all statuses available in the Jira instance (e.g., To Do, In Progress, Done).",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "jira_get_resolutions",
    description:
      "Get all resolutions available in the Jira instance (e.g., Done, Won't Do, Duplicate).",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "jira_get_create_metadata",
    description:
      "Get metadata about what fields are required and available when creating issues in specific projects or for specific issue types. This is essential for understanding what fields to provide when creating issues.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectIds: {
          type: "array",
          items: { type: "string" },
          description: "List of project IDs to get metadata for",
        },
        projectKeys: {
          type: "array",
          items: { type: "string" },
          description: "List of project keys to get metadata for",
        },
        issueTypeIds: {
          type: "array",
          items: { type: "string" },
          description: "List of issue type IDs to filter by",
        },
        issueTypeNames: {
          type: "array",
          items: { type: "string" },
          description: "List of issue type names to filter by",
        },
        expand: {
          type: "string",
          description:
            "Fields to expand (e.g., 'projects.issuetypes.fields')",
        },
      },
      required: [],
    },
  },
];

// Input schemas for validation
const GetCreateMetadataSchema = z.object({
  projectIds: z.array(z.string()).optional(),
  projectKeys: z.array(z.string()).optional(),
  issueTypeIds: z.array(z.string()).optional(),
  issueTypeNames: z.array(z.string()).optional(),
  expand: z.string().optional(),
});

// Tool handlers
export async function handleFieldTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_get_fields": {
      return client.get<JiraField[]>("/field");
    }

    case "jira_get_issue_types": {
      return client.get<JiraIssueType[]>("/issuetype");
    }

    case "jira_get_priorities": {
      return client.get<JiraPriority[]>("/priority");
    }

    case "jira_get_statuses": {
      return client.get<JiraStatus[]>("/status");
    }

    case "jira_get_resolutions": {
      return client.get<JiraResolution[]>("/resolution");
    }

    case "jira_get_create_metadata": {
      const input = GetCreateMetadataSchema.parse(args);
      const params: Record<string, string | undefined> = {};

      if (input.projectIds?.length) {
        params.projectIds = input.projectIds.join(",");
      }
      if (input.projectKeys?.length) {
        params.projectKeys = input.projectKeys.join(",");
      }
      if (input.issueTypeIds?.length) {
        params.issuetypeIds = input.issueTypeIds.join(",");
      }
      if (input.issueTypeNames?.length) {
        params.issuetypeNames = input.issueTypeNames.join(",");
      }
      if (input.expand) {
        params.expand = input.expand;
      }

      return client.get("/issue/createmeta", params);
    }

    default:
      throw new Error(`Unknown field tool: ${toolName}`);
  }
}
