import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/layout/AppLayout";
import AuthPage from "./components/auth/AuthPage";
import ChatView from "./components/chat/ChatView";
import SettingsView from "./components/settings/SettingsView";
import AdminDashboard from "./components/admin/AdminDashboard";
import DocumentsView from "./components/documents/DocumentsView";
import SkillsView from "./components/skills/SkillsView";
import QADashboard from "./components/qa/QADashboard";
import InternalChatView from "./components/roomia/ChatView";
import OliviaAgentWidget from "./components/agents/OliviaWidget";
import CampaignsView from "./components/campaigns/CampaignsView";
import LandingPage from "./components/landing/LandingPage";
import { useAppStore } from "./store/appStore";
import { ReactNode } from "react";
import UpdatePassword from "./components/auth/UpdatePassword";
import ForgotPassword from "./components/auth/ForgotPassword";
const queryClient = new QueryClient();

// Wrapper que solo monta el widget flotante global cuando el usuario es Agente y fuera de /agent-widget
function GlobalWidget() {
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

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAppStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAppStore();
  const isAdmin = user?.role?.toLowerCase() === "admin";
  if (!isAdmin) return <Navigate to="/app/chat" replace />;
  return <>{children}</>;
}

function AdminOrQARoute({ children }: { children: ReactNode }) {
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

function NonAgentRoute({ children }: { children: ReactNode }) {
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

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAppStore();
  if (isAuthenticated) return <Navigate to="/app/chat" replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { isAuthenticated } = useAppStore();
  if (isAuthenticated) return <Navigate to="/app/chat" replace />;
  return <LandingPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            }
          />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="chat" replace />} />
            <Route path="chat" element={<ChatView />} />
            <Route path="group-chats" element={<InternalChatView />} />
            <Route path="documents" element={<DocumentsView />} />
            <Route
              path="skills"
              element={
                <NonAgentRoute>
                  <SkillsView />
                </NonAgentRoute>
              }
            />
            <Route path="settings" element={<SettingsView />} />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="campaigns"
              element={
                <AdminRoute>
                  <CampaignsView />
                </AdminRoute>
              }
            />
            <Route
              path="qa"
              element={
                <AdminOrQARoute>
                  <QADashboard />
                </AdminOrQARoute>
              }
            />
          </Route>
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route
            path="/agent-widget"
            element={
              <div className="h-screen w-screen bg-background overflow-hidden flex flex-col">
                <OliviaAgentWidget isStandalone={true} />
              </div>
            }
          />
          <Route path="*" element={<Navigate to="/app/chat" replace />} />
        </Routes>
        <GlobalWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
