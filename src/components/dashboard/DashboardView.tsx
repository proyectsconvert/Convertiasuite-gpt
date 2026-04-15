import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, FileText, Globe, Presentation, Search, BarChart3,
  TrendingUp, Clock, Star, ArrowRight, Plus, Zap, ChevronRight, Sparkles
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";

const quickActions = [
  { icon: MessageSquare, label: "Chat IA", desc: "Conversar con IA", view: "chat", gradient: "from-blue-500/10 to-blue-500/5", iconColor: "text-blue-600 dark:text-blue-400" },
  { icon: FileText, label: "Documentos", desc: "Redactar con IA", view: "documents", gradient: "from-emerald-500/10 to-emerald-500/5", iconColor: "text-emerald-600 dark:text-emerald-400" },
  { icon: Globe, label: "Web Builder", desc: "Crear interfaces", view: "webbuilder", gradient: "from-amber-500/10 to-amber-500/5", iconColor: "text-amber-600 dark:text-amber-400" },
  { icon: Presentation, label: "Presentaciones", desc: "Crear slides", view: "presentations", gradient: "from-purple-500/10 to-purple-500/5", iconColor: "text-purple-600 dark:text-purple-400" },
  { icon: Search, label: "Búsqueda", desc: "Encontrar info", view: "search", gradient: "from-cyan-500/10 to-cyan-500/5", iconColor: "text-cyan-600 dark:text-cyan-400" },
  { icon: BarChart3, label: "Análisis", desc: "Analizar archivos", view: "chat", gradient: "from-rose-500/10 to-rose-500/5", iconColor: "text-rose-600 dark:text-rose-400" },
];

const stats = [
  { label: "Chats este mes", value: "847", change: "+23%", icon: MessageSquare },
  { label: "Documentos creados", value: "23", change: "+12%", icon: FileText },
  { label: "Tokens utilizados", value: "1.2M", change: "+18%", icon: Zap },
  { label: "Tiempo ahorrado", value: "48h", change: "+35%", icon: Clock },
];

export default function DashboardView() {
  const { setCurrentChatId, chats, documents, user, darkMode, toggleDarkMode } = useAppStore();
  const navigate = useNavigate();

  const handleNavigate = (view: string) => navigate(`/app/${view}`);
  const handleChatClick = (chatId: string) => {
    setCurrentChatId(chatId);
    navigate("/app/chat");
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">
                Buenos días, {user?.name?.split(" ")[0] || "Carlos"} 👋
              </h1>
              <p className="text-muted-foreground">¿En qué te puedo ayudar hoy?</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </motion.div>

        {/* Quick actions */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Acciones rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickActions.map((a, i) => (
              <motion.button
                key={a.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleNavigate(a.view)}
                className="surface-card p-4 text-center hover:shadow-lg transition-all duration-200 group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.gradient} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                  <a.icon className={`w-5 h-5 ${a.iconColor}`} />
                </div>
                <div className="text-sm font-medium text-foreground">{a.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="surface-card p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <s.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-success flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> {s.change}
                </span>
              </div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Recent activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="surface-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Chats recientes</h3>
              <button onClick={() => handleNavigate("chat")} className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todos <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {chats.slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleChatClick(c.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/80 transition-colors group text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{c.title}</div>
                    <div className="text-xs text-muted-foreground">{c.model} · {c.updatedAt.toLocaleDateString("es")}</div>
                  </div>
                  {c.favorite && <Star className="w-3.5 h-3.5 text-warning flex-shrink-0 fill-warning" />}
                </button>
              ))}
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Documentos recientes</h3>
              <button onClick={() => handleNavigate("documents")} className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todos <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {documents.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleNavigate("documents")}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/80 transition-colors group text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{d.title}</div>
                    <div className="text-xs text-muted-foreground capitalize">{d.template} · {d.updatedAt.toLocaleDateString("es")}</div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => handleNavigate("documents")}
              className="w-full mt-3 flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 border-dashed border-border hover:border-primary/30 hover:bg-primary/5 transition-colors text-sm text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-4 h-4" /> Nuevo documento
            </button>
          </div>
        </div>

        {/* Promotional banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 surface-elevated p-6 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">Potencia tu productividad</h3>
                <p className="text-muted-foreground text-sm">Accede a modelos avanzados y plantillas premium con el plan Pro</p>
              </div>
            </div>
            <Button onClick={() => handleNavigate("settings")} className="btn-primary-gradient">
              Mejorar plan <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}