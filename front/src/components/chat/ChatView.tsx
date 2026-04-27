import { useEffect, useRef, useState, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import WelcomeScreen from "@/components/chat/WelcomeScreen";
import ChatInput from "@/components/chat/ChatInput";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageBubble from "@/components/chat/MessageBubble";
import { chatApi, ChatMessage } from "@/services/api";

export default function ChatView() {
  const { currentChatId, setCurrentChatId, user, addSession } = useAppStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const isNewChat = !currentChatId;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping, streamingContent]);

  useEffect(() => {
    if (currentChatId) {
      chatApi.getHistory(currentChatId)
        .then((data) => setMessages(data.messages))
        .catch(() => setMessages([]));
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setIsTyping(true);
    setStreamingContent("");

    let sessionId = currentChatId;

    if (!sessionId && user?.id) {
      const newSession = await chatApi.createSession(user.id, userInput.slice(0, 56));
      sessionId = newSession.id;
      setCurrentChatId(sessionId);
      addSession(newSession);
    }

    try {
      const res = await chatApi.sendMessage({
        message: userInput,
        session_id: sessionId || undefined,
      });

      if (sessionId !== res.session_id) {
        setCurrentChatId(res.session_id);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: res.response,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Chat API Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          role: "assistant",
          content: `Error: ${(error as Error).message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
      setStreamingContent("");
    }
  }, [input, isTyping, currentChatId, user, setCurrentChatId, addSession]);

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

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 py-3">
          {messages.map((message, idx) => (
            <MessageBubble
              key={message.id}
              message={{
                id: message.id,
                role: message.role as "user" | "assistant",
                content: message.content,
                timestamp: new Date(message.timestamp),
              }}
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