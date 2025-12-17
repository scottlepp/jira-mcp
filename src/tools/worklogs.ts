import { z } from "zod";
import { JiraClient } from "../auth/jira-client.js";
import { JiraWorklog, PaginatedResponse } from "../types/jira.js";

// Tool definitions for worklogs

export const worklogTools = [
  {
    name: "jira_get_worklogs",
    description: "Get all worklogs (time tracking entries) for a Jira issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results (default 1048576)",
        },
        startAt: {
          type: "number",
          description: "Index of the first result (default 0)",
        },
        expand: {
          type: "string",
          description: "Comma-separated list of fields to expand",
        },
      },
      required: ["issueIdOrKey"],
    },
  },
  {
    name: "jira_add_worklog",
    description: "Add a worklog entry (log time) to a Jira issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        timeSpent: {
          type: "string",
          description:
            "Time spent in Jira format (e.g., '2h 30m', '1d', '3h')",
        },
        timeSpentSeconds: {
          type: "number",
          description:
            "Time spent in seconds (alternative to timeSpent). 1 hour = 3600 seconds.",
        },
        started: {
          type: "string",
          description:
            "When the work was started (ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ). Defaults to now.",
        },
        comment: {
          type: "string",
          description: "Description of the work done (plain text)",
        },
        adjustEstimate: {
          type: "string",
          description:
            "How to adjust remaining estimate: new, leave, manual, auto (default: auto)",
        },
        newEstimate: {
          type: "string",
          description:
            "New remaining estimate (required if adjustEstimate is 'new')",
        },
        reduceBy: {
          type: "string",
          description:
            "Amount to reduce estimate by (required if adjustEstimate is 'manual')",
        },
      },
      required: ["issueIdOrKey"],
    },
  },
  {
    name: "jira_update_worklog",
    description: "Update an existing worklog entry.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        worklogId: {
          type: "string",
          description: "The worklog ID to update",
        },
        timeSpent: {
          type: "string",
          description: "New time spent in Jira format (e.g., '2h 30m')",
        },
        timeSpentSeconds: {
          type: "number",
          description: "New time spent in seconds",
        },
        started: {
          type: "string",
          description: "New start time (ISO 8601 format)",
        },
        comment: {
          type: "string",
          description: "New description of the work done",
        },
        adjustEstimate: {
          type: "string",
          description: "How to adjust remaining estimate: new, leave, manual, auto",
        },
        newEstimate: {
          type: "string",
          description: "New remaining estimate",
        },
      },
      required: ["issueIdOrKey", "worklogId"],
    },
  },
  {
    name: "jira_delete_worklog",
    description: "Delete a worklog entry from a Jira issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        worklogId: {
          type: "string",
          description: "The worklog ID to delete",
        },
        adjustEstimate: {
          type: "string",
          description:
            "How to adjust remaining estimate: new, leave, manual, auto (default: auto)",
        },
        newEstimate: {
          type: "string",
          description: "New remaining estimate (if adjustEstimate is 'new')",
        },
        increaseBy: {
          type: "string",
          description:
            "Amount to increase estimate by (if adjustEstimate is 'manual')",
        },
      },
      required: ["issueIdOrKey", "worklogId"],
    },
  },
];

// Input schemas for validation
const GetWorklogsSchema = z.object({
  issueIdOrKey: z.string(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
  expand: z.string().optional(),
});

const AddWorklogSchema = z.object({
  issueIdOrKey: z.string(),
  timeSpent: z.string().optional(),
  timeSpentSeconds: z.number().optional(),
  started: z.string().optional(),
  comment: z.string().optional(),
  adjustEstimate: z.string().optional(),
  newEstimate: z.string().optional(),
  reduceBy: z.string().optional(),
});

const UpdateWorklogSchema = z.object({
  issueIdOrKey: z.string(),
  worklogId: z.string(),
  timeSpent: z.string().optional(),
  timeSpentSeconds: z.number().optional(),
  started: z.string().optional(),
  comment: z.string().optional(),
  adjustEstimate: z.string().optional(),
  newEstimate: z.string().optional(),
});

const DeleteWorklogSchema = z.object({
  issueIdOrKey: z.string(),
  worklogId: z.string(),
  adjustEstimate: z.string().optional(),
  newEstimate: z.string().optional(),
  increaseBy: z.string().optional(),
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
export async function handleWorklogTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_get_worklogs": {
      const { issueIdOrKey, maxResults, startAt, expand } =
        GetWorklogsSchema.parse(args);
      return client.get<PaginatedResponse<JiraWorklog>>(
        `/issue/${issueIdOrKey}/worklog`,
        {
          maxResults,
          startAt,
          expand,
        }
      );
    }

    case "jira_add_worklog": {
      const input = AddWorklogSchema.parse(args);
      const body: Record<string, unknown> = {};

      if (input.timeSpent) body.timeSpent = input.timeSpent;
      if (input.timeSpentSeconds) body.timeSpentSeconds = input.timeSpentSeconds;
      if (input.started) body.started = input.started;
      if (input.comment) body.comment = textToAdf(input.comment);

      // Validate that at least one time field is provided
      if (!input.timeSpent && !input.timeSpentSeconds) {
        throw new Error("Either timeSpent or timeSpentSeconds must be provided");
      }

      const queryParams: Record<string, string | undefined> = {};
      if (input.adjustEstimate) queryParams.adjustEstimate = input.adjustEstimate;
      if (input.newEstimate) queryParams.newEstimate = input.newEstimate;
      if (input.reduceBy) queryParams.reduceBy = input.reduceBy;

      return client.post<JiraWorklog>(
        `/issue/${input.issueIdOrKey}/worklog`,
        body,
        queryParams
      );
    }

    case "jira_update_worklog": {
      const input = UpdateWorklogSchema.parse(args);
      const body: Record<string, unknown> = {};

      if (input.timeSpent) body.timeSpent = input.timeSpent;
      if (input.timeSpentSeconds) body.timeSpentSeconds = input.timeSpentSeconds;
      if (input.started) body.started = input.started;
      if (input.comment) body.comment = textToAdf(input.comment);

      const queryParams: Record<string, string | undefined> = {};
      if (input.adjustEstimate) queryParams.adjustEstimate = input.adjustEstimate;
      if (input.newEstimate) queryParams.newEstimate = input.newEstimate;

      return client.put<JiraWorklog>(
        `/issue/${input.issueIdOrKey}/worklog/${input.worklogId}`,
        body,
        queryParams
      );
    }

    case "jira_delete_worklog": {
      const input = DeleteWorklogSchema.parse(args);
      const queryParams: Record<string, string | undefined> = {};
      if (input.adjustEstimate) queryParams.adjustEstimate = input.adjustEstimate;
      if (input.newEstimate) queryParams.newEstimate = input.newEstimate;
      if (input.increaseBy) queryParams.increaseBy = input.increaseBy;

      await client.delete(
        `/issue/${input.issueIdOrKey}/worklog/${input.worklogId}`,
        queryParams
      );
      return { success: true, deleted: input.worklogId };
    }

    default:
      throw new Error(`Unknown worklog tool: ${toolName}`);
  }
}
