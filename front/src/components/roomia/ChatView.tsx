import { useEffect, useRef, useState } from "react";
import { Hash, ShieldCheck, Sparkles, Users, Wifi, WifiOff, LucideMessageCircleReply } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import ChatInput from "@/components/chat/ChatInput";
import MessageBubble from "@/components/chat/MessageBubble";
import { useChatSocket } from "./useChatSocket";
import { toast } from "@/hooks/use-toast";

const WS_URL = import.meta.env.VITE_INTERNAL_CHAT_WS_URL as string; 

export default function InternalChatView() {
  const { currentChatId, user } = useAppStore();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    streamingContent,
    status,
    typingUsers,
    onlineUsers,
    sendMessage,
    sendTyping,
  } = useChatSocket({
    sessionId: currentChatId ?? undefined,
    wsUrl: WS_URL,
    token: user?.token,
    onError: (message) => toast({ title: "Chat", description: message, variant: "destructive" }),
  });

  const isNewChat = !currentChatId;
  const participantCount = Math.max(1, onlineUsers.length + 1);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    let sid = currentChatId;

    if (!sid && user?.id) {
    }

    setInput("");
    sendMessage(text);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    sendTyping(value.length > 0);
  };

  const connectionLabel: Record<typeof status, string> = {
    idle: "",
    connecting: "Conectando…",
    open: "Sala activa",
    reconnecting: "Reconectando…",
    closed: "Sin conexión",
  };

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.08),transparent_32%),hsl(var(--background))]">
      <header className="flex min-h-[68px] items-center justify-between gap-3 border-b border-border/50 bg-background/85 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Hash className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-display text-sm font-bold text-foreground sm:text-base">Sala Roomia</h1>
              <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary sm:inline-flex">Grupal</span>
            </div>
            <p className="truncate text-xs text-muted-foreground">Conversación compartida para tu equipo</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <Users className="h-3.5 w-3.5" />
            <span>{participantCount} {participantCount === 1 ? "participante" : "participantes"}</span>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${status === "open" ? "border-primary/25 bg-primary/10 text-primary" : "border-border bg-muted/60 text-muted-foreground"}`}>
            {status === "open" ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{connectionLabel[status] || "Preparando"}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
          {isNewChat && messages.length === 0 ? (
            <div className="flex min-h-[min(52vh,460px)] flex-col items-center justify-center px-4 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[0_0_0_8px_hsl(var(--primary)/0.04)]">
                <LucideMessageCircleReply className="h-7 w-7" />
              </div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Roomia</p>
              <h2 className="max-w-md font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Pensad juntos, en un mismo lugar.</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">Comparte ideas con tu equipo y deja que la conversación avance sin perder el contexto.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-3 py-1.5"><Users className="h-3.5 w-3.5 text-primary" /> Colaboración en tiempo real</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-3 py-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Contexto compartido</span>
              </div>
            </div>
          ) : (
            messages.map((m, index) => {
              const isUser = m.role === "user";
              const author = isUser ? "Tú" : m.role === "assistant" ? "Roomia" : "Sistema";
              const initials = isUser ? (user?.name?.[0] || "T").toUpperCase() : "R";

              return (
                <div key={m.id} className="flex items-start gap-3">
                  <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${isUser ? "bg-secondary text-secondary-foreground" : "bg-primary/15 text-primary"}`}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1 rounded-xl border border-border/50 bg-background/65 px-3 py-2 shadow-sm sm:px-4">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{author}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <MessageBubble message={m} previousMessage={index > 0 ? messages[index - 1] : undefined} sessionId={currentChatId} />
                  </div>
                </div>
              );
            })
          )}

          {streamingContent && (
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary">R</div>
              <div className="min-w-0 flex-1 rounded-xl border border-primary/20 bg-primary/[0.04] px-3 py-2 sm:px-4">
                <div className="mb-1 text-xs font-semibold text-primary">Roomia</div>
                <MessageBubble message={{ id: "streaming", role: "assistant", content: streamingContent, timestamp: new Date().toISOString() }} isStreaming previousMessage={messages[messages.length - 1]} sessionId={currentChatId} />
              </div>
            </div>
          )}

          {typingUsers.size > 0 && (
            <div className="ml-11 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex gap-1"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" /></span>
              {typingUsers.size === 1 ? "Alguien está escribiendo…" : "Varias personas están escribiendo…"}
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-border/40 bg-background/70 px-3 pb-4 pt-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          <ChatInput value={input} onChange={handleInputChange} onSend={handleSend} isLoading={status !== "open"} />
          <p className="mt-2 text-center text-[10px] text-muted-foreground">Los mensajes enviados aquí son visibles para todos los participantes de la sala.</p>
        </div>
      </div>
    </div>
  );
}