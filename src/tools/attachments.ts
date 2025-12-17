import { z } from "zod";
import { JiraClient } from "../auth/jira-client.js";
import { JiraAttachment } from "../types/jira.js";

// Tool definitions for attachments

export const attachmentTools = [
  {
    name: "jira_get_attachment",
    description: "Get metadata for a specific attachment by its ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        attachmentId: {
          type: "string",
          description: "The attachment ID",
        },
      },
      required: ["attachmentId"],
    },
  },
  {
    name: "jira_delete_attachment",
    description: "Delete an attachment from a Jira issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        attachmentId: {
          type: "string",
          description: "The attachment ID to delete",
        },
      },
      required: ["attachmentId"],
    },
  },
  {
    name: "jira_get_attachment_content",
    description:
      "Get the URL to download an attachment's content. Note: Returns the download URL, not the actual file content.",
    inputSchema: {
      type: "object" as const,
      properties: {
        attachmentId: {
          type: "string",
          description: "The attachment ID",
        },
      },
      required: ["attachmentId"],
    },
  },
  {
    name: "jira_get_attachment_meta",
    description:
      "Get the global attachment settings for the Jira instance (max size, allowed types, etc.).",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// Input schemas for validation
const GetAttachmentSchema = z.object({
  attachmentId: z.string(),
});

const DeleteAttachmentSchema = z.object({
  attachmentId: z.string(),
});

const GetAttachmentContentSchema = z.object({
  attachmentId: z.string(),
});

// Tool handlers
export async function handleAttachmentTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_get_attachment": {
      const { attachmentId } = GetAttachmentSchema.parse(args);
      return client.get<JiraAttachment>(`/attachment/${attachmentId}`);
    }

    case "jira_delete_attachment": {
      const { attachmentId } = DeleteAttachmentSchema.parse(args);
      await client.delete(`/attachment/${attachmentId}`);
      return { success: true, deleted: attachmentId };
    }

    case "jira_get_attachment_content": {
      const { attachmentId } = GetAttachmentContentSchema.parse(args);
      // First get the attachment metadata to get the content URL
      const attachment = await client.get<JiraAttachment>(
        `/attachment/${attachmentId}`
      );
      return {
        attachmentId,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        contentUrl: attachment.content,
        message:
          "Use the contentUrl to download the attachment. The URL requires authentication.",
      };
    }

    case "jira_get_attachment_meta": {
      return client.get("/attachment/meta");
    }

    default:
      throw new Error(`Unknown attachment tool: ${toolName}`);
  }
}
