# Jira MCP Server - Implementation Tasks

## Phase 1: Project Setup

- [x] Initialize npm project (`npm init`)
- [x] Create `package.json` with proper configuration
  - [x] Set `"type": "module"`
  - [x] Configure `bin` field for npx
  - [x] Add build scripts
- [x] Create `tsconfig.json`
- [x] Install dependencies
  - [x] `@modelcontextprotocol/sdk`
  - [x] `zod`
  - [x] `typescript` (dev)
  - [x] `@types/node` (dev)
- [x] Create directory structure
  - [x] `src/`
  - [x] `src/auth/`
  - [x] `src/tools/`
  - [x] `src/resources/`
  - [x] `src/types/`
- [x] Create `.gitignore`
- [x] Create `README.md` with setup instructions

---

## Phase 2: Core Infrastructure

- [x] Create `src/config.ts` - Environment configuration
  - [x] Load `JIRA_HOST`
  - [x] Load `JIRA_EMAIL`
  - [x] Load `JIRA_API_TOKEN`
  - [x] Validation and error messages

- [x] Create `src/auth/jira-client.ts` - Jira API client
  - [x] Basic Auth header generation
  - [x] Base request function with error handling
  - [x] GET request helper
  - [x] POST request helper
  - [x] PUT request helper
  - [x] DELETE request helper
  - [x] Rate limit handling (429 responses)
  - [x] Pagination support with `nextPageToken`

- [x] Create `src/types/jira.ts` - TypeScript types
  - [x] Issue types
  - [x] Project types
  - [x] User types
  - [x] Board/Sprint types
  - [x] Comment types
  - [x] Worklog types
  - [x] Common response types

- [x] Create `src/index.ts` - MCP server entry point
  - [x] Add shebang (`#!/usr/bin/env node`)
  - [x] Initialize Server
  - [x] Set up stdio transport
  - [x] Register tools
  - [x] Register resources
  - [x] Start server

---

## Phase 3: Implement Tools

### 3.1 Issues Tools (`src/tools/issues.ts`)

- [x] `jira_get_issue` - GET `/rest/api/3/issue/{issueIdOrKey}`
- [x] `jira_create_issue` - POST `/rest/api/3/issue`
- [x] `jira_update_issue` - PUT `/rest/api/3/issue/{issueIdOrKey}`
- [x] `jira_delete_issue` - DELETE `/rest/api/3/issue/{issueIdOrKey}`
- [x] `jira_bulk_create_issues` - POST `/rest/api/3/issue/bulk`
- [x] `jira_get_issue_transitions` - GET `/rest/api/3/issue/{issueIdOrKey}/transitions`
- [x] `jira_transition_issue` - POST `/rest/api/3/issue/{issueIdOrKey}/transitions`
- [x] `jira_assign_issue` - PUT `/rest/api/3/issue/{issueIdOrKey}/assignee`
- [x] `jira_get_issue_changelogs` - GET `/rest/api/3/issue/{issueIdOrKey}/changelog`

### 3.2 Search Tools (`src/tools/search.ts`)

- [x] `jira_search_issues` - POST `/rest/api/3/search/jql`
- [x] `jira_get_jql_autocomplete` - GET `/rest/api/3/jql/autocomplete/suggestions`

### 3.3 Projects Tools (`src/tools/projects.ts`)

- [x] `jira_list_projects` - GET `/rest/api/3/project/search`
- [x] `jira_get_project` - GET `/rest/api/3/project/{projectIdOrKey}`
- [x] `jira_create_project` - POST `/rest/api/3/project`
- [x] `jira_update_project` - PUT `/rest/api/3/project/{projectIdOrKey}`
- [x] `jira_delete_project` - DELETE `/rest/api/3/project/{projectIdOrKey}`
- [x] `jira_get_project_components` - GET `/rest/api/3/project/{projectIdOrKey}/components`
- [x] `jira_create_component` - POST `/rest/api/3/component`
- [x] `jira_get_project_versions` - GET `/rest/api/3/project/{projectIdOrKey}/versions`
- [x] `jira_create_version` - POST `/rest/api/3/version`
- [x] `jira_update_version` - PUT `/rest/api/3/version/{id}`
- [x] `jira_get_project_statuses` - GET `/rest/api/3/project/{projectIdOrKey}/statuses`

### 3.4 Users Tools (`src/tools/users.ts`)

