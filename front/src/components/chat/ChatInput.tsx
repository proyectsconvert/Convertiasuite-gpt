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

export default function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  variant = "conversation",
}: ChatInputProps) {
  const { selectedModel } = useAppStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FILE STATE
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    context: string;
    type?: string;
  } | null>(null);

  // AUDIO STATE
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const audioChunksRef = useRef<Blob[]>([]);

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

    if (canSend && !isLoading && !isUploadingFile) {
      onSend(
        attachedFile?.context,
        attachedFile?.name,
        attachedFile?.type,
      );

      setAttachedFile(null);
    }
  }, [
    value,
    attachedFile,
    isLoading,
    isUploadingFile,
    onSend,
  ]);

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
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (
      !file.name.endsWith(".xlsx") &&
      !file.name.endsWith(".csv")
    ) {
      alert(
        "Solo se admiten archivos Excel (.xlsx) o CSV.",
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
      console.error(error);

      alert("No se pudo procesar el archivo.");
    } finally {
      setIsUploadingFile(false);
      e.target.value = "";
    }
  };

  // AUDIO RECORDING
  const startRecording = async () => {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
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
        const audioBlob = new Blob(
          audioChunksRef.current,
          {
            type: "audio/webm",
          },
        );

        await uploadAudio(audioBlob);

        stream.getTracks().forEach((track) =>
          track.stop(),
        );
      };

      mediaRecorder.start();

      setIsRecording(true);
    } catch (error) {
      console.error(error);

      alert("No se pudo acceder al micrófono.");
    }
  };

  // STOP RECORDING
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();

    setIsRecording(false);
  };

  // AUDIO UPLOAD
  const uploadAudio = async (blob: Blob) => {
    try {
      setIsUploadingFile(true);

      const formData = new FormData();

      formData.append(
        "file",
        new File([blob], "recording.webm", {
          type: "audio/webm",
        }),
      );

      const response = await chatApi.uploadAudio(
        formData,
      );

      setAttachedFile({
        name: "Audio grabado",
        context: response.transcript,
        type: "audio",
      });
    } catch (error) {
      console.error(error);

      alert("No se pudo procesar el audio.");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const isWelcome = variant === "welcome";

  return (
    <div
      className={`w-full ${
        isWelcome
          ? "max-w-[640px] mx-auto mt-6"
          : "max-w-4xl mx-auto"
      }`}
    >
      <div className="relative rounded-2xl border bg-card shadow-md transition-shadow focus-within:shadow-lg focus-within:border-primary/20 border-border/40">
        {/* FILE INPUT */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,.csv"
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

                    <span>
                      Archivo listo para enviar
                    </span>
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
        {isRecording ? (
          <div className="px-4 py-5 flex items-center gap-3 text-red-500">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />

            <span className="text-sm font-medium">
              Grabando audio...
            </span>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isUploadingFile}
            placeholder={
              isUploadingFile
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
              disabled={
                isUploadingFile ||
                isLoading ||
                isRecording
              }
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
            >
              {isUploadingFile ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>

            {/* AUDIO BUTTON */}
            <button
              type="button"
              disabled={isLoading || isUploadingFile}
              onClick={
                isRecording
                  ? stopRecording
                  : startRecording
              }
              className={`p-1.5 rounded-lg transition-colors ${
                isRecording
                  ? "bg-red-500 text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {isRecording ? (
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
              isUploadingFile
            }
            className={`p-2 rounded-xl transition-all duration-100 ${
              (value.trim() || attachedFile) &&
              !isLoading &&
              !isUploadingFile
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