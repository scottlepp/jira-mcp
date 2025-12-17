import { z } from "zod";
import { JiraClient } from "../auth/jira-client.js";
import { JiraSearchResult } from "../types/jira.js";

// Tool definitions for search

export const searchTools = [
  {
    name: "jira_search_issues",
    description:
      "Search for Jira issues using JQL (Jira Query Language). Returns a list of issues matching the search criteria.",
    inputSchema: {
      type: "object" as const,
      properties: {
        jql: {
          type: "string",
          description:
            'JQL query string (e.g., "project = PROJ AND status = Open")',
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results to return (default 50, max 100)",
        },
        startAt: {
          type: "number",
          description: "Index of the first result to return (default 0)",
        },
        fields: {
          type: "array",
          items: { type: "string" },
          description:
            "List of fields to return (default: all navigable fields). Use '*all' for all fields, '-field' to exclude.",
        },
        expand: {
          type: "string",
          description:
            "Comma-separated list of expansions (e.g., changelog, renderedFields, transitions)",
        },
      },
      required: ["jql"],
    },
  },
  {
    name: "jira_get_jql_autocomplete",
    description:
      "Get autocomplete suggestions for JQL queries. Useful for building valid JQL queries.",
    inputSchema: {
      type: "object" as const,
      properties: {
        fieldName: {
          type: "string",
          description: "The field name to get suggestions for (e.g., project, status, assignee)",
        },
        fieldValue: {
          type: "string",
          description: "Partial value to autocomplete",
        },
      },
      required: [],
    },
  },
];

// Input schemas for validation
const SearchIssuesSchema = z.object({
  jql: z.string(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
  fields: z.array(z.string()).optional(),
  expand: z.string().optional(),
});

const JqlAutocompleteSchema = z.object({
  fieldName: z.string().optional(),
  fieldValue: z.string().optional(),
});

// Tool handlers
export async function handleSearchTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_search_issues": {
      const { jql, maxResults, startAt, fields, expand } =
        SearchIssuesSchema.parse(args);

      // Use GET /search/jql endpoint (the old /search POST is deprecated)
      // Note: The new API uses nextPageToken instead of startAt, but startAt still works for backwards compatibility
      const queryParams: Record<string, string | number | boolean | undefined> = {
        jql,
        maxResults: maxResults || 50,
      };

      if (startAt !== undefined) {
        queryParams.startAt = startAt;
      }

      if (fields && fields.length > 0) {
        queryParams.fields = fields.join(",");
      }

      if (expand) {
        queryParams.expand = expand;
      }

      return client.get<JiraSearchResult>("/search/jql", queryParams);
    }

    case "jira_get_jql_autocomplete": {
      const { fieldName, fieldValue } = JqlAutocompleteSchema.parse(args);

      if (fieldName) {
        return client.get("/jql/autocompletedata/suggestions", {
          fieldName,
          fieldValue,
        });
      }

      // Return all autocomplete data if no field specified
      return client.get("/jql/autocompletedata");
    }

    default:
      throw new Error(`Unknown search tool: ${toolName}`);
  }
}
