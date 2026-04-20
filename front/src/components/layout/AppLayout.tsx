import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import AppSidebar from "@/components/layout/AppSidebar";
import CommandPalette from "@/components/command/CommandPalette";

export default function AppLayout() {
  const { setView } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  
  useEffect(() => {
    const path = location.pathname.replace("/app/", "") || "dashboard";
    setView(path as any);
  }, [location, setView]);

  const handleNavigate = (view: string) => {
    navigate(`/app/${view}`);
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <AppSidebar onNavigate={handleNavigate} />
      <main className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </main>
      <CommandPalette />
    </div>
  );
}