import { useState, useCallback } from "react";
import {
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCcw,
  Check,
  User,
  FileText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import type { ChatMessage } from "@/services/api";

interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  isStreaming?: boolean;
}

export default function MessageBubble({
  message,
  onRegenerate,
  isStreaming,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const isUser = message.role === "user";

  const timestamp =
    message.timestamp instanceof Date
      ? message.timestamp
      : new Date(message.timestamp);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
    }
  }, [message.content]);

  if (typeof message.content !== "string") {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex gap-3 py-4 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
          isUser
            ? "bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/20"
            : "bg-background"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary" />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-0.5">
            <img
              src="/logo-dark.ico"
              alt="convert-IA"
              className="w-full h-full object-contain block dark:hidden"
            />
            <img
              src="/favicon.ico"
              alt="convert-IA"
              className="w-full h-full object-contain hidden dark:block"
            />
          </div>
        )}
      </div>

      <div
        className={`flex-1 min-w-0 ${isUser ? "flex flex-col items-end" : ""}`}
      >
        <div
          className={`text-xs font-semibold mb-1.5 ${isUser ? "text-muted-foreground" : "text-foreground"}`}
        >
          {isUser ? "Tú" : "convert-IA"}
        </div>

        <div className={`max-w-[90%] min-w-0 ${isUser ? "flex flex-col items-end" : ""}`}>
          {isUser ? (
            <div className="w-fit max-w-full rounded-2xl rounded-tr-md bg-secondary/70 px-4 py-3 text-[15px] leading-relaxed text-foreground">
              {message.attachment && (
                <div className="mb-3 overflow-hidden rounded-2xl border border-border/70 bg-background/90 p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {message.attachment.filename}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                        <span className="rounded-full bg-secondary/80 px-2 py-0.5 text-[11px] font-medium uppercase text-foreground/80">
                          {message.attachment.type || "archivo"}
                        </span>
                        <span>Adjunto cargado</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {message.content ? (
                <div>{message.content}</div>
              ) : (
                !message.attachment && <div>{message.content}</div>
              )}
            </div>
          ) : (
            <div className="prose-chat text-[15px] leading-[1.7] text-foreground">
              <ReactMarkdown
                components={{
                  /* Code blocks with copy button */
                  pre: ({ children, ...props }) => (
                    <div className="relative group/code my-3">
                      <pre
                        className="bg-[hsl(220,20%,13%)] text-[hsl(210,20%,88%)] rounded-xl p-4 overflow-x-auto text-sm leading-relaxed"
                        {...props}
                      >
                        {children}
                      </pre>
                      <button
                        onClick={() => {
                          const node = (props as { node?: unknown }).node;
                          let text = "";

                          if (
                            node &&
                            typeof node === "object" &&
                            "children" in node &&
                            Array.isArray(
                              (node as { children?: unknown }).children,
                            )
                          ) {
                            const firstChild = (node as { children?: unknown })
                              .children?.[0];
                            if (
                              firstChild &&
                              typeof firstChild === "object" &&
                              "children" in firstChild &&
                              Array.isArray(
                                (firstChild as { children?: unknown }).children,
                              )
                            ) {
                              const codeChild = (
                                firstChild as { children?: unknown }
                              ).children?.[0];
                              if (
                                codeChild &&
                                typeof codeChild === "object" &&
                                "value" in codeChild
                              ) {
                                text = String(
                                  (codeChild as { value?: unknown }).value ||
                                    "",
                                );
                              }
                            }
                          }

                          navigator.clipboard.writeText(text);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 text-white/60 opacity-0 group-hover/code:opacity-100 hover:bg-white/20 transition-all text-xs"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ),
                  code: ({ children, className, ...props }) => {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code
                          className="bg-secondary px-1.5 py-0.5 rounded text-[13px] font-mono text-foreground"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code
                        className={`font-mono text-[13px] ${className || ""}`}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-3 rounded-lg border border-border">
                      <table className="w-full text-sm">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 text-left font-semibold bg-secondary/50 border-b border-border text-foreground">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 border-b border-border/50 text-muted-foreground">
                      {children}
                    </td>
                  ),
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {children}
                    </a>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-5 my-2 space-y-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-5 my-2 space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-foreground">{children}</li>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold mt-5 mb-2 text-foreground">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg font-bold mt-4 mb-2 text-foreground">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold mt-3 mb-1.5 text-foreground">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-3 last:mb-0">{children}</p>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-3 border-primary/50 pl-4 my-3 text-muted-foreground italic">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="my-4 border-border" />,
                }}
              >
                {message.content}
              </ReactMarkdown>

              {isStreaming && (
                <span className="inline-flex items-center gap-0.5 ml-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:140ms]" />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:280ms]" />
                </span>
              )}

              {/* Action buttons */}
              {!isStreaming && (
                <div className="flex items-center gap-0.5 mt-3 -ml-1.5">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary transition-colors"
                    aria-label="Copiar"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setFeedback(feedback === "up" ? null : "up")}
                    className={`p-1.5 rounded-lg transition-colors ${
                      feedback === "up"
                        ? "text-success bg-success/10"
                        : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary"
                    }`}
                    aria-label="Me gusta"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      setFeedback(feedback === "down" ? null : "down")
                    }
                    className={`p-1.5 rounded-lg transition-colors ${
                      feedback === "down"
                        ? "text-destructive bg-destructive/10"
                        : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary"
                    }`}
                    aria-label="No me gusta"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                  {onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary transition-colors"
                      aria-label="Regenerar"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
