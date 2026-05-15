const API_URL = import.meta.env.VITE_API_URL || "";
const API_BASE = `${API_URL}/chat`;
const AUTH_BASE = `${API_URL}/auth`;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface SendMessageRequest {
  message: string;
  session_id?: string;
  model?: string;
  user_role?: string;
  has_attachment?: boolean;
}

export interface SendMessageResponse {
  response: string;
  model_used: string;
  session_id: string;
}

export interface StreamChunk {
  type: "start" | "chunk" | "done" | "error";
  content?: string;
  session_id?: string;
  model?: string;
  error?: string;
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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserInfo;
}

//AUTH HELPERS

function getAccessToken(): string | null {
  return localStorage.getItem("accessToken");
}

function clearSession(): void {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
}

function buildHeaders(customHeaders: HeadersInit = {}): HeadersInit {
  const token = getAccessToken();

  return {
    "Content-Type": "application/json",
    ...(token && {
      Authorization: `Bearer ${token}`,
    }),
    ...customHeaders,
  };
}

async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: buildHeaders(options.headers),
  });

  if (response.status === 401) {
    clearSession();
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `HTTP ${response.status}: ${errorText || response.statusText}`
    );
  }

  return response;
}

//AUTH API

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

    return response.json();
  },
};

//CHAT API

export const chatApi = {
  async sendMessage(
    req: SendMessageRequest
  ): Promise<SendMessageResponse> {
    const response = await apiFetch(API_BASE, {
      method: "POST",
      body: JSON.stringify(req),
    });

    return response.json();
  },

  async *sendMessageStream(
    req: SendMessageRequest
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const response = await apiFetch(`${API_BASE}/stream`, {
      method: "POST",
      body: JSON.stringify(req),
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
            const chunk: StreamChunk = JSON.parse(data);

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
};