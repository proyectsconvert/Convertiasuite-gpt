import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import VoiceAssistant from "@/components/voice/VoiceAssistant";
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
  Bot,
  Sparkles,
} from "lucide-react";

import { useAppStore } from "@/store/appStore";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { chatApi, skillsApi, type Skill } from "@/services/api";

type SpeechRecognitionResult = {
  transcript: string;
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: Array<Array<SpeechRecognitionResult> & { isFinal: boolean }>;
};

interface SpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: { error: string }) => void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: (
    extractedContexts?: string[],
    filenames?: string[],
    attachmentTypes?: string[],
    skillPrompt?: string,
  ) => void;
  isLoading: boolean;
  variant?: "welcome" | "conversation";
  onStop?: () => void;
  onOpenVoice?: () => void;
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
  variant,
  onStop,
  onOpenVoice,
}: ChatInputProps) {
  const { selectedModel, currentChatId, skills, enabledSkillIds, setSkills } = useAppStore();
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
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    realtimeTranscriptRef.current = realtimeTranscript;
  }, [realtimeTranscript]);

  useEffect(() => {
    transcriptAccumulatedRef.current = transcriptAccumulated;
  }, [transcriptAccumulated]);

  const [attachedFiles, setAttachedFiles] = useState<AttachedFileData[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [selectedSkillForMessage, setSelectedSkillForMessage] = useState<Skill | null>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);
  const activeMentionItemRef = useRef<HTMLButtonElement>(null);

  const enabledSkills = useMemo(
    () => skills.filter((s) => enabledSkillIds.includes(s.id)),
    [skills, enabledSkillIds],
  );

  const filteredMentionSkills = useMemo(() => {
    if (!mentionQuery) return enabledSkills;
    const q = mentionQuery.toLowerCase();
    return enabledSkills.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [enabledSkills, mentionQuery]);

  useEffect(() => {
    if (skills.length === 0) {
      skillsApi
        .listSkills()
        .then((response) => {
          if (response.skills && response.skills.length > 0) {
            setSkills(response.skills);
          }
        })
        .catch((error) => {
          console.error("Error cargando skills para autocompletar:", error);
        });
    }
  }, [skills.length, setSkills]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  // FIX #5: keep the highlighted mention item visible when navigating with arrow keys
  useEffect(() => {
    if (showMentionDropdown) {
      activeMentionItemRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [mentionIndex, showMentionDropdown]);

  // FIX #2: close the @mention dropdown on outside click
  useEffect(() => {
    if (!showMentionDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedInsideDropdown = mentionDropdownRef.current?.contains(target);
      const clickedInsideTextarea = textareaRef.current?.contains(target);
      if (!clickedInsideDropdown && !clickedInsideTextarea) {
        setShowMentionDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMentionDropdown]);

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
        selectedSkillForMessage?.prompt || undefined,
      );
      setAttachedFiles([]);
      setSelectedSkillForMessage(null);
      setShowMentionDropdown(false);
    }
  }, [value, attachedFiles, isLoading, uploadState, onSend, selectedSkillForMessage]);

  // ENTER SEND
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showMentionDropdown && filteredMentionSkills.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((prev) => (prev + 1) % filteredMentionSkills.length);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex((prev) => (prev - 1 + filteredMentionSkills.length) % filteredMentionSkills.length);
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          selectMentionSkill(filteredMentionSkills[mentionIndex]);
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setShowMentionDropdown(false);
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, showMentionDropdown, filteredMentionSkills, mentionIndex],
  );

  // Garantiza que solo haya 1 skill activa a la vez
  const selectMentionSkill = useCallback((skill: Skill) => {
    const cursorPos = textareaRef.current?.selectionStart ?? value.length;
    const textBeforeCursor = value.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    // Limpiar cualquier @mention de skill previa en todo el valor antes de insertar la nueva
    let cleanValue = value;
    if (selectedSkillForMessage) {
      cleanValue = cleanValue.replace(new RegExp(`@${selectedSkillForMessage.name}\\s?`, "g"), "");
    }

    // Recalcular índice de cursor sobre la cadena limpia
    const newCursorPos = Math.min(cursorPos, cleanValue.length);
    const newTextBefore = cleanValue.substring(0, newCursorPos);
    const newAtIndex = newTextBefore.lastIndexOf("@");

    if (newAtIndex !== -1) {
      const before = cleanValue.substring(0, newAtIndex);
      const after = cleanValue.substring(newCursorPos);
      const newValue = `${before}@${skill.name} ${after}`;
      onChange(newValue);

      requestAnimationFrame(() => {
        const targetCursorPos = before.length + skill.name.length + 2;
        textareaRef.current?.setSelectionRange(targetCursorPos, targetCursorPos);
        textareaRef.current?.focus();
      });
    }

    setSelectedSkillForMessage(skill);
    setShowMentionDropdown(false);
    setMentionQuery("");
    setMentionIndex(0);
  }, [value, onChange, selectedSkillForMessage]);

  // FIX #3: only trigger @mention when "@" is at the start of the string or preceded by whitespace
  const handleInputChange = useCallback((newValue: string) => {
    onChange(newValue);

    const cursorPos = textareaRef.current?.selectionStart ?? newValue.length;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMentionDropdown(true);
      setMentionIndex(0);
    } else {
      setShowMentionDropdown(false);
      setMentionQuery("");
    }

    // Clear selected skill if @mention was removed
    if (selectedSkillForMessage && !newValue.includes(`@${selectedSkillForMessage.name}`)) {
      setSelectedSkillForMessage(null);
    }
  }, [onChange, selectedSkillForMessage]);

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
      const response = await chatApi.uploadFile(file, currentChatId || undefined);
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

      const win = window as unknown as Record<string, new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        start: () => void;
        onresult: (event: { resultIndex: number; results: Array<Array<{ transcript: string }> & { isFinal: boolean }> }) => void;
        onerror: (event: { error: string }) => void;
      }>;
      const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;

      if (SpeechRecognitionAPI) {
        const recognition = new SpeechRecognitionAPI() as SpeechRecognition;
        recognition.lang = "es-ES";
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
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

        recognition.onerror = (event) => {
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

  // AUDIO UPLOAD (Dictado de chat)
  const uploadAudio = async (blob: Blob, browserTranscript: string) => {
    const hasBrowserTranscript = !!browserTranscript;

    if (!hasBrowserTranscript) {
      setUploadState("uploading");
    }

    try {
      if (!hasBrowserTranscript) {
        const formData = new FormData();
        formData.append(
          "file",
          new File([blob], "recording.webm", { type: "audio/webm" }),
        );

        const response = await chatApi.transcribeAudio(formData);
        if (response.transcript) {
          onChange(
            value
              ? `${value.trim()} ${response.transcript}`
              : response.transcript,
          );
        }
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
            className={`relative rounded-2xl border bg-card shadow-md transition-all duration-200 focus-within:shadow-lg border-border/40 overflow-visible ${
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
            <div className="relative">
              {/* @mention dropdown */}
              <AnimatePresence>
                {showMentionDropdown && (
                  <motion.div
                    ref={mentionDropdownRef}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-4 right-4 mb-1 z-50 rounded-xl border border-border bg-popover shadow-lg overflow-hidden"
                  >
                    <div className="py-1 max-h-[200px] overflow-y-auto">
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                        Skills disponibles
                      </div>
                      {enabledSkills.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-muted-foreground">
                          No tienes skills activas. Activa una skill para usar @.
                        </div>
                      ) : filteredMentionSkills.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-muted-foreground">
                          No se encontraron skills activas que coincidan.
                        </div>
                      ) : (
                        filteredMentionSkills.map((skill, i) => (
                          <button
                            key={skill.id}
                            ref={i === mentionIndex ? activeMentionItemRef : undefined}
                            onMouseEnter={() => setMentionIndex(i)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectMentionSkill(skill);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                              i === mentionIndex
                                ? "bg-primary/10 text-foreground"
                                : "text-foreground hover:bg-secondary/60"
                            }`}
                          >
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Sparkles className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium truncate">
                                {skill.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {skill.description}
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">
                              {skill.category}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Selected skill badge */}
              <AnimatePresence>
                {selectedSkillForMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mx-4 mt-2 flex items-center gap-2"
                  >
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-primary font-medium">
                        {selectedSkillForMessage.name}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedSkillForMessage(null);
                          // Remove @mention from input
                          const cleaned = value.replace(
                            new RegExp(`@${selectedSkillForMessage.name}\\s?`),
                            ""
                          );
                          onChange(cleaned);
                        }}
                        className="ml-0.5 p-0.5 rounded hover:bg-primary/20 transition-colors"
                      >
                        <X className="w-2.5 h-2.5 text-primary" />
                      </button>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Skill activa para este mensaje</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={30000}
                disabled={uploadState !== "idle"}
                autoComplete="off"
                placeholder={
                  uploadState === "uploading"
                    ? "Procesando..."
                    : enabledSkills.length > 0
                      ? "Envía un mensaje — escribe @ para usar una skill"
                      : "Envía un mensaje — activa una skill para usar @"
                }
                className="w-full resize-none bg-transparent px-4 pt-3.5 pb-1.5 text-[15px] leading-relaxed text-foreground outline-none focus:outline-none focus:ring-0 focus:border-transparent placeholder:text-muted-foreground/50 min-h-[48px] max-h-[200px] disabled:opacity-50"
              />
            </div>

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
{/* VOICE ASSISTANT BUTTON */}
<button
  type="button"
  onClick={() => {
    console.log("Abriendo asistente de voz...");
    onOpenVoice?.();
  }}
  className="
    p-1.5
    rounded-full
    bg-gradient-to-r
    from-[#1aeda1]
    to-[#bab8ff]
    hover:scale-110
    hover:brightness-90
    transition-all
    duration-200
    shadow-sm
  "
>
  <Bot className="w-4 h-4 text-black" />
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
        Oliv-IA puede cometer errores.
      </p>
    </div>
  );
}
