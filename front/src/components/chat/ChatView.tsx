import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/appStore";
import WelcomeScreen from "@/components/chat/WelcomeScreen";
import ChatInput from "@/components/chat/ChatInput";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageBubble from "@/components/chat/MessageBubble";
import { chatApi, ChatMessage, documentsApi } from "@/services/api";

export default function ChatView() {
  const { currentChatId, setCurrentChatId, user, addSession } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const skipNextHistoryFetch = useRef(false);

  const isNewChat = !currentChatId;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLoading, streamingContent]);

  useEffect(() => {
    if (currentChatId) {
      if (skipNextHistoryFetch.current) {
        skipNextHistoryFetch.current = false;
        return;
      }

      chatApi
        .getHistory(currentChatId)
        .then((data) => {
          if (data.messages && Array.isArray(data.messages)) {
            setMessages(
              data.messages.map((msg) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp,
                attachments: msg.attachments || [],
                images: msg.images || [],
              })),
            );
          }
        })
        .catch(() => setMessages([]));
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  const handleSend = async (
    extractedContext?: string,
    filename?: string,
    attachmentType?: string,
  ) => {
    const hasContent = input.trim() || extractedContext;
    if (!hasContent || isLoading) return;

    const messageText =
      input.trim() || `Analiza el archivo adjunto: ${filename}`;

    const attachment =
      filename && attachmentType
        ? { filename, type: attachmentType }
        : undefined;

    const userMsg: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: input.trim() || "",
      timestamp: new Date().toISOString(),
      attachments: attachment ? [attachment] : [],
      images:
        (attachmentType === "image" || attachmentType === "vision") &&
        extractedContext
          ? [extractedContext]
          : [],
    };

    setMessages((prev) => [...prev, userMsg]);

    setStreamingContent("");
    setInput("");
    setIsLoading(true);

    let sid = currentChatId;

    if (!sid && user?.id) {
      try {
        const sessionTitle =
          input.trim().length > 0
            ? input.slice(0, 50)
            : filename || "Nueva Conversación";

        skipNextHistoryFetch.current = true;

        const s = await chatApi.createSession(sessionTitle);
        sid = s.id;
        setCurrentChatId(sid);
        addSession(s);
      } catch (e) {
        console.error("Session error:", e);
        skipNextHistoryFetch.current = false;
      }
    }

    try {
      let fullResponse = "";

      for await (const chunk of chatApi.sendMessageStream({
        message: messageText,
        session_id: sid || undefined,
        extracted_context: extractedContext,
        attachment_type: attachmentType,
        attachment_name: filename,
      })) {
        if (chunk.type === "chunk" && chunk.content) {
          fullResponse += chunk.content;
          setStreamingContent(fullResponse);
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: fullResponse,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      console.error("Send error:", e);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  };

  if (isNewChat) {
    return (
      <div className="flex-1 flex flex-col h-full min-h-0">
        <WelcomeScreen onPromptSelect={(p) => setInput(p)} />
        <div className="px-4 pb-5 flex-shrink-0">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            isLoading={isLoading}
            variant="welcome"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-5 lg:px-8 py-3">
          {messages.map((m, index) => (
            <MessageBubble
              key={m.id}
              message={m}
              onRegenerate={undefined}
              previousMessage={index > 0 ? messages[index - 1] : undefined}
              sessionId={currentChatId}
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
              onRegenerate={undefined}
              isStreaming={true}
              previousMessage={messages[messages.length - 1]}
              sessionId={currentChatId}
            />
          )}
          {isLoading && !streamingContent && (
            <div className="flex items-center gap-3 py-4">
              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center">
                <img
                  src="/logo-dark.ico"
                  alt=""
                  className="w-5 h-5 object-contain block dark:hidden"
                />
                <img
                  src="/favicon.ico"
                  alt=""
                  className="w-5 h-5 object-contain hidden dark:block"
                />
              </div>
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <div className="px-4 pb-3 pt-1 flex-shrink-0">
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          isLoading={isLoading}
          variant="conversation"
        />
      </div>
    </div>
  );
}
