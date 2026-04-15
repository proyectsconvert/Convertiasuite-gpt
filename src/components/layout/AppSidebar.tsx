import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  MessageSquare, Plus, Search, Star, ChevronDown, ChevronRight, Sparkles, MoreHorizontal,
  Globe, LogOut, PanelLeftClose, PanelLeft, Sun, Moon, Settings, User, FileText, Presentation
} from "lucide-react";
import { useAppStore, type AppView } from "@/store/appStore";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  onNavigate?: (view: string) => void;
}

const mainNav: { icon: typeof MessageSquare; label: string; view: AppView; path: string }[] = [
  { icon: MessageSquare, label: "Chat IA", view: "chat", path: "/app/chat" },
  { icon: FileText, label: "Documentos", view: "documents", path: "/app/documents" },
  { icon: Globe, label: "Web Builder", view: "webbuilder", path: "/app/webbuilder" },
  { icon: Presentation, label: "Presentaciones", view: "presentations", path: "/app/presentations" },
  { icon: Search, label: "Búsqueda", view: "search", path: "/app/search" },
];

function groupByDate(chats: { id: string; title: string; updatedAt: Date; favorite?: boolean }[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const week = new Date(today.getTime() - 86400000 * 7);

  const groups: { label: string; items: typeof chats }[] = [
    { label: "Hoy", items: [] },
    { label: "Ayer", items: [] },
    { label: "Últimos 7 días", items: [] },
    { label: "Anteriores", items: [] },
  ];

  chats.forEach((c) => {
    const d = new Date(c.updatedAt);
    if (d >= today) groups[0].items.push(c);
    else if (d >= yesterday) groups[1].items.push(c);
    else if (d >= week) groups[2].items.push(c);
    else groups[3].items.push(c);
  });

  return groups.filter((g) => g.items.length > 0);
}

export default function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { view, setView, sidebarOpen, toggleSidebar, chats, currentChatId, setCurrentChatId, user, darkMode, toggleDarkMode, logout } = useAppStore();
  const [historyOpen, setHistoryOpen] = useState(true);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const grouped = groupByDate(chats);
  const favorites = chats.filter((c) => c.favorite);

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.(path.replace("/app/", ""));
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    handleNavigate("/app/chat");
  };

  const handleChatClick = (chatId: string) => {
    setCurrentChatId(chatId);
    handleNavigate("/app/chat");
  };

  if (!sidebarOpen) {
    return (
      <div className="w-14 bg-sidebar border-r border-sidebar-border flex flex-col items-center py-4 gap-2">
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors mb-2">
          <PanelLeft className="w-4 h-4 text-sidebar-foreground" />
        </button>
        <button onClick={handleNewChat} className="p-2 rounded-lg bg-primary text-primary-foreground">
          <Plus className="w-4 h-4" />
        </button>
        <div className="w-6 h-px bg-sidebar-border my-2" />
        {mainNav.map((n) => (
          <button
            key={n.view}
            onClick={() => handleNavigate(n.path)}
            className={`p-2 rounded-lg transition-colors ${
              location.pathname === n.path
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-muted-foreground hover:bg-sidebar-accent"
            }`}
          >
            <n.icon className="w-4 h-4" />
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button onClick={() => handleNavigate("/app/settings")} className="p-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 bg-sidebar border-r border-sidebar-border flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground text-sm">convert-IA</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDarkMode}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
            title={darkMode ? "Modo claro" : "Modo oscuro"}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors">
            <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* New chat */}
      <div className="px-3 mb-2">
        <Button onClick={handleNewChat} className="w-full justify-start gap-2 h-9 btn-primary-gradient text-sm">
          <Plus className="w-4 h-4" /> Nuevo chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 mb-3">
        <button
          onClick={() => useAppStore.getState().setCommandOpen(true)}
          className="w-full flex items-center gap-2 px-3 h-9 rounded-lg border border-border bg-background text-sm text-muted-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Buscar...</span>
          <span className="ml-auto text-xs bg-secondary px-1.5 py-0.5 rounded font-mono">⌘K</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="px-3 mb-3 space-y-0.5">
        {mainNav.map((n) => (
          <button
            key={n.view}
            onClick={() => handleNavigate(n.path)}
            className={`w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm transition-colors ${
              location.pathname === n.path
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            }`}
          >
            <n.icon className="w-4 h-4" />
            {n.label}
          </button>
        ))}
      </div>

      <div className="h-px bg-sidebar-border mx-3 mb-3" />

      {/* Favorites */}
      {favorites.length > 0 && (
        <div className="px-3 mb-2">
          <button
            onClick={() => setFavoritesOpen(!favoritesOpen)}
            className="w-full flex items-center gap-2 px-1 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
          >
            {favoritesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Star className="w-3 h-3" /> Favoritos
          </button>
          {favoritesOpen && (
            <div className="mt-1 space-y-0.5">
              {favorites.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleChatClick(c.id)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-sm truncate transition-colors ${
                    currentChatId === c.id && location.pathname === "/app/chat"
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-3">
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          className="w-full flex items-center gap-2 px-1 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors mb-1"
        >
          {historyOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Historial
        </button>
        {historyOpen && grouped.map((g) => (
          <div key={g.label} className="mb-3">
            <div className="text-xs text-muted-foreground px-1 py-1 font-medium">{g.label}</div>
            <div className="space-y-0.5">
              {g.items.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleChatClick(c.id)}
                  className={`group w-full text-left px-3 py-1.5 rounded-lg text-sm truncate transition-colors flex items-center ${
                    currentChatId === c.id && location.pathname === "/app/chat"
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <span className="truncate flex-1">{c.title}</span>
                  <MoreHorizontal className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 flex-shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{user?.name || "Usuario"}</div>
            <div className="text-xs text-muted-foreground truncate capitalize">{user?.plan || "Free"} Plan</div>
          </div>
          <button
            onClick={() => handleNavigate("/app/settings")}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}