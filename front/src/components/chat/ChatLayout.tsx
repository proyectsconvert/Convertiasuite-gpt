import { AnimatePresence } from "framer-motion";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatView from "@/components/chat/ChatView";
import ArtifactsPanel from "@/components/chat/ArtifactsPanel";
import { useAppStore } from "@/store/appStore";

/**
 * ChatLayout — Claude-style full-width layout
 * Can render ChatView (default) or arbitrary children (settings mode)
 */
interface ChatLayoutProps {
  settingsMode?: boolean;
  children?: React.ReactNode;
}

export default function ChatLayout({ settingsMode, children }: ChatLayoutProps) {
  const { artifactsPanelOpen } = useAppStore();

  return (
    <div className="h-full w-full flex overflow-hidden bg-background">
      {/* Left: Chat sidebar (always present) */}
      <AnimatePresence mode="wait">
        <ChatSidebar />
      </AnimatePresence>

      {/* Center: Chat or settings content */}
      <main className="flex-1 flex flex-col min-w-0">
        {settingsMode && children ? children : <ChatView />}
      </main>

      {/* Right: Artifacts panel (only in chat mode) */}
      {!settingsMode && (
        <AnimatePresence>
          {artifactsPanelOpen && <ArtifactsPanel />}
        </AnimatePresence>
      )}
    </div>
  );
}
