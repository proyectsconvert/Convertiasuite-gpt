import { useState, useEffect } from 'react';
import { Search, MessageSquare, Settings, ArrowRight, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useNavigate } from 'react-router-dom';

const actions = [
  { icon: MessageSquare, label: 'Nuevo chat', path: '/app/chat', shortcut: 'N' },
  { icon: Settings, label: 'Configuración', path: '/app/settings' },
];

export default function CommandPalette() {
  const { commandOpen, setCommandOpen, sessions, setCurrentChatId } = useAppStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset when command palette is closed or opened
  useEffect(() => {
    if (!commandOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [commandOpen]);

  // Handle global shortcuts and keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandOpen, setCommandOpen]);

  // Filter actions and sessions
  const filteredActions = actions.filter((a) =>
    a.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const listItems = [
    ...filteredActions.map((a) => ({ type: 'action' as const, item: a, id: `action-${a.label}` })),
    ...filteredSessions.map((s) => ({ type: 'session' as const, item: s, id: `session-${s.id}` })),
  ];

  // Keep selectedIndex in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Handle keyboard list navigation
  useEffect(() => {
    if (!commandOpen || listItems.length === 0) return;

    const navHandler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % listItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + listItems.length) % listItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = listItems[selectedIndex];
        if (selected) {
          if (selected.type === 'action') {
            if (selected.item.label === 'Nuevo chat') setCurrentChatId(null);
            navigate(selected.item.path);
          } else {
            setCurrentChatId(selected.item.id);
            navigate('/app/chat');
          }
          setCommandOpen(false);
        }
      }
    };

    window.addEventListener('keydown', navHandler);
    return () => window.removeEventListener('keydown', navHandler);
  }, [commandOpen, listItems, selectedIndex, navigate, setCurrentChatId, setCommandOpen]);

  if (!commandOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setCommandOpen(false)} />
      <div className="relative w-full max-w-lg bg-popover rounded-xl shadow-elevated border border-border overflow-hidden animate-fade-in">
        <div className="flex items-center gap-3 px-4 h-12 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar chats o acciones..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>
        <div className="p-2 max-h-80 overflow-y-auto">
          {listItems.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No se encontraron resultados
            </div>
          ) : (
            <>
              {filteredActions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1.5">Acciones</p>
                  {filteredActions.map((a, index) => {
                    const globalIndex = index;
                    const isSelected = selectedIndex === globalIndex;
                    return (
                      <button
                        key={a.label}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        onClick={() => {
                          if (a.label === 'Nuevo chat') setCurrentChatId(null);
                          navigate(a.path);
                          setCommandOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${
                          isSelected ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <a.icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{a.label}</span>
                        {a.shortcut && <span className="ml-auto text-xs text-muted-foreground font-mono bg-secondary px-1.5 py-0.5 rounded">{a.shortcut}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              {filteredSessions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase px-2 py-1.5">
                    {searchQuery ? 'Conversaciones encontradas' : 'Chats recientes'}
                  </p>
                  {filteredSessions.map((c, index) => {
                    const globalIndex = filteredActions.length + index;
                    const isSelected = selectedIndex === globalIndex;
                    return (
                      <button
                        key={c.id}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        onClick={() => {
                          setCurrentChatId(c.id);
                          navigate('/app/chat');
                          setCommandOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${
                          isSelected ? 'bg-secondary text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground truncate">{c.title}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100" />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