- [x] `jira_get_current_user` - GET `/rest/api/3/myself`
- [x] `jira_search_users` - GET `/rest/api/3/user/search`
- [x] `jira_get_user` - GET `/rest/api/3/user`
- [x] `jira_get_assignable_users` - GET `/rest/api/3/user/assignable/search`
- [x] `jira_bulk_get_users` - GET `/rest/api/3/user/bulk`

### 3.5 Boards Tools (`src/tools/boards.ts`)

- [x] `jira_list_boards` - GET `/rest/agile/1.0/board`
- [x] `jira_get_board` - GET `/rest/agile/1.0/board/{boardId}`
- [x] `jira_create_board` - POST `/rest/agile/1.0/board`
- [x] `jira_delete_board` - DELETE `/rest/agile/1.0/board/{boardId}`
- [x] `jira_get_board_configuration` - GET `/rest/agile/1.0/board/{boardId}/configuration`
- [x] `jira_get_board_issues` - GET `/rest/agile/1.0/board/{boardId}/issue`
- [x] `jira_get_board_backlog` - GET `/rest/agile/1.0/board/{boardId}/backlog`
- [x] `jira_get_board_epics` - GET `/rest/agile/1.0/board/{boardId}/epic`

### 3.6 Sprints Tools (`src/tools/sprints.ts`)

- [x] `jira_list_sprints` - GET `/rest/agile/1.0/board/{boardId}/sprint`
- [x] `jira_get_sprint` - GET `/rest/agile/1.0/sprint/{sprintId}`
- [x] `jira_create_sprint` - POST `/rest/agile/1.0/sprint`
- [x] `jira_update_sprint` - PUT `/rest/agile/1.0/sprint/{sprintId}`
- [x] `jira_delete_sprint` - DELETE `/rest/agile/1.0/sprint/{sprintId}`
- [x] `jira_get_sprint_issues` - GET `/rest/agile/1.0/sprint/{sprintId}/issue`
- [x] `jira_move_issues_to_sprint` - POST `/rest/agile/1.0/sprint/{sprintId}/issue`
- [x] `jira_move_issues_to_backlog` - POST `/rest/agile/1.0/backlog/issue`

### 3.7 Epics Tools (`src/tools/epics.ts`)

- [x] `jira_get_epic` - GET `/rest/agile/1.0/epic/{epicIdOrKey}`
- [x] `jira_get_epic_issues` - GET `/rest/agile/1.0/epic/{epicIdOrKey}/issue`
- [x] `jira_move_issues_to_epic` - POST `/rest/agile/1.0/epic/{epicIdOrKey}/issue`
- [x] `jira_remove_issues_from_epic` - POST `/rest/agile/1.0/epic/none/issue`

### 3.8 Comments Tools (`src/tools/comments.ts`)

- [x] `jira_get_comments` - GET `/rest/api/3/issue/{issueIdOrKey}/comment`
- [x] `jira_add_comment` - POST `/rest/api/3/issue/{issueIdOrKey}/comment`
- [x] `jira_update_comment` - PUT `/rest/api/3/issue/{issueIdOrKey}/comment/{id}`
- [x] `jira_delete_comment` - DELETE `/rest/api/3/issue/{issueIdOrKey}/comment/{id}`

### 3.9 Attachments Tools (`src/tools/attachments.ts`)

- [x] `jira_get_attachment` - GET `/rest/api/3/attachment/{id}`
- [x] `jira_delete_attachment` - DELETE `/rest/api/3/attachment/{id}`
- [x] `jira_get_attachment_content` - GET `/rest/api/3/attachment/content/{id}`
- [x] `jira_get_attachment_meta` - GET `/rest/api/3/attachment/meta`

### 3.10 Worklogs Tools (`src/tools/worklogs.ts`)

- [x] `jira_get_worklogs` - GET `/rest/api/3/issue/{issueIdOrKey}/worklog`
- [x] `jira_add_worklog` - POST `/rest/api/3/issue/{issueIdOrKey}/worklog`
- [x] `jira_update_worklog` - PUT `/rest/api/3/issue/{issueIdOrKey}/worklog/{id}`
- [x] `jira_delete_worklog` - DELETE `/rest/api/3/issue/{issueIdOrKey}/worklog/{id}`

### 3.11 Issue Links Tools (`src/tools/issue-links.ts`)

- [x] `jira_create_issue_link` - POST `/rest/api/3/issueLink`
- [x] `jira_get_issue_link` - GET `/rest/api/3/issueLink/{linkId}`
- [x] `jira_delete_issue_link` - DELETE `/rest/api/3/issueLink/{linkId}`
- [x] `jira_get_issue_link_types` - GET `/rest/api/3/issueLinkType`

