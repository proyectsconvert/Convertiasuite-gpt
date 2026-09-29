import { motion } from "framer-motion";
import { Send, Sparkles, User, MessageSquare, FileText, Presentation, Globe, Zap, Clock } from "lucide-react";
import { pa } from "./theme";
import { cn } from "@/lib/utils";

const chatMessages = [
  {
    role: "user",
    content: "¿Cuál es el status del proyecto de implementación con el cliente TechCorp?",
  },
  {
    role: "assistant",
    content: "Según el historial de conversaciones y documentos:\n\n• Avance: 78% completado\n• Última actualización: hace 2 días\n• Bloqueos: Pendiente aprobación de presupuesto\n\n¿Te gustaría que genere un resumen ejecutivo para el cliente?",
  },
];

const quickPrompts = [
  { 
    icon: MessageSquare, 
    label: "Análisis estratégico", 
    desc: "Consultas de negocio y datos",
    prompt: "Analiza el informe Q3 y dame insights clave"
  },
  { 
    icon: FileText, 
    label: "Documentos legales", 
    desc: "Contratos y acuerdos",
    prompt: "Redacta cláusula de confidencialidad"
  },
  { 
    icon: Presentation, 
    label: "Reuniones", 
    desc: "Actas y resúmenes",
    prompt: "Genera acta de reunión del equipo"
  },
  { 
    icon: Globe, 
    label: "Código rápido", 
    desc: "Snippets y funciones",
    prompt: "Crea función de autenticación JWT"
  },
];

export function VariantChat({ active }: { active: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={pa.badge}>Chat IA</span>
        <span className={cn("text-[10px] font-medium", pa.tSectionMeta)}>Múltiples modelos · Contexto integrado · Resultados instantáneos</span>
      </div>

      <motion.div 
        className={cn("overflow-hidden rounded-xl border", pa.card, "p-0")}
        initial={{ opacity: 0, y: 8 }} 
        animate={active ? { opacity: 1, y: 0 } : {}} 
        transition={{ duration: 0.5 }}
      >
        {/* Chat header */}
        <div className={cn("flex items-center justify-between border-b px-4 py-3", pa.panelHeader)}>
          <div className="flex items-center gap-2">
            <MessageSquare className={cn("h-4 w-4", pa.tAccent)} />
            <span className={cn("text-xs font-semibold", pa.tTitle)}>Chat con IA</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <Clock className="h-3 w-3" />
            <span>Hoy 10:32</span>
          </div>
        </div>

        {/* Chat messages */}
        <div className="p-4 space-y-4 max-h-[200px] overflow-y-auto">
          {chatMessages.map((msg, i) => (
            <motion.div 
              key={i} 
              className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "")}
              initial={{ opacity: 0, y: 8 }} 
              animate={active ? { opacity: 1, y: 0 } : {}} 
              transition={{ delay: 0.1 * i, duration: 0.4 }}
            >
              <div className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-gradient-to-br from-primary/20 to-accent/20 text-primary"
              )}>
                {msg.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </div>
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", 
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                  : "bg-slate-100 dark:bg-white/[0.05] text-slate-800 dark:text-emerald-50 rounded-tl-sm"
              )}>
                {msg.content.split('\n').map((line, j) => (
                  <p key={j} className={j > 0 ? "mt-2" : ""}>{line}</p>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Chat input */}
        <div className={cn("border-t p-4", pa.borderSubtle)}>
          <div className={cn("flex items-center gap-3 rounded-xl border px-4 py-3", pa.insetDark)}>
            <Zap className={cn("h-4 w-4 shrink-0", pa.tMuted)} />
            <span className={cn("flex-1 text-sm", pa.tMuted)}>Pregunta sobre tus proyectos, documentos o datos...</span>
            <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              <Send className="h-3 w-3" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick prompts */}
      <div className="grid grid-cols-2 gap-3">
        {quickPrompts.map((p, i) => (
          <motion.div
            key={p.label}
            className={cn(pa.card, pa.cardHover, "flex items-center gap-3 p-3 cursor-pointer")}
            initial={{ opacity: 0, y: 8 }}
            animate={active ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-primary">
              <p.icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("text-xs font-semibold truncate", pa.tStrong)}>{p.label}</p>
              <p className={cn("text-[10px] truncate", pa.tMuted)}>{p.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}