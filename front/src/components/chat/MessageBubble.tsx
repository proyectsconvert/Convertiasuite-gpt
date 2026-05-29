import { useState, useCallback } from "react";
import {
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCcw,
  Check,
  User,
  FileText,
  FileSpreadsheet,
  FileDown,
  Download,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { ChatMessage, documentsApi } from "@/services/api";
import remarkGfm from "remark-gfm";
interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  isStreaming?: boolean;
  previousMessage?: ChatMessage;
}

const getCodeText = (node: any): string => {
  try {
    const firstChild = node?.children?.[0];
    const codeChild = firstChild?.children?.[0];
    return codeChild?.value || "";
  } catch {
    return "";
  }
};

function extractTableData(children: any): string[][] {
  const rows: string[][] = [];

  const getText = (node: any): string => {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(getText).join("");
    if (node.props && node.props.children) return getText(node.props.children);
    return "";
  };
  const findRows = (node: any) => {
    if (!node) return;
    if (node.type === "tr") {
      const cells: string[] = [];
      const childrenArray = Array.isArray(node.props.children)
        ? node.props.children
        : [node.props.children];

      childrenArray.forEach((cell: any) => {
        if (cell && typeof cell === "object") {
          const text = getText(cell).trim();
          if (text || text === "") {
            cells.push(text);
          }
        }
      });
      if (cells.length > 0) {
        rows.push(cells);
      }
    } else if (node.props && node.props.children) {
      const childrenArray = Array.isArray(node.props.children)
        ? node.props.children
        : [node.props.children];
      childrenArray.forEach(findRows);
    }
  };

  if (Array.isArray(children)) {
    children.forEach(findRows);
  } else {
    findRows(children);
  }

  return rows;
}

