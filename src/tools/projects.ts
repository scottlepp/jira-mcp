import { z } from "zod";
import { JiraClient } from "../auth/jira-client.js";
import {
  JiraProject,
  JiraComponent,
  JiraVersion,
  JiraStatus,
  PaginatedResponse,
} from "../types/jira.js";

// Tool definitions for projects

export const projectTools = [
  {
    name: "jira_list_projects",
    description:
      "List all Jira projects that the user has permission to view. Supports pagination and filtering.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query to filter projects by name",
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
          description: "Order by field (e.g., name, key)",
        },
        expand: {
          type: "string",
          description:
            "Comma-separated list of fields to expand (e.g., description, lead, issueTypes)",
        },
      },
      required: [],
    },
  },
  {
    name: "jira_get_project",
    description: "Get detailed information about a specific Jira project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectIdOrKey: {
          type: "string",
          description: "The project key (e.g., PROJ) or project ID",
        },
        expand: {
          type: "string",
          description:
            "Comma-separated list of fields to expand (e.g., description, lead, issueTypes, projectKeys)",
        },
      },
      required: ["projectIdOrKey"],
    },
  },
  {
    name: "jira_create_project",
    description:
      "Create a new Jira project. Requires Jira admin permissions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        key: {
          type: "string",
          description: "Project key (uppercase letters, max 10 characters)",
        },
        name: {
          type: "string",
          description: "Project name",
        },
        projectTypeKey: {
          type: "string",
          description:
            "Project type (software, service_desk, business). Default: software",
        },
        projectTemplateKey: {
          type: "string",
          description:
            "Template key (e.g., com.pyxis.greenhopper.jira:gh-scrum-template)",
        },
        description: {
          type: "string",
          description: "Project description",
        },
        leadAccountId: {
          type: "string",
          description: "Account ID of the project lead",
        },
        assigneeType: {
          type: "string",
          description: "Default assignee type (PROJECT_LEAD or UNASSIGNED)",
        },
      },
      required: ["key", "name", "leadAccountId"],
    },
  },
  {
    name: "jira_update_project",
    description: "Update an existing Jira project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectIdOrKey: {
          type: "string",
          description: "The project key or ID",
        },
        name: {
          type: "string",
          description: "New project name",
        },
        description: {
          type: "string",
          description: "New project description",
        },
        leadAccountId: {
          type: "string",
          description: "Account ID of the new project lead",
        },
        assigneeType: {
          type: "string",
          description: "Default assignee type",
        },
      },
      required: ["projectIdOrKey"],
    },
  },
  {
    name: "jira_delete_project",
    description:
      "Delete a Jira project. This permanently deletes the project and all its issues. Use with extreme caution.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectIdOrKey: {
          type: "string",
          description: "The project key or ID to delete",
        },
      },
      required: ["projectIdOrKey"],
    },
  },
  {
    name: "jira_get_project_components",
    description: "Get all components for a project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectIdOrKey: {
          type: "string",
          description: "The project key or ID",
        },
      },
      required: ["projectIdOrKey"],
    },
  },
  {
    name: "jira_create_component",
    description: "Create a new component in a project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectKey: {
          type: "string",
          description: "The project key",
        },
        name: {
          type: "string",
          description: "Component name",
        },
        description: {
          type: "string",
          description: "Component description",
        },
        leadAccountId: {
          type: "string",
          description: "Account ID of the component lead",
        },
        assigneeType: {
          type: "string",
          description:
            "Assignee type (PROJECT_DEFAULT, COMPONENT_LEAD, PROJECT_LEAD, UNASSIGNED)",
        },
      },
      required: ["projectKey", "name"],
    },
  },
  {
    name: "jira_get_project_versions",
    description: "Get all versions for a project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectIdOrKey: {
          type: "string",
          description: "The project key or ID",
        },
        expand: {
          type: "string",
          description: "Comma-separated list of fields to expand",
        },
      },
      required: ["projectIdOrKey"],
    },
  },
  {
    name: "jira_create_version",
    description: "Create a new version in a project.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectId: {
          type: "string",
          description: "The project ID (numeric)",
        },
        name: {
          type: "string",
          description: "Version name",
        },
        description: {
          type: "string",
          description: "Version description",
        },
        startDate: {
          type: "string",
          description: "Start date (YYYY-MM-DD format)",
        },
        releaseDate: {
          type: "string",
          description: "Release date (YYYY-MM-DD format)",
        },
        released: {
          type: "boolean",
          description: "Whether the version is released",
        },
        archived: {
          type: "boolean",
          description: "Whether the version is archived",
        },
      },
      required: ["projectId", "name"],
    },
  },
  {
    name: "jira_update_version",
    description: "Update an existing version.",
    inputSchema: {
      type: "object" as const,
      properties: {
        versionId: {
          type: "string",
          description: "The version ID",
        },
        name: {
          type: "string",
          description: "New version name",
        },
        description: {
          type: "string",
          description: "New version description",
        },
        startDate: {
          type: "string",
          description: "Start date (YYYY-MM-DD format)",
        },
        releaseDate: {
          type: "string",
          description: "Release date (YYYY-MM-DD format)",
        },
        released: {
          type: "boolean",
          description: "Whether the version is released",
        },
        archived: {
          type: "boolean",
          description: "Whether the version is archived",
        },
      },
      required: ["versionId"],
    },
  },
  {
    name: "jira_get_project_statuses",
    description: "Get all statuses available in a project, grouped by issue type.",
    inputSchema: {
      type: "object" as const,
      properties: {
        projectIdOrKey: {
          type: "string",
          description: "The project key or ID",
        },
      },
      required: ["projectIdOrKey"],
    },
  },
];

