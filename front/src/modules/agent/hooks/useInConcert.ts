import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/modules/shared/store/appStore";
import { copilotApi, CopilotSuggestion } from "@/modules/shared/services/api";

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
  simulateCall: (scenario?: "price" | "distrust" | "interest" | "aggression") => Promise<void>;
  endSimulatedCall: () => void;
  sendManualTranscript: (text: string) => Promise<void>;
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
  const apiInstanceRef = useRef<any>(null);

  // Evalúa una frase transcrita contra el backend de OlivIA
  const processTranscript = useCallback(
    async (text: string, currentCallId?: string) => {
      const callId = currentCallId || activeInteractionId || "call-live";
      if (!text || !text.trim()) return;

      setTextWindow((prev) => {
        const next = [...prev, text];
        return next.length > 6 ? next.slice(-6) : next;
      });

      try {
        const response = await copilotApi.getSuggestion({
          text,
          call_id: callId,
          campaign_id: user?.campaign_name || "default",
          text_window: [...textWindow, text],
          speaker: "client",
        });

        if (response.has_suggestion && response.suggestion) {
          setCopilotSuggestion(response.suggestion);
          toast.info("💡 Nueva recomendación de OlivIA disponible", {
            description: response.suggestion.recommended_action,
            duration: 4000,
          });
        }
      } catch (err) {
        console.warn("[inConcert Copilot] Error obteniendo sugerencia:", err);
      }
    },
    [activeInteractionId, user, textWindow, setCopilotSuggestion]
  );

  // Inicialización y suscripción a eventos reales del CTI de inConcert
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.inConcertAgentApi) {
      setIsSdkLoaded(true);
      try {
        // Inicializar la API de inConcert
        const api = new window.inConcertAgentApi();
        apiInstanceRef.current = api;

        // 1. Detección de llamada iniciada
        api.CallTaken((interaction: any) => {
          const interactionId = interaction?.interactionId || interaction?.Id || `inc-${Date.now()}`;
          console.log("[inConcert CTI] Llamada tomada:", interactionId, interaction);

          setInCall(true, interactionId);
          setOliviaWidgetOpen(true);
          setTextWindow([]);

          toast.success("📞 Llamada detectada en inConcert", {
            description: "Modo Copiloto activado automáticamente.",
          });
        });

        // 2. Llamada en etapa de acreditación / tipificación
        api.InteractionInWrapup((interaction: any) => {
          console.log("[inConcert CTI] Llamada en wrapup/tipificación:", interaction);
          toast.info("📋 Llamada finalizada", {
            description: "Entrando en etapa de tipificación y resumen.",
          });
        });

        // 3. Interacción archivada o cancelada
        api.InteractionArchived(() => {
          console.log("[inConcert CTI] Interacción archivada");
          clearCopilot();
        });

        api.InteractionCanceled(() => {
          console.log("[inConcert CTI] Interacción cancelada");
          clearCopilot();
        });

        // 4. Transcripción emitida por inConcert (si la funcionalidad está activa en el tenant)
        if (typeof api.TranscribeInteraction === "function") {
          api.TranscribeInteraction((data: any) => {
            const rawText = typeof data === "string" ? data : data?.text || data?.transcript;
            if (rawText) {
              processTranscript(rawText);
            }
          });
        }
      } catch (err) {
        console.warn("[inConcert CTI] Error al enlazar eventos de inConcert:", err);
      }
    } else {
      console.log("[inConcert CTI] inConcertAgentApi no disponible aún en window");
    }
  }, [setInCall, setOliviaWidgetOpen, clearCopilot, processTranscript]);

  // Simulación para pruebas locales o QA
  const simulateCall = async (scenario: "price" | "distrust" | "interest" | "aggression" = "price") => {
    const simCallId = `sim-${Date.now()}`;
    setInCall(true, simCallId);
    setOliviaWidgetOpen(true);
    setTextWindow([]);

    toast.success("📞 [SIMULACIÓN inConcert] Llamada tomada", {
      description: `Call ID: ${simCallId} | Modo Copiloto Activado`,
    });

    const scenarioPhrases: Record<string, string> = {
      price: "Mire, estuve revisando su propuesta pero el precio me parece excesivamente caro.",
      distrust: "No confío en dar mis datos por teléfono, de dónde sacaron mi número?",
      interest: "Me interesa mucho la promoción, ¿cómo podemos hacer el pago hoy mismo?",
      aggression: "No me vuelvan a llamar más o los voy a denunciar por acoso!",
    };

    const phrase = scenarioPhrases[scenario];

    // Inyectar frase de cliente tras un pequeño delay
    setTimeout(() => {
      processTranscript(phrase, simCallId);
    }, 1000);
  };

  const endSimulatedCall = () => {
    clearCopilot();
    toast.info("📞 [SIMULACIÓN inConcert] Llamada finalizada");
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
