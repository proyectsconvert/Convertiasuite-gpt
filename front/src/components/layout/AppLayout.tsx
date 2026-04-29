import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import ChatLayout from "@/components/chat/ChatLayout";

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
      <ChatLayout />
    </div>
  );
}