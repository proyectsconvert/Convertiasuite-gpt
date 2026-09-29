import { Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/modules/shared/store/appStore";
import { ReactNode } from "react";

// ── Helpers ────────────────────────────────────────────────────────────────────

function useIsAgent() {
  const { user } = useAppStore();
  const userRole = (user?.role || "").toLowerCase();
  const funcRole = (user?.functional_role || "").toLowerCase();
  return (
    userRole === "agent" ||
    userRole === "agente" ||
    funcRole.includes("agent") ||
    funcRole.includes("agente")
  );
}

function useIsAdmin() {
  const { user } = useAppStore();
  return user?.role?.toLowerCase() === "admin";
}

function useIsAdminOrQA() {
  const { user } = useAppStore();
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const funcRole = (user?.functional_role || "").toLowerCase();
  const userRole = (user?.role || "").toLowerCase();
  const isQA =
    funcRole.includes("qa") ||
    funcRole.includes("calidad") ||
    funcRole.includes("quality") ||
    userRole.includes("qa") ||
    userRole.includes("quality");
  return isAdmin || isQA;
}

// ── Guards ─────────────────────────────────────────────────────────────────────

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAppStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return <Navigate to="/app/chat" replace />;
  return <>{children}</>;
}

export function AdminOrQARoute({ children }: { children: ReactNode }) {
  const isAdminOrQA = useIsAdminOrQA();
  if (!isAdminOrQA) return <Navigate to="/app/chat" replace />;
  return <>{children}</>;
}

export function NonAgentRoute({ children }: { children: ReactNode }) {
  const isAgent = useIsAgent();
  if (isAgent) return <Navigate to="/app/chat" replace />;
  return <>{children}</>;
}

export function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAppStore();
  if (isAuthenticated) return <Navigate to="/app/chat" replace />;
  return <>{children}</>;
}

// ── Widget Global (solo visible para agentes fuera de /agent-widget) ───────────
export function GlobalWidgetGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { isAuthenticated } = useAppStore();
  const isAgent = useIsAgent();

  if (!isAuthenticated || location.pathname === "/agent-widget" || !isAgent) {
    return null;
  }
  return <>{children}</>;
}
