import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeft,
  Trash2,
  Pencil,
  LogOut,
  Settings,
  Sun,
  Moon,
  Star,
  Shield,
  MessageSquare,
  Folder,
  SlidersHorizontal,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { chatApi } from "@/services/api";

function groupByDate(
  sessions: { id: string; title: string; updated_at: string }[],
) {
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
    chatSidebarOpen,
    toggleChatSidebar,
    sessions,
    currentChatId,
    setCurrentChatId,
    user,
    darkMode,
    toggleDarkMode,
    logout,
    deleteSession,
    renameSession,
    setSessions,
    appendSessions,
    setCommandOpen,
  } = useAppStore();

  const navigate = useNavigate();
  const location = useLocation();

  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<{
    updated_at: string;
    id: string;
  } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    if (user?.id) {
      chatApi
        .getSessions()
        .then((data) => {
          setSessions(data.sessions);
          setHasMore(data.has_more);
          setNextCursor(
            data.next_cursor_updated_at && data.next_cursor_id
              ? { updated_at: data.next_cursor_updated_at, id: data.next_cursor_id }
              : null,
          );
        })
        .catch(() => {});
    }
  }, [user?.id, setSessions]);

  // Load more (infinite scroll)
  const loadMore = useCallback(() => {
    if (!hasMore || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    chatApi
      .getSessions(nextCursor)
      .then((data) => {
        appendSessions(data.sessions);
        setHasMore(data.has_more);
        setNextCursor(
          data.next_cursor_updated_at && data.next_cursor_id
            ? { updated_at: data.next_cursor_updated_at, id: data.next_cursor_id }
            : null,
        );
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [hasMore, nextCursor, loadingMore, appendSessions]);

  // IntersectionObserver on sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "100px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const grouped = groupByDate(sessions);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpenId(null);
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

  const handleChatClick = useCallback(
    (chatId: string) => {
      setCurrentChatId(chatId);
      navigate("/app/chat");
    },
    [setCurrentChatId, navigate],
  );

  const handleRename = (id: string) => {
    if (editTitle.trim()) renameSession(id, editTitle.trim());
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (user?.id) {
      chatApi.deleteSession(id).catch(() => {});
    }
    deleteSession(id);
    setMenuOpenId(null);
  };

  const isChatActive = location.pathname === "/app/chat";
  const isDocActive = location.pathname.startsWith("/app/documents");
  const isSkillsActive = location.pathname.startsWith("/app/skills");
  const isSettingsActive = location.pathname.startsWith("/app/settings");
  const userInitial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <AnimatePresence>
        {chatSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={toggleChatSidebar}
          />
        )}
      </AnimatePresence>

      <div className="flex h-full max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40">
        {/* ─── PRIMARY NAV RAIL (THIN ICON BAR) ─── */}
        <aside className="w-[58px] h-full bg-sidebar/95 border-r border-sidebar-border/60 flex flex-col items-center justify-between py-3 flex-shrink-0 z-20">
          {/* Top Rail Actions */}
          <div className="flex flex-col items-center gap-3">
            {/* Original App Logo */}
            <button
              onClick={() => navigate("/app/chat")}
              className="p-0.5 rounded-xl hover:opacity-90 transition-transform active:scale-95 flex items-center justify-center"
              title="convert-IA"
            >
              <img
                src={darkMode ? "/favicon.ico" : "/logo-dark.ico"}
                className="w-9 h-9 rounded-xl object-contain"
                alt="convert-IA"
              />
            </button>

            {/* Sidebar Toggle */}
            <button
              onClick={toggleChatSidebar}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/70 transition-colors"
              title={chatSidebarOpen ? "Colapsar panel" : "Expandir panel"}
            >
              {chatSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeft className="w-4 h-4" />
              )}
            </button>

            <div className="w-6 h-[1px] bg-sidebar-border/40 my-0.5" />

            {/* Navigation Icons */}
            <button
              onClick={() => navigate("/app/chat")}
              className={`p-2.5 rounded-xl transition-all ${
                isChatActive
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              }`}
              title="Chats"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate("/app/documents")}
              className={`p-2.5 rounded-xl transition-all ${
                isDocActive
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              }`}
              title="Documentos"
            >
              <Folder className="w-4 h-4" />
            </button>


             <button
              onClick={() => navigate("/app/skills")}
              className={`p-2.5 rounded-xl transition-all ${
                isSkillsActive
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              }`}
              title="Skills"
            >
            <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Rail Actions */}
          <div className="flex flex-col items-center gap-2.5">
            <button
              onClick={() => navigate("/app/settings")}
              className={`p-2 rounded-xl transition-colors ${
                isSettingsActive
                  ? "text-primary bg-primary/15"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/70"
              }`}
              title="Configuración"
            >
              <Settings className="w-4.5 h-4.5" />
            </button>

            {/* User Avatar Circle */}
            <button
              onClick={() => navigate("/app/settings")}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1aeda1] to-[#bab8ff] text-slate-950 font-bold flex items-center justify-center text-xs shadow-md shadow-[#1aeda1]/20 hover:scale-105 transition-transform overflow-hidden"
              title={user?.name || user?.email || "Usuario"}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                userInitial
              )}
            </button>
          </div>
        </aside>

        {/* ─── EXPANDABLE CHAT HISTORY PANEL ─── */}
        <AnimatePresence initial={false}>
          {chatSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="h-full bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden flex-shrink-0 z-10"
            >
              {/* Header / New Chat + Search */}
              <div className="p-3.5 space-y-2.5 flex-shrink-0">
                {/* Vibrant Custom Gradient New Chat Button (#1aeda1 to #bab8ff) */}
                <button
                  onClick={handleNewChat}
                  className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-gradient-to-r from-[#1aeda1] to-[#bab8ff] text-slate-950 font-semibold text-xs tracking-wide shadow-md shadow-[#1aeda1]/20 hover:brightness-105 hover:shadow-lg hover:shadow-[#1aeda1]/30 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Nuevo chat</span>
                </button>

                {/* Search Bar Input Pill */}
                <button
                  onClick={() => setCommandOpen(true)}
                  className="w-full flex items-center gap-2 h-8 px-3 rounded-full bg-sidebar-accent/50 border border-sidebar-border/60 text-xs text-muted-foreground hover:bg-sidebar-accent transition-colors text-left"
                >
                  <Search className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate flex-1">Buscar...</span>
                  <span className="text-[10px] bg-secondary/80 px-1.5 py-0.2 rounded font-mono text-muted-foreground">
                    ⌘K
                  </span>
                </button>
              </div>

              {/* Chat Sessions History List */}
              <div className="flex-1 overflow-y-auto px-3 scrollbar-thin space-y-3">
                {grouped.length > 0 ? (
                  grouped.map((g) => (
                    <div key={g.label}>
                      <div className="text-[11px] text-muted-foreground/70 px-2 py-1 font-medium">
                        {g.label}
                      </div>
                      <div className="space-y-0.5 mt-0.5">
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
                                  className="w-full px-2.5 py-1 text-xs rounded-lg border border-primary bg-background text-foreground outline-none shadow-sm"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center group w-full min-w-0">
                                <button
                                  onClick={() => handleChatClick(c.id)}
                                  className={`flex-1 min-w-0 text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 ${
                                    currentChatId === c.id && isChatActive
                                      ? "bg-sidebar-accent text-foreground font-medium"
                                      : "text-muted-foreground/90 hover:bg-sidebar-accent/50 hover:text-foreground"
                                  }`}
                                >
                                  {c.favorite && (
                                    <Star className="w-3 h-3 text-warning flex-shrink-0 fill-warning" />
                                  )}
                                  <span className="truncate flex-1">
                                    {c.title}
                                  </span>
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpenId(
                                      menuOpenId === c.id ? null : c.id,
                                    );
                                  }}
                                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all flex-shrink-0 text-muted-foreground hover:text-foreground"
                                  aria-label="Opciones"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Dropdown Options Menu */}
                            <AnimatePresence>
                              {menuOpenId === c.id && (
                                <motion.div
                                  ref={menuRef}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  transition={{ duration: 0.1 }}
                                  className="absolute right-0 top-7 z-50 w-36 rounded-xl border border-border bg-popover p-1 shadow-lg"
                                >
                                  <button
                                    onClick={() => {
                                      setEditTitle(c.title);
                                      setEditingId(c.id);
                                      setMenuOpenId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-secondary transition-colors text-foreground"
                                  >
                                    <Pencil className="w-3 h-3" /> Renombrar
                                  </button>
                                  <button
                                    onClick={() => handleDelete(c.id)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
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
                    Sin conversaciones.
                    <br />
                    Crea un nuevo chat para comenzar.
                  </div>
                )}
                <div ref={sentinelRef} className="h-1" />
                {loadingMore && (
                  <div className="flex justify-center py-2">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Bottom User Info & Footer Actions */}
              <div className="px-3 py-2.5 border-t border-sidebar-border/60 flex-shrink-0 flex items-center gap-2">
                {/* User Avatar Circle */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1aeda1] to-[#bab8ff] text-slate-950 font-bold flex items-center justify-center text-[11px] flex-shrink-0 shadow-sm overflow-hidden">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    userInitial
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">
                    {user?.name || user?.email || "Usuario"}
                  </div>
                </div>

                {/* Dark Mode Toggle Button */}
                <button
                  onClick={toggleDarkMode}
                  className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Alternar tema"
                  title="Cambiar tema"
                >
                  {darkMode ? (
                    <Sun className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Moon className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Admin Panel Button */}
                {user?.role?.toLowerCase() === "admin" && (
                  <button
                    onClick={() => navigate("/app/admin")}
                    className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
                    title="Panel Admin"
                  >
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

