import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, Search, MoreHorizontal, PanelLeftClose, PanelLeft,
  Trash2, Pencil, LogOut, Settings, User, Sun, Moon, Star,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { chatApi } from "@/services/api";

function groupByDate(sessions: { id: string; title: string; updated_at: string }[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const week = new Date(today.getTime() - 86_400_000 * 7);
  const month = new Date(today.getTime() - 86_400_000 * 30);

  const groups: { label: string; items: typeof sessions }[] = [
    { label: "Hoy", items: [] },
    { label: "Ayer", items: [] },
    { label: "Últimos 7 días", items: [] },
    { label: "Últimos 30 días", items: [] },
    { label: "Anteriores", items: [] },
  ];

  sessions.forEach((c) => {
    const d = new Date(c.updated_at);
    if (d >= today) groups[0].items.push(c);
    else if (d >= yesterday) groups[1].items.push(c);
    else if (d >= week) groups[2].items.push(c);
    else if (d >= month) groups[3].items.push(c);
    else groups[4].items.push(c);
  });

  return groups.filter((g) => g.items.length > 0);
}

export default function ChatSidebar() {
  const {
    chatSidebarOpen, toggleChatSidebar, sessions, currentChatId,
    setCurrentChatId, user, darkMode, toggleDarkMode, logout,
    deleteSession, renameSession, setSessions,
  } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) {
      chatApi.getSessions(user.id)
        .then((data) => setSessions(data.sessions))
        .catch(() => {});
    }
  }, [user?.id, setSessions]);

  const grouped = groupByDate(sessions);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpenId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  const handleNewChat = useCallback(() => {
    setCurrentChatId(null);
    navigate("/app/chat");
  }, [setCurrentChatId, navigate]);

  const handleChatClick = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
    navigate("/app/chat");
  }, [setCurrentChatId, navigate]);

  const handleRename = (id: string) => {
    if (editTitle.trim()) renameSession(id, editTitle.trim());
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (user?.id) {
      chatApi.deleteSession(user.id, id).catch(() => {});
    }
    deleteSession(id);
    setMenuOpenId(null);
  };

  /* ─── Collapsed ─── */
  if (!chatSidebarOpen) {
    return (
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 52, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
        className="h-full bg-sidebar border-r border-sidebar-border flex flex-col items-center py-3 gap-1.5"
      >
        <button onClick={toggleChatSidebar} className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors" aria-label="Expandir">
          <PanelLeft className="w-4 h-4 text-sidebar-foreground" />
        </button>
        <button onClick={handleNewChat} className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity" aria-label="Nuevo chat">
          <Plus className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        <button onClick={toggleDarkMode} className="p-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent transition-colors" aria-label="Tema">
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button onClick={() => navigate("/app/settings")} className="p-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent transition-colors" aria-label="Configuración">
          <Settings className="w-4 h-4" />
        </button>
      </motion.div>
    );
  }

  /* ─── Expanded ─── */
  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 260, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeInOut" }}
      className="h-full bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden"
      style={{ minWidth: 260, maxWidth: 260 }}
    >
      {/* Header */}
      <div className="h-13 px-3 flex items-center justify-between flex-shrink-0 border-b border-sidebar-border/50">
        <div className="flex items-center gap-2">
          <img src={darkMode ? "/favicon.ico" : "/logo-dark.ico"} className="w-9 h-9 rounded-xl" alt="convert-IA" />    
        </div>
        <button onClick={toggleChatSidebar} className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground" aria-label="Colapsar">
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* New chat + search */}
      <div className="px-2 py-2 space-y-1 flex-shrink-0">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 h-9 px-3 rounded-lg border border-border/40 text-sm text-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Plus className="w-4 h-4 text-muted-foreground" />
          <span>Nuevo chat</span>
        </button>
        <button
          onClick={() => useAppStore.getState().setCommandOpen(true)}
          className="w-full flex items-center gap-2 px-3 h-8 rounded-lg text-xs text-muted-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Buscar...</span>
          <span className="ml-auto text-[10px] bg-secondary/80 px-1.5 py-0.5 rounded font-mono">⌘K</span>
        </button>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto px-2 scrollbar-thin">
        {grouped.length > 0 ? (
          grouped.map((g) => (
            <div key={g.label} className="mb-2">
              <div className="text-[10px] text-muted-foreground/70 px-2 py-1 font-semibold uppercase tracking-wider">{g.label}</div>
              <div className="space-y-px">
                {g.items.map((c) => (
                  <div key={c.id} className="relative group">
                    {editingId === c.id ? (
                      <div className="px-1 py-0.5">
                        <input
                          ref={editRef}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleRename(c.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(c.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="w-full px-2 py-1 text-[13px] rounded border border-primary bg-background text-foreground outline-none"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleChatClick(c.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[13px] transition-all duration-100 flex items-center gap-1.5 ${
                          currentChatId === c.id && location.pathname === "/app/chat"
                            ? "bg-sidebar-accent text-foreground"
                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                        }`}
                      >
                        {c.favorite && <Star className="w-3 h-3 text-warning flex-shrink-0 fill-warning" />}
                        <span className="truncate flex-1">{c.title}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === c.id ? null : c.id); }}
                          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all flex-shrink-0"
                          aria-label="Opciones"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </button>
                    )}

                    <AnimatePresence>
                      {menuOpenId === c.id && (
                        <motion.div
                          ref={menuRef}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.1 }}
                          className="absolute right-0 top-7 z-50 w-36 rounded-lg border border-border bg-popover p-1 shadow-lg"
                        >
                          <button
                            onClick={() => { setEditTitle(c.title); setEditingId(c.id); setMenuOpenId(null); }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md hover:bg-secondary transition-colors text-foreground"
                          >
                            <Pencil className="w-3 h-3" /> Renombrar
                          </button>
                          <button
                          onClick={() => handleDelete(c.id)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md hover:bg-destructive/10 transition-colors text-destructive"
                        >
                          <Trash2 className="w-3 h-3" /> Eliminar
                        </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-xs text-muted-foreground/60 px-4">
            Sin conversaciones.<br />Crea un nuevo chat para comenzar.
          </div>
        )}
      </div>

      {/* User footer */}
      <div className="px-3 py-2.5 border-t border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-foreground truncate">{user?.name || "Usuario"}</div>
          </div>
          <button onClick={toggleDarkMode} className="p-1 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground" aria-label="Tema">
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => navigate("/app/settings")} className="p-1 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground" aria-label="Config">
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button onClick={logout} className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" aria-label="Salir">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
