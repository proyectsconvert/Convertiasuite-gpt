
import { X, Mic, MicOff, Phone} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { chatApi } from "@/services/api"
import { voiceConversation } from "@/services/voiceConversation";
import AnimatedAvatar  from "./AnimatedAvatar";
import { Track } from "@radix-ui/react-slider";
import { set } from "date-fns";



interface Props {
  onClose: () => void;
  onSendVoice : ( text: string) => void;
  onEndCall: ()=> void;
}

type Status = 
|"idle"
|"listening" 
|"thinking"
|"speaking";


export default function VoiceAssistant({
  onClose,
  onSendVoice,
  onEndCall
}: Props){
  const [status, setStatus] = useState<Status>("idle");
  const [userText, setUserText] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const[VoiceLevel, setVoiceLevel] = useState(0);
  const [assistantLevel, setAssistantLevel] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoMode] = useState(false);
  const [callTime, setCallTime]= useState(0);
  const [isMuted, setIsMuted] = useState(false);

const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const audioChunksRef = useRef<Blob[]>([]);
const streamRef = useRef<MediaStream |null>(null);
const audioContextRef = useRef<AudioContext | null>(null);
const analyserRef = useRef<AnalyserNode | null>(null);
const silenceTimeRef = useRef< number | null>(null);
const animationFrameRef = useRef<number | null>(null)
const speechDetectedRef =useRef(false);
const isMutedRef = useRef(false)
const greetingPlayedRef = useRef(false);
const greetingPlayingRef = useRef (false)

   useEffect(()=>{
    if(
      voiceConversation.isConversationActive()&&
      !isSpeaking &&
      status ==="idle" &&
      !isMutedRef.current
    ){
      startListening();
    }
   }, [status,isSpeaking])

   useEffect(()=>{
    voiceConversation.registerSpeakingListener(
      (speaking) =>{
        setIsSpeaking(speaking);
      if (speaking){
        setStatus("speaking");
      }else{
        setStatus("idle")
      }
    }
    );
   },[]);

   useEffect(()=>{
    voiceConversation.start();
    playGreeting();
    return ()=>{
      voiceConversation.stop();

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      cleanupMediaStreams();

      greetingPlayingRef.current = false;


    };
   }, []);

   useEffect(()=>{
    if(!voiceConversation.isConversationActive()){
      return;
    }
    const timer = setInterval(()=>{
      setCallTime(prev =>prev+1)
    },1000);
    return()=>clearInterval(timer);
   },[]);
   const formatTime= (seconds:number)=>{
    const min = Math.floor(seconds/60);
    const sec = seconds %60;

    return `${min
        .toString()
        .padStart(2,"0")
    }:${
        sec
        .toString()
        .padStart(2,"0")
   }`;
   }; 
const playGreeting = async () => {
  if (greetingPlayedRef.current) {
    return;
  }

  greetingPlayedRef.current = true;
  greetingPlayingRef.current = true;

  try {
    setStatus("speaking");

    const response = await chatApi.getVoiceGreeting();

    if (response.text?.trim()) {
      setAssistantText(response.text);
    }

    if (response.audio_base64) {
      const audio = new Audio(
        `data:audio/wav;base64,${response.audio_base64}`
      );

      audio.onended = () => {
        greetingPlayingRef.current = false;

        if (isMutedRef.current) {
          setStatus("idle");
          return;
        }

        setStatus("idle");
      };

      audio.onerror = async () => {
        console.warn(
          "Error reproduciendo saludo de Qwen TTS"
        );

        try {
          if (response.text) {
            await voiceConversation.speak(response.text);
          }
        } catch (error) {
          console.error(
            "Error en fallback del saludo:",
            error
          );
        }

        greetingPlayingRef.current = false;
        setStatus("idle");
      };

      await audio.play();

    } else if (response.text) {

      await voiceConversation.speak(response.text);

      greetingPlayingRef.current = false;
      setStatus("idle");

    } else {

      greetingPlayingRef.current = false;
      setStatus("idle");
    }

  } catch (error) {

    console.error(
      "Error reproduciendo saludo inicial:",
      error
    );

    greetingPlayingRef.current = false;
    setStatus("idle");
  }
};

  

