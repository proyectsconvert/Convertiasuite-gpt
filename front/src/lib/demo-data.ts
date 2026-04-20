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

export const dashboardKpis: any[] = [];

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

export const semanticResults: SearchResult[] = [];

export const executionTimeline: any[] = [];

export const integrationCatalog: any[] = [];

export const moduleHealth: any[] = [];

export const planUsage: any[] = [];
