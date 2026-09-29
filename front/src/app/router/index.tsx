import { Navigate, useLocation } from "react-router-dom";
import AppLayout from "@/modules/shared/components/layout/AppLayout";
import AuthPage from "@/modules/shared/components/auth/AuthPage";
import ChatView from "@/modules/shared/components/chat/ChatView";
import SettingsView from "@/modules/shared/components/settings/SettingsView";
import AdminDashboard from "@/modules/admin/pages/admin/AdminDashboard";
import DocumentsView from "@/modules/shared/components/documents/DocumentsView";
import SkillsView from "@/modules/shared/components/skills/SkillsView";
import QADashboard from "@/modules/shared/components/qa/QADashboard";
import InternalChatView from "@/modules/shared/components/roomia/ChatView";
import OliviaAgentWidget from "@/modules/agent/components/agents/OliviaWidget";
import CampaignsView from "@/modules/admin/components/campaigns/CampaignsView";
import LandingPage from "@/modules/shared/components/landing/LandingPage";
import UpdatePassword from "@/modules/shared/components/auth/UpdatePassword";
import ForgotPassword from "@/modules/shared/components/auth/ForgotPassword";

import { useAppStore } from "@/store/appStore";
import {
  ProtectedRoute,
  AdminRoute,
  AdminOrQARoute,
  NonAgentRoute,
  PublicRoute,
} from "./guards/RouteGuards";

function RootRedirect() {
  const { isAuthenticated } = useAppStore();
  if (isAuthenticated) return <Navigate to="/app/chat" replace />;
  return <LandingPage />;
}

export const routes = [
  { path: "/", element: <RootRedirect /> },
  { path: "/login", element: <PublicRoute><AuthPage /></PublicRoute> },
  { path: "/register", element: <PublicRoute><AuthPage /></PublicRoute> },
  { path: "/update-password", element: <UpdatePassword /> },
  { path: "/forgot-password", element: <PublicRoute><ForgotPassword /></PublicRoute> },
  { path: "/agent-widget", element: <ProtectedRoute><OliviaAgentWidget /></ProtectedRoute> },
  {
    path: "/app",
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="chat" replace /> },
      { path: "chat", element: <ChatView /> },
      { path: "group-chats", element: <InternalChatView /> },
      { path: "documents", element: <DocumentsView /> },
      { path: "skills", element: <NonAgentRoute><SkillsView /></NonAgentRoute> },
      { path: "settings", element: <SettingsView /> },
      { path: "admin", element: <AdminRoute><AdminDashboard /></AdminRoute> },
      { path: "campaigns", element: <AdminOrQARoute><CampaignsView /></AdminOrQARoute> },
      { path: "qa", element: <AdminOrQARoute><QADashboard /></AdminOrQARoute> },
    ],
  },
];

// AppRouter will be a normal component rendering Routes internally using useRoutes 
// or mapping over the array.
import { useRoutes } from "react-router-dom";

export default function AppRouter() {
  const element = useRoutes(routes);
  return element;
}
