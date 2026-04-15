import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAppStore, type AppView } from "@/store/appStore";
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

const validViews = new Set(Object.keys(viewMap));

function getAppViewFromPath(pathname: string): AppView {
  if (pathname === "/" || pathname === "") {
    return "landing";
  }

  if (pathname === "/login" || pathname === "/register") {
    return "auth";
  }

  if (pathname.startsWith("/app")) {
    const segment = pathname.replace(/^\/app\/?/, "").split("/")[0] || "dashboard";
    if (validViews.has(segment)) {
      return segment as AppView;
    }
    return "dashboard";
  }

  return "landing";
}

export default function Index() {
  const { setView } = useAppStore();
  const location = useLocation();
  const appView = getAppViewFromPath(location.pathname);

  useEffect(() => {
    setView(appView);
  }, [appView, setView]);

  if (appView === "landing") {
    return <LandingPage />;
  }

  if (appView === "auth") {
    return <AuthPage />;
  }

  const ViewComponent = viewMap[appView] || DashboardView;
  return <ViewComponent />;
}
