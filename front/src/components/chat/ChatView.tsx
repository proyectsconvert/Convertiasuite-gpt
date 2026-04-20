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

const models = [
  "gemma4:26b",
  "llama3.2-vision:11b",
  "nomic-embed-text:latest",
  "qwen2.5-coder:7b",
  "qwen2.5:7b",
  "gemma-4E2B-it",
  "Gemma-4E4B-it",
  "gemini-3-flash-preview",
  "medgemma:4b",
  "nemotron-cascade-2:latest",
  "glm-4.7-flash:latest",
  "qwen3.6:latest",
  "deepseek-ocr",
  "glm-ocr",
  "deepseek-r1",
  "deepseek-coder"
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
  const [model, setModel] = useState("qwen2.5:7b");
  const [showModels, setShowModels] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find((chat) => chat.id === currentChatId);
  const messages = activeChat?.messages?.length ? activeChat.messages : [];

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

 const handleSend = async () => {
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

  try {
    const storeSnapshot = useAppStore.getState();
    const chatForApi = storeSnapshot.chats.find((chat) => chat.id === targetChatId);
    const apiMessages = (chatForApi?.messages || [userMessage]).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const res = await fetch("https://ollama.testbot.click/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: apiMessages,
        stream: false,
      }),
    });

    let data;
    try {
      data = await res.json();
    } catch(e) {
      // empty
    }

    if (!res.ok) {
      const serverError = data?.error ? `Server: ${data.error}` : `HTTP ${res.status}`;
      throw new Error(serverError);
    }

    const store = useAppStore.getState();
    const current = store.chats.find((chat) => chat.id === targetChatId);

    if (!current) return;

    store.updateChat(current.id, {
      messages: [
        ...current.messages,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: data?.message?.content || "No response received",
          timestamp: new Date(),
        },
      ],
      updatedAt: new Date(),
    });

  } catch (error) {
    console.error("Chat API Error:", error);

    const store = useAppStore.getState();
    const current = store.chats.find((chat) => chat.id === targetChatId);

    if (!current) return;

    store.updateChat(current.id, {
      messages: [
        ...current.messages,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: `Error conectando con el modelo: ${(error as Error).message}`,
          timestamp: new Date(),
        },
      ],

    });

  } finally {
    setIsTyping(false);
  }
};

  return (
    <div className="flex h-full flex-1 flex-col min-h-0">
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
              <div className="absolute right-0 top-11 z-30 min-w-44 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-card">
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

      <div className="grid flex-1 gap-0 lg:grid-cols-[1.7fr_1fr] min-h-0">
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

