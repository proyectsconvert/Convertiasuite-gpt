import { useEffect, useRef, useState } from "react";
import { Bot, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import { chatApi, ChatMessage } from "@/services/api";
import { useAppStore } from "@/store/appStore";

import "./OliviaAgentWidget.css";

const QUICK_ACTIONS = [
  "¿Cómo tipifico?",
  "Error en plataforma",
  "¿Cuál es el status?",
  "Procedimiento de llamada",
];

interface OliviaWidgetProps {
  isStandalone?: boolean;
}

export default function OliviaAgentWidget({ isStandalone = false }: OliviaWidgetProps) {
  const {
    user,
    oliviaWidgetOpen,
    setOliviaWidgetOpen,
    oliviaSessionId,
    setOliviaSessionId,
  } = useAppStore();

  const isOpen = isStandalone ? true : oliviaWidgetOpen;
  const setIsOpen = (open: boolean) => setOliviaWidgetOpen(open);

  const sessionId = oliviaSessionId;
  const setSessionId = (id: string | null) => setOliviaSessionId(id);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  const endRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Olivia está disponible para todos los usuarios autenticados en el sistema
  const canUseOliviaAgent = isStandalone || !!user;

  useEffect(() => {
    if (!canUseOliviaAgent) {
      return;
    }

    if (sessionId && messages.length === 0) {
      chatApi.getHistory(sessionId).then((res) => {
        if (res.messages) setMessages(res.messages);
      }).catch((error: Error) => {
        if (error.message.includes("HTTP 404")) {
          setSessionId(null);
          setMessages([]);
        } else {
          console.error("Error loading Olivia history:", error);
        }
      });
    }
  }, [sessionId, canUseOliviaAgent]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, streamingContent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isStandalone) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isStandalone]);

  if (!canUseOliviaAgent) {
    return null;
  }

  const sendMessage = async (text?: string) => {
    const message = (text ?? input).trim();

    if (!message || isLoading) {
      return;
    }

    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      let currentSessionId = sessionId;

      /*
       * Crear una sesión independiente para Olivia Agent.
       */
      if (!currentSessionId) {
        const session = await chatApi.createSession(
          "Olivia - Asistente de campaña"
        );

        currentSessionId = session.id;
        setSessionId(session.id);
      }

      let fullResponse = "";

      for await (const chunk of chatApi.sendMessageStream(
        {
          message,
          session_id: currentSessionId,
          functional_role: user?.functional_role,
        },
        {
          signal: controller.signal,
        }
      )) {
        if (controller.signal.aborted) {
          break;
        }

        if (chunk.type === "chunk" && chunk.content) {
          fullResponse += chunk.content;
          setStreamingContent(fullResponse);
        }
      }

      if (!controller.signal.aborted && currentSessionId) {
        const history = await chatApi.getHistory(currentSessionId);

        if (history.messages) {
          setMessages(history.messages);
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error(
          "Error enviando mensaje a Olivia Agent:",
          error
        );
      }
    } finally {
      setIsLoading(false);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();

    abortControllerRef.current = null;
    setIsLoading(false);
    setStreamingContent("");
  };

  const handlePopOut = async () => {
    const width = 380;
    const height = 580;

    // Probar la API Document Picture-in-Picture (Mantener siempre encima de WhatsApp y otras apps del SO)
    if ("documentPictureInPicture" in window) {
      try {
        const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
          width,
          height,
        });

        const isDark = document.documentElement.classList.contains("dark");
        const bgColor = isDark ? "#0c0f17" : "#f8fafc";

        pipWindow.document.documentElement.style.height = "100vh";
        pipWindow.document.documentElement.style.width = "100vw";
        pipWindow.document.documentElement.style.margin = "0";
        pipWindow.document.documentElement.style.padding = "0";
        pipWindow.document.documentElement.style.overflow = "hidden";
        pipWindow.document.documentElement.style.background = bgColor;

        pipWindow.document.body.style.height = "100vh";
        pipWindow.document.body.style.width = "100vw";
        pipWindow.document.body.style.margin = "0";
        pipWindow.document.body.style.padding = "0";
        pipWindow.document.body.style.overflow = "hidden";
        pipWindow.document.body.style.background = bgColor;

        if (isDark) {
          pipWindow.document.documentElement.classList.add("dark");
        }

        const iframe = pipWindow.document.createElement("iframe");
        iframe.src = window.location.origin + "/agent-widget";
        iframe.style.width = "100vw";
        iframe.style.height = "100vh";
        iframe.style.border = "none";
        iframe.style.display = "block";
        iframe.style.background = bgColor;

        pipWindow.document.body.appendChild(iframe);

        toast.success("Olivia fijada siempre por encima de WhatsApp y otras apps (Always-On-Top)");
        return;
      } catch (err) {
        console.warn("Document PiP fallback a ventana estándar:", err);
      }
    }

    // Fallback a ventana popout estándar
    const left = window.screen.width - width - 50;
    const top = 100;
    window.open(
      "/agent-widget",
      "OliviaAgentPopup",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,status=no,toolbar=no,menubar=no,location=no`
    );
    toast.success("Olivia abierta en ventana emergente independiente");
  };

  return (
    <>
      {/* Trigger (Solo si no es standalone) - Abre directamente la ventana flotante desacoplada */}
      {!isStandalone && (
        <button
          type="button"
          className="olivia-agent-trigger"
          onClick={handlePopOut}
          aria-label="Abrir Olivia Flotante"
          title="Abrir Olivia en ventana emergente flotante superpuesta (Always-On-Top)"
        >
          <Bot size={22} />
        </button>
      )}

      {/* Widget */}
      {(isStandalone || isOpen) && (
        <aside className={`olivia-agent-widget ${isStandalone ? "standalone" : ""}`}>
          {/* Header */}
          <header className="olivia-agent-header">
            <div className="olivia-agent-header-info">
              <div className="olivia-agent-avatar">
                <Bot size={18} />
              </div>

              <div>
                <h2>Olivia {isStandalone ? "(Flotante)" : ""}</h2>

                <p>
                  {user?.functional_role ?? "Agente"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!isStandalone && (
                <button
                  type="button"
                  onClick={handlePopOut}
                  className="olivia-agent-close hover:text-primary transition-colors"
                  aria-label="Desacoplar en ventana flotante"
                  title="Desacoplar / Abrir en ventana emergente independiente (Superponer sobre otras apps)"
                >
                  <ExternalLink size={18} />
                </button>
              )}

              {!isStandalone && (
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="olivia-agent-close hover:text-destructive transition-colors"
                  aria-label="Cerrar Olivia"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </header>

          {/* Quick actions */}
          <div className="olivia-agent-actions">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => sendMessage(action)}
                disabled={isLoading}
                className="olivia-agent-chip"
              >
                {action}
              </button>
            ))}
          </div>

          {/* Chat */}
          <div className="olivia-agent-messages">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                previousMessage={
                  index > 0
                    ? messages[index - 1]
                    : undefined
                }
                sessionId={sessionId ?? undefined}
              />
            ))}

            {streamingContent && (
              <MessageBubble
                message={{
                  id: "streaming",
                  role: "assistant",
                  content: streamingContent,
                  timestamp: new Date(),
                }}
                isStreaming
                previousMessage={
                  messages[messages.length - 1]
                }
                sessionId={sessionId ?? undefined}
              />
            )}

            {isLoading && !streamingContent && (
              <div className="olivia-agent-loading">
                <Bot size={18} />

                <div className="olivia-agent-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="olivia-agent-input">
            <ChatInput
              value={input}
              onChange={setInput}
              onSend={() => sendMessage()}
              isLoading={isLoading}
              variant="agent"
              onStop={handleStop}
            />
          </div>
        </aside>
      )}
    </>
  );
}