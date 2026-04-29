import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatView from "@/components/chat/ChatView";

export default function ChatLayout() {
  return (
    <div className="h-full w-full flex overflow-hidden bg-background">
      <ChatSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <ChatView />
      </main>
    </div>
  );
}