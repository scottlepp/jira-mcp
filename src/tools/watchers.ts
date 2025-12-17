import { z } from "zod";
import { JiraClient } from "../auth/jira-client.js";
import { JiraUser } from "../types/jira.js";

// Tool definitions for watchers and voters

export const watcherTools = [
  {
    name: "jira_get_watchers",
    description: "Get the list of users watching a Jira issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
      },
      required: ["issueIdOrKey"],
    },
  },
  {
    name: "jira_add_watcher",
    description:
      "Add a user as a watcher to a Jira issue. The user will receive notifications about issue updates.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        accountId: {
          type: "string",
          description:
            "The account ID of the user to add as a watcher. If not provided, adds the current user.",
        },
      },
      required: ["issueIdOrKey"],
    },
  },
  {
    name: "jira_remove_watcher",
    description: "Remove a user from the watchers list of a Jira issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
        accountId: {
          type: "string",
          description:
            "The account ID of the user to remove. If not provided, removes the current user.",
        },
      },
      required: ["issueIdOrKey"],
    },
  },
  {
    name: "jira_get_votes",
    description:
      "Get the list of users who have voted on a Jira issue and the vote count.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
      },
      required: ["issueIdOrKey"],
    },
  },
  {
    name: "jira_add_vote",
    description:
      "Add your vote to a Jira issue. Voting indicates support or interest in an issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
      },
      required: ["issueIdOrKey"],
    },
  },
  {
    name: "jira_remove_vote",
    description: "Remove your vote from a Jira issue.",
    inputSchema: {
      type: "object" as const,
      properties: {
        issueIdOrKey: {
          type: "string",
          description: "The issue key (e.g., PROJ-123) or issue ID",
        },
      },
      required: ["issueIdOrKey"],
    },
  },
];

// Input schemas for validation
const GetWatchersSchema = z.object({
  issueIdOrKey: z.string(),
});

const AddWatcherSchema = z.object({
  issueIdOrKey: z.string(),
  accountId: z.string().optional(),
});

const RemoveWatcherSchema = z.object({
  issueIdOrKey: z.string(),
  accountId: z.string().optional(),
});

const GetVotesSchema = z.object({
  issueIdOrKey: z.string(),
});

const AddVoteSchema = z.object({
  issueIdOrKey: z.string(),
});

const RemoveVoteSchema = z.object({
  issueIdOrKey: z.string(),
});

interface WatchersResponse {
  self: string;
  isWatching: boolean;
  watchCount: number;
  watchers: JiraUser[];
}

interface VotesResponse {
  self: string;
  votes: number;
  hasVoted: boolean;
  voters: JiraUser[];
}

// Tool handlers
export async function handleWatcherTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_get_watchers": {
      const { issueIdOrKey } = GetWatchersSchema.parse(args);
      return client.get<WatchersResponse>(`/issue/${issueIdOrKey}/watchers`);
    }

    case "jira_add_watcher": {
      const { issueIdOrKey, accountId } = AddWatcherSchema.parse(args);
      // When adding a watcher, the request body is just the account ID as a string
      await client.post(
        `/issue/${issueIdOrKey}/watchers`,
        accountId ? JSON.stringify(accountId) : undefined
      );
      return { success: true, issueKey: issueIdOrKey, watcher: accountId || "current user" };
    }

    case "jira_remove_watcher": {
      const { issueIdOrKey, accountId } = RemoveWatcherSchema.parse(args);
      await client.delete(`/issue/${issueIdOrKey}/watchers`, {
        accountId,
      });
      return { success: true, issueKey: issueIdOrKey, removed: accountId || "current user" };
    }

    case "jira_get_votes": {
      const { issueIdOrKey } = GetVotesSchema.parse(args);
      return client.get<VotesResponse>(`/issue/${issueIdOrKey}/votes`);
    }

    case "jira_add_vote": {
      const { issueIdOrKey } = AddVoteSchema.parse(args);
      await client.post(`/issue/${issueIdOrKey}/votes`);
      return { success: true, issueKey: issueIdOrKey, voted: true };
    }

    case "jira_remove_vote": {
      const { issueIdOrKey } = RemoveVoteSchema.parse(args);
      await client.delete(`/issue/${issueIdOrKey}/votes`);
      return { success: true, issueKey: issueIdOrKey, voted: false };
    }

    default:
      throw new Error(`Unknown watcher/voter tool: ${toolName}`);
  }
}
