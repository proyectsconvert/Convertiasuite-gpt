import { X, Mic, MicOff, Phone } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { chatApi } from "@/services/api";
import { voiceConversation } from "@/services/voiceConversation";
import AnimatedAvatar from "./AnimatedAvatar";
import {useAppStore} from "@/store/appStore";

interface Props {
  onClose: () => void;
  onSendVoice: (text: string) => void;
  onEndCall: () => void;
}

type Status = "idle" | "listening" | "thinking" | "speaking";

export default function VoiceAssistant({ onClose, onSendVoice, onEndCall }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [userText, setUserText] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [assistantLevel, setAssistantLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callTime, setCallTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const {darkMode} = useAppStore();
  const [callStarted, setCallStarted] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speechDetectedRef = useRef(false);
  const isMutedRef = useRef(false);
  const greetingPlayedRef = useRef(false);
  const greetingPlayingRef = useRef(false);
  const callIdRef = useRef<string | null>(null);

  
  useEffect(() => {
    if (
      voiceConversation.isConversationActive() &&
      !greetingPlayingRef.current &&
      !isSpeaking &&
      status === "idle" &&
      !isMutedRef.current
    ) {
      startListening();
    }
  
  }, [status, isSpeaking]);

  useEffect(() => {
    voiceConversation.registerSpeakingListener((speaking) => {
      setIsSpeaking(speaking);
      setStatus(speaking ? "speaking" : "idle");
    });
  }, []);

  useEffect(() => {
  playGreeting();

  return () => {
    voiceConversation.stop();

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }

    cleanupMediaStreams();
    greetingPlayingRef.current = false;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  useEffect(() => {
    if (!callStarted) return;
    const timer = setInterval(() => setCallTime((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [callStarted]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

const playGreeting = async () => {
  if (greetingPlayedRef.current) return;

  greetingPlayedRef.current = true;
  greetingPlayingRef.current = true;

  try {
    setStatus("speaking");

    const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone;
    const response = await chatApi.getVoiceGreeting(timezone);

    if (response.text?.trim()) {
      setAssistantText(response.text);
    }

    if (response.audio_base64) {
      const audio = new Audio(
        `data:audio/wav;base64,${response.audio_base64}`
      );

      audio.onended = () => {
        greetingPlayingRef.current = false;

        // Ahora sí activamos la conversación
        voiceConversation.start();
        setCallStarted(true);
        setStatus("idle");
      };

      audio.onerror = async () => {
        console.warn("Error reproduciendo saludo de Qwen TTS");

        try {
          if (response.text) {
            await voiceConversation.speak(response.text);
          }
        } catch (error) {
          console.error("Error en fallback del saludo:", error);
        }

        greetingPlayingRef.current = false;

        voiceConversation.start();

        setStatus("idle");
      };

      await audio.play();

    } else if (response.text) {

      await voiceConversation.speak(response.text);

      greetingPlayingRef.current = false;

      voiceConversation.start();
      setCallStarted(true);
      setStatus("idle");

    } else {

      greetingPlayingRef.current = false;

      voiceConversation.start();
      setCallStarted(true);
      setStatus("idle");
    }

  } catch (error) {
    console.error("Error reproduciendo saludo inicial:", error);

    greetingPlayingRef.current = false;

    voiceConversation.start();
    setCallStarted(true);
    setStatus("idle");
  }
};

  const toggleMute = () => {
    const newMutedState = !isMuted;
    isMutedRef.current = newMutedState;
    setIsMuted(newMutedState);

    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !newMutedState;
    });

    if (newMutedState) {
      setVoiceLevel(0);
      speechDetectedRef.current = false;
      if (silenceTimeRef.current !== null) {
        window.clearTimeout(silenceTimeRef.current);
        silenceTimeRef.current = null;
      }
      return;
    }

    if (voiceConversation.isConversationActive() && status === "idle") {
      startListening();
    }
  };

  const startListening = async () => {
    if (isMutedRef.current) return;
    if (status === "listening") return;
    if (mediaRecorderRef.current?.state === "recording") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.onstart = () => setStatus("listening");
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      speechDetectedRef.current = false;
      recorder.start();
      detectarSilencio();
    } catch (error) {
      console.error(error);
      alert("No fue posible acceder al micrófono");
    }
  };

  // Única función de limpieza de recursos de audio. Antes existían dos
  // (cleanupMediaStreams y cleanupAudio) casi idénticas — se consolidan aquí.
  const cleanupMediaStreams = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (silenceTimeRef.current) {
      window.clearTimeout(silenceTimeRef.current);
      silenceTimeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    audioChunksRef.current = [];
    speechDetectedRef.current = false;
  };

  const stopListening = () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state !== "recording") {
      cleanupMediaStreams();
      return;
    }

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      if (callIdRef.current) formData.append("call_id", callIdRef.current);

      try {
        setStatus("thinking");
        const response = await chatApi.uploadAudio(formData);

        if (response.call_id){ callIdRef.current = response.call_id;}
        if (response.transcript?.trim()) setUserText(response.transcript);
        if (response.response_text?.trim()) setAssistantText(response.response_text);

        if (!voiceConversation.isConversationActive()) {
          setStatus("idle");
          return;
        }

        if (response.audio_base64) {
          setStatus("speaking");
          const audio = new Audio(`data:audio/wav;base64,${response.audio_base64}`);
          audio.onended = () => setStatus("idle");
          audio.onerror = () => {
            console.warn("Error al reproducir audio de Qwen TTS, fallback a síntesis local");
            if (response.response_text) voiceConversation.speak(response.response_text);
            setStatus("idle");
          };
          await audio.play();
        } else if (response.response_text) {
          await voiceConversation.speak(response.response_text);
        } else if (response.transcript?.trim()) {
          await voiceConversation.send(response.transcript);
        }
      } catch (error) {
        console.error(error);
        setStatus("idle");
      } finally {
        cleanupMediaStreams();
        mediaRecorderRef.current = null;
      }
    };

    recorder.stop();
  };

  const detectarSilencio = () => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const data = new Uint8Array(analyser.fftSize);

    const revisar = () => {
      if (!voiceConversation.isConversationActive()) return;

      if (isMutedRef.current) {
        setVoiceLevel(0);
        animationFrameRef.current = requestAnimationFrame(revisar);
        return;
      }

      analyser.getByteTimeDomainData(data);

      let suma = 0;
      for (let i = 0; i < data.length; i++) suma += Math.abs(data[i] - 128);
      const volumen = suma / data.length;
      setVoiceLevel(volumen);

      if (volumen > 8) speechDetectedRef.current = true;

      if (speechDetectedRef.current && volumen < 5) {
        if (!silenceTimeRef.current) {
          silenceTimeRef.current = window.setTimeout(() => {
            stopListening();
          }, 700) as unknown as number;
        }
      } else if (silenceTimeRef.current !== null) {
        window.clearTimeout(silenceTimeRef.current);
        silenceTimeRef.current = null;
      }

      animationFrameRef.current = requestAnimationFrame(revisar);
    };

    revisar();
  };

  // NUNCA SE INVOCA (ver revisión). Si quieres que el avatar reaccione al
  // volumen de la voz de OlivIA (no solo al mic del usuario), esta función
  // hay que llamarla desde el audio de playGreeting/stopListening, y pasar
  // assistantLevel a <AnimatedAvatar /> mientras status === "speaking".
  const analizarVozAsistente = (audio: HTMLAudioElement) => {
    const context = new AudioContext();
    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(context.destination);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      analyser.getByteFrequencyData(data);
      let suma = 0;
      data.forEach((value) => (suma += value));
      setAssistantLevel(suma / data.length);
      requestAnimationFrame(loop);
    };
    loop();
  };

  const handleEndCall = () => {
    isMutedRef.current = false;
    setIsMuted(false);
    cleanupMediaStreams();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    voiceConversation.stop();
    onEndCall();
  };

  return (
    <div
  className={`fixed inset-0 z-50 flex items-center justify-center ${
    darkMode ? "bg-black/60" : "bg-black/20"
  }`}
>
      <div
  className={`
    relative
    overflow-hidden
    backdrop-blur-2xl
    rounded-[32px]
    shadow-2xl
    w-[520px]
    h-[770px]
    px-10
    py-8
    ${
      darkMode
        ? `
          bg-slate-950/80
          border
          border-emerald-500/20
          shadow-emerald-500/10
        `
        : `
          bg-white/90
          border
          border-emerald-500/20
          shadow-black/10
        `
    }
  `}
>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="background-gradient"></div>
          <div className="background-grid"></div>
          <div className="background-noise"></div>
        </div>

        <button
          onClick={onClose}
        className={`absolute top-6 right-6 z-30 w-10 h-10 rounded-full transition flex items-center justify-center ${
  darkMode
    ? "bg-white/5 hover:bg-white/10 border border-white/10 text-white"
    : "bg-black/5 hover:bg-black/10 border border-black/10 text-slate-700"
}`}
        >
          <X size={18} />
        </button>

        <div className="relative z-10 h-full flex flex-col items-center">
          <div className="flex flex-col items-center shrink-0">
            <h1
        className={`text-4xl font-bold ${
         darkMode ? "text-white" : "text-slate-900"
          }`}
        >
             OlivIA
          </h1>
            <p className="mt-2 text-emerald-400 tracking-[0.25em] uppercase text-xs">
              Voice Assistant
            </p>
          </div>

          <div className="shrink-0 mt-8 h-[340px] flex items-center justify-center">
            <AnimatedAvatar status={status} volume={voiceLevel} assistantSpeaking={isSpeaking} />
          </div>

          <div className="shrink-0 mt-2 flex flex-col items-center gap-2">
            <p className="text-emerald-400 text-sm tracking-[0.15em] uppercase font-semibold min-h-[20px]">
              {status === "idle" && "EN ESPERA"}
              {status === "listening" && "ESCUCHANDO TU VOZ"}
              {status === "thinking" && "PENSANDO..."}
              {status === "speaking" && "HABLANDO..."}
            </p>
            <span
  className={`text-3xl font-bold font-mono tracking-wider ${
    darkMode ? "text-white" : "text-slate-900"
  }`}
>
              {formatTime(callTime)}
            </span>
          </div>

          <div className="w-full max-w-sm mt-5 h-[115px] shrink-0 overflow-y-auto px-1 space-y-4">
            {userText && (
              <div className="flex justify-end">
                <div className="max-w-[85%] text-right">
                  <p className="text-xs text-emerald-400 mb-1 font-medium">Tú</p>
                  <div
  className={`inline-block rounded-2xl rounded-tr-sm px-4 py-2.5 ${
    darkMode
      ? "bg-white/5 border border-white/10 text-gray-200"
      : "bg-black/5 border border-black/10 text-slate-700"
  }`}
>
                    {userText}
                  </div>
                </div>
              </div>
            )}

            {assistantText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] text-left">
                  <p className="text-xs text-cyan-400 mb-1 font-medium">OlivIA</p>
                  <div
  className={`inline-block rounded-2xl rounded-tl-sm px-4 py-2.5 ${
    darkMode
      ? "bg-cyan-500/5 border border-cyan-400/10 text-gray-200"
      : "bg-cyan-500/10 border border-cyan-400/20 text-slate-700"
  }`}
>
                    {assistantText}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 mb-10 flex items-center justify-center gap-5 shrink-0">
            <button
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-300 ${
                isMuted
                  ? "bg-red-500/20 border-red-500/40 text-red-400 shadow-lg shadow-red-500/10"
                  : darkMode
  ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
  : "bg-black/5 border-black/10 text-slate-700 hover:bg-black/10"
              }`}
              title={isMuted ? "Activar micrófono" : "Silenciar micrófono"}
            >
              {isMuted ? <MicOff size={21} /> : <Mic size={21} />}
            </button>

            <button
              onClick={handleEndCall}
              className="w-14 h-14 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 text-white border border-red-400/30 shadow-lg shadow-red-500/30 transition-all duration-300 hover:scale-105 active:scale-95"
              title="Finalizar llamada"
            >
              <Phone size={21} strokeWidth={2.3} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}