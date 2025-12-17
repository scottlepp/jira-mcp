import { JiraClient } from "../auth/jira-client.js";

// Import all tool definitions and handlers
import { issueTools, handleIssueTool } from "./issues.js";
import { searchTools, handleSearchTool } from "./search.js";
import { projectTools, handleProjectTool } from "./projects.js";
import { userTools, handleUserTool } from "./users.js";
import { boardTools, handleBoardTool } from "./boards.js";
import { sprintTools, handleSprintTool } from "./sprints.js";
import { epicTools, handleEpicTool } from "./epics.js";
import { commentTools, handleCommentTool } from "./comments.js";
import { attachmentTools, handleAttachmentTool } from "./attachments.js";
import { worklogTools, handleWorklogTool } from "./worklogs.js";
import { issueLinkTools, handleIssueLinkTool } from "./issue-links.js";
import { watcherTools, handleWatcherTool } from "./watchers.js";
import { fieldTools, handleFieldTool } from "./fields.js";
import { filterTools, handleFilterTool } from "./filters.js";
import { groupTools, handleGroupTool } from "./groups.js";
import { serverTools, handleServerTool } from "./server.js";

// Export all tools as a single array
export const allTools = [
  ...issueTools,
  ...searchTools,
  ...projectTools,
  ...userTools,
  ...boardTools,
  ...sprintTools,
  ...epicTools,
  ...commentTools,
  ...attachmentTools,
  ...worklogTools,
  ...issueLinkTools,
  ...watcherTools,
  ...fieldTools,
  ...filterTools,
  ...groupTools,
  ...serverTools,
];

// Map of tool names to their categories for routing
const toolCategories: Record<string, string> = {};

// Populate tool categories
issueTools.forEach((t) => (toolCategories[t.name] = "issue"));
searchTools.forEach((t) => (toolCategories[t.name] = "search"));
projectTools.forEach((t) => (toolCategories[t.name] = "project"));
userTools.forEach((t) => (toolCategories[t.name] = "user"));
boardTools.forEach((t) => (toolCategories[t.name] = "board"));
sprintTools.forEach((t) => (toolCategories[t.name] = "sprint"));
epicTools.forEach((t) => (toolCategories[t.name] = "epic"));
commentTools.forEach((t) => (toolCategories[t.name] = "comment"));
attachmentTools.forEach((t) => (toolCategories[t.name] = "attachment"));
worklogTools.forEach((t) => (toolCategories[t.name] = "worklog"));
issueLinkTools.forEach((t) => (toolCategories[t.name] = "issueLink"));
watcherTools.forEach((t) => (toolCategories[t.name] = "watcher"));
fieldTools.forEach((t) => (toolCategories[t.name] = "field"));
filterTools.forEach((t) => (toolCategories[t.name] = "filter"));
groupTools.forEach((t) => (toolCategories[t.name] = "group"));
serverTools.forEach((t) => (toolCategories[t.name] = "server"));

// Main tool handler that routes to the appropriate category handler
export async function handleTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  const category = toolCategories[toolName];

  if (!category) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  switch (category) {
    case "issue":
      return handleIssueTool(client, toolName, args);
    case "search":
      return handleSearchTool(client, toolName, args);
    case "project":
      return handleProjectTool(client, toolName, args);
    case "user":
      return handleUserTool(client, toolName, args);
    case "board":
      return handleBoardTool(client, toolName, args);
    case "sprint":
      return handleSprintTool(client, toolName, args);
    case "epic":
      return handleEpicTool(client, toolName, args);
    case "comment":
      return handleCommentTool(client, toolName, args);
    case "attachment":
      return handleAttachmentTool(client, toolName, args);
    case "worklog":
      return handleWorklogTool(client, toolName, args);
    case "issueLink":
      return handleIssueLinkTool(client, toolName, args);
    case "watcher":
      return handleWatcherTool(client, toolName, args);
    case "field":
      return handleFieldTool(client, toolName, args);
    case "filter":
      return handleFilterTool(client, toolName, args);
    case "group":
      return handleGroupTool(client, toolName, args);
    case "server":
      return handleServerTool(client, toolName, args);
    default:
      throw new Error(`Unknown tool category: ${category}`);
  }
}
