import { JiraConfig } from "../config.js";

export interface JiraRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  queryParams?: Record<string, string | number | boolean | undefined>;
}

export interface JiraErrorResponse {
  errorMessages?: string[];
  errors?: Record<string, string>;
}

export class JiraApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: JiraErrorResponse
  ) {
    super(message);
    this.name = "JiraApiError";
  }
}

export class JiraClient {
  private config: JiraConfig;
  private cloudId: string | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(config: JiraConfig) {
    this.config = config;

    // If cloudId is provided in config, use it directly
    if (config.cloudId) {
      this.cloudId = config.cloudId;
    }
  }

  /**
   * Initialize the client by fetching the cloudId if needed (for scoped tokens)
   */
  private async ensureInitialized(): Promise<void> {
    // Classic tokens don't need initialization
    if (this.config.tokenType === "classic") {
      return;
    }

    // Already have cloudId
    if (this.cloudId) {
      return;
    }

    // Prevent multiple parallel initializations
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.fetchCloudId();
    return this.initPromise;
  }

  /**
   * Fetch the cloudId from the tenant_info endpoint
   * This works for both scoped tokens and classic tokens
   */
  private async fetchCloudId(): Promise<void> {
    // Get cloudId from the tenant_info endpoint
    // URL: https://<site>.atlassian.net/_edge/tenant_info
    const tenantInfoUrl = `${this.config.host}/_edge/tenant_info`;

    const response = await fetch(tenantInfoUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new JiraApiError(
        `Failed to fetch tenant info from ${tenantInfoUrl}: ${text}`,
        response.status
      );
    }

    const tenantInfo: { cloudId: string } = await response.json();

    if (!tenantInfo.cloudId) {
      throw new JiraApiError(
        "No cloudId found in tenant info response",
        500
      );
    }

    this.cloudId = tenantInfo.cloudId;
  }

  /**
   * Build the appropriate URL based on token type
   */
  private buildUrl(
    path: string,
    queryParams?: Record<string, string | number | boolean | undefined>,
    isAgile: boolean = false
  ): string {
    let baseUrl: string;

    if (this.config.tokenType === "scoped") {
      // Scoped tokens use api.atlassian.com with cloudId
      const apiBase = isAgile
        ? `https://api.atlassian.com/ex/jira/${this.cloudId}/rest/agile/1.0`
        : `https://api.atlassian.com/ex/jira/${this.cloudId}/rest/api/3`;
      baseUrl = apiBase;
    } else {
      // Classic tokens use the direct site URL
      const apiBase = isAgile
        ? `${this.config.host}/rest/agile/1.0`
        : `${this.config.host}/rest/api/3`;
      baseUrl = apiBase;
    }

    const url = new URL(`${baseUrl}${path}`);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Get the appropriate authorization header
   * Both classic and scoped tokens use Basic authentication (email:token)
   */
  private getAuthHeader(): string {
    // Both classic and scoped tokens use Basic authentication
    const credentials = Buffer.from(
      `${this.config.email}:${this.config.apiToken}`
    ).toString("base64");
    return `Basic ${credentials}`;
  }

  private async request<T>(
    path: string,
    options: JiraRequestOptions = {},
    isAgile: boolean = false
  ): Promise<T> {
    // Ensure we're initialized (fetches cloudId if needed)
    await this.ensureInitialized();

    const { method = "GET", body, queryParams } = options;
    const url = this.buildUrl(path, queryParams, isAgile);

    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(),
      Accept: "application/json",
    };

    if (body) {
      headers["Content-Type"] = "application/json";
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new JiraApiError(
        `Rate limited. Retry after ${retryAfter || "unknown"} seconds`,
        429
      );
    }

    // Handle no content responses
    if (response.status === 204) {
      return {} as T;
    }

    // Get response text first to handle both JSON and non-JSON responses
    const responseText = await response.text();

    // Try to parse as JSON
    let data: T | JiraErrorResponse | undefined;
    let parseError: Error | undefined;

    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        parseError = e as Error;
        // If it's not JSON, treat the text as the response/error message
      }
    }

    if (!response.ok) {
      // Handle error response
      let errorMessage: string;

      if (data && typeof data === "object") {
        const errorData = data as JiraErrorResponse;
        errorMessage =
          errorData.errorMessages?.join(", ") ||
          Object.values(errorData.errors || {}).join(", ") ||
          `HTTP ${response.status}`;
        throw new JiraApiError(errorMessage, response.status, errorData);
      } else {
        // Plain text error response
        errorMessage = responseText || `HTTP ${response.status}`;
        throw new JiraApiError(errorMessage, response.status, {
          errorMessages: [errorMessage],
        });
      }
    }

    // For successful responses
    if (parseError && responseText) {
      // Non-JSON successful response (like file downloads)
      return responseText as unknown as T;
    }

    return (data ?? {}) as T;
  }

  // Platform API (REST API v3)
  async get<T>(
    path: string,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>(path, { method: "GET", queryParams }, false);
  }

  async post<T>(
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>(path, { method: "POST", body, queryParams }, false);
  }

  async put<T>(
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>(path, { method: "PUT", body, queryParams }, false);
  }

  async delete<T>(
    path: string,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>(path, { method: "DELETE", queryParams }, false);
  }

  // Agile API (REST Agile 1.0)
  async agileGet<T>(
    path: string,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>(path, { method: "GET", queryParams }, true);
  }

  async agilePost<T>(
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>(path, { method: "POST", body, queryParams }, true);
  }

  async agilePut<T>(
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>(path, { method: "PUT", body, queryParams }, true);
  }

  async agileDelete<T>(
    path: string,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>(path, { method: "DELETE", queryParams }, true);
  }
}
