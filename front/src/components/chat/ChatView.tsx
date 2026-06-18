import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/appStore";
import WelcomeScreen from "@/components/chat/WelcomeScreen";
import ChatInput from "@/components/chat/ChatInput";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageBubble from "@/components/chat/MessageBubble";
import { chatApi, ChatMessage, documentsApi } from "@/services/api";

export default function ChatView() {
  const {
    currentChatId,
    setCurrentChatId,
    user,
    addSession,
    messages,
    setMessages,
    setActiveArtifact,
    setArtifactsPanelOpen,
  } = useAppStore();
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
    setActiveArtifact(null);
    setArtifactsPanelOpen(false);
    setMessages([]);

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
                artifacts: msg.artifacts || [],
                images: msg.images || [],
              })),
            );
          }
        })
        .catch(() => setMessages([]));
    } else {
      setActiveArtifact(null);
      setArtifactsPanelOpen(false);
      setMessages([]);
    }
  }, [currentChatId, setActiveArtifact, setArtifactsPanelOpen, setMessages]);

  const handleSend = async (
    extractedContexts?: string[],
    filenames?: string[],
    attachmentTypes?: string[],
  ) => {
    const hasAttachments = filenames && filenames.length > 0;
    const hasContent = input.trim() || hasAttachments;
    if (!hasContent || isLoading) return;

    // Build attachments array
    const attachments: { filename: string; type: string }[] = [];
    const images: string[] = [];

    if (hasAttachments && filenames && attachmentTypes && extractedContexts) {
      for (let i = 0; i < filenames.length; i++) {
        attachments.push({
          filename: filenames[i],
          type: attachmentTypes[i],
        });

        // Collect image contexts
        if (
          (attachmentTypes[i] === "image" || attachmentTypes[i] === "vision") &&
          extractedContexts[i]
        ) {
          images.push(extractedContexts[i]);
        }
      }
    }

    const sessionTitle =
      input.trim().length > 0
        ? input.slice(0, 50)
        : hasAttachments
          ? filenames?.[0] || "Nueva Conversación"
          : "Nueva Conversación";

    const userMsg: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: input.trim() || "",
      timestamp: new Date().toISOString(),
      attachments: attachments,
      images: images,
    };

    setMessages((prev) => [...prev, userMsg]);

    setStreamingContent("");
    setInput("");
    setIsLoading(true);

    let sid = currentChatId;

    if (!sid && user?.id) {
      try {
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

      // Combine all contexts for the message
      const combinedContexts =
        extractedContexts?.join("\n\n---\n\n") || undefined;
      const messageType = attachmentTypes?.[0];
      const firstName = filenames?.[0];

      for await (const chunk of chatApi.sendMessageStream({
        message:
          input.trim() ||
          `Analiza los archivos adjuntos: ${filenames?.join(", ")}`,
        session_id: sid || undefined,
        extracted_context: combinedContexts,
        attachment_type: messageType,
        attachment_name: firstName,
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
        <div className="mx-auto w-full max-w-4xl px-4 py-3 sm:px-5 lg:px-8">
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
      <div className="px-3 pb-3 pt-1 flex-shrink-0 sm:px-4">
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
