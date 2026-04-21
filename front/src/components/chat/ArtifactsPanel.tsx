import { useState } from "react";
import {
  X, Copy, Download, Check, Code2, Eye, FileText,
} from "lucide-react";
import { useAppStore, type ChatArtifact } from "@/store/appStore";
import { motion, AnimatePresence } from "framer-motion";

export default function ArtifactsPanel() {
  const { artifactsPanelOpen, activeArtifact, setArtifactsPanelOpen, setActiveArtifact } = useAppStore();
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  if (!artifactsPanelOpen) return null;

  const handleCopy = async () => {
    if (!activeArtifact) return;
    await navigator.clipboard.writeText(activeArtifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!activeArtifact) return;
    const ext = activeArtifact.language === "html" ? "html" : activeArtifact.language === "python" ? "py" : "txt";
    const blob = new Blob([activeArtifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeArtifact.title.replace(/\s+/g, "_").toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* If no active artifact, show placeholder */
  const demoArtifact: ChatArtifact = activeArtifact || {
    id: "demo",
    title: "Vista previa",
    type: "markdown",
    content: "Selecciona un artefacto del chat para previsualizar su contenido aquí.\n\n> Los artefactos se generan automáticamente cuando convert-IA produce código, documentos o HTML.",
  };

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 400, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="h-full border-l border-border/40 bg-card/50 flex flex-col overflow-hidden"
      style={{ minWidth: 400, maxWidth: 400 }}
    >
      {/* Header */}
      <div className="h-12 border-b border-border/40 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
            {demoArtifact.title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Copiar"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Descargar"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setArtifactsPanelOpen(false); setActiveArtifact(null); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/40 flex-shrink-0">
        <button
          onClick={() => setTab("preview")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            tab === "preview"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye className="w-3.5 h-3.5" /> Preview
        </button>
        <button
          onClick={() => setTab("code")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            tab === "code"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Code2 className="w-3.5 h-3.5" /> Code
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "preview" ? (
          <div className="prose-chat text-sm text-foreground">
            {demoArtifact.type === "html" ? (
              <iframe
                srcDoc={demoArtifact.content}
                className="w-full h-full min-h-[400px] rounded-lg border border-border bg-white"
                title="Preview"
                sandbox="allow-scripts"
              />
            ) : (
              <div className="whitespace-pre-wrap leading-relaxed">
                {demoArtifact.content}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-[hsl(220,20%,13%)] p-4 overflow-x-auto">
            <pre className="text-[13px] leading-relaxed text-[hsl(210,20%,88%)] font-mono whitespace-pre-wrap">
              {demoArtifact.content}
            </pre>
          </div>
        )}
      </div>
    </motion.div>
  );
}