export default function MessageBubble({
  message,
  onRegenerate,
  isStreaming,
  previousMessage,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const isUser = message.role === "user";
  const attachment = message.attachments?.[0];

  console.log("MESSAGE", message);
  console.log("ATTACHMENT", attachment);

  const userText = previousMessage?.content?.toLowerCase() || "";
  const assistantText = message.content?.toLowerCase() || "";

  const hasPdfKeyword = /\bpdf\b/i.test(userText);
  const hasPdfIntent = hasPdfKeyword && /(gener|crea|descarg|export|haz|hac|pas|convert|en\s+pdf|como\s+pdf|un\s+pdf|el\s+pdf|descarga|bajar|guard|reporte|informe)/i.test(userText);
  const assistantOffersPdf = /\bpdf\b/i.test(assistantText) && /(descargar\s+pdf|descarga\s+pdf|pdf\s+generado|he\s+generado\s+el\s+pdf|aquí\s+tienes\s+el\s+pdf)/i.test(assistantText);
  const showPdfButton = hasPdfIntent || assistantOffersPdf;

  const hasWordKeyword = /\b(word|docx)\b/i.test(userText);
  const hasWordIntent = hasWordKeyword && /(gener|crea|descarg|export|haz|hac|pas|convert|en\s+(word|docx)|como\s+(word|docx)|un\s+(word|docx)|el\s+(word|docx)|descarga|bajar|guard|reporte|informe)/i.test(userText);
  const assistantOffersWord = /\b(word|docx)\b/i.test(assistantText) && /(descargar\s+(word|docx)|descarga\s+(word|docx)|(word|docx)\s+generado|he\s+generado\s+el\s+(word|docx)|aquí\s+tienes\s+el\s+(word|docx))/i.test(assistantText);
  const showWordButton = hasWordIntent || assistantOffersWord;

  const timestamp =
    message.timestamp instanceof Date
      ? message.timestamp
      : new Date(message.timestamp);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [message.content]);

  const handleDownload = useCallback(
    async (format: string, filename: string, content: any) => {
      try {
        const blob = await documentsApi.generateFile(filename, format, content);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error(`Error descargando el archivo ${filename}:`, error);
      }
    },
    [],
  );

  if (typeof message.content !== "string" && !message.attachments?.length) {
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

        <div
          className={`max-w-[90%] min-w-0 ${isUser ? "flex flex-col items-end" : ""}`}
        >
          {isUser ? (
            <div className="w-fit max-w-full rounded-2xl rounded-tr-md bg-secondary/70 px-4 py-3 text-[15px] leading-relaxed text-foreground">
              {attachment && (
                <div className="mb-3 overflow-hidden rounded-2xl border border-border/70 bg-background/90 p-3">
                  {(attachment.type === "image" || attachment.type === "vision") && message.images?.[0] ? (
                    <div className="relative rounded-xl overflow-hidden border border-border/40 max-h-60 bg-secondary/30 flex items-center justify-center max-w-sm">
                      <img
                        src={`data:image/png;base64,${message.images[0]}`}
                        alt={attachment.filename}
                        className="max-h-60 object-contain w-full rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {attachment.filename}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                          <span className="rounded-full bg-secondary/80 px-2 py-0.5 text-[11px] font-medium uppercase text-foreground/80">
                            {attachment.type || "archivo"}
                          </span>
                          <span>Adjunto cargado</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {message.content ? (
                <div>{message.content}</div>
              ) : (
                !attachment && <div>{message.content}</div>
              )}
            </div>
          ) : (
            <div className="prose-chat text-[15px] leading-[1.7] text-foreground">
              {(!isStreaming && (showPdfButton || showWordButton)) ? (
                <div className="flex flex-col gap-3 my-3">
                  <p className="text-[15px] leading-relaxed text-foreground">
                    {showPdfButton && showWordButton
                      ? "¡Listo! Aquí te presento el PDF y Word solicitados. Puedes descargarlos directamente con los botones de abajo 👇"
                      : showPdfButton
                        ? "¡Listo! Aquí te presento el PDF solicitado. Puedes descargarlo directamente con el botón de abajo 👇"
                        : "¡Listo! Aquí te presento el documento Word solicitado. Puedes descargarlo directamente con el botón de abajo 👇"}
                  </p>
                  {showPdfButton && (
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-secondary/20 transition-all shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                          <FileDown className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                            {previousMessage?.attachments?.[0]?.filename
                              ? `${previousMessage.attachments[0].filename.substring(0, previousMessage.attachments[0].filename.lastIndexOf('.')) || previousMessage.attachments[0].filename}.pdf`
                              : `documento-${message.id.slice(0, 8)}.pdf`}
                          </div>
                          <div className="text-xs text-muted-foreground">Documento PDF listo para descargar</div>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleDownload(
                            "pdf",
                            previousMessage?.attachments?.[0]?.filename
                              ? `${previousMessage.attachments[0].filename.substring(0, previousMessage.attachments[0].filename.lastIndexOf('.')) || previousMessage.attachments[0].filename}.pdf`
                              : `documento-${message.id.slice(0, 8)}.pdf`,
                            message.content,
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                        title="Descargar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {showWordButton && (
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-secondary/20 transition-all shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                            {previousMessage?.attachments?.[0]?.filename
                              ? `${previousMessage.attachments[0].filename.substring(0, previousMessage.attachments[0].filename.lastIndexOf('.')) || previousMessage.attachments[0].filename}.docx`
                              : `documento-${message.id.slice(0, 8)}.docx`}
                          </div>
                          <div className="text-xs text-muted-foreground">Documento Word listo para descargar</div>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleDownload(
                            "word",
                            previousMessage?.attachments?.[0]?.filename
                              ? `${previousMessage.attachments[0].filename.substring(0, previousMessage.attachments[0].filename.lastIndexOf('.')) || previousMessage.attachments[0].filename}.docx`
                              : `documento-${message.id.slice(0, 8)}.docx`,
                            message.content,
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                        title="Descargar Word"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    pre: ({ children, ...props }) => {
                      const codeElement = children as any;
                      const className = codeElement?.props?.className || "";
                      const match = /language-(\w+)/.exec(className);
                      const rawLang = match ? match[1] : "txt";
                      const isSupportedForDownload = [
                        "csv",
                        "json",
                        "markdown",
                        "md",
                        "txt",
                      ].includes(rawLang);

                      return (
                        <div className="relative group/code my-3">
                          <pre
                            className="bg-[hsl(220,20%,13%)] text-[hsl(210,20%,88%)] rounded-xl p-4 overflow-x-auto text-sm leading-relaxed"
                            {...props}
                          >
                            {children}
                          </pre>
                          <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover/code:opacity-100 transition-all">
                            {isSupportedForDownload && (
                              <button
                                onClick={() => {
                                  const text = getCodeText((props as any).node);
                                  const fileExt =
                                    rawLang === "markdown" ? "md" : rawLang;
                                  handleDownload(
                                    rawLang,
                                    `codigo-descargado.${fileExt}`,
                                    text,
                                  );
                                }}
                                className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all text-xs"
                                title={`Descargar archivo .${rawLang === "markdown" ? "md" : rawLang}`}
                              >
                                <FileDown className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                  const text = getCodeText((props as any).node);
                                  navigator.clipboard.writeText(text);
                              }}
                              className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all text-xs"
                              title="Copiar código"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    },
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
                    table: ({ children }) => {
                      const handleExport = (format: "excel" | "csv") => {
                        const tableData = extractTableData(children);
                        if (tableData.length > 0) {
                          const extension = format === "excel" ? "xlsx" : "csv";
                          handleDownload(
                            format,
                            `tabla-exportada.${extension}`,
                            tableData,
                          );
                        }
                      };

                      return (
                        <div className="my-4 rounded-xl border border-border bg-background/50 overflow-hidden group/table">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/30 border-b border-border text-[11px] text-muted-foreground">
                            <span className="font-medium flex items-center gap-1.5">
                              <FileSpreadsheet className="w-3.5 h-3.5 text-success" />
                              Tabla de datos
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleExport("excel")}
                                className="px-2 py-0.5 rounded hover:bg-secondary hover:text-foreground transition-colors flex items-center gap-1 text-[11px]"
                                title="Exportar a Excel (.xlsx)"
                              >
                                <Download className="w-3 h-3 text-success" />
                                <span>Excel</span>
                              </button>
                              <button
                                onClick={() => handleExport("csv")}
                                className="px-2 py-0.5 rounded hover:bg-secondary hover:text-foreground transition-colors flex items-center gap-1 text-[11px]"
                                title="Exportar a CSV (.csv)"
                              >
                                <Download className="w-3 h-3 text-primary" />
                                <span>CSV</span>
                              </button>
                            </div>
                          </div>
                          <div className="overflow-x-auto p-1 bg-background">
                            <table className="w-full text-sm border-collapse">
                              {children}
                            </table>
                          </div>
                        </div>
                      );
                    },
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
              )}

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
