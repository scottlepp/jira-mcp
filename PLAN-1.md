# Jira MCP Server Implementation Plan

## Overview
Build a Model Context Protocol (MCP) server that provides AI models with full access to Jira Cloud functionality via the latest REST API v3 and Agile API 1.0.

## Project Structure

```
jira-mcp/
├── src/
│   ├── index.ts              # Entry point, MCP server setup
│   ├── config.ts             # Configuration and environment handling
│   ├── auth/
│   │   └── jira-client.ts    # Jira API client with authentication
│   ├── tools/
│   │   ├── issues.ts         # Issue-related tools
│   │   ├── projects.ts       # Project-related tools
│   │   ├── users.ts          # User-related tools
│   │   ├── boards.ts         # Board/Agile tools
│   │   ├── sprints.ts        # Sprint tools
│   │   ├── comments.ts       # Comment tools
│   │   ├── attachments.ts    # Attachment tools
│   │   ├── worklogs.ts       # Worklog tools
│   │   ├── search.ts         # JQL search tools
│   │   └── index.ts          # Tool registration
│   ├── resources/
│   │   └── index.ts          # MCP resources (project lists, etc.)
│   └── types/
│       └── jira.ts           # TypeScript types for Jira entities
├── package.json
├── tsconfig.json
└── README.md
```

## Dependencies

**IMPORTANT: Always use the latest version of dependencies. Before adding any dependency, check for the latest version.**

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "@types/node": "latest",
    "typescript": "latest"
  }
}
```

## Authentication Configuration

Support two authentication methods via environment variables:

1. **API Token (Basic Auth)** - Recommended for personal use
   - `JIRA_HOST`: Jira instance URL (e.g., `https://yourcompany.atlassian.net`)
   - `JIRA_EMAIL`: User email
   - `JIRA_API_TOKEN`: API token from Atlassian account

2. **OAuth 2.0** - For app integrations (future enhancement)

---

## MCP Tools - Complete API Coverage

### 1. Issues Tools

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_get_issue` | `/rest/api/3/issue/{issueIdOrKey}` | GET | Get issue details |
| `jira_create_issue` | `/rest/api/3/issue` | POST | Create a new issue |
| `jira_update_issue` | `/rest/api/3/issue/{issueIdOrKey}` | PUT | Update an existing issue |
| `jira_delete_issue` | `/rest/api/3/issue/{issueIdOrKey}` | DELETE | Delete an issue |
| `jira_bulk_create_issues` | `/rest/api/3/issue/bulk` | POST | Create multiple issues (max 50) |
| `jira_get_issue_transitions` | `/rest/api/3/issue/{issueIdOrKey}/transitions` | GET | Get available transitions |
| `jira_transition_issue` | `/rest/api/3/issue/{issueIdOrKey}/transitions` | POST | Transition issue to new status |
| `jira_assign_issue` | `/rest/api/3/issue/{issueIdOrKey}/assignee` | PUT | Assign issue to user |
| `jira_get_issue_changelogs` | `/rest/api/3/issue/{issueIdOrKey}/changelog` | GET | Get issue change history |

### 2. Search Tools (JQL)

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_search_issues` | `/rest/api/3/search/jql` | POST | Search issues using JQL |
| `jira_get_jql_autocomplete` | `/rest/api/3/jql/autocomplete/suggestions` | GET | Get JQL autocomplete suggestions |

### 3. Projects Tools

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_list_projects` | `/rest/api/3/project/search` | GET | List all accessible projects |
| `jira_get_project` | `/rest/api/3/project/{projectIdOrKey}` | GET | Get project details |
| `jira_create_project` | `/rest/api/3/project` | POST | Create a new project |
| `jira_update_project` | `/rest/api/3/project/{projectIdOrKey}` | PUT | Update project |
| `jira_delete_project` | `/rest/api/3/project/{projectIdOrKey}` | DELETE | Delete project |
| `jira_get_project_components` | `/rest/api/3/project/{projectIdOrKey}/components` | GET | List project components |
| `jira_create_component` | `/rest/api/3/component` | POST | Create component |
| `jira_get_project_versions` | `/rest/api/3/project/{projectIdOrKey}/versions` | GET | List project versions |
| `jira_create_version` | `/rest/api/3/version` | POST | Create version |
| `jira_update_version` | `/rest/api/3/version/{id}` | PUT | Update version |
| `jira_get_project_statuses` | `/rest/api/3/project/{projectIdOrKey}/statuses` | GET | Get project statuses |

### 4. Users Tools

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_get_current_user` | `/rest/api/3/myself` | GET | Get authenticated user |
| `jira_search_users` | `/rest/api/3/user/search` | GET | Search for users |
| `jira_get_user` | `/rest/api/3/user` | GET | Get user by account ID |
| `jira_get_assignable_users` | `/rest/api/3/user/assignable/search` | GET | Find assignable users for issue/project |
| `jira_bulk_get_users` | `/rest/api/3/user/bulk` | GET | Get multiple users by account IDs |

