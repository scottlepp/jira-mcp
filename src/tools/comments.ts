import { z } from "zod";
import { JiraClient } from "../auth/jira-client.js";
import { JiraComment, PaginatedResponse } from "../types/jira.js";

// Tool definitions for comments

export const commentTools = [
  {
    name: "jira_get_comments",
    description: "Get all comments on a Jira issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results (default 50)",
        },
        startAt: {
          type: "number",
          description: "Index of the first result (default 0)",
        },
        orderBy: {
          type: "string",
          description: "Order by field (created, -created for descending)",
        },
        expand: {
          type: "string",
          description: "Comma-separated list of fields to expand (e.g., renderedBody)",
        },
      },
      required: ["issueIdOrKey"],
    },
  },
  {
    name: "jira_add_comment",
    description: "Add a comment to a Jira issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        body: {
          type: "string",
          description: "The comment text (plain text, will be converted to ADF)",
        },
        visibility: {
          type: "object",
          description: "Optional visibility restriction",
          properties: {
            type: {
              type: "string",
              description: "Type of visibility (role or group)",
            },
            value: {
              type: "string",
              description: "Name of role or group",
            },
          },
        },
      },
      required: ["issueIdOrKey", "body"],
    },
  },
  {
    name: "jira_update_comment",
    description: "Update an existing comment on a Jira issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        commentId: {
          type: "string",
          description: "The comment ID",
        },
        body: {
          type: "string",
          description: "The new comment text (plain text)",
        },
        visibility: {
          type: "object",
          description: "Optional visibility restriction",
          properties: {
            type: { type: "string" },
            value: { type: "string" },
          },
        },
      },
      required: ["issueIdOrKey", "commentId", "body"],
    },
  },
  {
    name: "jira_delete_comment",
    description: "Delete a comment from a Jira issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        commentId: {
          type: "string",
          description: "The comment ID to delete",
        },
      },
      required: ["issueIdOrKey", "commentId"],
    },
  },
];

// Input schemas for validation
const GetCommentsSchema = z.object({
  issueIdOrKey: z.string(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
  orderBy: z.string().optional(),
  expand: z.string().optional(),
});

const AddCommentSchema = z.object({
  issueIdOrKey: z.string(),
  body: z.string(),
  visibility: z
    .object({
      type: z.string(),
      value: z.string(),
    })
    .optional(),
});

const UpdateCommentSchema = z.object({
  issueIdOrKey: z.string(),
  commentId: z.string(),
  body: z.string(),
  visibility: z
    .object({
      type: z.string(),
      value: z.string(),
    })
    .optional(),
});

const DeleteCommentSchema = z.object({
  issueIdOrKey: z.string(),
  commentId: z.string(),
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
export async function handleCommentTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_get_comments": {
      const { issueIdOrKey, maxResults, startAt, orderBy, expand } =
        GetCommentsSchema.parse(args);
      return client.get<PaginatedResponse<JiraComment>>(
        `/issue/${issueIdOrKey}/comment`,
        {
          maxResults,
          startAt,
          orderBy,
          expand,
        }
      );
    }

    case "jira_add_comment": {
      const { issueIdOrKey, body, visibility } = AddCommentSchema.parse(args);
      const requestBody: Record<string, unknown> = {
        body: textToAdf(body),
      };
      if (visibility) {
        requestBody.visibility = visibility;
      }
      return client.post<JiraComment>(
        `/issue/${issueIdOrKey}/comment`,
        requestBody
      );
    }

    case "jira_update_comment": {
      const { issueIdOrKey, commentId, body, visibility } =
        UpdateCommentSchema.parse(args);
      const requestBody: Record<string, unknown> = {
        body: textToAdf(body),
      };
      if (visibility) {
        requestBody.visibility = visibility;
      }
      return client.put<JiraComment>(
        `/issue/${issueIdOrKey}/comment/${commentId}`,
        requestBody
      );
    }

    case "jira_delete_comment": {
      const { issueIdOrKey, commentId } = DeleteCommentSchema.parse(args);
      await client.delete(`/issue/${issueIdOrKey}/comment/${commentId}`);
      return { success: true, deleted: commentId };
    }

    default:
      throw new Error(`Unknown comment tool: ${toolName}`);
  }
}