const toggleMute = () => {
  const newMutedState = !isMuted;

  isMutedRef.current = newMutedState;
  setIsMuted(newMutedState);

  const stream = streamRef.current;

  if (stream) {
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !newMutedState;
    });
  }

  if (newMutedState) {
    setVoiceLevel(0);
    speechDetectedRef.current = false;

    if (silenceTimeRef.current !== null) {
      window.clearTimeout(silenceTimeRef.current);
      silenceTimeRef.current = null;
    }
    return;
  }
  if(
    voiceConversation.isConversationActive() &&
    status ==="idle"
  ){
    startListening();
  }
};
 const startListening = async ()=>{
  if(isMutedRef.current){
    return;
  }
  if(status ==="listening"){
    return;
  }
  if (mediaRecorderRef.current?.state ==="recording"){
    return;
  }
  try{
    const stream = await navigator.mediaDevices.getUserMedia({
      audio:true,
    });
  streamRef.current = stream;
  const audioContext = new AudioContext();
  audioContextRef.current = audioContext;
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;

  source.connect(analyser);

  analyserRef.current = analyser;

  audioChunksRef.current =[];

  const recorder = new MediaRecorder(stream);

  mediaRecorderRef.current= recorder;
  recorder.onstart = ()=>{
    console.log("grabación iniciada");
    setStatus("listening");

   };

   recorder.ondataavailable=(event) =>{
    console.log("Chunk recibido", event.data.size)
    if(event.data.size >0){
      audioChunksRef.current.push(event.data);
    }
   };
   speechDetectedRef.current = false;
   recorder.start();
detectarSilencio();

  }catch(error){
    console.error(error);

    alert("No fue posible accender al microfono")
  }
};



  const cleanupMediaStreams = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (silenceTimeRef.current) {
      clearTimeout(silenceTimeRef.current);
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

const stopListening = () =>{
  const recorder = mediaRecorderRef.current;

  if(!recorder || recorder.state !== "recording" ) return;

  recorder.onstop = async ()=>{
    console.log("Grabación detenida");
    console.log(audioChunksRef.current)

    const audioBlob = new Blob(
      audioChunksRef.current,
      {
        type:"audio/webm",
      }
    );

    const formData = new FormData();

    formData.append(
      "file",
      audioBlob,
      "audio.webm"
    );
    try{
      setStatus("thinking");
      const response = await chatApi.uploadAudio(formData);
      console.log("respuesta pipeline voz", response);
       if(response.transcript?.trim()){
        setUserText(response.transcript)
      }

      // Si el backend devolvió audio base64 de Qwen TTS, reproducirlo directamente
      if(response.response_text?.trim()){
        setAssistantText(response.response_text);
      }
      if (response.audio_base64) {
        setStatus("speaking");
        const audio = new Audio(`data:audio/wav;base64,${response.audio_base64}`);
        audio.onended = () => setStatus("idle");
        audio.onerror = () => {
          console.warn("Error al reproducir audio de Qwen TTS, fallback a síntesis local");
          if (response.response_text) {
            voiceConversation.speak(response.response_text);
          }
          setStatus("idle");
        };
        await audio.play();
      } else if (response.response_text) {
        // Fallback a síntesis del navegador si Qwen TTS no devolvió audio
        await voiceConversation.speak(response.response_text);
      } else if (response.transcript?.trim()) {
        await voiceConversation.send(response.transcript);
      }
    } catch (error) {
      console.error(error);
      setStatus("idle");
    }
    streamRef.current
    ?.getTracks()
    .forEach(track =>track.stop());

    mediaRecorderRef.current = null;
    streamRef.current=null;

    if (animationFrameRef.current){
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (silenceTimeRef.current){
      window.clearTimeout(silenceTimeRef.current);
      silenceTimeRef.current=null;
    }

   if( audioContextRef.current){
    audioContextRef.current.close();
    audioContextRef.current = null;
  }

    analyserRef.current = null;
  };

const callIdRef = useRef<string | null>(null);

  const stopListening = () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state !== "recording") {
      cleanupMediaStreams();
      return;
    }

    recorder.onstop = async () => {
      console.log("Grabación detenida");

      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });

      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      if (callIdRef.current) {
        formData.append("call_id", callIdRef.current);
      }

      try {
        setStatus("thinking");
        const response = await chatApi.uploadAudio(formData);
        console.log("respuesta pipeline voz", response);
        if (response.call_id) {
          callIdRef.current = response.call_id;
        }
        setText(response.transcript || response.response_text || "");

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
            if (response.response_text) {
              voiceConversation.speak(response.response_text);
            }
            setStatus("idle");
          };
          await audio.play();
        } else if (response.response_text) {
          // Fallback a síntesis del navegador si Qwen TTS no devolvió audio
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

const detectarSilencio = ()=>{

  if(!analyserRef.current) return;

  const analyser = analyserRef.current;

  const data = new Uint8Array(analyser.fftSize);

  const revisar = ()=>{

    if (!voiceConversation.isConversationActive()){
      return;
    }
    if(isMutedRef.current){
      setVoiceLevel(0);
      animationFrameRef.current=
      requestAnimationFrame(revisar);
      return;
    }
    analyser.getByteTimeDomainData(data)

    

    let suma =0;

    for (let i = 0; i < data.length; i++){
      suma += Math.abs(data[i]  - 128);
    }

    const volumen = suma / data.length;
    setVoiceLevel(volumen);

    if(volumen >8 ){

      speechDetectedRef.current=true;
    
      }
      if (speechDetectedRef.current && volumen<5){
        if(!silenceTimeRef.current){
          silenceTimeRef.current = window.setTimeout(() => {
            stopListening();
          }, 700) as unknown as number;
        
      }
    }else {
      if (silenceTimeRef.current !==null){
        window.clearTimeout(silenceTimeRef.current);
        silenceTimeRef.current = null;
      }
    }
   animationFrameRef.current = requestAnimationFrame(revisar);
  };
  revisar();
}

const analizarVozAssitant = (audio: HTMLAudioElement)=>{
  const context = new AudioContext();
  const source = context.createMediaElementSource(audio);
  const analyser=
  context.createAnalyser();
  analyser.fftSize=256;
  source.connect(analyser);
  analyser.connect(
    context.destination
  );
  const data =
  new Uint8Array(
    analyser.frequencyBinCount
  );
  const loop = ()=>{
    analyser.getByteFrequencyData(data);
    let suma = 0;

    data.forEach(Value=>{
      suma += Value;
  });
const volumen= suma/ data.length;
setAssistantLevel(volumen);
requestAnimationFrame(loop);  

};
loop();
}


const cleanupAudio = () =>{
  if(mediaRecorderRef.current){
  if(mediaRecorderRef.current.state!== "inactive"){
    mediaRecorderRef.current.stop();
  }
  mediaRecorderRef.current= null;
}
if(streamRef.current){
  streamRef.current.getTracks().forEach((track)=>{
    track.stop();
  });
  streamRef.current= null;
}
if ( animationFrameRef.current !== null){
  cancelAnimationFrame(animationFrameRef.current);
  animationFrameRef.current = null;
}
if (silenceTimeRef.current !== null){
  window.clearTimeout(silenceTimeRef.current);
  silenceTimeRef.current = null;
}

if(audioContextRef.current){
  audioContextRef.current.close();
  audioContextRef.current = null;
}
analyserRef.current = null;
audioChunksRef.current = [];
speechDetectedRef.current = false;
};


return (
  <div
    className="
      fixed
      inset-0
      z-50
      flex
      items-center
      justify-center
      bg-black/60
    "
  >
    <div
      className="
        relative
        overflow-hidden
        bg-slate-950/80
        backdrop-blur-2xl
        border
        border-emerald-500/20
        rounded-[32px]
        shadow-2xl
        shadow-emerald-500/10
        w-[520px]
        h-[770px]
        px-10
        py-8
      "
    >

      {/* =========================
          FONDO
      ========================= */}

      <div
        className="
          absolute
          inset-0
          overflow-hidden
          pointer-events-none
        "
      >
        <div className="background-gradient"></div>
        <div className="background-grid"></div>
        <div className="background-noise"></div>
      </div>


      {/* =========================
          CERRAR
      ========================= */}

      <button
        onClick={onClose}
        className="
          absolute
          top-6
          right-6
          z-30
          w-10
          h-10
          rounded-full
          bg-white/5
          hover:bg-white/10
          transition
          flex
          items-center
          justify-center
          border
          border-white/10
          text-white
        "
      >
        <X size={18} />
      </button>


      {/* =========================
          CONTENIDO PRINCIPAL
      ========================= */}

      <div
        className="
          relative
          z-10
          h-full
          flex
          flex-col
          items-center
        "
      >


        {/* =========================
            HEADER
        ========================= */}

        <div
          className="
            flex
            flex-col
            items-center
            shrink-0
          "
        >

          <h1
            className="
              text-4xl
              font-bold
              text-white
            "
          >
            OlivIA
          </h1>

          <p
            className="
              mt-2
              text-emerald-400
              tracking-[0.25em]
              uppercase
              text-xs
            "
          >
            Voice Assistant
          </p>

        </div>


        {/* =========================
            AVATAR
        ========================= */}

        <div
          className="
            shrink-0
            mt-8
            h-[340px]
            flex
            items-center
            justify-center
          "
        >

          <AnimatedAvatar
            status={status}
            volume={VoiceLevel}
            assistantSpeaking={isSpeaking}
          />

        </div>


        {/* =========================
            ESTADO + TIEMPO
        ========================= */}

        <div
          className="
            shrink-0
            mt-2
            flex
            flex-col
            items-center
            gap-2
          "
        >

          <p
            className="
              text-emerald-400
              text-sm
              tracking-[0.15em]
              uppercase
              font-semibold
              min-h-[20px]
            "
          >
            {status === "idle" && "EN ESPERA"}

            {status === "listening" &&
              "ESCUCHANDO TU VOZ"}

            {status === "thinking" &&
              "PENSANDO..."}

            {status === "speaking" &&
              "HABLANDO..."}
          </p>

          <span
            className="
              text-3xl
              font-bold
              text-white
              font-mono
              tracking-wider
            "
          >
            {formatTime(callTime)}
          </span>

        </div>


        {/* =========================
            MENSAJES
        ========================= */}

        <div
          className="
            w-full
            max-w-sm
            mt-5
            h-[115px]
            shrink-0
            overflow-y-auto
            px-1
            space-y-4
          "
        >

          {/* Tú */}
          {userText && (
            <div className="flex justify-end">

              <div className="max-w-[85%] text-right">

                <p
                  className="
                    text-xs
                    text-emerald-400
                    mb-1
                    font-medium
                  "
                >
                  Tú
                </p>

                <div
                  className="
                    inline-block
                    bg-white/5
                    border
                    border-white/10
                    rounded-2xl
                    rounded-tr-sm
                    px-4
                    py-2.5
                    text-gray-200
                  "
                >
                  {userText}
                </div>

              </div>

            </div>
          )}


          {/* OlivIA */}
          {assistantText && (
            <div className="flex justify-start">

              <div className="max-w-[85%] text-left">

                <p
                  className="
                    text-xs
                    text-cyan-400
                    mb-1
                    font-medium
                  "
                >
                  OlivIA
                </p>

                <div
                  className="
                    inline-block
                    bg-cyan-500/5
                    border
                    border-cyan-400/10
                    rounded-2xl
                    rounded-tl-sm
                    px-4
                    py-2.5
                    text-gray-200
                  "
                >
                  {assistantText}
                </div>

              </div>

            </div>
          )}

        </div>


        {/* =========================
            CONTROLES
        ========================= */}

        <div
          className="
            mt-4
            mb-10
            flex
            items-center
            justify-center
            gap-5
            shrink-0
          "
        >

          {/* =====================
              MICRÓFONO
          ===================== */}

          <button
            onClick={toggleMute}
            className={`
              w-14
              h-14
              rounded-full
              flex
              items-center
              justify-center
              border
              transition-all
              duration-300


    voiceConversation.stop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    cleanupMediaStreams();
    onEndCall();
=======
              ${
                isMuted
                  ? `
                    bg-red-500/20
                    border-red-500/40
                    text-red-400
                    shadow-lg
                    shadow-red-500/10
                  `
                  : `
                    bg-white/5
                    border-white/10
                    text-white
                    hover:bg-white/10
                  `
              }
            `}
            title={
              isMuted
                ? "Activar micrófono"
                : "Silenciar micrófono"
            }
          >

            {isMuted ? (
              <MicOff size={21} />
            ) : (
              <Mic size={21} />
            )}


          </button>


          {/* =====================
              FINALIZAR
          ===================== */}

          <button
            onClick={() => {

              isMutedRef.current = false;

              setIsMuted(false);

              cleanupAudio();

              voiceConversation.stop();

              onEndCall();

            }}
            className="
              w-14
              h-14
              rounded-full
              flex
              items-center
              justify-center
              bg-red-600
              hover:bg-red-500
              text-white
              border
              border-red-400/30
              shadow-lg
              shadow-red-500/30
              transition-all
              duration-300
              hover:scale-105
              active:scale-95
            "
            title="Finalizar llamada"
          >

            <Phone
              size={21}
              strokeWidth={2.3}
            />

          </button>

        </div>

      </div>

    </div>
  </div>