### 5. Boards Tools (Agile API)

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_list_boards` | `/rest/agile/1.0/board` | GET | List all boards |
| `jira_get_board` | `/rest/agile/1.0/board/{boardId}` | GET | Get board details |
| `jira_create_board` | `/rest/agile/1.0/board` | POST | Create a new board |
| `jira_delete_board` | `/rest/agile/1.0/board/{boardId}` | DELETE | Delete board |
| `jira_get_board_configuration` | `/rest/agile/1.0/board/{boardId}/configuration` | GET | Get board configuration |
| `jira_get_board_issues` | `/rest/agile/1.0/board/{boardId}/issue` | GET | Get issues on board |
| `jira_get_board_backlog` | `/rest/agile/1.0/board/{boardId}/backlog` | GET | Get board backlog |
| `jira_get_board_epics` | `/rest/agile/1.0/board/{boardId}/epic` | GET | Get epics on board |

### 6. Sprints Tools (Agile API)

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_list_sprints` | `/rest/agile/1.0/board/{boardId}/sprint` | GET | List sprints for board |
| `jira_get_sprint` | `/rest/agile/1.0/sprint/{sprintId}` | GET | Get sprint details |
| `jira_create_sprint` | `/rest/agile/1.0/sprint` | POST | Create new sprint |
| `jira_update_sprint` | `/rest/agile/1.0/sprint/{sprintId}` | PUT | Update sprint (name, dates, state) |
| `jira_delete_sprint` | `/rest/agile/1.0/sprint/{sprintId}` | DELETE | Delete sprint (future only) |
| `jira_get_sprint_issues` | `/rest/agile/1.0/sprint/{sprintId}/issue` | GET | Get issues in sprint |
| `jira_move_issues_to_sprint` | `/rest/agile/1.0/sprint/{sprintId}/issue` | POST | Move issues to sprint |
| `jira_move_issues_to_backlog` | `/rest/agile/1.0/backlog/issue` | POST | Move issues to backlog |

### 7. Epics Tools (Agile API)

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_get_epic` | `/rest/agile/1.0/epic/{epicIdOrKey}` | GET | Get epic details |
| `jira_get_epic_issues` | `/rest/agile/1.0/epic/{epicIdOrKey}/issue` | GET | Get issues in epic |
| `jira_move_issues_to_epic` | `/rest/agile/1.0/epic/{epicIdOrKey}/issue` | POST | Add issues to epic |
| `jira_remove_issues_from_epic` | `/rest/agile/1.0/epic/none/issue` | POST | Remove issues from epic |

### 8. Comments Tools

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_get_comments` | `/rest/api/3/issue/{issueIdOrKey}/comment` | GET | Get issue comments |
| `jira_add_comment` | `/rest/api/3/issue/{issueIdOrKey}/comment` | POST | Add comment to issue |
| `jira_update_comment` | `/rest/api/3/issue/{issueIdOrKey}/comment/{id}` | PUT | Update comment |
| `jira_delete_comment` | `/rest/api/3/issue/{issueIdOrKey}/comment/{id}` | DELETE | Delete comment |

### 9. Attachments Tools

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_get_attachment` | `/rest/api/3/attachment/{id}` | GET | Get attachment metadata |
| `jira_delete_attachment` | `/rest/api/3/attachment/{id}` | DELETE | Delete attachment |
| `jira_get_attachment_content` | `/rest/api/3/attachment/content/{id}` | GET | Download attachment |
| `jira_get_attachment_meta` | `/rest/api/3/attachment/meta` | GET | Get attachment settings |

### 10. Worklogs Tools

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_get_worklogs` | `/rest/api/3/issue/{issueIdOrKey}/worklog` | GET | Get worklogs for issue |
| `jira_add_worklog` | `/rest/api/3/issue/{issueIdOrKey}/worklog` | POST | Add worklog entry |
| `jira_update_worklog` | `/rest/api/3/issue/{issueIdOrKey}/worklog/{id}` | PUT | Update worklog |
| `jira_delete_worklog` | `/rest/api/3/issue/{issueIdOrKey}/worklog/{id}` | DELETE | Delete worklog |

### 11. Issue Links Tools

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_create_issue_link` | `/rest/api/3/issueLink` | POST | Link two issues |
| `jira_get_issue_link` | `/rest/api/3/issueLink/{linkId}` | GET | Get issue link details |
| `jira_delete_issue_link` | `/rest/api/3/issueLink/{linkId}` | DELETE | Delete issue link |
| `jira_get_issue_link_types` | `/rest/api/3/issueLinkType` | GET | List available link types |

### 12. Watchers & Voters Tools

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_get_watchers` | `/rest/api/3/issue/{issueIdOrKey}/watchers` | GET | Get issue watchers |
| `jira_add_watcher` | `/rest/api/3/issue/{issueIdOrKey}/watchers` | POST | Add watcher to issue |
| `jira_remove_watcher` | `/rest/api/3/issue/{issueIdOrKey}/watchers` | DELETE | Remove watcher |
| `jira_get_votes` | `/rest/api/3/issue/{issueIdOrKey}/votes` | GET | Get votes on issue |
| `jira_add_vote` | `/rest/api/3/issue/{issueIdOrKey}/votes` | POST | Add vote to issue |
| `jira_remove_vote` | `/rest/api/3/issue/{issueIdOrKey}/votes` | DELETE | Remove vote |

