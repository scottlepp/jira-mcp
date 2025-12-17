// Common types

export interface JiraUser {
  self?: string;
  accountId: string;
  accountType?: string;
  emailAddress?: string;
  displayName: string;
  active?: boolean;
  timeZone?: string;
  locale?: string;
  avatarUrls?: Record<string, string>;
}

export interface JiraProject {
  self?: string;
  id: string;
  key: string;
  name: string;
  description?: string;
  lead?: JiraUser;
  projectTypeKey?: string;
  simplified?: boolean;
  style?: string;
  avatarUrls?: Record<string, string>;
}

export interface JiraIssueType {
  self?: string;
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  subtask?: boolean;
  hierarchyLevel?: number;
}

export interface JiraPriority {
  self?: string;
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
}

export interface JiraStatus {
  self?: string;
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  statusCategory?: {
    self?: string;
    id: number;
    key: string;
    name: string;
    colorName?: string;
  };
}

export interface JiraResolution {
  self?: string;
  id: string;
  name: string;
  description?: string;
}

export interface JiraComponent {
  self?: string;
  id: string;
  name: string;
  description?: string;
  lead?: JiraUser;
  assigneeType?: string;
  project?: string;
  projectId?: number;
}

export interface JiraVersion {
  self?: string;
  id: string;
  name: string;
  description?: string;
  archived?: boolean;
  released?: boolean;
  releaseDate?: string;
  startDate?: string;
  projectId?: number;
}

// Issue types

export interface JiraIssue {
  id: string;
  key: string;
  self?: string;
  expand?: string;
  fields: JiraIssueFields;
  changelog?: {
    startAt: number;
    maxResults: number;
    total: number;
    histories: JiraChangelog[];
  };
  transitions?: JiraTransition[];
}

export interface JiraIssueFields {
  summary: string;
  description?: unknown; // ADF content
  issuetype?: JiraIssueType;
  project?: JiraProject;
  status?: JiraStatus;
  priority?: JiraPriority;
  assignee?: JiraUser | null;
  reporter?: JiraUser;
  creator?: JiraUser;
  created?: string;
  updated?: string;
  duedate?: string | null;
  resolution?: JiraResolution | null;
  resolutiondate?: string | null;
  labels?: string[];
  components?: JiraComponent[];
  fixVersions?: JiraVersion[];
  versions?: JiraVersion[];
  parent?: { id: string; key: string };
  subtasks?: { id: string; key: string; fields: { summary: string } }[];
  issuelinks?: JiraIssueLink[];
  attachment?: JiraAttachment[];
  comment?: { comments: JiraComment[]; maxResults: number; total: number };
  worklog?: { worklogs: JiraWorklog[]; maxResults: number; total: number };
  [key: string]: unknown; // Custom fields
}

export interface JiraChangelog {
  id: string;
  author: JiraUser;
  created: string;
  items: {
    field: string;
    fieldtype: string;
    fieldId?: string;
    from?: string | null;
    fromString?: string | null;
    to?: string | null;
    toString?: string | null;
  }[];
}

export interface JiraTransition {
  id: string;
  name: string;
  to: JiraStatus;
  hasScreen?: boolean;
  isGlobal?: boolean;
  isInitial?: boolean;
  isAvailable?: boolean;
  isConditional?: boolean;
  isLooped?: boolean;
}

export interface JiraIssueLink {
  id: string;
  self?: string;
  type: {
    id: string;
    name: string;
    inward: string;
    outward: string;
  };
  inwardIssue?: { id: string; key: string; fields?: { summary: string } };
  outwardIssue?: { id: string; key: string; fields?: { summary: string } };
}

// Comment types

export interface JiraComment {
  self?: string;
  id: string;
  author?: JiraUser;
  body: unknown; // ADF content
  updateAuthor?: JiraUser;
  created: string;
  updated: string;
  visibility?: {
    type: string;
    value: string;
  };
}

// Attachment types

export interface JiraAttachment {
  self?: string;
  id: string;
  filename: string;
  author?: JiraUser;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
}

// Worklog types

export interface JiraWorklog {
  self?: string;
  id: string;
  author?: JiraUser;
  updateAuthor?: JiraUser;
  comment?: unknown; // ADF content
  created: string;
  updated: string;
  started: string;
  timeSpent: string;
  timeSpentSeconds: number;
  issueId?: string;
}

// Board/Sprint types (Agile)

export interface JiraBoard {
  id: number;
  self?: string;
  name: string;
  type: "scrum" | "kanban" | "simple";
  location?: {
    projectId?: number;
    projectKey?: string;
    projectName?: string;
    displayName?: string;
  };
}

export interface JiraSprint {
  id: number;
  self?: string;
  state: "closed" | "active" | "future";
  name: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  originBoardId?: number;
  goal?: string;
}

export interface JiraEpic {
  id: number;
  key: string;
  self?: string;
  name: string;
  summary: string;
  done: boolean;
  color?: { key: string };
}

// Filter types

export interface JiraFilter {
  self?: string;
  id: string;
  name: string;
  description?: string;
  owner?: JiraUser;
  jql: string;
  viewUrl?: string;
  searchUrl?: string;
  favourite?: boolean;
  favouritedCount?: number;
  sharePermissions?: unknown[];
}

// Field types

export interface JiraField {
  id: string;
  name: string;
  custom: boolean;
  orderable?: boolean;
  navigable?: boolean;
  searchable?: boolean;
  clauseNames?: string[];
  schema?: {
    type: string;
    system?: string;
    custom?: string;
    customId?: number;
  };
}

// Paginated response types

export interface PaginatedResponse<T> {
  startAt: number;
  maxResults: number;
  total: number;
  values?: T[];
  issues?: T[];
  isLast?: boolean;
  nextPageToken?: string;
}

// Search result type

export interface JiraSearchResult {
  expand?: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
  warningMessages?: string[];
  names?: Record<string, string>;
  schema?: Record<string, unknown>;
}

// Server info

export interface JiraServerInfo {
  baseUrl: string;
  version: string;
  versionNumbers: number[];
  deploymentType: string;
  buildNumber: number;
  buildDate: string;
  serverTime: string;
  scmInfo: string;
  serverTitle: string;
}

// Issue link types

export interface JiraIssueLinkType {
  id: string;
  name: string;
  inward: string;
  outward: string;
  self?: string;
}

// Group types

export interface JiraGroup {
  name: string;
  groupId?: string;
  self?: string;
}

// Permission types

export interface JiraPermission {
  id: string;
  key: string;
  name: string;
  type: string;
  description?: string;
  havePermission: boolean;
}
