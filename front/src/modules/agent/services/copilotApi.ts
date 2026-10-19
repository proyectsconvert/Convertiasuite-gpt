import { apiFetch } from "@/modules/shared/services/api";

const RAW_API_URL = import.meta.env.VITE_API_URL || "";
const API_URL = typeof window !== "undefined" && RAW_API_URL.includes("backend") ? "" : RAW_API_URL;

export interface CopilotSuggestion {
  call_id: string;
  campaign_id: string;
  trigger_type: string;
  primary_signal: string;
  protocol_applied: string;
  recommended_action: string;
  suggested_phrase: string;
  confidence: number;
  model_used: string;
  latency_ms: number;
  evidence: string;
}

export interface CopilotTurnResponse {
  has_suggestion: boolean;
  suggestion?: CopilotSuggestion | null;
  accumulated_risk: number;
  accumulated_interest: number;
  status: string;
}

export const copilotApi = {
  async getSuggestion(params: {
    text: string;
    call_id: string;
    campaign_id?: string;
    text_window?: string[];
    speaker?: string;
    accumulated_risk?: number;
    accumulated_interest?: number;
  }): Promise<CopilotTurnResponse> {
    return apiFetch<CopilotTurnResponse>(`${API_URL}/v1/copilot/suggest`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  async checkHealth(): Promise<any> {
    return apiFetch(`${API_URL}/v1/copilot/health`);
  },
};
