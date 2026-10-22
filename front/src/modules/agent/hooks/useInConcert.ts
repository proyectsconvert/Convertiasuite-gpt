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
  const activeInteractionIdRef = useRef(activeInteractionId);
  const textWindowRef = useRef<string[]>([]);
  const userRef = useRef(user);

  activeInteractionIdRef.current = activeInteractionId;
  userRef.current = user;

  // Evalúa una frase transcrita contra el backend de Olivia.
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

  // Inicializa el SDK y registra los eventos de inConcert.
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (typeof window.inConcertAgentApi !== "function") {
      console.warn("[inConcert CTI] El SDK no está cargado.");
      setIsSdkLoaded(false);
      return;
    }

    let api: any;

    try {
      api = new window.inConcertAgentApi(
        "cls-convertia-aws.i6.inconcert.cloud",
        null,
        true
      );

      apiInstanceRef.current = api;
      setIsSdkLoaded(true);

      console.info(
        "[inConcert CTI] Instancia del SDK creada. Verificando conexión..."
      );

      // Comprueba si la API devuelve el estado del agente.
      if (typeof api.GetLoggedUserState === "function") {
        api.GetLoggedUserState((status: any) => {
          if (status == null) {
            console.warn(
              "[inConcert CTI] La API no devolvió el estado del agente. " +
                "La instancia existe, pero la conexión no está confirmada."
            );
          } else {
            console.info(
              "[inConcert CTI] Estado del agente recibido:",
              status
            );
          }
        });
      }

      // Llamada tomada.
      if (typeof api.CallTaken === "function") {
        api.CallTaken((interaction: any) => {
          const interactionId =
            interaction?.interactionId ||
            interaction?.Id ||
            `inc-${Date.now()}`;

          console.info(
            "[inConcert CTI] Evento CallTaken recibido:",
            interaction
          );

          setInCall(true, interactionId);
          setOliviaWidgetOpen(true);

          textWindowRef.current = [];
          setTextWindow([]);

          toast.success("Llamada detectada en inConcert", {
            description: "Modo copiloto activado.",
          });
        });
      }

      // Interacción en etapa de wrap-up o tipificación.
      if (typeof api.InteractionInWrapup === "function") {
        api.InteractionInWrapup((interaction: any) => {
          console.info(
            "[inConcert CTI] Interacción en wrap-up:",
            interaction
          );
        });
      }

      // Interacción archivada.
      if (typeof api.InteractionArchived === "function") {
        api.InteractionArchived(() => {
          console.info("[inConcert CTI] Interacción archivada.");

          clearCopilot();
          setInCall(false, null);
        });
      }

      // Interacción cancelada.
      if (typeof api.InteractionCanceled === "function") {
        api.InteractionCanceled(() => {
          console.info("[inConcert CTI] Interacción cancelada.");

          clearCopilot();
          setInCall(false, null);
        });
      }

      // Transcripción, si está disponible en la configuración del tenant.
      if (typeof api.TranscribeInteraction === "function") {
        api.TranscribeInteraction((data: any) => {
          const rawText =
            typeof data === "string"
              ? data
              : data?.text || data?.transcript;

          if (rawText) {
            void processTranscript(rawText);
          }
        });
      }
    } catch (err) {
      console.error(
        "[inConcert CTI] Error al inicializar el SDK:",
        err
      );

      setIsSdkLoaded(false);
    }

    return () => {
      if (apiInstanceRef.current === api) {
        apiInstanceRef.current = null;
      }

      // No se libera la instancia explícitamente porque el SDK
      // puede compartir recursos internos con otras instancias.
    };
  }, [
    setInCall,
    setOliviaWidgetOpen,
    clearCopilot,
    processTranscript,
  ]);

  // Simulación para pruebas locales o QA.
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

    toast.info("[SIMULACIÓN] Llamada finalizada");
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