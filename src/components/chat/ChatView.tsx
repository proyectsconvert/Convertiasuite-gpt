import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  Copy,
  FileText,
  Globe,
  MessageSquare,
  Presentation,
  RefreshCcw,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  User,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { quickChatPrompts } from "@/lib/demo-data";

const models = ["GPT-5", "Claude 3.5", "Gemini Pro", "Mistral Large"];

const starterMessages = [
  {
    id: "starter-assistant",
    role: "assistant" as const,
    content:
      "Tengo sincronizado el contexto de Convert-IA. Ya detecte la propuesta de TechCorp, el pitch deck y la estrategia de marketing Q2. Dime que entregable quieres acelerar y te preparo la version ejecutiva.",
    timestamp: new Date(),
  },
];

const quickActions = [
  { label: "Generar propuesta comercial", icon: FileText },
  { label: "Crear pagina de lanzamiento", icon: Globe },
  { label: "Preparar guion de presentacion", icon: Presentation },
  { label: "Analizar pipeline trimestral", icon: MessageSquare },
];

export default function ChatView() {
  const { chats, currentChatId, updateChat, addChat, setCurrentChatId } = useAppStore();
  const [input, setInput] = useState("");
  const [model, setModel] = useState("GPT-5");
  const [showModels, setShowModels] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find((chat) => chat.id === currentChatId);
  const messages = activeChat?.messages?.length ? activeChat.messages : starterMessages;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  const summary = useMemo(() => {
    return {
      title: activeChat?.title ?? "Briefing inicial Convert-IA",
      model: activeChat?.model ?? model,
      lastUpdate: activeChat?.updatedAt ? activeChat.updatedAt.toLocaleDateString("es") : "Hoy",
    };
  }, [activeChat, model]);

  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    const userMessage = {
      id: `${Date.now()}-user`,
      role: "user" as const,
      content: input,
      timestamp: new Date(),
    };

    let targetChatId = activeChat?.id;
    if (!targetChatId) {
      const newChatId = `${Date.now()}`;
      addChat({
        id: newChatId,
        title: input.slice(0, 56),
        model,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [userMessage],
      });
      setCurrentChatId(newChatId);
      targetChatId = newChatId;
    } else {
      updateChat(targetChatId, {
        messages: [...(activeChat?.messages ?? []), userMessage],
        updatedAt: new Date(),
      });
    }

    const userInput = input;
    setInput("");
    setIsTyping(true);

    window.setTimeout(() => {
      const store = useAppStore.getState();
      const current = store.chats.find((chat) => chat.id === targetChatId);
      if (!current) {
        setIsTyping(false);
        return;
      }

      store.updateChat(current.id, {
        messages: [
          ...current.messages,
          {
            id: `${Date.now()}-assistant`,
            role: "assistant",
            content: buildResponse(userInput),
            timestamp: new Date(),
          },
        ],
        updatedAt: new Date(),
      });
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="border-b border-border bg-card/80 px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Modulo de conversacion</p>
            <h1 className="text-xl font-bold text-foreground">{summary.title}</h1>
            <p className="text-xs text-muted-foreground">Modelo activo: {summary.model} · Ultima actividad: {summary.lastUpdate}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowModels((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-secondary"
            >
              <Bot className="h-3.5 w-3.5 text-primary" /> {model} <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {showModels && (
              <div className="absolute right-0 top-11 z-30 min-w-44 rounded-lg border border-border bg-popover p-1 shadow-card">
                {models.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setModel(option);
                      setShowModels(false);
                    }}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                      option === model ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-0 lg:grid-cols-[1.7fr_1fr]">
        <main className="flex min-h-0 flex-col border-r border-border/70">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
              {messages.map((message) => (
                <article key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
                  {message.role === "assistant" && (
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "surface-card border border-border/70 text-foreground"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose-chat text-sm">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                        <div className="mt-3 flex items-center gap-1 border-t border-border pt-2">
                          {[Copy, ThumbsUp, ThumbsDown, RefreshCcw].map((Icon, index) => (
                            <button
                              key={index}
                              className="rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </article>
              ))}
              {isTyping && (
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                    <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                  </div>
                  <div className="surface-card flex items-center gap-1 rounded-full px-3 py-2">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:140ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:280ms]" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          <footer className="border-t border-border bg-card/80 px-6 py-4">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => setInput(action.label)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  >
                    <action.icon className="h-3.5 w-3.5" /> {action.label}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2 rounded-xl border border-border bg-secondary/60 p-2">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Pide un entregable conectado con chats, docs y presentaciones..."
                  className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <Button className="btn-primary-gradient h-9 w-9 p-0" onClick={handleSend} disabled={!input.trim() || isTyping}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">Contenido demo para presentacion comercial interna.</p>
            </div>
          </footer>
        </main>

        <aside className="hidden border-l border-border/40 bg-card/60 p-5 lg:block">
          <h2 className="text-sm font-semibold text-foreground">Prompts sugeridos</h2>
          <div className="mt-4 space-y-2">
            {quickChatPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInput(prompt)}
                className="w-full rounded-lg border border-border/70 bg-secondary/40 p-3 text-left text-xs text-muted-foreground transition hover:border-primary/30 hover:bg-secondary hover:text-foreground"
              >
                {prompt}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function buildResponse(input: string) {
  const normalized = input.toLowerCase();
  if (normalized.includes("propuesta") || normalized.includes("comercial")) {
    return "## Borrador de propuesta para TechCorp\n\n- Objetivo: reducir costos operativos en 25% durante 90 dias.\n- Alcance: diagnostico, implementacion y optimizacion con KPIs semanales.\n- Inversion estimada: **52,000 USD** primer ano.\n\n### Recomendacion\nConectar este entregable con la presentacion `Pitch Deck - Serie A` para reforzar ROI y traccion en una sola narrativa ejecutiva.";
  }

  if (normalized.includes("pitch") || normalized.includes("presentacion")) {
    return "## Guion ejecutivo para la presentacion\n\n1. Contexto: productividad perdida por tareas manuales.\n2. Solucion: suite IA unificada con chat, documentos y web builder.\n3. Impacto: 62h de ahorro y 180% de crecimiento YoY.\n\n### Siguiente paso\nPuedo generar la version de 5 slides y sincronizarla con el modulo de presentaciones.";
  }

  return "Entendido. Ya conecte tu solicitud con los artefactos demo existentes. Puedo convertir este requerimiento en documento formal, slide deck o landing en un solo flujo para mantener coherencia entre modulos.";
}
