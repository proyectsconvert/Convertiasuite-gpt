import { type LucideIcon, BarChart3, FileText, Globe, MessageSquare, Presentation, Search, Sparkles } from "lucide-react";

export type ModuleKey = "dashboard" | "chat" | "documents" | "presentations" | "webbuilder" | "search" | "settings";

export interface ModuleAction {
  key: ModuleKey;
  title: string;
  description: string;
  icon: LucideIcon;
  accentClass: string;
}

export const moduleActions: ModuleAction[] = [
  {
    key: "chat",
    title: "Asistente IA",
    description: "Define estrategia Q2 para Convert-IA",
    icon: MessageSquare,
    accentClass: "text-primary",
  },
  {
    key: "documents",
    title: "Documento",
    description: "Propuesta comercial para TechCorp",
    icon: FileText,
    accentClass: "text-success",
  },
  {
    key: "presentations",
    title: "Presentacion",
    description: "Pitch deck con narrativa de inversion",
    icon: Presentation,
    accentClass: "text-accent",
  },
  {
    key: "webbuilder",
    title: "Web Builder",
    description: "Landing para lanzamiento Enterprise",
    icon: Globe,
    accentClass: "text-warning",
  },
  {
    key: "search",
    title: "Busqueda",
    description: "Consulta semantica multi-modulo",
    icon: Search,
    accentClass: "text-primary",
  },
  {
    key: "settings",
    title: "Configuracion",
    description: "Gestion de tema e integraciones",
    icon: Sparkles,
    accentClass: "text-muted-foreground",
  },
];

export const dashboardKpis = [
  { label: "Entregables activos", value: "18", trend: "+4 esta semana" },
  { label: "Horas ahorradas", value: "62h", trend: "+16% mensual" },
  { label: "Flujos automatizados", value: "11", trend: "+2 nuevos" },
  { label: "Uso IA del plan", value: "74%", trend: "3.7M / 5M tokens" },
];

export const quickChatPrompts = [
  "Crea un plan de lanzamiento para Convert-IA Enterprise en 30 dias",
  "Resume la propuesta comercial de TechCorp con enfoque en ROI",
  "Genera un guion para presentar resultados Q1 al comite ejecutivo",
  "Prepara una estrategia SEO y paid media para LATAM",
];

export const webPromptPresets = [
  "Landing SaaS con hero, logos, beneficios y CTA",
  "Pagina de pricing B2B con comparador de planes",
  "Sitio para onboarding de clientes enterprise",
  "Micrositio de webinar con registro y agenda",
];

export interface SearchResult {
  id: string;
  title: string;
  type: "chat" | "document" | "presentation" | "web";
  snippet: string;
  source: string;
  updatedAt: string;
  score: number;
}

export const semanticResults: SearchResult[] = [
  {
    id: "sr-1",
    title: "Estrategia de marketing Q2 2025",
    type: "chat",
    snippet: "Incluye distribucion de presupuesto de 50,000 USD en LinkedIn Ads, Search y nurtures para pipeline B2B.",
    source: "Chat: Estrategia de marketing Q2 2025",
    updatedAt: "Hace 2 horas",
    score: 98,
  },
  {
    id: "sr-2",
    title: "Propuesta Comercial - TechCorp",
    type: "document",
    snippet: "Define alcance por fases, inversion total de 52,000 USD y objetivo de reduccion de costos operativos del 25%.",
    source: "Documento: Propuesta Comercial - TechCorp",
    updatedAt: "Hoy",
    score: 95,
  },
  {
    id: "sr-3",
    title: "Pitch Deck - Serie A",
    type: "presentation",
    snippet: "Presenta traccion de 500+ empresas, ARR de 2.4M y crecimiento interanual de 180%.",
    source: "Presentacion: Pitch Deck - Serie A",
    updatedAt: "Ayer",
    score: 91,
  },
  {
    id: "sr-4",
    title: "Landing Enterprise Launch",
    type: "web",
    snippet: "Version optimizada para conversion con hero, prueba social, pricing modular y formulario de demo.",
    source: "Web Builder: Enterprise launch v3",
    updatedAt: "Hace 3 dias",
    score: 87,
  },
];

export const executionTimeline = [
  { title: "Kickoff de campaña Q2", owner: "Carlos Mendoza", status: "En progreso" },
  { title: "Cierre propuesta TechCorp", owner: "Equipo Comercial", status: "Pendiente aprobacion" },
  { title: "Revision pitch para inversores", owner: "Growth + Finanzas", status: "Listo para ensayo" },
];

export const integrationCatalog = [
  { name: "Slack", description: "Alertas de entregables y aprobaciones", connected: true },
  { name: "Google Drive", description: "Sincronizacion de documentos de cuenta", connected: true },
  { name: "Notion", description: "Publicacion de resenas y reportes", connected: false },
  { name: "HubSpot", description: "Envio de propuestas al CRM", connected: false },
];

export const moduleHealth = [
  { label: "Chat IA", status: "Operativo", detail: "Latencia promedio 1.2 s" },
  { label: "Documentos", status: "Operativo", detail: "Autosave cada 10 s" },
  { label: "Presentaciones", status: "Operativo", detail: "Render HD disponible" },
  { label: "Web Builder", status: "Operativo", detail: "Deploy demo listo" },
  { label: "Busqueda", status: "Sincronizando", detail: "Indexando ultimas 2 fuentes" },
];

export const planUsage = [
  { label: "Chats del mes", usage: "847 / ilimitado", percent: 100 },
  { label: "Documentos activos", usage: "23 / ilimitado", percent: 100 },
  { label: "Almacenamiento", usage: "2.4 GB / 10 GB", percent: 24 },
  { label: "Tokens IA", usage: "3.7M / 5M", percent: 74 },
];
