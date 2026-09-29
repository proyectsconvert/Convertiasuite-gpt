import { useMemo, useEffect, useState } from "react";
import { ArrowRight, FileText } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/appStore";
import { chatApi, QuickAction } from "@/services/api";

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
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActions = async () => {
      try {
        const res = await chatApi.getQuickActions();
        if (res.status === "success" && res.actions) {
          setActions(res.actions);
        }
      } catch (error) {
        console.error("Error fetching quick actions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchActions();
  }, []);

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
      className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 overflow-y-auto"
    >
      <motion.div variants={item} className="mb-5">
        <div className="w-14 h-14 flex items-center justify-center p-0.5 mx-auto">
            <img
              src="/logo-dark.ico"
              alt="convert-IA"
              className="w-full h-full object-contain block dark:hidden"
            />
            <img
              src="/favicon.ico"
              alt="convert-IA"
              className="w-full h-full object-contain hidden dark:block"
            />
          </div>
      </motion.div>

      <motion.h1 variants={item} className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground tracking-tight text-center">
        {greeting}, {firstName}
      </motion.h1>

      <motion.p variants={item} className="text-base text-muted-foreground mt-2 text-center">
        ¿En qué puedo ayudarte hoy?
      </motion.p>

      {!loading && actions.length > 0 && (
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-6 sm:mt-8 w-full max-w-[640px]">
          {actions.map((action) => {
            const IconComponent = (action.icon && (LucideIcons as any)[action.icon]) || FileText;
            const gradientColor = action.color || "from-secondary to-secondary hover:from-secondary hover:to-secondary";
            const iconColorClass = action.icon_color || "text-foreground";
            return (
              <button
                key={action.action_id || action.label}
                onClick={() => onPromptSelect(action.prompt)}
                className={`group text-left p-3.5 rounded-xl border border-border/30 bg-gradient-to-br ${gradientColor} transition-all duration-150 hover:border-border/60 hover:shadow-sm`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 ${iconColorClass}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-foreground">{action.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{action.description}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </div>
              </button>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}