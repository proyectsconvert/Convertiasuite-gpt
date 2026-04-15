import { motion } from 'framer-motion';
import {
  MessageSquare, FileText, Globe, Presentation, Search, BarChart3,
  TrendingUp, Clock, Star, ArrowRight, Sparkles, Plus, Zap
} from 'lucide-react';
import { useAppStore, type AppView } from '@/store/appStore';
import { Button } from '@/components/ui/button';

const quickActions: { icon: typeof MessageSquare; label: string; desc: string; view: AppView; color: string }[] = [
  { icon: MessageSquare, label: 'Chat IA', desc: 'Conversar con IA', view: 'chat', color: 'bg-primary/10 text-primary' },
  { icon: FileText, label: 'Documentos', desc: 'Redactar con IA', view: 'documents', color: 'bg-success/10 text-success' },
  { icon: Globe, label: 'Web Builder', desc: 'Crear interfaces', view: 'webbuilder', color: 'bg-warning/10 text-warning' },
  { icon: Presentation, label: 'Presentaciones', desc: 'Crear slides', view: 'presentations', color: 'bg-accent/10 text-accent' },
  { icon: Search, label: 'Búsqueda', desc: 'Encontrar info', view: 'search', color: 'bg-primary/10 text-primary' },
  { icon: BarChart3, label: 'Análisis', desc: 'Analizar archivos', view: 'chat', color: 'bg-destructive/10 text-destructive' },
];

const stats = [
  { label: 'Chats este mes', value: '847', change: '+23%', icon: MessageSquare },
  { label: 'Documentos creados', value: '23', change: '+12%', icon: FileText },
  { label: 'Tokens utilizados', value: '1.2M', change: '+18%', icon: Zap },
  { label: 'Tiempo ahorrado', value: '48h', change: '+35%', icon: Clock },
];

export default function DashboardView() {
  const { setView, setCurrentChatId, chats, documents } = useAppStore();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Buenos días, Carlos 👋</h1>
          <p className="text-muted-foreground">¿En qué te puedo ayudar hoy?</p>
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {quickActions.map((a, i) => (
            <motion.button key={a.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setView(a.view)}
              className="surface-card p-4 text-center hover:shadow-card-hover transition-all duration-200 group">
              <div className={`w-10 h-10 rounded-xl ${a.color} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                <a.icon className="w-5 h-5" />
              </div>
              <div className="text-sm font-medium text-foreground">{a.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
            </motion.button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
              className="surface-card p-4">
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
              <button onClick={() => setView('chat')} className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todos <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {chats.slice(0, 5).map((c) => (
                <button key={c.id} onClick={() => { setCurrentChatId(c.id); setView('chat'); }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary transition-colors group text-left">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{c.title}</div>
                    <div className="text-xs text-muted-foreground">{c.model} · {c.updatedAt.toLocaleDateString('es')}</div>
                  </div>
                  {c.favorite && <Star className="w-3.5 h-3.5 text-warning flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Documentos recientes</h3>
              <button onClick={() => setView('documents')} className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todos <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {documents.map((d) => (
                <button key={d.id} onClick={() => setView('documents')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary transition-colors group text-left">
                  <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{d.title}</div>
                    <div className="text-xs text-muted-foreground capitalize">{d.template} · {d.updatedAt.toLocaleDateString('es')}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Quick start new doc */}
            <button onClick={() => setView('documents')}
              className="w-full mt-3 flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <Plus className="w-4 h-4" /> Nuevo documento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
