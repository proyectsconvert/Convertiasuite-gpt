import { useEffect, useRef, useState } from "react";
import {
  Bot,
  ExternalLink,
  Lock,
  Mail,
  X,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  HelpCircle,
  PhoneCall,
  AlertTriangle,
  Radio,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import MessageBubble from "@/components/chat/MessageBubble";
import ChatInput from "@/components/chat/ChatInput";
import { chatApi, ChatMessage } from "@/services/api";
import { useAppStore } from "@/store/appStore";

import "./OliviaAgentWidget.css";

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  promptText: string;
  channel?: "chat" | "whatsapp" | "email";
}

export interface QuickActionGroup {
  categoryId: string;
  categoryLabel: string;
  icon: LucideIcon;
  actions: QuickAction[];
}

export const QUICK_ACTION_GROUPS: QuickActionGroup[] = [
  {
    categoryId: "frequent_queries",
    categoryLabel: "Consultas Frecuentes",
    icon: Zap,
    actions: [
      {
        id: "tipificacion",
        label: "¿Cómo tipifico?",
        icon: Zap,
        promptText: "¿Cuáles son las reglas y pasos para tipificar esta llamada?",
      },
      {
        id: "procedimiento",
        label: "Procedimiento llamada",
        icon: PhoneCall,
        promptText: "Muestra el protocolo estándar de atención telefónica.",
      },
      {
        id: "status",
        label: "¿Cuál es el status?",
        icon: HelpCircle,
        promptText: "¿Cómo verifico el estado del lead o transacción?",
      },
      {
        id: "error_plataforma",
        label: "Error en plataforma",
        icon: AlertTriangle,
        promptText: "Pasos a seguir en caso de error en la plataforma.",
      },
    ],
  },
];

// Sección de acciones rápidas extraída correctamente fuera del componente principal
interface QuickActionsSectionProps {
  onSelectAction: (action: QuickAction) => void;
}

