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
  Brain,
  Boxes,
  Code2,
  Zap,
  BarChart3,
  MessageCircle,
  Megaphone,
  Bot,
  Award,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { chatApi } from "@/services/api";
import { toast } from "sonner";

function SidebarTooltip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative flex items-center justify-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, x: -6, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -6, scale: 0.95 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            /* LIQUID GLASS TOOLTIP */
            className="absolute left-full ml-3 z-50 px-3 py-1.5 text-[11px] font-medium text-foreground bg-white/10 dark:bg-black/30 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] whitespace-nowrap pointer-events-none"
          >
            {/* Reflejo de luz superior */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-t-xl" />
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  const [appsModalOpen, setAppsModalOpen] = useState(false);

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
    oliviaWidgetOpen,
    toggleOliviaWidget,
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
        .catch(() => { });
    }
  }, [user?.id, setSessions]);

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
      .catch(() => { })
      .finally(() => setLoadingMore(false));
  }, [hasMore, nextCursor, loadingMore, appendSessions]);

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

  const filteredSessions = sessions.filter(
    (s) =>
      !s.title?.toLowerCase().includes("olivia") &&
      !s.title?.toLowerCase().includes("asistente de campaña")
  );

  const grouped = groupByDate(filteredSessions);

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
      chatApi.deleteSession(id).catch(() => { });
    }
    deleteSession(id);
    setMenuOpenId(null);
  };

  const isChatActive = location.pathname === "/app/chat";
  const isDocActive = location.pathname.startsWith("/app/documents");
  const isSkillsActive = location.pathname.startsWith("/app/skills");
  const isGroupChatActive = location.pathname.startsWith("/app/group-chats");
  const isSettingsActive = location.pathname.startsWith("/app/settings");
  const isApplicationsActive = appsModalOpen;
  const userRole = (user?.role || "").toLowerCase();
  const functionalRole = (user?.functional_role || "").toLowerCase();
  const isAdmin = userRole === "admin";
  const isAgent =
    userRole === "agent" ||
    userRole === "agente" ||
    functionalRole.includes("agent") ||
    functionalRole.includes("agente");
  const isQA =
    !isAdmin &&
    (functionalRole.includes("qa") ||
      functionalRole.includes("calidad") ||
      functionalRole.includes("quality") ||
      userRole === "qa" ||
      userRole.includes("quality"));
  const canAccessRoleTools = isAdmin || isQA;
  const roleApps = [
    ...(isAdmin
      ? [
          {
            name: "Admin Dashboard",
            icon: Shield,
            url: "/app/admin",
            description: "Administración de la plataforma",
          },
          {
            name: "Gestión de Campañas",
            icon: Megaphone,
            url: "/app/campaigns",
            description: "Gestiona campañas y operaciones",
          },
        ]
      : []),
    ...(canAccessRoleTools
      ? [
          {
            name: "QA Dashboard",
            icon: Award,
            url: "/app/qa",
            description: "Panel de calidad y auditoría",
          },
        ]
      : []),
  ];
  const userInitial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <>
      <AnimatePresence>
        {chatSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-md md:hidden"
            onClick={toggleChatSidebar}
          />
        )}
      </AnimatePresence>

      <div className="flex h-full max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40">
        {/* ─── PRIMARY NAV RAIL (LIQUID GLASS FINISH) ─── */}
        <aside className="w-[58px] h-full bg-white/10 dark:bg-slate-950/20 backdrop-blur-2xl border-r border-white/20 dark:border-white/10 flex flex-col items-center justify-between py-3 flex-shrink-0 z-20 shadow-[4_0_24px_rgba(0,0,0,0.1)] relative">
          {/* Reflejo de luz lateral superior */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white/20 via-transparent to-transparent pointer-events-none" />

          {/* Top Rail Actions */}
          <div className="flex flex-col items-center gap-3 relative z-10">
            <SidebarTooltip text="convert-IA">
              <button
                onClick={() => navigate("/app/chat")}
                className="p-0.5 rounded-xl hover:scale-105 transition-all duration-300 active:scale-95 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
              >
                <img
                  src={darkMode ? "/favicon.ico" : "/logo-dark.ico"}
                  className="w-9 h-9 rounded-xl object-contain"
                  alt="convert-IA"
                />
              </button>
            </SidebarTooltip>

            <SidebarTooltip text={chatSidebarOpen ? "Colapsar panel" : "Expandir panel"}>
              <button
                onClick={toggleChatSidebar}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/15 dark:hover:bg-white/10 transition-all border border-transparent hover:border-white/20"
              >
                {chatSidebarOpen ? (
                  <PanelLeftClose className="w-4 h-4" />
                ) : (
                  <PanelLeft className="w-4 h-4" />
                )}
              </button>
            </SidebarTooltip>

            <div className="w-6 h-[1px] bg-gradient-to-r from-transparent via-white/30 dark:via-white/15 to-transparent my-0.5" />

            {/* Navigation Icons con acentos glass */}
            <SidebarTooltip text="Chats">
              <button
                onClick={() => navigate("/app/chat")}
                className={`p-2.5 rounded-xl transition-all ${isChatActive
                    ? "bg-primary/20 text-primary border border-primary/40 shadow-[0_0_15px_rgba(26,237,161,0.25)] backdrop-blur-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/15 dark:hover:bg-white/10 border border-transparent hover:border-white/15"
                  }`}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </SidebarTooltip>

            <SidebarTooltip text="Documentos">
              <button
                onClick={() => navigate("/app/documents")}
                className={`p-2.5 rounded-xl transition-all ${isDocActive
                    ? "bg-primary/20 text-primary border border-primary/40 shadow-[0_0_15px_rgba(26,237,161,0.25)] backdrop-blur-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/15 dark:hover:bg-white/10 border border-transparent hover:border-white/15"
                  }`}
              >
                <Folder className="w-4 h-4" />
              </button>
            </SidebarTooltip>

            {canAccessRoleTools && (
              <SidebarTooltip text="Dashboards">
                <button
                  onClick={() => setAppsModalOpen(true)}
                  className={`p-2.5 rounded-xl transition-all ${isApplicationsActive
                      ? "bg-primary/20 text-primary border border-primary/40 shadow-[0_0_15px_rgba(26,237,161,0.25)] backdrop-blur-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/15 dark:hover:bg-white/10 border border-transparent hover:border-white/15"
                    }`}
                  aria-label="Abrir dashboards"
                >
                  <Boxes className="w-4 h-4" />
                </button>
              </SidebarTooltip>
            )}

            {!isAgent && (
              <SidebarTooltip text="Skills">
                <button
                  onClick={() => navigate("/app/skills")}
                  className={`p-2.5 rounded-xl transition-all ${isSkillsActive
                      ? "bg-primary/20 text-primary border border-primary/40 shadow-[0_0_15px_rgba(26,237,161,0.25)] backdrop-blur-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/15 dark:hover:bg-white/10 border border-transparent hover:border-white/15"
                    }`}
                >
                  <Brain className="w-4 h-4" />
                </button>
              </SidebarTooltip>
            )}

            <SidebarTooltip text="Chat Grupal">
              <button
                onClick={() => navigate("/app/group-chats")}
                className={`p-2.5 rounded-xl transition-all ${isGroupChatActive
                    ? "bg-primary/20 text-primary border border-primary/40 shadow-[0_0_15px_rgba(26,237,161,0.25)] backdrop-blur-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/15 dark:hover:bg-white/10 border border-transparent hover:border-white/15"
                  }`}
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </SidebarTooltip>
            
          </div>

          {/* Bottom Rail Actions */}
          <div className="flex flex-col items-center gap-2.5 relative z-10">
            <SidebarTooltip text="Configuración">
              <button
                onClick={() => navigate("/app/settings")}
                className={`p-2 rounded-xl transition-all ${isSettingsActive
                    ? "text-primary bg-primary/20 border border-primary/40 shadow-[0_0_15px_rgba(26,237,161,0.25)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/15 dark:hover:bg-white/10 border border-transparent hover:border-white/15"
                  }`}
              >
                <Settings className="w-4.5 h-4.5" />
              </button>
            </SidebarTooltip>

            <SidebarTooltip text={user?.name || user?.email || "Usuario"}>
              <button
                onClick={() => navigate("/app/settings")}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1aeda1] to-[#bab8ff] text-slate-950 font-bold flex items-center justify-center text-xs shadow-[0_4px_16px_rgba(26,237,161,0.3)] hover:scale-105 transition-all overflow-hidden border border-white/30"
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
            </SidebarTooltip>
          </div>
        </aside>

        {/* ─── EXPANDABLE CHAT HISTORY PANEL (LIQUID GLASS PANEL) ─── */}
        <AnimatePresence initial={false}>
          {chatSidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="h-full bg-white/5 dark:bg-slate-950/30 backdrop-blur-2xl border-r border-white/20 dark:border-white/10 flex flex-col overflow-hidden flex-shrink-0 z-10 relative"
            >
              {/* Header / New Chat + Search */}
              <div className="p-3.5 space-y-2.5 flex-shrink-0">
                <button
                  onClick={handleNewChat}
                  className="relative group w-full flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-gradient-to-r from-[#1aeda1] to-[#bab8ff] text-slate-950 font-semibold text-xs tracking-wide shadow-[0_4px_20px_rgba(26,237,161,0.25)] hover:shadow-[0_6px_24px_rgba(26,237,161,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Nuevo chat</span>
                </button>

                <button
                  onClick={() => setCommandOpen(true)}
                  className="w-full flex items-center gap-2 h-8 px-3 rounded-full bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 text-xs text-muted-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-all text-left backdrop-blur-md"
                >
                  <Search className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate flex-1">Buscar...</span>
                  <span className="text-[10px] bg-white/20 dark:bg-white/10 px-1.5 py-0.2 rounded font-mono text-muted-foreground border border-white/10">
                    ⌘K
                  </span>
                </button>
              </div>

              {/* Chat Sessions History List */}
              <div className="flex-1 overflow-y-auto px-3 scrollbar-thin space-y-3">
                {grouped.length > 0 ? (
                  grouped.map((g) => (
                    <div key={g.label}>
                      <div className="text-[11px] text-muted-foreground/70 px-2 py-1 font-medium uppercase tracking-wider">
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
                                  className="w-full px-2.5 py-1 text-xs rounded-xl border border-primary/50 bg-white/20 dark:bg-black/40 backdrop-blur-md text-foreground outline-none shadow-sm"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center group w-full min-w-0">
                                <button
                                  onClick={() => handleChatClick(c.id)}
                                  className={`flex-1 min-w-0 text-left px-2.5 py-1.5 rounded-xl text-xs transition-all flex items-center gap-2 border ${currentChatId === c.id && isChatActive
                                      ? "bg-white/20 dark:bg-white/10 border-white/30 dark:border-white/20 text-foreground font-medium shadow-sm backdrop-blur-md"
                                      : "border-transparent text-muted-foreground/90 hover:bg-white/10 dark:hover:bg-white/5 hover:border-white/10 hover:text-foreground"
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
                                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/20 dark:hover:bg-white/10 transition-all flex-shrink-0 text-muted-foreground hover:text-foreground"
                                  aria-label="Opciones"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Options Dropdown - Liquid Glass */}
                            <AnimatePresence>
                              {menuOpenId === c.id && (
                                <motion.div
                                  ref={menuRef}
                                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                  transition={{ duration: 0.1 }}
                                  className="absolute right-0 top-7 z-50 w-36 rounded-2xl border border-white/30 dark:border-white/15 bg-white/30 dark:bg-slate-900/40 backdrop-blur-2xl p-1 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]"
                                >
                                  <button
                                    onClick={() => {
                                      setEditTitle(c.title);
                                      setEditingId(c.id);
                                      setMenuOpenId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-xl hover:bg-white/20 dark:hover:bg-white/10 transition-colors text-foreground"
                                  >
                                    <Pencil className="w-3 h-3" /> Renombrar
                                  </button>
                                  <button
                                    onClick={() => handleDelete(c.id)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-xl hover:bg-red-500/20 transition-colors text-red-500 dark:text-red-400"
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
              <div className="px-3 py-2.5 border-t border-white/20 dark:border-white/10 flex-shrink-0 flex items-center gap-2 bg-white/5 dark:bg-black/10 backdrop-blur-md">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1aeda1] to-[#bab8ff] text-slate-950 font-bold flex items-center justify-center text-[11px] flex-shrink-0 shadow-sm overflow-hidden border border-white/30">
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

                <button
                  onClick={toggleDarkMode}
                  className="p-1.5 rounded-xl hover:bg-white/15 dark:hover:bg-white/10 transition-all border border-transparent hover:border-white/15 text-muted-foreground hover:text-foreground"
                  aria-label="Alternar tema"
                  title="Cambiar tema"
                >
                  {darkMode ? (
                    <Sun className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Moon className="w-3.5 h-3.5" />
                  )}
                </button>


                <button
                  onClick={logout}
                  className="p-1.5 rounded-xl hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ─── MODAL DE MÁS APLICACIONES (ULTRA LIQUID GLASS MODAL) ─── */}
        <AnimatePresence>
          {canAccessRoleTools && appsModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop con desfoque fluido */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setAppsModalOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-xl"
              />

              {/* Contenedor Cristal Líquido */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative w-full max-w-xl rounded-3xl border border-white/30 dark:border-white/15 bg-white/20 dark:bg-slate-950/40 p-6 shadow-[0_16px_48px_0_rgba(0,0,0,0.35)] backdrop-blur-2xl z-10 overflow-hidden"
              >
                {/* Destello de luz superior en diagonal */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/20 dark:bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />

                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/20 dark:border-white/10 relative z-10">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      Ecosistema de Aplicaciones
                    </h3>
                    <p className="text-xs font-semibold text-foreground">
                      Selecciona una herramienta para acceder
                    </p>
                  </div>
                  <button
                    onClick={() => setAppsModalOpen(false)}
                    className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/20 dark:hover:bg-white/10 transition-colors border border-transparent hover:border-white/20"
                  >
                    ✕
                  </button>
                </div>

                {/* Grid con tarjetas glass adaptativas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
                  {roleApps.map((app) => {
                    const AppIcon = app.icon;
                    return (
                      <button
                        key={app.name}
                        onClick={() => {
                          setAppsModalOpen(false);
                          if (app.url) {
                            navigate(app.url);
                          } else {
                            toast.info(`${app.name} estará disponible próximamente`);
                          }
                        }}
                        className={`group relative flex items-start gap-3.5 p-3.5 rounded-2xl border backdrop-blur-xl transition-all duration-300 text-left hover:scale-[1.02] shadow-[0_4px_16px_rgba(0,0,0,0.1)] ${app.cardStyle}`}
                      >
                        <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-105 flex-shrink-0 backdrop-blur-md ${app.iconStyle}`}>
                          <AppIcon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-xs font-bold text-foreground">
                              {app.name}
                            </span>
                            {app.badge && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/20 dark:bg-black/30 text-muted-foreground border border-white/20 dark:border-white/10 flex-shrink-0">
                                {app.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                            {app.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}