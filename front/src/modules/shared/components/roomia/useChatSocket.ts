import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/services/api";

type ChatStatus = "idle" | "connecting" | "open" | "reconnecting" | "closed";

type UseChatSocketOptions = {
  sessionId?: string;
  wsUrl?: string;
  token?: string;
  onError?: (message: string) => void;
};

type SocketEvent = {
  type?: string;
  message?: Partial<ChatMessage>;
  content?: string;
  error?: string;
};

export function useChatSocket({ sessionId, wsUrl, token, onError }: UseChatSocketOptions) {
  const socketRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers] = useState<string[]>([]);

  useEffect(() => {
    if (!wsUrl) {
      setStatus("closed");
      return;
    }

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    setStatus("connecting");

    socket.onopen = () => {
      setStatus("open");
      if (token || sessionId) {
        socket.send(JSON.stringify({ type: "join", session_id: sessionId, token }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SocketEvent;
        if (data.type === "error") {
          onError?.(data.error || "No se pudo conectar al chat");
        } else if (data.type === "typing") {
          const userId = String(data.message?.id || "remote");
          setTypingUsers((current) => new Set(current).add(userId));
        } else if (data.type === "chunk") {
          setStreamingContent((current) => current + (data.content || ""));
        } else if (data.message?.content) {
          setMessages((current) => [...current, data.message as ChatMessage]);
          setStreamingContent("");
        }
      } catch {
        onError?.("Respuesta no válida del chat");
      }
    };

    socket.onerror = () => {
      setStatus("closed");
      onError?.("No hay conexión con el chat grupal");
    };
    socket.onclose = () => setStatus("closed");

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [onError, sessionId, token, wsUrl]);

  const sendMessage = useCallback((content: string) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "message", session_id: sessionId, content }));
  }, [sessionId]);

  const sendTyping = useCallback((typing: boolean) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "typing", session_id: sessionId, typing }));
  }, [sessionId]);

  return { messages, streamingContent, status, typingUsers, onlineUsers, sendMessage, sendTyping };
}
