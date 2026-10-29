import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/modules/shared/store/appStore";
import {
  copilotApi,
  CopilotSuggestion,
} from "@/modules/agent/services/copilotApi";

declare global {
  interface Window {
    inConcertAgentApi?: any;
    inConcert?: any;
  }
}

export interface UseInConcertReturn {
  isSdkLoaded: boolean;
  inCall: boolean;
  activeInteractionId: string | null;
  latestSuggestion: CopilotSuggestion | null;
  textWindow: string[];
  simulateCall: (
    scenario?: "price" | "distrust" | "interest" | "aggression"
  ) => Promise<void>;
  endSimulatedCall: () => void;
  sendManualTranscript: (text: string) => Promise<void>;
}

function getCopilotWsUrl(): string {
  if (typeof window === "undefined") return "";
  const isHttps = window.location.protocol === "https:";
  const defaultProto = isHttps ? "wss:" : "ws:";

  const rawApi = import.meta.env.VITE_API_URL || "";
  if (rawApi && !rawApi.includes("backend")) {
    try {
      const url = new URL(rawApi);
      const wsProto = url.protocol === "https:" ? "wss:" : "ws:";
      return `${wsProto}//${url.host}/v1/copilot/ws`;
    } catch {
      // fallback a relative
    }
  }
  return `${defaultProto}//${window.location.host}/v1/copilot/ws`;
}

