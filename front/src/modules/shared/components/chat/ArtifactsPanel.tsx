import { useState, useEffect, lazy, Suspense } from "react";
import {
  X,
  Copy,
  Download,
  Check,
  Code2,
  Eye,
  FileText,
  Maximize2,
  Minimize2,
  ChevronDown,
  Folder,
} from "lucide-react";
import {
  useAppStore,
  type ChatArtifact,
  useCurrentChatArtifacts,
} from "@/store/appStore";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  extractArtifactsFromMessage,
  getArtifactTypeLabel,
} from "@/lib/artifact-utils";

const SyntaxHighlighter = lazy(() =>
  import("react-syntax-highlighter").then((m) => ({ default: m.Prism })),
);
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";


const replaceHtmlCodeBlock = (markdown: string, newHtml: string): string => {
  const regex = /(```html\r?\n)([\s\S]*?)(\r?\n```)/;
  if (regex.test(markdown)) {
    return markdown.replace(regex, `$1${newHtml}$3`);
  }
  return markdown;
};

const LANGUAGE_LABELS: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  tsx: "TSX",
  jsx: "JSX",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  json: "JSON",
  bash: "Bash",
  shell: "Shell",
  yaml: "YAML",
  markdown: "Markdown",
  md: "Markdown",
  txt: "Texto",
};

const getExt = (lang?: string) => {
  if (!lang) return "txt";
  const map: Record<string, string> = {
    python: "py",
    javascript: "js",
    typescript: "ts",
    markdown: "md",
    html: "html",
    css: "css",
    sql: "sql",
    json: "json",
    bash: "sh",
    shell: "sh",
    yaml: "yaml",
    tsx: "tsx",
    jsx: "jsx",
  };
  return map[lang] || lang;
};


