import { useState } from 'react';
import {
  Search as SearchIcon, Filter, FileText, MessageSquare, Presentation,
  Globe, Image, Calendar, ChevronDown, Sparkles, Clock, Star, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const filters = ['Todo', 'Chats', 'Documentos', 'Presentaciones', 'Archivos'];

const results = [
  { type: 'chat', title: 'Estrategia de marketing Q2 2025', snippet: '...presupuesto de $50,000 USD enfocado en adquisición B2B con LinkedIn Ads y Google Search...', date: 'Hace 2 horas', icon: MessageSquare },
  { type: 'document', title: 'Propuesta Comercial - TechCorp', snippet: '...solución integral para optimizar procesos operativos con un ROI proyectado del 300%...', date: 'Ayer', icon: FileText },
  { type: 'presentation', title: 'Pitch Deck - Serie A', snippet: '...500+ empresas activas, $2.4M ARR con 180% crecimiento year-over-year...', date: 'Hace 3 días', icon: Presentation },
  { type: 'chat', title: 'Análisis financiero trimestral', snippet: '...Revenue Total Q1: $2.4M (+18% YoY) con crecimiento acelerado en marzo...', date: 'Ayer', icon: MessageSquare },
  { type: 'document', title: 'Informe Q1 2025', snippet: '...resultados por encima de las expectativas en todas las métricas clave del negocio...', date: 'Hace 5 días', icon: FileText },
  { type: 'chat', title: 'Investigación de mercado LATAM', snippet: '...oportunidades significativas en Brasil, México y Colombia para expansión regional...', date: 'Hace 1 semana', icon: MessageSquare },
];

export default function SearchView() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todo');

  const filtered = activeFilter === 'Todo'
    ? results
    : results.filter((r) => {
        if (activeFilter === 'Chats') return r.type === 'chat';
        if (activeFilter === 'Documentos') return r.type === 'document';
        if (activeFilter === 'Presentaciones') return r.type === 'presentation';
        return true;
      });

  return (
    <div className="flex-1 flex flex-col h-full overflow-auto">
      <div className="max-w-4xl w-full mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Búsqueda inteligente</h1>
          <p className="text-muted-foreground">Encuentra información en tus conversaciones, documentos y proyectos.</p>
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en todo tu espacio de trabajo..."
            className="w-full h-12 pl-12 pr-12 rounded-xl border border-border bg-card text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          {filters.map((f) => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeFilter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* AI summary */}
        <div className="surface-card p-4 mb-6 border-l-4 border-l-primary">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Resumen IA</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Encontré <strong className="text-foreground">{filtered.length} resultados</strong> relacionados. 
            Los temas más frecuentes son estrategia de marketing, análisis financiero y propuestas comerciales. 
            El contenido más reciente se enfoca en planificación Q2 2025.
          </p>
        </div>

        {/* Results */}
        <div className="space-y-3">
          {filtered.map((r, i) => (
            <button key={i} className="w-full text-left surface-card p-4 hover:shadow-card-hover transition-all duration-200 group">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  r.type === 'chat' ? 'bg-primary/10' : r.type === 'document' ? 'bg-success/10' : 'bg-accent/10'
                }`}>
                  <r.icon className={`w-5 h-5 ${
                    r.type === 'chat' ? 'text-primary' : r.type === 'document' ? 'text-success' : 'text-accent'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{r.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground capitalize">{r.type}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed truncate">{r.snippet}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{r.date}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
