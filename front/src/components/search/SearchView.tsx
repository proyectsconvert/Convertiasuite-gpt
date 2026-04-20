import { useMemo, useState } from "react";
import { Clock3, FileText, Globe, MessageSquare, Presentation, Search, Sparkles, X } from "lucide-react";
import { semanticResults } from "@/lib/demo-data";

const filters = [
  { id: "all", label: "Todo" },
  { id: "chat", label: "Chats" },
  { id: "document", label: "Documentos" },
  { id: "presentation", label: "Presentaciones" },
  { id: "web", label: "Web" },
] as const;

const iconMap = {
  chat: MessageSquare,
  document: FileText,
  presentation: Presentation,
  web: Globe,
};

export default function SearchView() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]["id"]>("all");

  const filtered = useMemo(() => {
    return semanticResults.filter((result) => {
      const byFilter = activeFilter === "all" ? true : result.type === activeFilter;
      const byQuery =
        query.trim().length === 0 ||
        `${result.title} ${result.snippet} ${result.source}`.toLowerCase().includes(query.toLowerCase());
      return byFilter && byQuery;
    });
  }, [activeFilter, query]);

  return (
    <div className="flex flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Busqueda semantica</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Workspace intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">Relaciona chats, documentos, presentaciones y sitios generados con un solo query.</p>
        </header>

        <section className="mb-6 rounded-2xl border border-border bg-card p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar 'TechCorp ROI', 'Q2 marketing' o 'pitch serie A'"
              className="h-11 w-full rounded-xl border border-border bg-secondary/40 pl-11 pr-10 text-sm text-foreground outline-none transition focus:border-primary/40"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {filters.map((filter) => {
              const count = semanticResults.filter((result) => (filter.id === "all" ? true : result.type === filter.id)).length;
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    filter.id === activeFilter ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {filter.label} ({count})
                </button>
              );
            })}
          </div>
        </section>

        <section className="surface-elevated mb-6 border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Resumen IA</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Se detectaron <span className="font-semibold text-foreground">{filtered.length} resultados</span> relacionados con la narrativa comercial de Convert-IA.
            Los mejores matches conectan estrategia Q2, propuesta TechCorp y pitch para inversion.
          </p>
        </section>

        <section className="space-y-3">
          {filtered.map((result) => {
            const Icon = iconMap[result.type];
            return (
              <article key={result.id} className="surface-card p-4 transition hover:shadow-card-hover">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-foreground">{result.title}</h2>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">Score {result.score}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{result.snippet}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{result.source}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" /> {result.updatedAt}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
