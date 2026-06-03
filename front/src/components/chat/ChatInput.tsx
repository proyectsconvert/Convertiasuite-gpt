import { useRef, useEffect, useState, useCallback } from "react";
import {
  Send,
  Paperclip,
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

function AudioWaveform() {
  const bars = [3, 6, 10, 14, 18, 22, 26, 22, 18, 14, 10, 6, 3];

  // Dos tonos exactos solicitados
  const colorStart = { r: 26, g: 237, b: 161 }; // #1aeda1
  const colorEnd = { r: 186, g: 184, b: 255 }; // #bab8ff

  return (
    <div className="flex items-center justify-center gap-[3px] h-6">
      {bars.map((baseHeight, i) => {
        const ratio = i / (bars.length - 1);
        const r = Math.round(
          colorStart.r + (colorEnd.r - colorStart.r) * ratio,
        );
        const g = Math.round(
          colorStart.g + (colorEnd.g - colorStart.g) * ratio,
        );
        const b = Math.round(
          colorStart.b + (colorEnd.b - colorStart.b) * ratio,
        );
        const rgbColor = `rgb(${r}, ${g}, ${b})`;

        return (
          <motion.div
            key={i}
            className="rounded-full w-[3px]"
            style={{ backgroundColor: rgbColor }}
            animate={{
              height: [
                `${baseHeight * 0.6}px`,
                `${baseHeight * 1.8}px`,
                `${baseHeight * 0.6}px`,
              ],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 0.9 + i * 0.04,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.06,
            }}
          />
        );
      })}
    </div>
  );
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

  const [uploadState, setUploadState] = useState<UploadState>("idle");

  const [transcriptAccumulated, setTranscriptAccumulated] = useState("");
  const [realtimeTranscript, setRealtimeTranscript] = useState("");

  const realtimeTranscriptRef = useRef("");
  const transcriptAccumulatedRef = useRef("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    realtimeTranscriptRef.current = realtimeTranscript;
  }, [realtimeTranscript]);

  useEffect(() => {
    transcriptAccumulatedRef.current = transcriptAccumulated;
  }, [transcriptAccumulated]);

  const [attachedFile, setAttachedFile] = useState<AttachedFileData | null>(
    null,
  );

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

    const fileExtension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();
    const allowedExtensions = [
      ".xlsx",
      ".csv",
      ".pdf",
      ".docx",
      ".txt",
      ".json",
      ".md",
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".pptx",
    ];

    if (!allowedExtensions.includes(fileExtension)) {
      toast({
        title: "Formato no permitido",
        description:
          "Solo se admiten Excel (.xlsx), CSV, PDF (.pdf), Word (.docx), PowerPoint (.pptx), Texto (.txt), Markdown (.md), JSON (.json) o Imágenes (.png, .jpg, .jpeg, .webp)",
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

        const fullTranscript =
          `${transcriptAccumulatedRef.current.trim()} ${realtimeTranscriptRef.current.trim()}`.trim();

        if (fullTranscript) {
          onChange(
            value ? `${value.trim()} ${fullTranscript}` : fullTranscript,
          );
        }

        await uploadAudio(audioBlob, fullTranscript);
        stream.getTracks().forEach((track) => track.stop());
      };

      const SpeechRecognitionAPI =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = "es-ES";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          let interim = "";
          let final = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript + " ";
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          if (final) {
            setTranscriptAccumulated((prev) => prev + final);
            setRealtimeTranscript("");
          } else {
            setRealtimeTranscript(interim);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
        };

        recognitionRef.current = recognition;
        setTranscriptAccumulated("");
        setRealtimeTranscript("");
        recognition.start();
      } else {
        setTranscriptAccumulated("");
        setRealtimeTranscript("");
      }

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

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // AUDIO UPLOAD
  const uploadAudio = async (blob: Blob, browserTranscript: string) => {
    const hasBrowserTranscript = !!browserTranscript;

    if (!hasBrowserTranscript) {
      setUploadState("uploading");
    }

    try {
      const formData = new FormData();
      formData.append(
        "file",
        new File([blob], "recording.webm", { type: "audio/webm" }),
      );

      if (!hasBrowserTranscript) {
        const response = await chatApi.uploadAudio(formData);
        if (response.transcript) {
          onChange(
            value
              ? `${value.trim()} ${response.transcript}`
              : response.transcript,
          );
        }
      } else {
        chatApi.uploadAudio(formData).catch((err) => {
          console.error("Error al subir audio de fondo:", err);
        });
      }
    } catch (error) {
      console.error("Error al procesar audio:", error);
    } finally {
      setUploadState("idle");
      setTranscriptAccumulated("");
      setRealtimeTranscript("");
    }
  };

  const isWelcome = variant === "welcome";
  const isRecording = uploadState === "recording";

  return (
    <div
      className={`w-full ${
        isWelcome ? "max-w-[640px] mx-auto mt-6" : "max-w-4xl mx-auto"
      }`}
    >
      <AnimatePresence mode="wait">
        {isRecording ? (
          /*UI GRABACIÓN */
          <motion.div
            key="recording-ui"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="relative rounded-2xl p-[1px] bg-gradient-to-r from-[#1aeda1] to-[#bab8ff] shadow-2xl overflow-hidden"
          >
            <div className="rounded-[15px] bg-neutral-100 dark:bg-neutral-950 px-4 py-3 flex items-center gap-3 relative">
              <div className="absolute inset-0 bg-neutral-500/[0.02] dark:bg-white/[0.02] pointer-events-none rounded-[15px]" />

              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-neutral-900 dark:bg-white animate-pulse shadow-[0_0_8px_2px_rgba(0,0,0,0.15)] dark:shadow-[0_0_8px_2px_rgba(255,255,255,0.3)]" />

              <div className="flex-1 flex items-center gap-3 min-w-0 overflow-hidden">
                <div className="flex-shrink-0">
                  <AudioWaveform />
                </div>

                <div className="flex-1 min-w-0">
                  {transcriptAccumulated || realtimeTranscript ? (
                    <div className="text-sm truncate leading-relaxed max-w-full flex items-center gap-1">
                      {transcriptAccumulated && (
                        <span className="text-neutral-800 dark:text-neutral-200 font-medium">
                          {transcriptAccumulated.trim()}
                        </span>
                      )}
                      {realtimeTranscript && (
                        <motion.span
                          initial={{ opacity: 0.7 }}
                          animate={{ opacity: 1 }}
                          className="text-neutral-500 dark:text-neutral-400 italic"
                        >
                          {transcriptAccumulated
                            ? ` ${realtimeTranscript}`
                            : realtimeTranscript}
                        </motion.span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-400 dark:text-neutral-500 italic">
                      Escuchando...
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={stopRecording}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-neutral-300 dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-900 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-800 hover:border-[#1aeda1] dark:hover:border-[#bab8ff] transition-all shadow-sm active:scale-95"
                title="Detener grabación"
              >
                <Square className="w-2.5 h-2.5 fill-current text-neutral-900 dark:text-white" />
              </button>
            </div>
          </motion.div>
        ) : (
          /* ---- NORMAL INPUT UI ---- */
          <motion.div
            key="normal-ui"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="relative rounded-2xl border bg-card shadow-md transition-shadow focus-within:shadow-lg focus-within:border-primary/20 border-border/40"
          >
            {/* FILE INPUT */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.csv,.pdf,.docx,.txt,.md,.json,.png,.jpg,.jpeg,.webp,.pptx"
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

                {/* MIC BUTTON */}
                <button
                  type="button"
                  disabled={isLoading || uploadState === "uploading"}
                  onClick={startRecording}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
                >
                  <Mic className="w-4 h-4" />
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
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-[11px] text-muted-foreground/50 mt-2">
        convert-IA puede cometer errores.
      </p>
    </div>
  );
}
