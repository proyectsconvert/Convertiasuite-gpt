import { useAppStore } from '@/store/appStore';
import LandingPage from '@/components/landing/LandingPage';
import AuthPage from '@/components/auth/AuthPage';
import AppSidebar from '@/components/layout/AppSidebar';
import DashboardView from '@/components/dashboard/DashboardView';
import ChatView from '@/components/chat/ChatView';
import DocumentsView from '@/components/documents/DocumentsView';
import WebBuilderView from '@/components/webbuilder/WebBuilderView';
import PresentationsView from '@/components/presentations/PresentationsView';
import SearchView from '@/components/search/SearchView';
import SettingsView from '@/components/settings/SettingsView';
import CommandPalette from '@/components/command/CommandPalette';

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
  const { view } = useAppStore();

  if (view === 'landing') return <LandingPage />;
  if (view === 'auth') return <AuthPage />;

  const ViewComponent = viewMap[view] || DashboardView;

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <ViewComponent />
      </main>
      <CommandPalette />
    </div>
  );
}
