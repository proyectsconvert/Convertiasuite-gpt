import { useRef, useEffect, useState, useCallback } from "react";
import {
  Send,
  Paperclip,
  ChevronDown,
  Bot,
  Loader2,
  X,
  FileText,
  Code,
  Cpu,
  Brain,
  Eye,
  Activity,
  HeartPulse,
  Layers,
  Cloud,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { AnimatePresence, motion } from "framer-motion";
import { chatApi } from "@/services/api";

const models = [
  { id: "qwen2.5:7b", name: "Qwen 2.5 7B", badge: "Fast" },
  { id: "llama3.2-vision:11b", name: "Llama 3.2 Vision", badge: "Vision" },
  { id: "qwen2.5-coder:7b", name: "Qwen 2.5 Coder", badge: "Code" },
  { id: "deepseek-r1", name: "DeepSeek R1", badge: "Reasoning" },
  { id: "deepseek-coder", name: "DeepSeek Coder", badge: "Code" },
  { id: "glm-4.7-flash:latest", name: "GLM 4.7 Flash", badge: "Fast" },
  { id: "medgemma:4b", name: "MedGemma 4B", badge: "Medical" },
  { id: "nomic-embed-text:latest", name: "Nomic Embed", badge: "Embed" },
];

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: (
    extractedContext?: string,
    filename?: string,
    attachmentType?: string,
  ) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showModels, setShowModels] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    context: string;
    type?: string;
  } | null>(null);

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

  //TEXTAREA + FILE UPLOAD HANDLERS
  const handleSubmit = useCallback(() => {
    const canSend = value.trim() || attachedFile;
    if (canSend && !isLoading && !isUploadingFile) {
      onSend(attachedFile?.context, attachedFile?.name, attachedFile?.type);
      setAttachedFile(null);
    }
  }, [value, attachedFile, isLoading, isUploadingFile, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".csv")) {
      alert(
        "Formato no soportado. Por ahora solo se admiten archivos Excel (.xlsx) o CSV.",
      );
      e.target.value = "";
      return;
    }

    setIsUploadingFile(true);
    try {
      const response = await chatApi.uploadFile(file);

      setAttachedFile({
        name: response.filename,
        context: response.extracted_context,
        type: response.attachment_type,
      });
    } catch (error) {
      console.error("Error subiendo el archivo al backend:", error);
      alert("No se pudo procesar la estructura del archivo.");
    } finally {
      setIsUploadingFile(false);
      e.target.value = "";
    }
  };

  const currentModel = models.find((m) => m.id === selectedModel) || models[0];
  const isWelcome = variant === "welcome";

  const getModelIcon = (modelId: string) => {
    if (modelId.includes("coder") || modelId.includes("code")) return Code;
    if (modelId.includes("embed") || modelId.includes("nomic")) return Layers;
    if (
      modelId.includes("vision") ||
      modelId.includes("ocr") ||
      modelId.includes("image")
    )
      return Eye;
    if (modelId.includes("medical") || modelId.includes("medgemma"))
      return HeartPulse;
    if (modelId.includes("reasoning") || modelId.includes("deepseek-r1"))
      return Activity;
    if (
      modelId.includes("gemma4") ||
      modelId.includes("qwen3.6") ||
      modelId.includes("qwen2.5")
    )
      return Cpu;
    if (modelId.includes("glm")) return Sparkles;
    if (modelId.includes("nemotron")) return Cloud;
    return Bot;
  };

  const CurrentModelIcon = getModelIcon(currentModel.id);

  return (
    <div
      className={`w-full ${isWelcome ? "max-w-[640px] mx-auto mt-6" : "max-w-4xl mx-auto"}`}
    >
      <div className="relative rounded-2xl border bg-card shadow-md transition-shadow focus-within:shadow-lg focus-within:border-primary/20 border-border/40">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx, .csv"
          className="hidden"
        />

        <AnimatePresence>
          {attachedFile && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mx-4 mt-3 overflow-hidden rounded-3xl border border-border/60 bg-secondary/80 shadow-sm"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center text rounded-2xl bg-primary/10 text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {attachedFile.name}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                    <span className="rounded-full bg-background/90 px-2 py-0.5 font-medium uppercase">
                      {attachedFile.type || "archivo"}
                    </span>
                    <span>Archivo adjuntado listo para enviar</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="p-2 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                  aria-label="Eliminar adjunto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isUploadingFile}
          placeholder={
            isUploadingFile
              ? "Procesando estructura del archivo..."
              : "Envía un mensaje a convert-IA..."
          }
          className="w-full resize-none bg-transparent px-4 pt-3.5 pb-1.5 text-[15px] text-left leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 min-h-[48px] max-h-[200px] disabled:opacity-50"          aria-label="Mensaje"
        />

        <div className="flex items-center justify-between px-2.5 pb-2.5">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={isUploadingFile || isLoading}
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Adjuntar archivo"
            >
              {isUploadingFile ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowModels(!showModels)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <CurrentModelIcon className="w-3.5 h-3.5" />
                <span className="font-medium hidden sm:inline">
                  {currentModel.name}
                </span>
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
                    {models.map((m) => {
                      const OptionIcon = getModelIcon(m.id);
                      return (
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
                          <div className="flex items-center gap-2 flex-1 text-left">
                            <OptionIcon className="w-4 h-4 text-primary" />
                            <span>{m.name}</span>
                          </div>
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
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={
              (!value.trim() && !attachedFile) || isLoading || isUploadingFile
            }
            className={`p-2 rounded-xl transition-all duration-100 ${
              (value.trim() || attachedFile) && !isLoading && !isUploadingFile
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
