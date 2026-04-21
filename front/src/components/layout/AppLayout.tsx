import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import CommandPalette from "@/components/command/CommandPalette";
import ChatLayout from "@/components/chat/ChatLayout";
import SettingsView from "@/components/settings/SettingsView";

/**
 * AppLayout — Full-screen layout.
 * - /app/chat → Claude-style ChatLayout (sidebar + chat + artifacts)
 * - /app/settings → Settings page inside ChatLayout sidebar
 */
export default function AppLayout() {
  const { setView } = useAppStore();
  const location = useLocation();
  const isSettings = location.pathname.startsWith("/app/settings");

  useEffect(() => {
    const path = location.pathname.replace("/app/", "") || "chat";
    setView(path as any);
  }, [location, setView]);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {isSettings ? (
        <ChatLayout settingsMode>
          <SettingsView />
        </ChatLayout>
      ) : (
        <ChatLayout />
      )}
      <CommandPalette />
    </div>
  );
}