### 13. Fields & Metadata Tools

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_get_fields` | `/rest/api/3/field` | GET | Get all fields (standard + custom) |
| `jira_get_issue_types` | `/rest/api/3/issuetype` | GET | Get all issue types |
| `jira_get_priorities` | `/rest/api/3/priority` | GET | Get all priorities |
| `jira_get_statuses` | `/rest/api/3/status` | GET | Get all statuses |
| `jira_get_resolutions` | `/rest/api/3/resolution` | GET | Get all resolutions |
| `jira_get_create_metadata` | `/rest/api/3/issue/createmeta` | GET | Get fields required to create issues |

### 14. Filters & Dashboards Tools

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_list_filters` | `/rest/api/3/filter/search` | GET | Search/list filters |
| `jira_get_filter` | `/rest/api/3/filter/{id}` | GET | Get filter details |
| `jira_create_filter` | `/rest/api/3/filter` | POST | Create saved filter |
| `jira_update_filter` | `/rest/api/3/filter/{id}` | PUT | Update filter |
| `jira_delete_filter` | `/rest/api/3/filter/{id}` | DELETE | Delete filter |
| `jira_get_favourite_filters` | `/rest/api/3/filter/favourite` | GET | Get user's favorite filters |

### 15. Groups & Permissions Tools

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_search_groups` | `/rest/api/3/groups/picker` | GET | Search for groups |
| `jira_get_group_members` | `/rest/api/3/group/member` | GET | Get group members |
| `jira_get_my_permissions` | `/rest/api/3/mypermissions` | GET | Get current user permissions |

### 16. Server Info Tools

| Tool Name | Jira API Endpoint | Method | Description |
|-----------|-------------------|--------|-------------|
| `jira_get_server_info` | `/rest/api/3/serverInfo` | GET | Get Jira server info |

---

## MCP Resources

Expose read-only data sources as MCP resources:

| Resource URI | Description |
|--------------|-------------|
| `jira://projects` | List of all accessible projects |
| `jira://project/{key}` | Project details |
| `jira://issue/{key}` | Issue details |
| `jira://boards` | List of all boards |
| `jira://board/{id}` | Board details |
| `jira://sprint/{id}` | Sprint details |
| `jira://myself` | Current user info |

---

## Implementation Steps

**IMPORTANT: As each task is completed, update [TASKS.md](TASKS.md) by checking off the corresponding checkbox (`- [ ]` → `- [x]`).**

### Phase 1: Project Setup
1. Initialize npm project with `package.json`
2. Configure TypeScript with `tsconfig.json`
3. Set up project structure
4. Configure for npx distribution (bin field, shebang)

### Phase 2: Core Infrastructure
1. Implement Jira API client with authentication
2. Set up MCP server with stdio transport
3. Create error handling utilities
4. Implement configuration loading from environment

### Phase 3: Implement Tools (by category)
1. **Issues Tools** - Core CRUD and search
2. **Projects Tools** - Project management
3. **Users Tools** - User lookup
4. **Boards & Sprints Tools** - Agile functionality
5. **Comments Tools** - Issue discussion
6. **Worklogs Tools** - Time tracking
7. **Attachments Tools** - File handling
8. **Metadata Tools** - Fields, types, statuses
9. **Links & Watchers Tools** - Issue relationships
10. **Filters Tools** - Saved searches

### Phase 4: Implement Resources
1. Define resource URIs and handlers
2. Implement resource reading

### Phase 5: Testing & Documentation
1. Test with MCP Inspector
2. Test with Claude Desktop
3. Write README with setup instructions
4. Add usage examples

---

## npx Configuration

**package.json**:
```json
{
  "name": "jira-mcp",
  "version": "1.0.0",
  "description": "MCP server for Jira Cloud",
  "type": "module",
  "bin": {
    "jira-mcp": "./build/index.js"
  },
  "main": "./build/index.js",
  "files": ["build"],
  "scripts": {
    "build": "tsc",
    "start": "node build/index.js",
    "prepublishOnly": "npm run build"
  }
}
```

**Entry point (src/index.ts)** - requires shebang:
```typescript
#!/usr/bin/env node
```

---

## Claude Desktop Configuration

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "jira-mcp"],
      "env": {
        "JIRA_HOST": "https://yourcompany.atlassian.net",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

---

## Key Implementation Notes

1. **API Versioning**: Use REST API v3 for platform APIs, Agile API 1.0 for boards/sprints
2. **Pagination**: Use `nextPageToken` cursor pagination (not deprecated `startAt`)
3. **ADF Content**: Support Atlassian Document Format for rich text fields
4. **Error Handling**: Return meaningful error messages from Jira API responses
5. **Rate Limiting**: Handle 429 responses gracefully
6. **Input Validation**: Use Zod schemas for all tool inputs

---

## Total: 72 Tools Covering All Major Jira Functionality
