import { useMemo } from "react";
import {
  FileText, Globe, MessageSquare, Presentation, Sparkles, ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";

const quickActions = [
  {
    label: "Generar propuesta comercial",
    description: "Documentos profesionales con IA",
    icon: FileText,
    color: "from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/15 hover:to-teal-500/15",
    iconColor: "text-emerald-500",
    prompt: "Genera una propuesta comercial profesional para un cliente potencial del sector fintech, incluyendo objetivos, alcance del servicio y pricing.",
  },
  {
    label: "Crear landing page",
    description: "Diseña páginas que conviertan",
    icon: Globe,
    color: "from-blue-500/10 to-cyan-500/10 hover:from-blue-500/15 hover:to-cyan-500/15",
    iconColor: "text-blue-500",
    prompt: "Diseña el contenido para una landing page de lanzamiento de producto SaaS, incluyendo hero, features, testimonials y CTA.",
  },
  {
    label: "Preparar presentación",
    description: "Guiones y slides de impacto",
    icon: Presentation,
    color: "from-violet-500/10 to-purple-500/10 hover:from-violet-500/15 hover:to-purple-500/15",
    iconColor: "text-violet-500",
    prompt: "Prepara un guion para una presentación de 15 minutos sobre resultados del Q1 para el comité ejecutivo.",
  },
  {
    label: "Analizar datos",
    description: "Insights de ventas y métricas",
    icon: MessageSquare,
    color: "from-amber-500/10 to-orange-500/10 hover:from-amber-500/15 hover:to-orange-500/15",
    iconColor: "text-amber-500",
    prompt: "Analiza el pipeline de ventas del trimestre pasado y genera insights sobre conversión, deal velocity y áreas de mejora.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

interface WelcomeScreenProps {
  onPromptSelect: (prompt: string) => void;
}

export default function WelcomeScreen({ onPromptSelect }: WelcomeScreenProps) {
  const { user } = useAppStore();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Usuario";

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex-1 flex flex-col items-center justify-center px-6"
    >
      <motion.div variants={item} className="mb-5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
          <img src="/favicon.ico" alt="convert-IA" className="w-7 h-7" />
        </div>
      </motion.div>

      <motion.h1 variants={item} className="text-3xl lg:text-4xl font-semibold text-foreground tracking-tight text-center">
        {greeting}, {firstName}
      </motion.h1>

      <motion.p variants={item} className="text-base text-muted-foreground mt-2 text-center">
        ¿En qué puedo ayudarte hoy?
      </motion.p>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-8 w-full max-w-[640px]">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => onPromptSelect(action.prompt)}
            className={`group text-left p-3.5 rounded-xl border border-border/30 bg-gradient-to-br ${action.color} transition-all duration-150 hover:border-border/60 hover:shadow-sm`}
          >
            <div className="flex items-start gap-2.5">
              <div className={`mt-0.5 ${action.iconColor}`}>
                <action.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-foreground">{action.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{action.description}</div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
            </div>
          </button>
        ))}
      </motion.div>
    </motion.div>
  );
}