export default function ArtifactsPanel() {
  const {
    artifactsPanelOpen,
    activeArtifact,
    setArtifactsPanelOpen,
    setActiveArtifact,
    messages,
    setMessages,
    currentChatId,
  } = useAppStore();

  const allArtifacts = useCurrentChatArtifacts();

  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showArtifactsList, setShowArtifactsList] = useState(false);

  useEffect(() => {
    if (!allArtifacts.length) return;

    const isCurrentArtifactValid =
      activeArtifact &&
      allArtifacts.some((artifact) => artifact.id === activeArtifact.id);

    if (!isCurrentArtifactValid) {
      setActiveArtifact(allArtifacts[allArtifacts.length - 1]);
    }
  }, [allArtifacts, activeArtifact, setActiveArtifact]);

  useEffect(() => {
    setIsEditing(false);
    if (activeArtifact) {
      setTab(
        activeArtifact.type === "html" ||
          activeArtifact.type === "markdown" ||
          activeArtifact.type === "document"
          ? "preview"
          : "code",
      );
    }
  }, [activeArtifact?.id]);

  if (!artifactsPanelOpen || !allArtifacts.length) return null;


  const handleCopy = async () => {
    if (!activeArtifact || activeArtifact.type === "document") return;
    await navigator.clipboard.writeText(activeArtifact.content);
    setCopied(true);
    toast.success("Contenido copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeArtifact) return;

    // Para documentos, crear un link de descarga con el nombre original
    if (activeArtifact.type === "document") {
      const filename =
        activeArtifact.filename ||
        `documento.${activeArtifact.fileType || "file"}`;
      if (activeArtifact.downloadUrl) {
        const a = document.createElement("a");
        a.href = activeArtifact.downloadUrl;
        a.download = filename;
        a.click();
      } else {
        toast.info("El documento debe descargarse desde el mensaje original");
      }
      return;
    }

    // Para otros artefactos, descargar como archivo de texto
    const ext = getExt(activeArtifact.language || activeArtifact.type);
    const blob = new Blob([activeArtifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeArtifact.title.replace(/\s+/g, "_").toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartEdit = () => {
    if (activeArtifact?.type === "document") return;
    if (activeArtifact) {
      setEditContent(activeArtifact.content);
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!activeArtifact || !currentChatId) return;
    setIsSaving(true);
    try {
      const updatedArtifact = { ...activeArtifact, content: editContent };
      setActiveArtifact(updatedArtifact);

      const updatedMessages = messages.map((msg) => {
        if (msg.id === activeArtifact.messageId) {
          const newContent = replaceHtmlCodeBlock(msg.content, editContent);
          return { ...msg, content: newContent };
        }
        return msg;
      });

      const { chatApi } = await import("@/services/api");
      await chatApi.updateHistory(currentChatId, updatedMessages);

      setMessages(updatedMessages);
      setIsEditing(false);
      toast.success("Artefacto guardado correctamente");
    } catch (error) {
      console.error("Error saving artifact:", error);
      toast.error("Error al guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  };


  const demoArtifact: ChatArtifact = activeArtifact || {
    id: "demo",
    title: "Vista previa",
    type: "markdown",
    content:
      "Selecciona un artefacto del chat para previsualizar su contenido aquí.\n\n> Los artefactos se generan automáticamente cuando convert-IA produce código, documentos o HTML.",
  };

  const lang = demoArtifact.language || demoArtifact.type || "txt";
  const langLabel = LANGUAGE_LABELS[lang] ?? lang.toUpperCase();

  const panelWidth = expanded ? 700 : 450;


  return (
    <AnimatePresence>
      <motion.div
        key="artifacts-panel"
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 50, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className={`fixed inset-0 z-50 bg-card flex flex-col overflow-hidden md:static md:inset-auto md:z-auto md:h-full md:border-l md:border-border/40 md:bg-card/50 ${
          expanded
            ? "md:w-[700px] md:min-w-[700px] md:max-w-[700px]"
            : "md:w-[450px] md:min-w-[450px] md:max-w-[450px]"
        }`}
      >
        {/* ── Header ── */}
        <div className="h-12 border-b border-border/40 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
            {allArtifacts.length > 1 ? (
              <div className="relative flex-1 min-w-0">
                <button
                  onClick={() => setShowArtifactsList(!showArtifactsList)}
                  className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:bg-secondary/50 px-2 py-1 rounded-lg transition-colors flex-1 min-w-0"
                >
                  <span className="truncate max-w-[180px]">
                    {demoArtifact.title}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
                </button>
                <AnimatePresence>
                  {showArtifactsList && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-border bg-popover shadow-lg z-50 max-h-64 overflow-y-auto"
                    >
                      {allArtifacts.map((artifact, idx) => (
                        <button
                          key={artifact.id}
                          onClick={() => {
                            setActiveArtifact(artifact);
                            setShowArtifactsList(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            activeArtifact?.id === artifact.id
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-secondary/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">
                                {artifact.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getArtifactTypeLabel(artifact)}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-foreground truncate max-w-[220px]">
                  {demoArtifact.title}
                </span>
                {lang && lang !== "document" && lang !== "markdown" && (
                  <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded-md flex-shrink-0">
                    {langLabel}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* expand / collapse */}
            <button
              onClick={() => setExpanded((e) => !e)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label={expanded ? "Contraer" : "Expandir"}
              title={expanded ? "Contraer panel" : "Expandir panel"}
            >
              {expanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={handleCopy}
              disabled={activeArtifact?.type === "document"}
              className={`p-1.5 rounded-lg transition-colors ${
                activeArtifact?.type === "document"
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              aria-label="Copiar"
              title={
                activeArtifact?.type === "document"
                  ? "No se puede copiar documentos"
                  : "Copiar contenido"
              }
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Descargar"
              title="Descargar archivo"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setArtifactsPanelOpen(false);
                setActiveArtifact(null);
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Cerrar"
              title="Cerrar panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-border/40 flex-shrink-0">
          <button
            onClick={() => {
              setTab("preview");
              setIsEditing(false);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              tab === "preview"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          {demoArtifact.type !== "document" && (
            <button
              onClick={() => setTab("code")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                tab === "code"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Código
            </button>
          )}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {tab === "preview" ? (
            <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_55%)]">
              {demoArtifact.type === "document" ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      {demoArtifact.filename}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Tipo: {demoArtifact.fileType?.toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    <Download className="w-4 h-4 inline mr-2" />
                    Descargar archivo
                  </button>
                </div>
              ) : demoArtifact.type === "html" ? (
                <div className="flex-1 min-h-0 overflow-auto rounded-[1.5rem] border border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-2 sm:p-3 shadow-[0_24px_70px_rgba(15,23,42,0.25)]">
                  <div className="mx-auto flex h-full min-h-[620px] max-w-5xl flex-col overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
                    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      </div>
                      <div className="ml-2 flex-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500">
                        Vista previa de página
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_55%)] p-2 sm:p-3">
                      <div className="mx-auto h-full min-h-[560px] overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-inner">
                        <iframe
                          srcDoc={
                            demoArtifact.content +
                            `\n<script>
                              document.addEventListener('click', function(e) {
                                const anchor = e.target.closest('a');
                                if (anchor) {
                                  const href = anchor.getAttribute('href');
                                  if (href && href.startsWith('#')) {
                                    e.preventDefault();
                                    const id = href.slice(1);
                                    const el = document.getElementById(id);
                                    if (el) {
                                      el.scrollIntoView({ behavior: 'smooth' });
                                    }
                                  }
                                }
                              });
                            </script>`
                          }
                          className="h-full w-full min-h-[560px] bg-white"
                          title="Vista previa HTML"
                          sandbox="allow-scripts allow-same-origin"
                          style={{ width: "100%", border: 0 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : demoArtifact.type === "markdown" ||
                lang === "markdown" ||
                lang === "md" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed text-foreground">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {demoArtifact.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <Suspense
                  fallback={
                    <pre className="text-[13px] text-muted-foreground whitespace-pre-wrap p-4">
                      {demoArtifact.content}
                    </pre>
                  }
                >
                  <SyntaxHighlighter
                    language={lang}
                    style={oneDark}
                    customStyle={{
                      margin: 0,
                      borderRadius: "0.75rem",
                      fontSize: "13px",
                      lineHeight: 1.6,
                      background: "hsl(220,20%,13%)",
                      flex: 1,
                    }}
                    showLineNumbers
                    wrapLongLines={false}
                  >
                    {demoArtifact.content}
                  </SyntaxHighlighter>
                </Suspense>
              )}
            </div>
          ) : isEditing ? (
            <div className="flex-1 flex flex-col min-h-0 gap-3 p-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 w-full min-h-[350px] p-4 rounded-xl bg-[hsl(220,20%,13%)] text-[hsl(210,20%,88%)] font-mono text-[13px] leading-relaxed border border-border/50 outline-none resize-none focus:ring-1 focus:ring-primary"
                spellCheck={false}
              />
              <div className="flex gap-2 justify-end flex-shrink-0">
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-lg border border-border/50 hover:bg-secondary text-xs font-semibold transition-all text-foreground"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-all flex items-center gap-1"
                >
                  {isSaving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative group/codeview flex-1 flex flex-col min-h-0">
              <Suspense
                fallback={
                  <pre className="flex-1 p-4 text-[13px] leading-relaxed text-[hsl(210,20%,88%)] font-mono whitespace-pre-wrap bg-[hsl(220,20%,13%)]">
                    {demoArtifact.content}
                  </pre>
                }
              >
                <SyntaxHighlighter
                  language={lang}
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    fontSize: "13px",
                    lineHeight: 1.6,
                    background: "hsl(220,20%,13%)",
                    flex: 1,
                    minHeight: "100%",
                  }}
                  showLineNumbers
                  wrapLongLines={false}
                >
                  {demoArtifact.content}
                </SyntaxHighlighter>
              </Suspense>

              {activeArtifact && activeArtifact.type !== "document" && (
                <button
                  onClick={handleStartEdit}
                  className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all text-xs font-semibold opacity-0 group-hover/codeview:opacity-100"
                >
                  Editar
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