export function OliviaQuickActionsSection({ onSelectAction }: QuickActionsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>("frequent_queries");

  return (
    <div className="olivia-quick-actions-section">
      {QUICK_ACTION_GROUPS.map((group) => (
        <div key={group.categoryId} className="olivia-action-group">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <group.icon size={14} />
            {group.categoryLabel}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {group.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onSelectAction(action)}
                className="olivia-agent-chip"
              >
                <action.icon size={12} className="text-emerald-500 dark:text-emerald-400" />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface OliviaWidgetProps {
  isStandalone?: boolean;
}

export default function OliviaAgentWidget({ isStandalone = false }: OliviaWidgetProps) {
  const {
    user,
    login,
    oliviaWidgetOpen,
    setOliviaWidgetOpen,
    oliviaSessionId,
    setOliviaSessionId,
  } = useAppStore();

  const isOpen = isStandalone ? true : oliviaWidgetOpen;
  const sessionId = oliviaSessionId;
  const setSessionId = (id: string | null) => setOliviaSessionId(id);

  const isAuthenticated = !!user;
  const userRole = (user?.role || "").toLowerCase();
  const functionalRole = (user?.functional_role || "").toLowerCase();
  const isAgent =
    userRole === "agent" ||
    userRole === "agente" ||
    functionalRole.includes("agent") ||
    functionalRole.includes("agente");

  const campaignName = user?.campaign_name ?? null;

  // --- Estado del chat ---
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  // --- Estado del login inline ---
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const endRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (sessionId && messages.length === 0) {
      chatApi
        .getHistory(sessionId)
        .then((res) => {
          if (res.messages) setMessages(res.messages);
        })
        .catch((error: Error) => {
          if (error.message.includes("HTTP 404")) {
            setSessionId(null);
            setMessages([]);
          } else {
            console.error("Error loading Olivia history:", error);
          }
        });
    }
  }, [sessionId, isAuthenticated]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isStandalone) {
        setOliviaWidgetOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isStandalone, setOliviaWidgetOpen]);

  async function handleWidgetLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loginLoading) return;

    setLoginError("");
    setLoginLoading(true);

    try {
      const success = await login(loginEmail, loginPassword);

      if (!success) {
        setLoginError("Correo o contraseña incorrectos.");
        return;
      }

      setLoginPassword("");
    } catch (err) {
      console.error(err);
      setLoginError("No fue posible iniciar sesión.");
    } finally {
      setLoginLoading(false);
    }
  }

  const sendMessage = async (text?: string) => {
    const message = (text ?? input).trim();

    if (!message || isLoading) return;

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

      if (!currentSessionId) {
        const session = await chatApi.createSession("Olivia - Asistente de campaña");
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
        { signal: controller.signal }
      )) {
        if (controller.signal.aborted) break;

        if (chunk.type === "chunk" && chunk.content) {
          fullResponse += chunk.content;
          setStreamingContent(fullResponse);
        }
      }

      if (!controller.signal.aborted && currentSessionId) {
        const history = await chatApi.getHistory(currentSessionId);
        if (history.messages) setMessages(history.messages);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("Error enviando mensaje a Olivia Agent:", error);
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

        toast.success("OlivIA fijada siempre por encima de WhatsApp y otras apps (Always-On-Top)");
        return;
      } catch (err) {
        console.warn("Document PiP fallback a ventana estándar:", err);
      }
    }

    const left = window.screen.width - width - 50;
    const top = 100;
    window.open(
      "/agent-widget",
      "OliviaAgentPopup",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,status=no,toolbar=no,menubar=no,location=no`
    );
    toast.success("OlivIA abierta en ventana flotante Always-On-Top");
  };

  const userName = user?.name ? user.name.split(" ")[0] : "Agente";

  return (
    <>
      {/* Botón flotante estilizado */}
      {!isStandalone && (
        <button
          type="button"
          className="olivia-agent-trigger"
          onClick={handlePopOut}
          aria-label="Abrir OlivIA Flotante"
          title="Abrir OlivIA en ventana flotante superpuesta (Always-On-Top)"
        >
          <div className="olivia-agent-trigger-glow" />
          <Bot size={24} className="relative z-10" />
          <span className="olivia-agent-trigger-badge" />
        </button>
      )}

      {(isStandalone || isOpen) && (
        <aside className={`olivia-agent-widget ${isStandalone ? "standalone" : ""}`}>
          {/* Header estilizado */}
          <header className="olivia-agent-header">
            <div className="olivia-agent-header-info">
              <div className="olivia-agent-avatar">
                <Bot size={18} />
                <span className="olivia-agent-status-dot" />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h2 className="olivia-brand-title">OlivIA</h2>
                </div>
                <p className="olivia-header-role">
                  {isAuthenticated ? (user?.functional_role ?? "Asistente Activo") : "Inicia sesión para continuar"}
                  {campaignName && isAuthenticated && (
                    <span className="ml-1 text-xs text-muted-foreground">({campaignName})</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!isStandalone && (
                <button
                  type="button"
                  onClick={handlePopOut}
                  className="olivia-agent-header-btn"
                  aria-label="Desacoplar en ventana flotante"
                  title="Desacoplar en ventana emergente Always-On-Top (Superponer sobre otras apps)"
                >
                  <ExternalLink size={16} />
                </button>
              )}

              {!isStandalone && (
                <button
                  type="button"
                  onClick={() => setOliviaWidgetOpen(false)}
                  className="olivia-agent-header-btn hover:text-destructive"
                  aria-label="Cerrar OlivIA"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </header>

          {!isAuthenticated ? (
            // --- Vista de login inline estilizada ---
            <div className="olivia-agent-login-wrapper">
              <div className="olivia-agent-login-hero">
                <div className="olivia-login-avatar-ring">
                  <Bot size={28} />
                </div>
                <h3>Bienvenido a OlivIA</h3>
                <p>Tu copiloto inteligente Always-On-Top para optimizar tu gestión en tiempo real</p>
              </div>

              <form onSubmit={handleWidgetLogin} className="olivia-agent-login">
                <div className="olivia-agent-login-field">
                  <Mail className="olivia-agent-login-icon" size={15} />
                  <input
                    type="email"
                    placeholder="correo@empresa.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="olivia-agent-login-field">
                  <Lock className="olivia-agent-login-icon" size={15} />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="Contraseña"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="olivia-agent-pw-toggle"
                  >
                    {showLoginPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {loginError && (
                  <div className="olivia-agent-login-error">
                    <AlertTriangle size={13} className="flex-shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button type="submit" disabled={loginLoading} className="olivia-agent-login-submit">
                  {loginLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Verificando credenciales...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <Sparkles size={14} /> Ingresar a OlivIA
                    </span>
                  )}
                </button>
              </form>
            </div>
          ) : !isAgent ? (
            // --- Vista para usuarios sin rol de agente ---
            <div className="olivia-agent-empty-state my-auto">
              <div className="olivia-empty-icon-wrap">
                <Bot size={32} />
              </div>
              <h4>Acceso para Agentes</h4>
              <p>
                OlivIA está habilitada exclusivamente para usuarios con rol o función de <strong>Agente</strong> en campaña.
              </p>
            </div>
          ) : (
            // --- Vista de chat estilizada ---
            <div className="olivia-agent-chat-container">
              {/* Quick actions chips */}
              <div className="olivia-agent-actions">
                {QUICK_ACTION_GROUPS.flatMap((group) => group.actions).map(({ label, promptText, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => sendMessage(promptText)}
                    disabled={isLoading}
                    className="olivia-agent-chip"
                  >
                    <Icon size={12} className="text-emerald-500 dark:text-emerald-400" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Messages area */}
              <div className="olivia-agent-messages">
                {messages.length === 0 && !streamingContent && (
                  <div className="olivia-agent-empty-state">
                    <div className="olivia-empty-icon-wrap">
                      <Bot size={32} />
                      <div className="olivia-empty-glow" />
                    </div>
                    <h4>¡Hola, {userName}! 👋</h4>
                    <p>
                      Estoy lista para apoyarte con tipificaciones, objeciones y procedimientos de campaña en tiempo real.
                    </p>
                    <div className="olivia-empty-hint">
                      <Radio size={12} className="text-emerald-500 animate-pulse" />
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    previousMessage={index > 0 ? messages[index - 1] : undefined}
                    sessionId={sessionId ?? undefined}
                  />
                ))}

                {streamingContent && (
                  <MessageBubble
                    message={{
                      id: "streaming",
                      role: "assistant",
                      content: streamingContent,
                      timestamp: new Date().toISOString(),
                    }}
                    isStreaming
                    previousMessage={messages[messages.length - 1]}
                    sessionId={sessionId ?? undefined}
                  />
                )}

                {isLoading && !streamingContent && (
                  <div className="olivia-agent-loading">
                    <div className="olivia-agent-loading-avatar">
                      <Bot size={14} />
                    </div>
                    <div className="olivia-agent-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span className="text-[11px] text-muted-foreground ml-1">OlivIA está pensando...</span>
                  </div>
                )}

                <div ref={endRef} />
              </div>

              {/* Chat Input */}
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
            </div>
          )}
        </aside>
      )}
    </>
  );
}