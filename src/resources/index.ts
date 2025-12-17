import { JiraClient } from "../auth/jira-client.js";
import {
  JiraProject,
  JiraIssue,
  JiraBoard,
  JiraSprint,
  JiraUser,
  PaginatedResponse,
} from "../types/jira.js";

// Resource definitions
export const resourceDefinitions = [
  {
    uri: "jira://projects",
    name: "Jira Projects",
    description: "List of all accessible Jira projects",
    mimeType: "application/json",
  },
  {
    uri: "jira://boards",
    name: "Jira Boards",
    description: "List of all accessible Jira boards (Scrum and Kanban)",
    mimeType: "application/json",
  },
  {
    uri: "jira://myself",
    name: "Current User",
    description: "Information about the currently authenticated user",
    mimeType: "application/json",
  },
];

// Resource template definitions (for dynamic URIs)
export const resourceTemplates = [
  {
    uriTemplate: "jira://project/{key}",
    name: "Jira Project",
    description: "Details of a specific Jira project by key",
    mimeType: "application/json",
  },
  {
    uriTemplate: "jira://issue/{key}",
    name: "Jira Issue",
    description: "Details of a specific Jira issue by key",
    mimeType: "application/json",
  },
  {
    uriTemplate: "jira://board/{id}",
    name: "Jira Board",
    description: "Details of a specific Jira board by ID",
    mimeType: "application/json",
  },
  {
    uriTemplate: "jira://sprint/{id}",
    name: "Jira Sprint",
    description: "Details of a specific Jira sprint by ID",
    mimeType: "application/json",
  },
];

// Resource handler
export async function handleResource(
  client: JiraClient,
  uri: string
): Promise<{ contents: { uri: string; mimeType: string; text: string }[] }> {
  // Parse the URI
  const url = new URL(uri);
  const path = url.pathname.replace(/^\/\//, "");
  const parts = path.split("/").filter(Boolean);

  let data: unknown;

  if (uri === "jira://projects") {
    // List all projects
    const result = await client.get<PaginatedResponse<JiraProject>>(
      "/project/search",
      { maxResults: 100 }
    );
    data = result.values || [];
  } else if (uri === "jira://boards") {
    // List all boards
    const result = await client.agileGet<PaginatedResponse<JiraBoard>>(
      "/board",
      { maxResults: 100 }
    );
    data = result.values || [];
  } else if (uri === "jira://myself") {
    // Get current user
    data = await client.get<JiraUser>("/myself");
  } else if (parts[0] === "project" && parts[1]) {
    // Get specific project
    data = await client.get<JiraProject>(`/project/${parts[1]}`);
  } else if (parts[0] === "issue" && parts[1]) {
    // Get specific issue
    data = await client.get<JiraIssue>(`/issue/${parts[1]}`);
  } else if (parts[0] === "board" && parts[1]) {
    // Get specific board
    data = await client.agileGet<JiraBoard>(`/board/${parts[1]}`);
  } else if (parts[0] === "sprint" && parts[1]) {
    // Get specific sprint
    data = await client.agileGet<JiraSprint>(`/sprint/${parts[1]}`);
  } else {
    throw new Error(`Unknown resource URI: ${uri}`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}
