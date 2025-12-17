import { JiraClient } from "../auth/jira-client.js";
import { JiraServerInfo } from "../types/jira.js";

// Tool definitions for server info

export const serverTools = [
  {
    name: "jira_get_server_info",
    description:
      "Get information about the Jira server/instance including version, build number, and deployment type.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// Tool handlers
export async function handleServerTool(
  client: JiraClient,
  toolName: string,
  _args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_get_server_info": {
      return client.get<JiraServerInfo>("/serverInfo");
    }

    default:
      throw new Error(`Unknown server tool: ${toolName}`);
  }
}
