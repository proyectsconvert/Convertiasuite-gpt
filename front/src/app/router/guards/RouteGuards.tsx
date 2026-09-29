import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAppStore } from "@/store/appStore";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAppStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAppStore();
  const isAdmin = user?.role?.toLowerCase() === "admin";
  if (!isAdmin) return <Navigate to="/app/chat" replace />;
  return <>{children}</>;
}

export function AdminOrQARoute({ children }: { children: ReactNode }) {
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
  
  if (!isAdmin && !isQA) return <Navigate to="/app/chat" replace />;
  return <>{children}</>;
}

export function NonAgentRoute({ children }: { children: ReactNode }) {
  const { user } = useAppStore();
  const userRole = (user?.role || "").toLowerCase();
  const funcRole = (user?.functional_role || "").toLowerCase();
  const isAgent =
    userRole === "agent" ||
    userRole === "agente" ||
    funcRole.includes("agent") ||
    funcRole.includes("agente");
    
  if (isAgent) return <Navigate to="/app/chat" replace />;
  return <>{children}</>;
}

export function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAppStore();
  if (isAuthenticated) return <Navigate to="/app/chat" replace />;
  return <>{children}</>;
}
