import { useRef, useEffect, useState, useCallback } from "react";
import {
  Send,
  Paperclip,
  Loader2,
  X,
  FileText,
  Mic,
  Square,
  FileImage,
  FileJson,
  FileCode,
  FileSpreadsheet,
  File as FileIcon,
} from "lucide-react";

import { useAppStore } from "@/store/appStore";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { chatApi } from "@/services/api";

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: (
    extractedContexts?: string[],
    filenames?: string[],
    attachmentTypes?: string[],
  ) => void;
  isLoading: boolean;
  variant?: "welcome" | "conversation";
  onStop?: () => void;
}

type UploadState = "idle" | "uploading" | "recording";

interface AttachedFileData {
  id: string;
  name: string;
  context: string;
  type?: string;
  preview?: string;
  fileSize?: string;
  isImage?: boolean;
  rawFile?: File;
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

// EXTRACT FILE PREVIEW
async function extractFilePreview(file: File): Promise<{ preview?: string; fileSize: string; isImage: boolean }> {
  const fileSize = (file.size / 1024).toFixed(1); // KB
  const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

  // Images - convert to data URL for thumbnail
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return { preview: dataUrl, fileSize: `${fileSize}KB`, isImage: true };
    } catch {
      return { fileSize: `${fileSize}KB`, isImage: true };
    }
  }

  // Text files - read content and show preview
  if ([".txt", ".json", ".md", ".csv"].includes(extension)) {
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      const preview = text.substring(0, 200).replace(/\n/g, " ").trim();
      return { preview: preview || "Archivo vacío", fileSize: `${fileSize}KB`, isImage: false };
    } catch {
      return { fileSize: `${fileSize}KB`, isImage: false };
    }
  }

  // Other files - just return size
  return { fileSize: `${fileSize}KB`, isImage: false };
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  variant = "conversation",
  onStop,
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

  const [attachedFiles, setAttachedFiles] = useState<AttachedFileData[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  // SUBMIT
  const handleSubmit = useCallback(() => {
    const canSend = value.trim() || attachedFiles.length > 0;
    if (canSend && !isLoading && uploadState === "idle") {
      const contexts = attachedFiles.map((f) => f.context);
      const filenames = attachedFiles.map((f) => f.name);
      const types = attachedFiles.map((f) => f.type || "archivo");
      onSend(
        contexts.length > 0 ? contexts : undefined,
        filenames.length > 0 ? filenames : undefined,
        types.length > 0 ? types : undefined,
      );
      setAttachedFiles([]);
    }
  }, [value, attachedFiles, isLoading, uploadState, onSend]);

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

  // FILE PROCESSING
  const processFile = async (file: File) => {
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
      return;
    }

    setUploadState("uploading");
    try {
      const previewData = await extractFilePreview(file);
      const response = await chatApi.uploadFile(file);
      const newFile: AttachedFileData = {
        id: Math.random().toString(36).substr(2, 9),
        name: response.filename,
        context: response.extracted_context,
        type: response.attachment_type,
        preview: previewData.preview,
        fileSize: previewData.fileSize,
        isImage: previewData.isImage,
      };
      setAttachedFiles((prev) => [...prev, newFile]);
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
    }
  };

  // REMOVE FILE
  const removeFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // FILE UPLOAD
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      await processFile(files[i]);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (uploadState === "idle" && !isLoading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploadState !== "idle" || isLoading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        await processFile(files[i]);
      }
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
          <motion.div
            key="normal-ui"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-2xl border bg-card shadow-md transition-all duration-200 focus-within:shadow-lg focus-within:border-primary/20 border-border/40 overflow-hidden ${
              isDragging
                ? "border-[#1aeda1] dark:border-[#bab8ff] ring-2 ring-[#1aeda1]/20 dark:ring-[#bab8ff]/20 scale-[1.01]"
                : ""
            }`}
          >
            {/* DRAG OVERLAY */}
            <AnimatePresence>
              {isDragging && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/90 dark:bg-background/95 border-2 border-dashed border-[#1aeda1] dark:border-[#bab8ff] rounded-2xl backdrop-blur-sm pointer-events-none"
                >
                  <Paperclip className="w-10 h-10 text-primary animate-bounce mb-2" />
                  <p className="text-sm font-semibold text-foreground">
                    Suelta tu archivo aquí
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Excel, CSV, PDF, Word, PowerPoint, Texto, Imágenes...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {/* FILE INPUT */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.csv,.pdf,.docx,.txt,.md,.json,.png,.jpg,.jpeg,.webp,.pptx"
              multiple
              className="hidden"
            />

            {/* ATTACHED FILES */}
            <AnimatePresence>
              {attachedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="mx-4 mt-3 space-y-2 max-h-[200px] overflow-y-auto"
                >
                  {attachedFiles.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className="overflow-hidden rounded-2xl border border-border/60 bg-secondary/80 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* IMAGE PREVIEW */}
                      {file.isImage && file.preview ? (
                        <div className="flex items-stretch">
                          <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-l-xl">
                            <img
                              src={file.preview}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 flex items-center justify-between px-4 py-2">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {file.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground uppercase font-medium">
                                {file.fileSize} · {file.type || "imagen"}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(file.id)}
                              className="p-1.5 flex-shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                              title="Remover archivo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : file.preview ? (
                        /* TEXT PREVIEW */
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3 px-4 py-2">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                              {file.type === "json" ? (
                                <FileJson className="w-4 h-4" />
                              ) : file.type === "csv" ? (
                                <FileSpreadsheet className="w-4 h-4" />
                              ) : (
                                <FileCode className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-foreground truncate">
                                {file.name}
                              </div>
                              <div className="text-[11px] text-muted-foreground uppercase font-medium">
                                {file.fileSize} · {file.type || "texto"}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(file.id)}
                              className="p-1.5 flex-shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                              title="Remover archivo"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="px-4 py-2 bg-background/40 text-[12px] text-muted-foreground italic line-clamp-2 border-t border-border/30">
                            {file.preview}
                          </div>
                        </div>
                      ) : (
                        /* DEFAULT FILE PREVIEW */
                        <div className="flex items-center gap-3 px-4 py-2.5">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            {file.type === "pdf" ? (
                              <FileText className="w-4 h-4 text-red-500" />
                            ) : file.type === "xlsx" || file.type === "csv" ? (
                              <FileSpreadsheet className="w-4 h-4 text-green-500" />
                            ) : file.type === "docx" ? (
                              <FileText className="w-4 h-4 text-blue-500" />
                            ) : file.type === "pptx" ? (
                              <FileText className="w-4 h-4 text-orange-500" />
                            ) : (
                              <FileIcon className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground truncate">
                              {file.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground uppercase font-medium">
                              {file.fileSize} · {file.type || "archivo"}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFile(file.id)}
                            className="p-1.5 flex-shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                            title="Remover archivo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
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
              maxLength={30000}
              disabled={uploadState !== "idle"}
              placeholder={
                uploadState === "uploading"
                  ? "Procesando..."
                  : "Envía un mensaje"
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

              {/* SEND/STOP BUTTON & CHARACTER COUNT */}
              <div className="flex items-center gap-2">
                {value.length > 0 && (
                  <span className={`text-[11px] font-medium mr-1 ${
                    value.length > 25000 
                      ? "text-red-500 animate-pulse font-semibold" 
                      : "text-muted-foreground/60"
                  }`}
                  >
                    {value.length}/30000
                  </span>
                )}

                {isLoading ? (
                  <button
                    type="button"
                    onClick={onStop}
                    className="p-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all duration-100 shadow-sm flex items-center justify-center active:scale-95"
                    title="Detener respuesta"
                  >
                    <Square className="w-4 h-4 fill-current text-white" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={
                      (!value.trim() && attachedFiles.length === 0) ||
                      uploadState !== "idle"
                    }
                    className={`p-2 rounded-xl transition-all duration-100 ${
                      (value.trim() || attachedFiles.length > 0) &&
                      uploadState === "idle"
                        ? "bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                        : "bg-secondary text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
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
