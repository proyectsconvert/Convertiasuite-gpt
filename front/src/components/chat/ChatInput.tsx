import { useRef, useEffect, useState, useCallback } from "react";
import { Send, Paperclip, ChevronDown, Bot, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { AnimatePresence, motion } from "framer-motion";

const models = [
  { id: "qwen2.5:7b", name: "QUANTA-IA", badge: ["Fast Reasoning"] },
  { id: "gemma4:26b", name: "MAGMA-IA", badge: ["Smart"] },
  { id: "llama3.2-vision:11b", name: "SPECTRA-IA", badge: ["Images"] },
  { id: "qwen2.5-coder:7b", name: "CYPHER-IA", badge: ["Code"] },
  { id: "deepseek-r1", name: "AETHER-IA", badge: ["Reasoning"] },
  { id: "deepseek-coder", name: "FORGE-IA", badge: ["Code"] },
  {
    id: "nemotron-cascade-2:latest",
    name: "NEURO-IA",
    badge: ["Strong Reasoning"],
  },
  { id: "glm-4.7-flash:latest", name: "KINETIC-IA", badge: ["Fast"] },
  { id: "qwen3.6:latest", name: "CORE-IA", badge: ["New"] },
  { id: "medgemma:4b", name: "VITAL-IA", badge: ["Medical"] },
  { id: "nomic-embed-text:latest", name: "VECTOR-IA", badge: ["Embed"] },
];

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  isLoading: boolean;
  variant?: "welcome" | "conversation";
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  variant = "conversation",
}: ChatInputProps) {
  const { selectedModel, setSelectedModel } = useAppStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showModels, setShowModels] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setShowModels(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (value.trim() && !isLoading) onSend();
      }
    },
    [value, isLoading, onSend],
  );

  const currentModel = models.find((m) => m.id === selectedModel) || models[0];
  const isWelcome = variant === "welcome";

  return (
    <div
      className={`w-full ${isWelcome ? "max-w-[640px] mx-auto mt-6" : "max-w-4xl mx-auto"}`}
    >
      <div className="relative rounded-2xl border bg-card shadow-md transition-shadow focus-within:shadow-lg focus-within:border-primary/20 border-border/40">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Envía un mensaje a convert-IA..."
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-1.5 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 min-h-[48px] max-h-[200px]"
          aria-label="Mensaje"
        />

        <div className="flex items-center justify-between px-2.5 pb-2.5">
          <div className="flex items-center gap-0.5">
            <button
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Adjuntar archivo"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowModels(!showModels)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Bot className="w-3.5 h-3.5" />
                <span className="font-medium hidden sm:inline">
                  {currentModel.name}
                </span>
                {currentModel.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-muted-foreground/70 border border-border/20">
                    {currentModel.badge}
                  </span>
                )}
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showModels ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {showModels && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.1 }}
                    className="absolute bottom-full left-0 mb-1.5 w-52 rounded-xl border border-border bg-popover shadow-xl p-1 z-50 max-h-60 overflow-y-auto"
                  >
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setShowModels(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors ${
                          m.id === selectedModel
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <span className="flex-1 text-left">{m.name}</span>
                        {m.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              m.id === selectedModel
                                ? "bg-primary/20 text-primary"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {m.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button
            onClick={onSend}
            disabled={!value.trim() || isLoading}
            className={`p-2 rounded-xl transition-all duration-100 ${
              value.trim() && !isLoading
                ? "bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            }`}
            aria-label="Enviar"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground/50 mt-2">
        convert-IA puede cometer errores. Verifica la información importante.
      </p>
    </div>
  );
}
