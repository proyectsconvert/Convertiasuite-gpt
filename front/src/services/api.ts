const API_URL = "";
const API_BASE = `${API_URL}/chat`;
const AUTH_BASE = `${API_URL}/auth`;

export interface Attachment {
  id?: string;
  filename: string;
  type: string;
}

export interface DocumentArtifact {
  id?: string;
  filename: string;
  type: "pdf" | "docx" | "pptx" | "csv" | "json" | "txt" | "file";
  content?: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  artifacts?: DocumentArtifact[];
  images?: string[];
}

export interface SendMessageRequest {
  message: string;
  session_id?: string;
  model?: string;
  user_role?: string;
  extracted_context?: string;
  attachment_type?: string;
  attachment_name?: string;
}

export interface SendMessageStreamOptions {
  signal?: AbortSignal;
}

export interface StreamChunk {
  type: "start" | "chunk" | "done" | "error";
  content?: string;
  session_id?: string;
  model?: string;
  error?: string;
}

// Type guard para validar StreamChunk
function isValidStreamChunk(data: unknown): data is StreamChunk {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  const validTypes = ["start", "chunk", "done", "error"];
  return (
    typeof obj.type === "string" &&
    validTypes.includes(obj.type) &&
    (obj.content === undefined || typeof obj.content === "string") &&
    (obj.session_id === undefined || typeof obj.session_id === "string") &&
    (obj.model === undefined || typeof obj.model === "string") &&
    (obj.error === undefined || typeof obj.error === "string")
  );
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  session_id: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface SessionListResponse {
  sessions: SessionSummary[];
}

export interface GenerateDocumentResponse {
  success: boolean;
  artifact: {
    id: string;
    filename: string;
    type: string;
    size: number;
    created_at: string;
  };
  message?: string;
}

export interface DocumentListResponse {
  count: number;
  documents: Array<{
    id: string;
    filename: string;
    type: string;
    word_count: number;
    created_at: string;
    updated_at: string;
    tags: string[];
    metadata: Record<string, unknown>;
    preview_text: string;
    version: number;
    history: Array<{ version?: number; action?: string; timestamp?: string; summary?: string }>;
  }>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  area?: string;
  functional_role?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  user: UserInfo;
}


function getAccessToken(): string | null {
  return localStorage.getItem("accessToken");
}

function getRefreshToken(): string | null {
  return localStorage.getItem("refreshToken");
}

let authRedirected = false;

function setTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem("accessToken", accessToken);
  if (refreshToken) {
    localStorage.setItem("refreshToken", refreshToken);
  }
  authRedirected = false;
}

function clearSession(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

let onTokenRefreshed: ((token: string) => void) | null = null;
export function setTokenRefreshListener(listener: (token: string) => void) {
  onTokenRefreshed = listener;
}

// Flag para evitar múltiples intentos de refresh simultáneamente
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

function handleAuthFailure(): never {
  if (!authRedirected) {
    authRedirected = true;
    clearSession();
    window.location.assign("/login");
  }

  throw new Error("Sesión expirada. Inicie sesión nuevamente.");
}

async function tryRefreshToken(): Promise<boolean> {
  if (authRedirected) {
    return false;
  }

  // Si ya estamos refrescando, espera a que termine
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${AUTH_BASE}/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${refreshToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTokens(data.access_token, data.refresh_token || refreshToken);
        if (onTokenRefreshed) {
          onTokenRefreshed(data.access_token);
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error refrescando token:", error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function buildHeaders(customHeaders: HeadersInit = {}, isFormData = false): HeadersInit {
  const token = getAccessToken();
  const headers: Record<string, string> = {};

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return { ...headers, ...(customHeaders as Record<string, string>) };
}

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const isFormData = options.body instanceof FormData;

  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options.headers, isFormData),
  });

  // Intentar refrescar si recibe 401
  if (response.status === 401) {
    const refreshed = await tryRefreshToken();

    if (refreshed) {
      return fetch(url, {
        ...options,
        headers: buildHeaders(options.headers, isFormData),
      }).catch((error) => {
        handleAuthFailure();
        throw error;
      });
    }

    handleAuthFailure();
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `HTTP ${response.status}: ${errorText || response.statusText}`
    );
  }

  return response;
}


