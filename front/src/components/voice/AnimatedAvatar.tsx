import "./IAVoice.css";

interface AnimatedAvatarProps {
  status?: "idle" | "listening" | "thinking" | "speaking";
volume?:number;
assistantSpeaking?:boolean;
}

export default function AnimatedAvatar({
  status = "idle",
  volume=0,
  assistantSpeaking=false
}: AnimatedAvatarProps) {
  return (
    <div className={`assistant-avatar 
    ${status}
    ${assistantSpeaking ? "assistant-speaking" : ""}
    `}>

      <div className="assistant-background"></div>

      <div className="nebula"></div>

      <div className="halo"></div>

      <div className="avatar-glow"></div>

      <div className="ring ia-ring ia-ring-1"></div>
      <div className="ring ia-ring ia-ring-2"></div>
      <div className="ring ia-ring ia-ring-3"></div>

      <div className="avatar-core"
      
      style={{
        transform:
        status==="listening"
        ? `scale(${1 + volume / 80})`
    : undefined
      }}
      
      
      >

        <img
          src="/02 simbolo-verde-blanco.png"
          alt="OlivIA"
        />

        <div className="energy-core"></div>

        <div className="glass-reflection"></div>

      </div>

      <div className="particles">

        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>

      </div>

      <div className="voice-wave">

        <span></span>
        <span></span>
        <span></span>

      </div>

      <div className="assistant-status">

        {status === "idle" && "EN ESPERA"}

        {status === "listening" && "ESCUCHANDO..."}

        {status === "thinking" && "PENSANDO..."}

        {status === "speaking" && "HABLANDO..."}

      </div>

    </div>
  );
}