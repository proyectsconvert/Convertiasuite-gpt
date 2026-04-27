const API_BASE = "/api/chat";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface SendMessageRequest {
  message: string;
  session_id?: string;
  user_role?: string;
  has_attachment?: boolean;
}

export interface SendMessageResponse {
  response: string;
  model_used: string;
  session_id: string;
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