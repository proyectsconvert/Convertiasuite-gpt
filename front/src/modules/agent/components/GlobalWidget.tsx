import { useLocation } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import OliviaAgentWidget from "@/modules/agent/components/agents/OliviaWidget";

// Wrapper que solo monta el widget flotante global cuando el usuario es Agente y fuera de /agent-widget
export function GlobalWidget() {
  const location = useLocation();
  const { isAuthenticated, user } = useAppStore();
  
  if (!isAuthenticated || location.pathname === "/agent-widget") return null;

  const userRole = (user?.role || "").toLowerCase();
  const functionalRole = (user?.functional_role || "").toLowerCase();
  const isAgent =
    userRole === "agent" ||
    userRole === "agente" ||
    functionalRole.includes("agent") ||
    functionalRole.includes("agente");

  if (!isAgent) return null;

  return <OliviaAgentWidget />;
}
