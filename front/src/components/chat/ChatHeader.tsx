import { useState, useRef, useEffect } from "react";
import {
  Share2,
  PanelRightOpen,
  PanelRightClose,
  Check,
  Package,
} from "lucide-react";

import { useAppStore, useCurrentChatArtifacts } from "@/store/appStore";
import { AnimatePresence } from "framer-motion";
import { getArtifactCounts } from "@/lib/artifact-utils";

export default function ChatHeader() {
  const {
    sessions,
    currentChatId,
    renameSession,
    artifactsPanelOpen,
    setArtifactsPanelOpen,
  } = useAppStore();

  const artifacts = useCurrentChatArtifacts();
  const artifactCounts = getArtifactCounts(artifacts);

  const activeChat = sessions.find((c) => c.id === currentChatId);

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [showModels, setShowModels] = useState(false);
  const [shareConfirm, setShareConfirm] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowModels(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  const handleSave = () => {
    if (currentChatId && editValue.trim()) {
      renameSession(currentChatId, editValue.trim());
    }

    setIsEditing(false);
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);

    setShareConfirm(true);

    setTimeout(() => {
      setShareConfirm(false);
    }, 2000);
  };

  const title = activeChat?.title || "Nuevo chat";

  return (
    <header className="min-h-12 border-b border-border/40 flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 flex-shrink-0 bg-background/80 backdrop-blur-sm">
      {/* Left */}
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
            onClick={() => {
              setEditValue(title);
              setIsEditing(true);
            }}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate max-w-[180px] sm:max-w-[300px]"
            title="Click para editar el nombre"
          >
            {title}
          </button>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <AnimatePresence>
          {showModels && (
            <div
              ref={dropdownRef}
              className="absolute top-full right-0 mt-1 w-48 rounded-xl border border-border bg-popover shadow-xl p-1 z-50"
            >
              {/* Models dropdown */}
            </div>
          )}
        </AnimatePresence>

        {/* Share */}
        <button
          onClick={handleShare}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Compartir"
        >
          {shareConfirm ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
        </button>

        {/* Artifacts */}
        {artifactCounts.total > 0 && (
          <button
            onClick={() => setArtifactsPanelOpen(!artifactsPanelOpen)}
            className={`p-2 rounded-lg transition-colors relative ${
              artifactsPanelOpen
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
            aria-label={artifactsPanelOpen ? "Cerrar panel" : "Abrir panel"}
            title={`Artefactos: ${artifactCounts.documents} documentos, ${artifactCounts.html} HTML, ${artifactCounts.code} código, ${artifactCounts.markdown} markdown`}
          >
            {artifactsPanelOpen ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <>
                <PanelRightOpen className="w-4 h-4" />
                {artifactCounts.total > 0 && (
                  <span className="absolute top-0 right-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {artifactCounts.total}
                  </span>
                )}
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
