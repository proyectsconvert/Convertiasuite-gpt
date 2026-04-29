const API_BASE = "/chat";

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

export const chatApi = {
  async sendMessage(req: SendMessageRequest): Promise<SendMessageResponse> {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  sendMessageStream(req: SendMessageRequest): AsyncGenerator<StreamChunk, void, unknown> {
    return (async function* () {
      const response = await fetch(`${API_BASE}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              try {
                const chunk: StreamChunk = JSON.parse(data);
                yield chunk;
                if (chunk.type === "done" || chunk.type === "error") {
                  return;
                }
              } catch (e) {
                console.error("Failed to parse SSE data:", data);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    })();
  },

  async getHistory(sessionId: string): Promise<ChatHistoryResponse> {
    const res = await fetch(`${API_BASE}/${sessionId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async getSessions(userId: string): Promise<SessionListResponse> {
    const res = await fetch(`${API_BASE}/sessions?user_id=${userId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async createSession(userId: string, title: string): Promise<SessionSummary> {
    const res = await fetch(`${API_BASE}/sessions?user_id=${userId}&title=${encodeURIComponent(title)}`, {
      method: "POST",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}?user_id=${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  },
};