export const authApi = {
  async login(req: LoginRequest): Promise<TokenResponse> {
    const response = await fetch(`${AUTH_BASE}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `HTTP ${response.status}: ${errorText || response.statusText}`
      );
    }

    const data: TokenResponse = await response.json();

    // Guardar tokens después de login exitoso
    localStorage.setItem("accessToken", data.access_token);
    if (data.refresh_token) {
      localStorage.setItem("refreshToken", data.refresh_token);
    }

    return data;
  },

  async updateProfile(req: { name?: string; area?: string; functional_role?: string }): Promise<UserInfo> {
    const response = await apiFetch(`${AUTH_BASE}/profile`, {
      method: "PUT",
      body: JSON.stringify(req),
    });
    return response.json();
  },

  async changePassword(req: { current_password: string; new_password: string }): Promise<{ success: boolean }> {
    const response = await apiFetch(`${AUTH_BASE}/change-password`, {
      method: "POST",
      body: JSON.stringify(req),
    });
    return response.json();
  },
};


export const chatApi = {
  async *sendMessageStream(
    req: SendMessageRequest,
    options: SendMessageStreamOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const response = await apiFetch(`${API_BASE}/stream`, {
      method: "POST",
      body: JSON.stringify(req),
      signal: options.signal,
    });

    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, {
          stream: true,
        });

        const lines = buffer.split(/\r?\n/);

        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) {
            continue;
          }

          const data = line.slice(6).trim();

          if (!data) {
            continue;
          }

          try {
            const parsed = JSON.parse(data);

            if (!isValidStreamChunk(parsed)) {
              console.error("Invalid StreamChunk structure:", parsed);
              throw new Error("Invalid stream chunk format");
            }

            const chunk: StreamChunk = parsed;

            yield chunk;

            if (
              chunk.type === "done" ||
              chunk.type === "error"
            ) {
              return;
            }
          } catch (error) {
            console.error("Invalid SSE JSON:", data);

            throw new Error("Stream parsing failed");
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  async getHistory(
    sessionId: string
  ): Promise<ChatHistoryResponse> {
    const response = await apiFetch(
      `${API_BASE}/${sessionId}`
    );

    return response.json();
  },

  async getSessions(): Promise<SessionListResponse> {
    const response = await apiFetch(
      `${API_BASE}/sessions`
    );

    return response.json();
  },

  async createSession(
    title: string
  ): Promise<SessionSummary> {

    const response = await apiFetch(
      `${API_BASE}/sessions?title=${encodeURIComponent(title)}`,
      {
        method: "POST",
      }
    );

    return response.json();
  },

  async deleteSession(
    sessionId: string
  ): Promise<void> {

    await apiFetch(
      `${API_BASE}/sessions/${sessionId}`,
      {
        method: "DELETE",
      }
    );
  },

  async stopSessionStream(
    sessionId: string
  ): Promise<{ status: string; stopped: boolean }> {
    const response = await apiFetch(
      `${API_BASE}/sessions/${sessionId}/stop`,
      {
        method: "POST",
      }
    );
    return response.json();
  },

  async uploadFile(
    file: File,
    sessionId?: string
  ): Promise<{ filename: string; extracted_context: string; attachment_type?: string }> {
    const formData = new FormData();
    formData.append("file", file);

    if (sessionId) {
      formData.append("session_id", sessionId);
    }

    const response = await apiFetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData,
    });

    return response.json();
  },

  async uploadAudio(
    formData: FormData
  ): Promise<{ transcript: string }> {
    const response = await apiFetch(`${API_BASE}/upload-audio`, {
      method: "POST",
      body: formData,
    });

    return response.json();
  },

  async updateHistory(
    sessionId: string,
    messages: ChatMessage[]
  ): Promise<{ status: string }> {
    const response = await apiFetch(
      `${API_BASE}/${sessionId}/messages`,
      {
        method: "PUT",
        body: JSON.stringify(messages),
      }
    );
    return response.json();
  }
};

export const documentsApi = {
  async uploadFile(file: File, tags: string[] = []): Promise<{ id: string; filename: string }> {
    const formData = new FormData();
    formData.append("file", file);
    tags.forEach((tag) => formData.append("tags", tag));

    const response = await apiFetch(`${API_URL}/api/documents/upload`, {
      method: "POST",
      body: formData,
    });

    return response.json();
  },

  async listDocuments(
    filters?: { search?: string; type?: string; tag?: string; area?: string; user?: string; dateFrom?: string; dateTo?: string }
  ): Promise<DocumentListResponse> {
    const params = new URLSearchParams();
    if (filters?.search) params.set("search", filters.search);
    if (filters?.type) params.set("type", filters.type);
    if (filters?.tag) params.set("tag", filters.tag);
    if (filters?.area) params.set("area", filters.area);
    if (filters?.user) params.set("user", filters.user);
    if (filters?.dateFrom) params.set("date_from", filters.dateFrom);
    if (filters?.dateTo) params.set("date_to", filters.dateTo);

    const response = await apiFetch(`${API_URL}/api/documents/?${params.toString()}`);
    return response.json();
  },

  async getById(documentId: string): Promise<any> {
    const response = await apiFetch(`${API_URL}/api/documents/${documentId}`);
    return response.json();
  },

  async download(documentId: string): Promise<Blob> {
    const response = await apiFetch(`${API_URL}/api/documents/${documentId}/download`);
    return response.blob();
  },

  async delete(documentId: string): Promise<{ message: string }> {
    const response = await apiFetch(`${API_URL}/api/documents/${documentId}`, {
      method: "DELETE",
    });
    return response.json();
  },

  async generateFile(filename: string, format: string, content: any, sessionId?: string): Promise<Blob> {
    const payload: any = { filename, format, content };
    if (sessionId) {
      payload.session_id = sessionId;
    }
    const response = await apiFetch(`${API_URL}/api/documents/generate`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.blob();
  },

  async generateWithArtifact(
    filename: string,
    format: string,
    content: any,
    sessionId: string,
    messageId?: string
  ): Promise<GenerateDocumentResponse> {
    const payload: any = {
      filename,
      format,
      content,
      session_id: sessionId
    };
    if (messageId) {
      payload.message_id = messageId;
    }
    const response = await apiFetch(`${API_URL}/api/documents/generate-with-artifact`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return response.json();
  }
};

const ADMIN_BASE = `${API_URL}/admin`;

export interface ModelMetric {
  model_name: string;
  provider: string;
  requests: number;
  tokens_input: number;
  tokens_output: number;
  total_cost: number;
  avg_cost_per_request: number;
}

export interface DepartmentMetric {
  department_name: string;
  requests: number;
  tokens_input: number;
  tokens_output: number;
  total_cost: number;
}

export interface RoleMetric {
  role_name: string;
  requests: number;
  tokens_input: number;
  tokens_output: number;
  total_cost: number;
}

export interface UserMetric {
  user_id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  requests: number;
  tokens_input: number;
  tokens_output: number;
  total_cost: number;
  last_use: string;
  most_used_model: string;
}

export interface TimelineMetric {
  date: string;
  requests: number;
  tokens_input: number;
  tokens_output: number;
  total_cost: number;
}

export interface AdminMetricsResponse {
  summary: {
    total_requests: number;
    total_tokens_input: number;
    total_tokens_output: number;
    total_cost: number;
    active_users: number;
    avg_tokens_per_request: number;
    avg_cost_per_request: number;
    requests_per_minute: number;
  };
  by_model: ModelMetric[];
  by_department: DepartmentMetric[];
  by_role: RoleMetric[];
  by_user: UserMetric[];
  timeline: TimelineMetric[];
}

export const adminApi = {
  async getMetrics(userId?: string): Promise<AdminMetricsResponse> {
    const params = new URLSearchParams();
    if (userId) params.set("user_id", userId);

    const response = await apiFetch(`${ADMIN_BASE}/metrics${params.toString() ? `?${params.toString()}` : ""}`, {
      method: "GET",
    });
    return response.json();
  },
};

