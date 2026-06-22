import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ArtifactsPanel from "@/components/chat/ArtifactsPanel";
import { PanelLeft } from "lucide-react";

export default function AppLayout() {
  const { setView, chatSidebarOpen, toggleChatSidebar } = useAppStore();
  const { artifactsPanelOpen } = useAppStore();
  const location = useLocation();
  const isSettings = location.pathname.startsWith("/app/settings");

  useEffect(() => {
    const path = location.pathname.replace("/app/", "") || "chat";
    setView(path as any);
  }, [location, setView]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden md:flex-row">
      {isSettings ? (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Outlet />
        </div>
      ) : (
        <>
          {/* Mobile top bar - only visible on mobile when sidebar is closed */}
          <div className="flex items-center h-12 px-3 border-b border-border/40 flex-shrink-0 bg-background md:hidden">
            <button
              onClick={toggleChatSidebar}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
              aria-label="Abrir menú"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
            <span className="ml-2 text-sm font-medium text-foreground truncate">
              convert-IA
            </span>
          </div>

          {/* Desktop sidebar - always visible on md+ */}
          <div className="hidden md:flex">
            <ChatSidebar />
          </div>

          {/* Mobile sidebar drawer - only when open on mobile */}
          <div className="md:hidden">
            {chatSidebarOpen && <ChatSidebar />}
          </div>

          <main className="flex-1 flex min-w-0 flex-col overflow-hidden">
            <Outlet />
          </main>
          {artifactsPanelOpen && <ArtifactsPanel />}
        </>
      )}
    </div>
  );
}