export function useInConcert(): UseInConcertReturn {
  const {
    inCall,
    activeInteractionId,
    copilotSuggestion,
    setInCall,
    setCopilotSuggestion,
    clearCopilot,
    setOliviaWidgetOpen,
    user,
  } = useAppStore();

  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [textWindow, setTextWindow] = useState<string[]>([]);

  const activeInteractionIdRef = useRef(activeInteractionId);
  const textWindowRef = useRef<string[]>([]);
  const userRef = useRef(user);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  activeInteractionIdRef.current = activeInteractionId;
  userRef.current = user;

  // Evalúa una frase transcrita contra el motor de copiloto del backend
  const processTranscript = useCallback(
    async (text: string, currentCallId?: string) => {
      if (!text?.trim()) return;

      const callId =
        currentCallId ||
        activeInteractionIdRef.current ||
        "call-live";

      const nextTextWindow = [...textWindowRef.current, text].slice(-6);

      textWindowRef.current = nextTextWindow;
      setTextWindow(nextTextWindow);

      try {
        const response = await copilotApi.getSuggestion({
          text,
          call_id: callId,
          campaign_id: userRef.current?.campaign_name || "default",
          text_window: nextTextWindow,
          speaker: "client",
        });

        if (response.has_suggestion && response.suggestion) {
          setCopilotSuggestion(response.suggestion);

          toast.info("Nueva recomendación de Olivia disponible", {
            description: response.suggestion.recommended_action,
            duration: 4000,
          });
        }
      } catch (err) {
        console.warn(
          "[inConcert Copilot] Error obteniendo sugerencia:",
          err
        );
      }
    },
    [setCopilotSuggestion]
  );

  // Conexión WebSocket en tiempo real para eventos de inConcert Webhook
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isUnmounted = false;
    let pingInterval: any = null;

    const connectWebSocket = () => {
      const wsUrl = getCopilotWsUrl();
      if (!wsUrl) return;

      console.info("[inConcert Copilot] Conectando a WebSocket:", wsUrl);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isUnmounted) return;
        console.info("[inConcert Copilot] WebSocket conectado exitosamente.");
        setIsSdkLoaded(true);

        // Keep-alive ping cada 30 segundos
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        if (isUnmounted) return;
        try {
          const data = JSON.parse(event.data);
          console.info("[inConcert Copilot] Evento recibido por WebSocket:", data);

          if (data.type === "CALL_STARTED") {
            const currentUser = userRef.current;
            const userRole = (currentUser?.role || "").toLowerCase();
            const funcRole = (currentUser?.functional_role || "").toLowerCase();
            const isAgent =
              userRole === "agent" ||
              userRole === "agente" ||
              funcRole.includes("agent") ||
              funcRole.includes("agente");

            if (!isAgent) {
              return;
            }

            // Si el webhook trae un agente específico y el usuario tiene sesión, verificar pertenencia
            if (data.agent_username && currentUser?.email) {
              const target = String(data.agent_username).toLowerCase();
              const userEmail = currentUser.email.toLowerCase();
              const userName = (currentUser.name || "").toLowerCase();
              const userPrefix = userEmail.split("@")[0];

              if (!target.includes(userPrefix) && !userEmail.includes(target) && !userName.includes(target)) {
                console.info("[inConcert Copilot] Evento ignorado: pertenece a otro agente:", data.agent_username);
                return;
              }
            }

            const interactionId =
              data.call_id ||
              data.payload?.interactionId ||
              `inc-${Date.now()}`;

            setInCall(true, interactionId);
            setOliviaWidgetOpen(true);

            textWindowRef.current = [];
            setTextWindow([]);

            const clientInfo = data.customer_name || data.customer_phone ? ` (${data.customer_name || data.customer_phone})` : "";
            toast.success("Llamada detectada en inConcert", {
              description: `Modo copiloto activado${clientInfo}`,
            });
          } else if (data.type === "CALL_ENDED") {
            console.info("[inConcert Copilot] Llamada finalizada recibida por WebSocket.");
            clearCopilot();
            setInCall(false, null);
            textWindowRef.current = [];
            setTextWindow([]);
            toast.info("Llamada finalizada.");
          } else if (data.type === "MESSAGE_RECEIVED") {
            console.info("[inConcert Copilot] Mensaje recibido:", data.message_direction, data.raw_event);
            // Si es mensaje entrante del cliente, procesarlo como transcripción para sugerencias
            if (data.message_direction === "inbound" && data.message_text) {
              void processTranscript(data.message_text, data.call_id);
            }
          } else if (data.type === "INTERACTION_UPDATE") {
            console.info("[inConcert Copilot] Actualización de interacción:", data.update_type);
            if (data.update_type?.includes("transfer") || data.update_type?.includes("transferida")) {
              toast.info("Interacción transferida", {
                description: `La interacción ${data.call_id} fue transferida.`,
              });
            }
          } else if (data.type === "AGENT_SESSION") {
            console.info("[inConcert Copilot] Evento de sesión de agente:", data.session_action, data.agent_username);
          } else if (data.type === "SUGGESTION" && data.suggestion) {
            setCopilotSuggestion(data.suggestion);
            toast.info("Nueva recomendación de Olivia disponible", {
              description: data.suggestion.recommended_action,
              duration: 4000,
            });
          } else if (data.type === "TRANSCRIPT" && data.text) {
            void processTranscript(data.text, data.call_id);
          }
        } catch (e) {
          console.warn("[inConcert Copilot] Error parseando mensaje de WebSocket:", e);
        }
      };

      ws.onclose = () => {
        if (isUnmounted) return;
        console.warn("[inConcert Copilot] WebSocket cerrado. Reintentando en 3s...");
        setIsSdkLoaded(false);
        clearInterval(pingInterval);

        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isUnmounted) {
            connectWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (err) => {
        console.warn("[inConcert Copilot] Error en WebSocket:", err);
      };
    };

    connectWebSocket();

    return () => {
      isUnmounted = true;
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [setInCall, setOliviaWidgetOpen, clearCopilot, setCopilotSuggestion, processTranscript]);

  // Simulación para pruebas locales o QA
  const simulateCall = async (
    scenario: "price" | "distrust" | "interest" | "aggression" = "price"
  ) => {
    const simCallId = `sim-${Date.now()}`;

    setInCall(true, simCallId);
    setOliviaWidgetOpen(true);

    textWindowRef.current = [];
    setTextWindow([]);

    toast.success("[SIMULACIÓN] Llamada iniciada", {
      description: `Call ID: ${simCallId}`,
    });

    const scenarioPhrases: Record<
      "price" | "distrust" | "interest" | "aggression",
      string
    > = {
      price:
        "Mire, estuve revisando su propuesta pero el precio me parece excesivamente caro.",
      distrust:
        "No confío en dar mis datos por teléfono, ¿de dónde sacaron mi número?",
      interest:
        "Me interesa mucho la promoción, ¿cómo podemos hacer el pago hoy mismo?",
      aggression:
        "No me vuelvan a llamar más o los voy a denunciar por acoso.",
    };

    const phrase = scenarioPhrases[scenario];

    setTimeout(() => {
      void processTranscript(phrase, simCallId);
    }, 1000);
  };

  const endSimulatedCall = () => {
    clearCopilot();
    setInCall(false, null);

    textWindowRef.current = [];
    setTextWindow([]);

    toast.info("Llamada finalizada");
  };

  const sendManualTranscript = async (text: string) => {
    await processTranscript(text);
  };

  return {
    isSdkLoaded,
    inCall,
    activeInteractionId,
    latestSuggestion: copilotSuggestion,
    textWindow,
    simulateCall,
    endSimulatedCall,
    sendManualTranscript,
  };
}