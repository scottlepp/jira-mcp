import { z } from "zod";
import { JiraClient } from "../auth/jira-client.js";
import { JiraIssueLink, JiraIssueLinkType } from "../types/jira.js";

// Tool definitions for issue links

export const issueLinkTools = [
  {
    name: "jira_create_issue_link",
    description:
      "Create a link between two issues (e.g., blocks, is blocked by, relates to, duplicates).",
    inputSchema: {
      type: "object" as const,
      properties: {
        linkType: {
          type: "string",
          description:
            "The type of link (e.g., 'Blocks', 'Duplicate', 'Relates'). Use jira_get_issue_link_types to see available types.",
        },
        inwardIssueKey: {
          type: "string",
          description:
            "The issue key that is the source/inward issue (e.g., 'PROJ-123 blocks PROJ-456' - PROJ-123 is inward)",
        },
        outwardIssueKey: {
          type: "string",
          description:
            "The issue key that is the target/outward issue (e.g., 'PROJ-123 blocks PROJ-456' - PROJ-456 is outward)",
        },
        comment: {
          type: "string",
          description: "Optional comment to add when creating the link",
        },
      },
      required: ["linkType", "inwardIssueKey", "outwardIssueKey"],
    },
  },
  {
    name: "jira_get_issue_link",
    description: "Get details of a specific issue link by its ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        linkId: {
          type: "string",
          description: "The issue link ID",
        },
      },
      required: ["linkId"],
    },
  },
  {
    name: "jira_delete_issue_link",
    description: "Delete a link between two issues.",
    inputSchema: {
      type: "object" as const,
      properties: {
        linkId: {
          type: "string",
          description: "The issue link ID to delete",
        },
      },
      required: ["linkId"],
    },
  },
  {
    name: "jira_get_issue_link_types",
    description:
      "Get all available issue link types in the Jira instance (e.g., Blocks, Duplicate, Relates).",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// Input schemas for validation
const CreateIssueLinkSchema = z.object({
  linkType: z.string(),
  inwardIssueKey: z.string(),
  outwardIssueKey: z.string(),
  comment: z.string().optional(),
});

const GetIssueLinkSchema = z.object({
  linkId: z.string(),
});

const DeleteIssueLinkSchema = z.object({
  linkId: z.string(),
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
export async function handleIssueLinkTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_create_issue_link": {
      const { linkType, inwardIssueKey, outwardIssueKey, comment } =
        CreateIssueLinkSchema.parse(args);

      const body: Record<string, unknown> = {
        type: { name: linkType },
        inwardIssue: { key: inwardIssueKey },
        outwardIssue: { key: outwardIssueKey },
      };

      if (comment) {
        body.comment = {
          body: textToAdf(comment),
        };
      }

      await client.post("/issueLink", body);
      return {
        success: true,
        linkType,
        inwardIssue: inwardIssueKey,
        outwardIssue: outwardIssueKey,
      };
    }

    case "jira_get_issue_link": {
      const { linkId } = GetIssueLinkSchema.parse(args);
      return client.get<JiraIssueLink>(`/issueLink/${linkId}`);
    }

    case "jira_delete_issue_link": {
      const { linkId } = DeleteIssueLinkSchema.parse(args);
      await client.delete(`/issueLink/${linkId}`);
      return { success: true, deleted: linkId };
    }

    case "jira_get_issue_link_types": {
      const result = await client.get<{ issueLinkTypes: JiraIssueLinkType[] }>(
        "/issueLinkType"
      );
      return result.issueLinkTypes;
    }

    default:
      throw new Error(`Unknown issue link tool: ${toolName}`);
  }
}
