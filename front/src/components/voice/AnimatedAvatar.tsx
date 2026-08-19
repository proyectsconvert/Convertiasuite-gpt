import { useAppStore } from "@/store/appStore";
import "./IaVoice.css";

interface AnimatedAvatarProps {
  status?: "idle" | "listening" | "thinking" | "speaking";
  volume?: number;
  assistantSpeaking?: boolean;
}

export default function AnimatedAvatar({
  status = "idle",
  volume = 0,
  assistantSpeaking = false
}: AnimatedAvatarProps) {
  const { darkMode } = useAppStore();

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
            status === "listening"
              ? `scale(${1 + volume / 80})`
              : undefined
        }}
      >
        <img 
          src="/favicon.ico" 
          className="w-26 h-26 object-contain z-20 select-none pointer-events-none" 
          alt="convert-IA" 
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


    </div>
  );
}