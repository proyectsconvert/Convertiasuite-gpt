import { hablar } from "@/services/voice";
import { motion} from "framer-motion";
import { X, Mic, Square } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { chatApi } from "@/services/api"
import { voiceConversation } from "@/services/voiceConversation";
import { set } from "date-fns";
import AnimatedAvatar  from "./AnimatedAvatar";
import { Value } from "@radix-ui/react-select";


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
  const [text, setText] = useState("");
  const[VoiceLevel, setVoiceLevel] = useState(0);
  const [assistantLevel, setAssistantLevel] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoMode] = useState(false);
  const [callTime, setCallTime]= useState(0);

const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const audioChunksRef = useRef<Blob[]>([]);
const streamRef = useRef<MediaStream |null>(null);
const audioContextRef = useRef<AudioContext | null>(null);
const analyserRef = useRef<AnalyserNode | null>(null);
const silenceTimeRef = useRef< number | null>(null);
const animationFrameRef = useRef<number | null>(null)
const speechDetectedRef =useRef(false);

   useEffect(()=>{
    if(
      voiceConversation.isConversationActive()&&
      !isSpeaking &&
      status ==="idle"
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
    startListening();
    return ()=>{
      voiceConversation.stop();

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
 const startListening = async ()=>{
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
    setText("Escuchando...")
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
      console.log("respuesta",response)
      setText(response.transcript);
      if(response.transcript.trim()){
        await voiceConversation.send(
          response.transcript
        )
      }

    }catch(error){
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
      clearTimeout(silenceTimeRef.current);
      silenceTimeRef.current=null;
    }

    audioContextRef.current.close();
    audioContextRef.current = null;
    analyserRef.current = null;
  };
  recorder.stop();
}

const detectarSilencio = ()=>{

  if(!analyserRef.current) return;

  const analyser = analyserRef.current;

  const data = new Uint8Array(analyser.fftSize);

  const revisar = ()=>{

    if (!voiceConversation.isConversationActive()){
      return;
    }

    analyser.getByteTimeDomainData(data);

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
          }, 700);
        
      }
    }else {
      if (silenceTimeRef.current){
        clearTimeout(silenceTimeRef.current);
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
  return (

<div className="
fixed
inset-0
z-50
flex
items-center
justify-center
bg-black/60
">

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
    h-[720px]
    flex
    flex-col
    items-center
    justify-between
    px-10
    py-8
    "
    >


        {/* Fondo futurista */}

        <div className="
        absolute
        inset-0
        overflow-hidden
        pointer-events-none
        ">

            <div className="background-gradient"></div>

            <div className="background-grid"></div>

            <div className="background-noise"></div>

        </div>



        {/* Botón cerrar */}

        <button
        onClick={onClose}
        className="
        absolute
        top-6
        right-6
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
        z-20
        "
        >

            <X size={18}/>

        </button>



        {/* Contenido central */}

        <div
        className="
        flex
        flex-col
        items-center
        justify-center
        flex-1
        z-10
        "
        >


            <AnimatedAvatar
                status={status}
                volume={VoiceLevel}
                assistantSpeaking={isSpeaking}
            />



            <div className="
            mt-10
            text-center
            ">


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




           <div className="call-info">

  <p>

    {status === "idle" && "Esperando..."}

    {status === "listening" && "● Escuchando tu voz"}

    {status === "thinking" && "◌ Procesando..."}

    {status === "speaking" && "◉ OlivIA respondiendo"}

</p>


<span>
{formatTime(callTime)}
</span>

</div>


            {
            text && (

                <p
                className="
                mt-5
                text-sm
                text-gray-300
                text-center
                max-w-sm
                "
                >

                    {text}

                </p>

            )
            }



        </div>


<br />


        {/* Botón finalizar llamada */}


        <div
        className="
        z-10
        pb-4
        "
        >

<button

onClick={()=>{

    voiceConversation.stop();

    onEndCall();

}}

className="end-call-button"

>

<div className="end-call-circle">

<Square
size={16}
fill="white"
/>

</div>


<div className="end-call-text">

<span>
Finalizar llamada
</span>

<small>
Cerrar asistente
</small>

</div>


</button>


        </div>



    </div>


</div>

);
}