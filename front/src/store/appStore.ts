import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppView = 
  | 'landing' 
  | 'auth' 
  | 'dashboard' 
  | 'chat' 
  | 'documents' 
  | 'webbuilder' 
  | 'presentations' 
  | 'search' 
  | 'settings';

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

export interface Document {
  id: string;
  title: string;
  content: string;
  template: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Presentation {
  id: string;
  title: string;
  template: string;
  slides: PresentationSlide[];
  createdAt: Date;
}

export interface PresentationSlide {
  id: string;
  title: string;
  content: string;
  layout: 'title' | 'content' | 'two-column' | 'image' | 'blank';
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
  darkMode: boolean;
  currentChatId: string | null;
  chats: ChatSession[];
  documents: Document[];
  presentations: Presentation[];
  commandOpen: boolean;
  user: User | null;
  isAuthenticated: boolean;
  
  setView: (view: AppView) => void;
  setAuthTab: (tab: AuthTab) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  setCurrentChatId: (id: string | null) => void;
  addChat: (chat: ChatSession) => void;
  updateChat: (id: string, updates: Partial<ChatSession>) => void;
  setCommandOpen: (open: boolean) => void;
  login: (email: string, password: string) => boolean;
  loginWithDemo: () => void;
  logout: () => void;
}

const mockChats: ChatSession[] = [];

const mockDocuments: Document[] = [
  { id: 'd1', title: 'Propuesta Comercial - TechCorp', content: '', template: 'proposal', createdAt: new Date(), updatedAt: new Date() },
  { id: 'd2', title: 'Informe Q1 2025', content: '', template: 'report', createdAt: new Date(Date.now() - 86400000 * 2), updatedAt: new Date(Date.now() - 86400000 * 2) },
  { id: 'd3', title: 'Acta reunión directiva', content: '', template: 'minutes', createdAt: new Date(Date.now() - 86400000 * 5), updatedAt: new Date(Date.now() - 86400000 * 5) },
];

const mockPresentations: Presentation[] = [
  { id: 'p1', title: 'Pitch Deck - Serie A', template: 'pitch', slides: [
    { id: 's1', title: 'convert-IA', content: 'Convierte ideas en resultados con IA', layout: 'title' },
    { id: 's2', title: 'El Problema', content: 'Las empresas pierden 40% de productividad en tareas repetitivas', layout: 'content' },
    { id: 's3', title: 'La Solución', content: 'Plataforma unificada de IA empresarial', layout: 'two-column' },
    { id: 's4', title: 'Tracción', content: '500+ empresas, $2.4M ARR, 180% crecimiento YoY', layout: 'content' },
  ], createdAt: new Date() },
  { id: 'p2', title: 'Reporte Trimestral Q1', template: 'report', slides: [
    { id: 's5', title: 'Resultados Q1 2025', content: '', layout: 'title' },
    { id: 's6', title: 'KPIs', content: '', layout: 'content' },
  ], createdAt: new Date(Date.now() - 86400000 * 3) },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'landing',
      authTab: 'login',
      sidebarOpen: true,
      darkMode: false,
      currentChatId: null,
      chats: mockChats,
      documents: mockDocuments,
      presentations: mockPresentations,
      commandOpen: false,
      user: null,
      isAuthenticated: false,

      setView: (view) => set({ view }),
      setAuthTab: (tab) => set({ authTab: tab }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleDarkMode: () => set((s) => {
        const next = !s.darkMode;
        document.documentElement.classList.toggle('dark', next);
        return { darkMode: next };
      }),
      setCurrentChatId: (id) => set({ currentChatId: id }),
      addChat: (chat) => set((s) => ({ chats: [chat, ...s.chats] })),
      updateChat: (id, updates) => set((s) => ({
        chats: s.chats.map((c) => c.id === id ? { ...c, ...updates } : c),
      })),
      setCommandOpen: (open) => set({ commandOpen: open }),
      login: (email: string, password: string) => {
        if (email && password.length >= 4) {
          set({ 
            user: { ...DEMO_USER, email }, 
            isAuthenticated: true, 
            view: 'dashboard' 
          });
          return true;
        }
        return false;
      },
      loginWithDemo: () => {
        set({ 
          user: DEMO_USER, 
          isAuthenticated: true, 
          view: 'dashboard' 
        });
      },
      logout: () => set({ 
        user: null, 
        isAuthenticated: false, 
        view: 'landing' 
      }),
    }),
    {
      name: 'convert-ia-storage',
      partialize: (state) => ({ 
        darkMode: state.darkMode,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle('dark', state.darkMode);
        }
      },
    }
  )
);
