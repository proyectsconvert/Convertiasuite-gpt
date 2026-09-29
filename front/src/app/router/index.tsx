import { Navigate, Route, Routes } from "react-router-dom";
import {
  ProtectedRoute,
  AdminRoute,
  AdminOrQARoute,
  NonAgentRoute,
  PublicRoute,
  GlobalWidgetGuard,
} from "./guards/RouteGuards";

// Pages / Views
import AuthPage from "@/modules/shared/components/auth/AuthPage";
import ForgotPassword from "@/modules/shared/components/auth/ForgotPassword";
import UpdatePassword from "@/modules/shared/components/auth/UpdatePassword";
import LandingPage from "@/modules/shared/components/landing/LandingPage";
import AppLayout from "@/modules/shared/components/layout/AppLayout";
import ChatView from "@/modules/shared/components/chat/ChatView";
import InternalChatView from "@/modules/shared/components/roomia/ChatView";
import DocumentsView from "@/modules/shared/components/documents/DocumentsView";
import SkillsView from "@/modules/shared/components/skills/SkillsView";
import SettingsView from "@/modules/shared/components/settings/SettingsView";
import AdminDashboard from "@/modules/admin/components/admin/AdminDashboard";
import CampaignsView from "@/modules/admin/components/campaigns/CampaignsView";
import QADashboard from "@/modules/admin/components/qa/QADashboard";
import OliviaAgentWidget from "@/modules/agent/components/agents/OliviaWidget";
import { useAppStore } from "@/modules/shared/store/appStore";

function RootRedirect() {
  const { isAuthenticated } = useAppStore();
  if (isAuthenticated) return <Navigate to="/app/chat" replace />;
  return <LandingPage />;
}

export function AppRouter() {
  return (
    <>
      <Routes>
        {/* Root */}
        <Route path="/" element={<RootRedirect />} />

        {/* Public */}
        <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><AuthPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* Agent widget standalone */}
        <Route
          path="/agent-widget"
          element={
            <div className="h-screen w-screen bg-background overflow-hidden flex flex-col">
              <OliviaAgentWidget isStandalone={true} />
            </div>
          }
        />

        {/* App (rutas protegidas con layout) */}
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
          <Route path="settings" element={<SettingsView />} />
          <Route
            path="skills"
            element={<NonAgentRoute><SkillsView /></NonAgentRoute>}
          />
          <Route
            path="admin"
            element={<AdminRoute><AdminDashboard /></AdminRoute>}
          />
          <Route
            path="campaigns"
            element={<AdminRoute><CampaignsView /></AdminRoute>}
          />
          <Route
            path="qa"
            element={<AdminOrQARoute><QADashboard /></AdminOrQARoute>}
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/app/chat" replace />} />
      </Routes>

      {/* Widget flotante global para agentes */}
      <GlobalWidgetGuard>
        <OliviaAgentWidget />
      </GlobalWidgetGuard>
    </>
  );
}
