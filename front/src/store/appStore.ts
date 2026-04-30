import { create } from 'zustand';
import { SessionSummary, authApi } from '@/services/api';

export type AppView = 'landing' | 'auth' | 'chat' | 'settings';
export type AuthTab = 'login' | 'register';

export interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  plan: 'free' | 'pro' | 'enterprise';
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: { name: string; type: string }[];
  artifacts?: ChatArtifact[];
}

export interface ChatArtifact {
  id: string;
  title: string;
  type: 'code' | 'html' | 'markdown' | 'document';
  language?: string;
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: Date;
  updatedAt: Date;
  favorite?: boolean;
  folder?: string;
}

export const DEMO_USER: User = {
  id: 'demo-1',
  name: 'Carlos Mendoza',
  email: 'demo@convert-ia.com',
  company: 'Convert-IA Inc.',
  role: 'Product Manager',
  plan: 'pro',
};

interface AppState {
  view: AppView;
  authTab: AuthTab;
  sidebarOpen: boolean;
  chatSidebarOpen: boolean;
  darkMode: boolean;
  currentChatId: string | null;
  sessions: SessionSummary[];
  commandOpen: boolean;
  user: User | null;
  isAuthenticated: boolean;
  selectedModel: string;
  artifactsPanelOpen: boolean;
  activeArtifact: ChatArtifact | null;

  setView: (view: AppView) => void;
  setAuthTab: (tab: AuthTab) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleChatSidebar: () => void;
  setChatSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  setCurrentChatId: (id: string | null) => void;
  setSessions: (sessions: SessionSummary[]) => void;
  addSession: (session: SessionSummary) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  setCommandOpen: (open: boolean) => void;
  setSelectedModel: (model: string) => void;
  setArtifactsPanelOpen: (open: boolean) => void;
  setActiveArtifact: (artifact: ChatArtifact | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithDemo: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  (set) => ({
    view: 'landing',
    authTab: 'login',
    sidebarOpen: true,
    chatSidebarOpen: true,
    darkMode: false,
    currentChatId: null,
    sessions: [],
    commandOpen: false,
    user: null,
    isAuthenticated: false,
    selectedModel: 'qwen2.5:7b',
    artifactsPanelOpen: false,
    activeArtifact: null,

    setView: (view) => set({ view }),
    setAuthTab: (tab) => set({ authTab: tab }),
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    toggleChatSidebar: () => set((s) => ({ chatSidebarOpen: !s.chatSidebarOpen })),
    setChatSidebarOpen: (open) => set({ chatSidebarOpen: open }),
    toggleDarkMode: () => set((s) => {
      const next = !s.darkMode;
      document.documentElement.classList.toggle('dark', next);
      return { darkMode: next };
    }),
    setCurrentChatId: (id) => set({ currentChatId: id }),
    setSessions: (sessions) => set({ sessions }),
    addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
    deleteSession: (id) => set((s) => ({
      sessions: s.sessions.filter((c) => c.id !== id),
      currentChatId: s.currentChatId === id ? null : s.currentChatId,
    })),
    renameSession: (id, title) => set((s) => ({
      sessions: s.sessions.map((c) => c.id === id ? { ...c, title } : c),
    })),
    setCommandOpen: (open) => set({ commandOpen: open }),
    setSelectedModel: (model) => set({ selectedModel: model }),
    setArtifactsPanelOpen: (open) => set({ artifactsPanelOpen: open }),
    setActiveArtifact: (artifact) => set({ activeArtifact: artifact, artifactsPanelOpen: !!artifact }),
    login: async (email: string, password: string) => {
      try {
        const response = await authApi.login({ email, password });
        set({
          user: {
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            company: 'Convert-IA',
            role: response.user.role,
            plan: 'pro',
          },
          isAuthenticated: true,
          view: 'chat',
        });
        return true;
      } catch (e) {
        console.error('Login failed:', e);
        return false;
      }
    },
    loginWithDemo: () => {
      set({
        user: DEMO_USER,
        isAuthenticated: true,
        view: 'chat',
      });
    },
    logout: () => set({
      user: null,
      isAuthenticated: false,
      view: 'landing',
      sessions: [],
      currentChatId: null,
    }),
  })
);
