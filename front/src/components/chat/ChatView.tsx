import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import WelcomeScreen from "@/components/chat/WelcomeScreen";
import ChatInput from "@/components/chat/ChatInput";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageBubble from "@/components/chat/MessageBubble";

export default function ChatView() {
  const {
    chats, currentChatId, updateChat, addChat, setCurrentChatId, selectedModel,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find((chat) => chat.id === currentChatId);
  const messages = activeChat?.messages?.length ? activeChat.messages : [];
  const isNewChat = !activeChat || messages.length === 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping, streamingContent]);

  const handleSend = useCallback(async () => {
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
        model: selectedModel,
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
    setStreamingContent("");

    try {
      const storeSnapshot = useAppStore.getState();
      const chatForApi = storeSnapshot.chats.find((chat) => chat.id === targetChatId);
      const apiMessages = (chatForApi?.messages || [userMessage]).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const res = await fetch("https://ollama.testbot.click/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter(Boolean);

          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.message?.content) {
                accumulated += json.message.content;
                setStreamingContent(accumulated);
              }
            } catch {
              /* skip malformed JSON */
            }
          }
        }
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
            content: accumulated || "No se recibió respuesta.",
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
      setStreamingContent("");
    }
  }, [input, isTyping, activeChat, selectedModel, addChat, setCurrentChatId, updateChat]);

  /* ─── Welcome screen ─── */
  if (isNewChat) {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0">
        <WelcomeScreen onPromptSelect={(prompt) => setInput(prompt)} />
        <div className="px-4 pb-5 flex-shrink-0">
          <ChatInput value={input} onChange={setInput} onSend={handleSend} isLoading={isTyping} variant="welcome" />
        </div>
      </div>
    );
  }

  /* ─── Conversation ─── */
  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 py-3">
          {messages.map((message, idx) => (
            <MessageBubble
              key={message.id}
              message={message}
              onRegenerate={
                message.role === "assistant" && idx === messages.length - 1 ? () => {} : undefined
              }
            />
          ))}

          {isTyping && streamingContent && (
            <MessageBubble
              message={{ id: "streaming", role: "assistant", content: streamingContent, timestamp: new Date() }}
              isStreaming={true}
            />
          )}

          {isTyping && !streamingContent && (
            <div className="flex items-center gap-3 py-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center ring-1 ring-primary/10">
                <img src="/favicon.ico" alt="convert-IA" className="w-5 h-5 rounded-full" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-secondary/50">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:140ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:280ms]" />
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      <div className="px-4 pb-3 pt-1 flex-shrink-0">
        <ChatInput value={input} onChange={setInput} onSend={handleSend} isLoading={isTyping} variant="conversation" />
      </div>
    </div>
  );
}
