import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/appStore";
import WelcomeScreen from "@/components/chat/WelcomeScreen";
import ChatInput from "@/components/chat/ChatInput";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageBubble from "@/components/chat/MessageBubble";
import { chatApi, ChatMessage, documentsApi } from "@/services/api";
import { normalizeChatContent } from "@/lib/artifact-utils";

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
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef(0);

  const normalizeUserMessage = (text: string) => {
    if (!text) return text;

    const cleaned = text
      .replace(/[\u200B-\u200F\uFEFF]/g, "")
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ");

    const lines = cleaned.split("\n");
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

    if (
      nonEmptyLines.length > 1 &&
      nonEmptyLines.every((line) => line.trim().length === 1)
    ) {
      return nonEmptyLines.join("");
    }

    return cleaned.trim();
  };

  const isNewChat = !currentChatId;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLoading, streamingContent]);

  const buildMessageWithArtifacts = (msg: ChatMessage): ChatMessage => {
    const content = msg.content || "";
    const artifacts = msg.artifacts || [];

    const hasHtmlContent =
      msg.role === "assistant" &&
      typeof content === "string" &&
      /<html|<!doctype|<body|<main|<section|<header|<footer|<div|<nav|<article/i.test(
        content,
      );

    return {
      id: msg.id,
      role: msg.role,
      content: msg.role === "user" ? normalizeChatContent(content) : content,
      timestamp: msg.timestamp,
      attachments: msg.attachments || [],
      artifacts:
        artifacts.length > 0
          ? artifacts
          : hasHtmlContent
            ? [
                {
                  id: `${msg.id}-html-fallback`,
                  filename: "landing.html",
                  type: "html",
                  content,
                  url: undefined,
                },
              ]
            : [],
      images: msg.images || [],
    };
  };

  useEffect(() => {
    setActiveArtifact(null);
    setArtifactsPanelOpen(false);

    if (currentChatId) {
      if (skipNextHistoryFetch.current) {
        skipNextHistoryFetch.current = false;
        return;
      }

      setMessages([]);
      chatApi
        .getHistory(currentChatId)
        .then((data) => {
          if (data.messages && Array.isArray(data.messages)) {
            setMessages(data.messages.map(buildMessageWithArtifacts));
          }
        })
        .catch(() => setMessages([]));
    } else {
      setMessages([]);
    }
  }, [currentChatId, setActiveArtifact, setArtifactsPanelOpen, setMessages]);

  const handleSend = async (
    extractedContexts?: string[],
    filenames?: string[],
    attachmentTypes?: string[],
    customText?: string,
  ) => {
    const messageText = customText !== undefined ? customText : input;
    const normalizedMessageText = normalizeUserMessage(messageText);
    const hasAttachments = filenames && filenames.length > 0;
    const hasContent = normalizedMessageText.trim() || hasAttachments;
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
      normalizedMessageText.trim().length > 0
        ? normalizedMessageText.slice(0, 50)
        : hasAttachments
          ? filenames?.[0] || "Nueva Conversación"
          : "Nueva Conversación";

    const userMsg: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: normalizedMessageText.trim() || "",
      timestamp: new Date().toISOString(),
      attachments: attachments,
      images: images,
    };

    setStreamingContent("");
    setInput("");
    setIsLoading(true);

    const requestId = ++activeRequestIdRef.current;
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeAbortControllerRef.current = controller;

    let sid = currentChatId;

    if (!sid && user?.id) {
      try {
        skipNextHistoryFetch.current = true;

        const s = await chatApi.createSession(sessionTitle);
        sid = s.id;
        setCurrentChatId(sid, false);
        addSession(s);

        // Guardar el mensaje del usuario después de crear la sesión
        setMessages((prev) => [...prev, userMsg]);
      } catch (e) {
        console.error("Session error:", e);
        skipNextHistoryFetch.current = false;
      }
    } else {
      setMessages((prev) => [...prev, userMsg]);
    }

    try {
      let fullResponse = "";
      // Combine all contexts for the message
      const combinedContexts =
        extractedContexts?.join("\n\n---\n\n") || undefined;
      const messageType = attachmentTypes?.[0];
      const firstName = filenames?.[0];

      for await (const chunk of chatApi.sendMessageStream(
        {
          message:
            normalizedMessageText.trim() ||
            `Analiza los archivos adjuntos: ${filenames?.join(", ")}`,
          session_id: sid || undefined,
          extracted_context: combinedContexts,
          attachment_type: messageType,
          attachment_name: firstName,
        },
        { signal: controller.signal },
      )) {
        if (controller.signal.aborted) {
          break;
        }

        if (chunk.type === "chunk" && chunk.content) {
          fullResponse += chunk.content;
          setStreamingContent(fullResponse);
        }
      }

      if (
        !controller.signal.aborted &&
        requestId === activeRequestIdRef.current
      ) {
        if (sid) {
          try {
            const history = await chatApi.getHistory(sid);
            if (history.messages && Array.isArray(history.messages)) {
              setMessages(history.messages.map(buildMessageWithArtifacts));
            } else {
              setMessages((prev) => [
                ...prev,
                {
                  id: `${Date.now()}-assistant`,
                  role: "assistant",
                  content: fullResponse,
                  timestamp: new Date().toISOString(),
                },
              ]);
            }
          } catch (historyError) {
            console.error("Error loading refreshed history:", historyError);
            setMessages((prev) => [
              ...prev,
              {
                id: `${Date.now()}-assistant`,
                role: "assistant",
                content: fullResponse,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-assistant`,
              role: "assistant",
              content: fullResponse,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        console.error("Send error:", e);
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setIsLoading(false);
        if (!controller.signal.aborted) {
          setStreamingContent("");
        }
      }

      if (activeAbortControllerRef.current === controller) {
        activeAbortControllerRef.current = null;
      }
    }
  };

  useEffect(() => {
    const handleCustomSend = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const text = customEvent.detail;
      if (text && !isLoading) {
        handleSend(undefined, undefined, undefined, text);
      }
    };

    const handleRefreshChat = () => {
      if (currentChatId) {
        chatApi
          .getHistory(currentChatId)
          .then((data) => {
            if (data.messages && Array.isArray(data.messages)) {
              setMessages(data.messages.map(buildMessageWithArtifacts));
            }
          })
          .catch(console.error);
      }
    };

    window.addEventListener("send-chat-message", handleCustomSend);
    window.addEventListener("refresh-chat", handleRefreshChat);
    return () => {
      window.removeEventListener("send-chat-message", handleCustomSend);
      window.removeEventListener("refresh-chat", handleRefreshChat);
    };
  }, [currentChatId, user, isLoading, input, setMessages]);

  const handleStop = async () => {
    if (!currentChatId) return;

    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }

    setIsLoading(false);
    setStreamingContent("");

    try {
      await chatApi.stopSessionStream(currentChatId);
    } catch (e) {
      console.error("Error stopping stream:", e);
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
            onStop={handleStop}
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
          onStop={handleStop}
        />
      </div>
    </div>
  );
}
