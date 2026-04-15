import { create } from 'zustand';

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
  
  setView: (view: AppView) => void;
  setAuthTab: (tab: AuthTab) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  setCurrentChatId: (id: string | null) => void;
  addChat: (chat: ChatSession) => void;
  updateChat: (id: string, updates: Partial<ChatSession>) => void;
  setCommandOpen: (open: boolean) => void;
}

const mockChats: ChatSession[] = [
  {
    id: '1',
    title: 'Estrategia de marketing Q2 2025',
    model: 'GPT-5',
    favorite: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [
      { id: 'm1', role: 'user', content: 'Necesito una estrategia de marketing digital para el segundo trimestre. Nuestro presupuesto es de $50,000 USD y queremos enfocarnos en adquisición de clientes B2B.', timestamp: new Date() },
      { id: 'm2', role: 'assistant', content: '## Estrategia de Marketing Digital Q2 2025\n\n### Distribución del presupuesto ($50,000 USD)\n\n| Canal | Inversión | % |\n|-------|-----------|---|\n| LinkedIn Ads | $15,000 | 30% |\n| Google Ads (Search) | $12,000 | 24% |\n| Content Marketing | $8,000 | 16% |\n| Email Nurturing | $5,000 | 10% |\n| Webinars/Eventos | $5,000 | 10% |\n| SEO Técnico | $5,000 | 10% |\n\n### KPIs objetivo\n- **MQLs**: 200/mes\n- **SQLs**: 50/mes\n- **CAC**: <$250\n- **Pipeline generado**: $500K\n\n### Acciones clave por mes\n\n**Abril**: Lanzamiento campañas LinkedIn + setup nurturing\n**Mayo**: Webinar flagship + retargeting\n**Junio**: Optimización basada en datos + scale winners\n\n¿Quieres que profundice en alguno de estos canales?', timestamp: new Date() },
    ],
  },
  {
    id: '2',
    title: 'Análisis financiero trimestral',
    model: 'Claude 3.5',
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
    messages: [
      { id: 'm3', role: 'user', content: 'Analiza estos datos de revenue del Q1...', timestamp: new Date(Date.now() - 86400000) },
      { id: 'm4', role: 'assistant', content: 'Basándome en los datos proporcionados, aquí está el análisis:\n\n**Revenue Total Q1**: $2.4M (+18% YoY)\n- Enero: $720K\n- Febrero: $780K\n- Marzo: $900K\n\n**Tendencia**: Crecimiento acelerado mes a mes, con un spike significativo en marzo (+15.4% MoM).', timestamp: new Date(Date.now() - 86400000) },
    ],
  },
  {
    id: '3',
    title: 'Propuesta comercial para TechCorp',
    model: 'GPT-5',
    createdAt: new Date(Date.now() - 86400000 * 2),
    updatedAt: new Date(Date.now() - 86400000 * 2),
    messages: [],
  },
  {
    id: '4',
    title: 'Optimización de procesos operativos',
    model: 'Gemini Pro',
    createdAt: new Date(Date.now() - 86400000 * 3),
    updatedAt: new Date(Date.now() - 86400000 * 3),
    messages: [],
  },
  {
    id: '5',
    title: 'Investigación de mercado LATAM',
    model: 'GPT-5',
    createdAt: new Date(Date.now() - 86400000 * 5),
    updatedAt: new Date(Date.now() - 86400000 * 5),
    messages: [],
  },
  {
    id: '6',
    title: 'Plan de capacitación equipo ventas',
    model: 'Claude 3.5',
    favorite: true,
    createdAt: new Date(Date.now() - 86400000 * 8),
    updatedAt: new Date(Date.now() - 86400000 * 8),
    messages: [],
  },
];

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

export const useAppStore = create<AppState>((set) => ({
  view: 'landing',
  authTab: 'login',
  sidebarOpen: true,
  darkMode: false,
  currentChatId: '1',
  chats: mockChats,
  documents: mockDocuments,
  presentations: mockPresentations,
  commandOpen: false,

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
}));
