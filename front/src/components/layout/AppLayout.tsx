import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import ChatSidebar from "@/components/chat/ChatSidebar";

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
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Outlet />
        </div>
      ) : (
        <>
          <ChatSidebar />
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Outlet />
          </main>
        </>
      )}
    </div>
  );
}