### 3.12 Watchers & Voters Tools (`src/tools/watchers.ts`)

- [x] `jira_get_watchers` - GET `/rest/api/3/issue/{issueIdOrKey}/watchers`
- [x] `jira_add_watcher` - POST `/rest/api/3/issue/{issueIdOrKey}/watchers`
- [x] `jira_remove_watcher` - DELETE `/rest/api/3/issue/{issueIdOrKey}/watchers`
- [x] `jira_get_votes` - GET `/rest/api/3/issue/{issueIdOrKey}/votes`
- [x] `jira_add_vote` - POST `/rest/api/3/issue/{issueIdOrKey}/votes`
- [x] `jira_remove_vote` - DELETE `/rest/api/3/issue/{issueIdOrKey}/votes`

### 3.13 Fields & Metadata Tools (`src/tools/fields.ts`)

- [x] `jira_get_fields` - GET `/rest/api/3/field`
- [x] `jira_get_issue_types` - GET `/rest/api/3/issuetype`
- [x] `jira_get_priorities` - GET `/rest/api/3/priority`
- [x] `jira_get_statuses` - GET `/rest/api/3/status`
- [x] `jira_get_resolutions` - GET `/rest/api/3/resolution`
- [x] `jira_get_create_metadata` - GET `/rest/api/3/issue/createmeta`

### 3.14 Filters Tools (`src/tools/filters.ts`)

- [x] `jira_list_filters` - GET `/rest/api/3/filter/search`
- [x] `jira_get_filter` - GET `/rest/api/3/filter/{id}`
- [x] `jira_create_filter` - POST `/rest/api/3/filter`
- [x] `jira_update_filter` - PUT `/rest/api/3/filter/{id}`
- [x] `jira_delete_filter` - DELETE `/rest/api/3/filter/{id}`
- [x] `jira_get_favourite_filters` - GET `/rest/api/3/filter/favourite`

### 3.15 Groups & Permissions Tools (`src/tools/groups.ts`)

- [x] `jira_search_groups` - GET `/rest/api/3/groups/picker`
- [x] `jira_get_group_members` - GET `/rest/api/3/group/member`
- [x] `jira_get_my_permissions` - GET `/rest/api/3/mypermissions`

### 3.16 Server Info Tools (`src/tools/server.ts`)

- [x] `jira_get_server_info` - GET `/rest/api/3/serverInfo`

### 3.17 Tool Registration (`src/tools/index.ts`)

- [x] Create tool registration file
- [x] Export all tools
- [x] Register tools with MCP server

---

## Phase 4: Implement Resources

### Resources (`src/resources/index.ts`)

- [x] `jira://projects` - List all accessible projects
- [x] `jira://project/{key}` - Project details
- [x] `jira://issue/{key}` - Issue details
- [x] `jira://boards` - List all boards
- [x] `jira://board/{id}` - Board details
- [x] `jira://sprint/{id}` - Sprint details
- [x] `jira://myself` - Current user info
- [x] Register resources with MCP server

---

## Phase 5: Testing & Documentation

### Testing

- [x] Verify build works (`npm run build`)
- [x] Create integration test suite (`npm test`)
  - [x] Server info tools
  - [x] Users tools (current user, search)
  - [x] Projects tools (list, get)
  - [x] Fields/metadata tools
  - [x] Search tools (JQL)
  - [x] Issues tools (CRUD)
  - [x] Boards tools
  - [x] Filters tools
  - [x] Groups tools
  - [x] Permissions tools
  - [x] Comments tools
  - [x] Worklogs tools
  - [x] Watchers tools
- [ ] Test with MCP Inspector (`npx @modelcontextprotocol/inspector`)
- [ ] Test with Claude Desktop

### Documentation

- [x] Complete README.md
  - [x] Installation instructions
  - [x] Configuration guide
  - [x] Claude Desktop setup
  - [x] Available tools list
  - [x] Available resources list
  - [ ] Usage examples
- [ ] Add inline code documentation

### Publishing

- [x] Verify build works (`npm run build`)
- [ ] Test npx execution locally
- [ ] Publish to npm (optional)

---

## Summary

| Phase | Tasks | Completed |
|-------|-------|-----------|
| Phase 1: Project Setup | 12 | 12 |
| Phase 2: Core Infrastructure | 25 | 25 |
| Phase 3: Implement Tools | 72 | 72 |
| Phase 4: Implement Resources | 8 | 8 |
| Phase 5: Testing & Documentation | 19 | 17 |
| **Total** | **136** | **134** |
