import { useState, useRef, useEffect } from "react";
import {
  Bot, ChevronDown, Share2, PanelRightOpen, PanelRightClose, Check,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { AnimatePresence, motion } from "framer-motion";

const models = [
  { id: "qwen2.5:7b", name: "Qwen 2.5 7B", badge: ["Fast"] },
  { id: "gemma4:26b", name: "Gemma 4 26B", badge: ["Smart"] },
  { id: "llama3.2-vision:11b", name: "Llama 3.2 Vision", badge: ["Vision"] },
  { id: "qwen2.5-coder:7b", name: "Qwen 2.5 Coder", badge: ["Code"] },
  { id: "deepseek-r1", name: "DeepSeek R1", badge: ["Reasoning"] },
  { id: "deepseek-coder", name: "DeepSeek Coder", badge: ["Code"] },
  { id: "nemotron-cascade-2:latest", name: "Nemotron Cascade 2", badge: [] },
  { id: "glm-4.7-flash:latest", name: "GLM 4.7 Flash", badge: ["Fast"] },
  { id: "qwen3.6:latest", name: "Qwen 3.6", badge: [] },
  { id: "medgemma:4b", name: "MedGemma 4B", badge: ["Medical"] },
  { id: "nomic-embed-text:latest", name: "Nomic Embed", badge: ["Embed"] },
];

export default function ChatHeader() {
  const {
    sessions, currentChatId, renameSession, selectedModel,
    setSelectedModel, artifactsPanelOpen, setArtifactsPanelOpen,
  } = useAppStore();

  const activeChat = sessions.find((c) => c.id === currentChatId);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [showModels, setShowModels] = useState(false);
  const [shareConfirm, setShareConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus();
  }, [isEditing]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModels(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSave = () => {
    if (currentChatId && editValue.trim()) {
      renameSession(currentChatId, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareConfirm(true);
    setTimeout(() => setShareConfirm(false), 2000);
  };

  const currentModelName = models.find((m) => m.id === selectedModel)?.name || selectedModel;
  const title = activeChat?.title || "Nuevo chat";

  return (
    <header className="h-12 border-b border-border/40 flex items-center justify-between px-4 flex-shrink-0 bg-background/80 backdrop-blur-sm">
      {/* Left: chat title (editable) */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setIsEditing(false);
            }}
            className="text-sm font-medium bg-transparent border-b border-primary outline-none text-foreground px-0 py-0.5 max-w-[300px]"
          />
        ) : (
          <button
            onClick={() => { setEditValue(title); setIsEditing(true); }}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate max-w-[300px]"
            title="Click para editar el nombre"
          >
            {title}
          </button>
        )}
      </div>

      {/* Right: model selector + share + artifacts */}
      <div className="flex items-center gap-1">
        {/* Model selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowModels(!showModels)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">{currentModelName}</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showModels ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showModels && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full right-0 mt-1 w-48 rounded-xl border border-border bg-popover shadow-xl p-1 z-50"
              >
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModel(m.id); setShowModels(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      m.id === selectedModel
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Share */}
        <button
          onClick={handleShare}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Compartir"
        >
          {shareConfirm ? <Check className="w-4 h-4 text-success" /> : <Share2 className="w-4 h-4" />}
        </button>

        {/* Artifacts panel toggle */}
        <button
          onClick={() => setArtifactsPanelOpen(!artifactsPanelOpen)}
          className={`p-2 rounded-lg transition-colors ${
            artifactsPanelOpen
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
          aria-label={artifactsPanelOpen ? "Cerrar panel" : "Abrir panel"}
        >
          {artifactsPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