// Input schemas for validation
const ListProjectsSchema = z.object({
  query: z.string().optional(),
  maxResults: z.number().optional(),
  startAt: z.number().optional(),
  orderBy: z.string().optional(),
  expand: z.string().optional(),
});

const GetProjectSchema = z.object({
  projectIdOrKey: z.string(),
  expand: z.string().optional(),
});

const CreateProjectSchema = z.object({
  key: z.string(),
  name: z.string(),
  projectTypeKey: z.string().optional(),
  projectTemplateKey: z.string().optional(),
  description: z.string().optional(),
  leadAccountId: z.string(),
  assigneeType: z.string().optional(),
});

const UpdateProjectSchema = z.object({
  projectIdOrKey: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  leadAccountId: z.string().optional(),
  assigneeType: z.string().optional(),
});

const DeleteProjectSchema = z.object({
  projectIdOrKey: z.string(),
});

const GetComponentsSchema = z.object({
  projectIdOrKey: z.string(),
});

const CreateComponentSchema = z.object({
  projectKey: z.string(),
  name: z.string(),
  description: z.string().optional(),
  leadAccountId: z.string().optional(),
  assigneeType: z.string().optional(),
});

const GetVersionsSchema = z.object({
  projectIdOrKey: z.string(),
  expand: z.string().optional(),
});

const CreateVersionSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  releaseDate: z.string().optional(),
  released: z.boolean().optional(),
  archived: z.boolean().optional(),
});

const UpdateVersionSchema = z.object({
  versionId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  releaseDate: z.string().optional(),
  released: z.boolean().optional(),
  archived: z.boolean().optional(),
});

const GetStatusesSchema = z.object({
  projectIdOrKey: z.string(),
});

// Tool handlers
export async function handleProjectTool(
  client: JiraClient,
  toolName: string,
  args: unknown
): Promise<unknown> {
  switch (toolName) {
    case "jira_list_projects": {
      const { query, maxResults, startAt, orderBy, expand } =
        ListProjectsSchema.parse(args);
      return client.get<PaginatedResponse<JiraProject>>("/project/search", {
        query,
        maxResults,
        startAt,
        orderBy,
        expand,
      });
    }

    case "jira_get_project": {
      const { projectIdOrKey, expand } = GetProjectSchema.parse(args);
      return client.get<JiraProject>(`/project/${projectIdOrKey}`, { expand });
    }

    case "jira_create_project": {
      const input = CreateProjectSchema.parse(args);
      return client.post<JiraProject>("/project", {
        key: input.key,
        name: input.name,
        projectTypeKey: input.projectTypeKey || "software",
        projectTemplateKey: input.projectTemplateKey,
        description: input.description,
        leadAccountId: input.leadAccountId,
        assigneeType: input.assigneeType,
      });
    }

    case "jira_update_project": {
      const input = UpdateProjectSchema.parse(args);
      const body: Record<string, unknown> = {};

      if (input.name) body.name = input.name;
      if (input.description) body.description = input.description;
      if (input.leadAccountId) body.leadAccountId = input.leadAccountId;
      if (input.assigneeType) body.assigneeType = input.assigneeType;

      return client.put<JiraProject>(`/project/${input.projectIdOrKey}`, body);
    }

    case "jira_delete_project": {
      const { projectIdOrKey } = DeleteProjectSchema.parse(args);
      await client.delete(`/project/${projectIdOrKey}`);
      return { success: true, deleted: projectIdOrKey };
    }

    case "jira_get_project_components": {
      const { projectIdOrKey } = GetComponentsSchema.parse(args);
      return client.get<JiraComponent[]>(
        `/project/${projectIdOrKey}/components`
      );
    }

    case "jira_create_component": {
      const input = CreateComponentSchema.parse(args);
      return client.post<JiraComponent>("/component", {
        project: input.projectKey,
        name: input.name,
        description: input.description,
        leadAccountId: input.leadAccountId,
        assigneeType: input.assigneeType,
      });
    }

    case "jira_get_project_versions": {
      const { projectIdOrKey, expand } = GetVersionsSchema.parse(args);
      return client.get<JiraVersion[]>(`/project/${projectIdOrKey}/versions`, {
        expand,
      });
    }

    case "jira_create_version": {
      const input = CreateVersionSchema.parse(args);
      return client.post<JiraVersion>("/version", {
        projectId: parseInt(input.projectId, 10),
        name: input.name,
        description: input.description,
        startDate: input.startDate,
        releaseDate: input.releaseDate,
        released: input.released,
        archived: input.archived,
      });
    }

    case "jira_update_version": {
      const input = UpdateVersionSchema.parse(args);
      const body: Record<string, unknown> = {};

      if (input.name) body.name = input.name;
      if (input.description !== undefined) body.description = input.description;
      if (input.startDate !== undefined) body.startDate = input.startDate;
      if (input.releaseDate !== undefined) body.releaseDate = input.releaseDate;
      if (input.released !== undefined) body.released = input.released;
      if (input.archived !== undefined) body.archived = input.archived;

      return client.put<JiraVersion>(`/version/${input.versionId}`, body);
    }

    case "jira_get_project_statuses": {
      const { projectIdOrKey } = GetStatusesSchema.parse(args);
      return client.get<{ id: string; name: string; statuses: JiraStatus[] }[]>(
        `/project/${projectIdOrKey}/statuses`
      );
    }

    default:
      throw new Error(`Unknown project tool: ${toolName}`);
  }
}
