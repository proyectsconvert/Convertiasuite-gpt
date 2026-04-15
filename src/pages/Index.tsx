import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import LandingPage from "@/components/landing/LandingPage";
import AuthPage from "@/components/auth/AuthPage";
import DashboardView from "@/components/dashboard/DashboardView";
import ChatView from "@/components/chat/ChatView";
import DocumentsView from "@/components/documents/DocumentsView";
import WebBuilderView from "@/components/webbuilder/WebBuilderView";
import PresentationsView from "@/components/presentations/PresentationsView";
import SearchView from "@/components/search/SearchView";
import SettingsView from "@/components/settings/SettingsView";

const viewMap: Record<string, React.ComponentType> = {
  dashboard: DashboardView,
  chat: ChatView,
  documents: DocumentsView,
  webbuilder: WebBuilderView,
  presentations: PresentationsView,
  search: SearchView,
  settings: SettingsView,
};

export default function Index() {
  const { setView } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    
    if (path === "/" || path === "") {
      setView("landing");
    } else if (path === "/login" || path === "/register") {
      setView("auth");
    } else if (path.startsWith("/app/")) {
      const viewName = path.replace("/app/", "") || "dashboard";
      if (viewMap[viewName]) {
        setView(viewName as any);
      }
    }
  }, [location.pathname, setView]);

  const path = location.pathname;
  
  if (path === "/" || path === "") {
    return <LandingPage />;
  }
  
  if (path === "/login" || path === "/register") {
    return <AuthPage />;
  }

  return <DashboardView />;
}