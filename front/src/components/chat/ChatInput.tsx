import { useRef, useEffect, useState, useCallback } from "react";
import {
  Send,
  Paperclip,
  Bot,
  Loader2,
  X,
  FileText,
  Mic,
  Square,
} from "lucide-react";

import { useAppStore } from "@/store/appStore";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { chatApi } from "@/services/api";

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

type UploadState = "idle" | "uploading" | "recording";

interface AttachedFileData {
  name: string;
  context: string;
  type?: string;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  variant = "conversation",
}: ChatInputProps) {
  const { selectedModel } = useAppStore();
  const { toast } = useToast();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // UNIFIED UPLOAD STATE (uploading file or recording audio)
  const [uploadState, setUploadState] = useState<UploadState>("idle");

  const [attachedFile, setAttachedFile] = useState<AttachedFileData | null>(
    null,
  );

  // AUTO RESIZE TEXTAREA
  useEffect(() => {
    const el = textareaRef.current;

    if (!el) return;

    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  // SUBMIT
  const handleSubmit = useCallback(() => {
    const canSend = value.trim() || attachedFile;

    if (canSend && !isLoading && uploadState === "idle") {
      onSend(attachedFile?.context, attachedFile?.name, attachedFile?.type);

      setAttachedFile(null);
    }
  }, [value, attachedFile, isLoading, uploadState, onSend]);

  // ENTER SEND
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // FILE UPLOAD
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    const allowedExtensions = [".xlsx", ".csv", ".pdf", ".docx", ".txt", ".json", ".md"];

    if (!allowedExtensions.includes(fileExtension)) {
      toast({
        title: "Formato no permitido",
        description:
          "Solo se admiten Excel (.xlsx), CSV, PDF (.pdf), Word (.docx), Texto (.txt), Markdown (.md) o JSON (.json)",
        variant: "destructive",
      });

      e.target.value = "";
      return;
    }

    setUploadState("uploading");
    try {
      const response = await chatApi.uploadFile(file);

      setAttachedFile({
        name: response.filename,
        context: response.extracted_context,
        type: response.attachment_type,
      });
    } catch (error) {
      console.error(error);

      toast({
        title: "Error al procesar archivo",
        description:
          "No se pudo procesar el archivo. Verifica que esté en formato válido.",
        variant: "destructive",
      });
    } finally {
      setUploadState("idle");
      e.target.value = "";
    }
  };

  // AUDIO RECORDING
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        await uploadAudio(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();

      setUploadState("recording");
    } catch (error) {
      let errorMessage = "No se pudo acceder al micrófono";

      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          errorMessage =
            "Permiso denegado. Habilita el micrófono en tu navegador";
        } else if (error.name === "NotFoundError") {
          errorMessage = "No se encontró dispositivo de micrófono";
        } else if (error.name === "NotReadableError") {
          errorMessage = "El micrófono está siendo usado por otra aplicación";
        }
      }

      console.error("Error grabando audio:", error);
      toast({
        title: "Error de audio",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // STOP RECORDING
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();

    setUploadState("idle");
  };

  // AUDIO UPLOAD
  const uploadAudio = async (blob: Blob) => {
    try {
      const formData = new FormData();

      formData.append(
        "file",
        new File([blob], "recording.webm", {
          type: "audio/webm",
        }),
      );

      const response = await chatApi.uploadAudio(formData);

      setAttachedFile({
        name: "Audio grabado",
        context: response.transcript,
        type: "audio",
      });

      toast({
        title: "Éxito",
        description: "Audio procesado correctamente",
      });
    } catch (error) {
      console.error("Error al procesar audio:", error);
      toast({
        title: "Error al procesar audio",
        description:
          "No se pudo procesar el archivo de audio. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setUploadState("idle");
    }
  };

  const isWelcome = variant === "welcome";

  return (
    <div
      className={`w-full ${
        isWelcome ? "max-w-[640px] mx-auto mt-6" : "max-w-4xl mx-auto"
      }`}
    >
      <div className="relative rounded-2xl border bg-card shadow-md transition-shadow focus-within:shadow-lg focus-within:border-primary/20 border-border/40">
        {/* FILE INPUT */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,.csv,.pdf,.docx, .txt, .md, .json"
          className="hidden"
        />

        {/* ATTACHED FILE */}
        <AnimatePresence>
          {attachedFile && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mx-4 mt-3 overflow-hidden rounded-3xl border border-border/60 bg-secondary/80 shadow-sm"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
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

                    <span>Archivo listo para enviar</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAttachedFile(null)}
                  className="p-2 rounded-2xl text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TEXTAREA */}
        {uploadState === "recording" ? (
          <div className="px-4 py-5 flex items-center gap-3 text-red-500">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />

            <span className="text-sm font-medium">Grabando audio...</span>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={uploadState !== "idle"}
            placeholder={
              uploadState === "uploading"
                ? "Procesando..."
                : "Envía un mensaje..."
            }
            className="w-full resize-none bg-transparent px-4 pt-3.5 pb-1.5 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 min-h-[48px] max-h-[200px] disabled:opacity-50"
          />
        )}

        {/* FOOTER */}
        <div className="flex items-center justify-between px-2.5 pb-2.5">
          <div className="flex items-center gap-1">
            {/* FILE BUTTON */}
            <button
              type="button"
              disabled={uploadState !== "idle" || isLoading}
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
            >
              {uploadState === "uploading" ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>

            {/* AUDIO BUTTON */}
            <button
              type="button"
              disabled={isLoading || uploadState !== "idle"}
              onClick={
                uploadState === "recording" ? stopRecording : startRecording
              }
              className={`p-1.5 rounded-lg transition-colors ${
                uploadState === "recording"
                  ? "bg-red-500 text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {uploadState === "recording" ? (
                <Square className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* SEND BUTTON */}
          <button
            onClick={handleSubmit}
            disabled={
              (!value.trim() && !attachedFile) ||
              isLoading ||
              uploadState !== "idle"
            }
            className={`p-2 rounded-xl transition-all duration-100 ${
              (value.trim() || attachedFile) &&
              !isLoading &&
              uploadState === "idle"
                ? "bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            }`}
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
        convert-IA puede cometer errores.
      </p>
    </div>
  );
}
