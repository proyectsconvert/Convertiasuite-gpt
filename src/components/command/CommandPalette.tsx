import { useEffect } from 'react';
import { Search, FileText, MessageSquare, Globe, Presentation, Settings, ArrowRight, Sparkles } from 'lucide-react';
import { useAppStore, type AppView } from '@/store/appStore';

const actions: { icon: typeof Search; label: string; view: AppView; shortcut?: string }[] = [
  { icon: MessageSquare, label: 'Nuevo chat', view: 'chat', shortcut: 'N' },
  { icon: FileText, label: 'Nuevo documento', view: 'documents', shortcut: 'D' },
  { icon: Presentation, label: 'Nueva presentación', view: 'presentations', shortcut: 'P' },
  { icon: Globe, label: 'Web Builder', view: 'webbuilder', shortcut: 'W' },
  { icon: Search, label: 'Búsqueda inteligente', view: 'search', shortcut: 'S' },
  { icon: Settings, label: 'Configuración', view: 'settings' },
];

export default function CommandPalette() {
  const { commandOpen, setCommandOpen, setView, chats } = useAppStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if (e.key === 'Escape') setCommandOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandOpen, setCommandOpen]);

  if (!commandOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setCommandOpen(false)} />
      <div className="relative w-full max-w-lg bg-popover rounded-xl shadow-elevated border border-border overflow-hidden animate-fade-in">
        <div className="flex items-center gap-3 px-4 h-12 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            placeholder="Buscar acciones, chats, documentos..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>
        <div className="p-2 max-h-80 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1.5">Acciones rápidas</p>
          {actions.map((a) => (
            <button key={a.label} onClick={() => { setView(a.view); setCommandOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors group">
              <a.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground">{a.label}</span>
              {a.shortcut && <span className="ml-auto text-xs text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">{a.shortcut}</span>}
            </button>
          ))}
          <p className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1.5 mt-2">Chats recientes</p>
          {chats.slice(0, 4).map((c) => (
            <button key={c.id} onClick={() => { useAppStore.getState().setCurrentChatId(c.id); setView('chat'); setCommandOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground truncate">{c.title}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
