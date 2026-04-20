import { useMemo, useState } from "react";
import {
  LayoutTemplate,
  Play,
  Plus,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";

const aiTools = ["Generar slide", "Resumir contenido", "Adaptar tono", "Crear cierre comercial"];

const layoutLabels: Record<string, string> = {
  title: "Portada",
  content: "Contenido",
  "two-column": "Dos columnas",
  image: "Imagen",
  blank: "En blanco",
};

export default function PresentationsView() {
  const { presentations } = useAppStore();
  const [activePresentation, setActivePresentation] = useState(presentations[0]?.id ?? "");
  const [activeSlide, setActiveSlide] = useState(0);

  const presentation = useMemo(
    () => presentations.find((item) => item.id === activePresentation) ?? presentations[0],
    [activePresentation, presentations],
  );
  const slides = presentation?.slides ?? [];
  const current = slides[activeSlide];

  if (!presentation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="surface-card max-w-md p-6 text-center">
          <LayoutTemplate className="mx-auto mb-4 h-10 w-10 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Sin presentaciones disponibles</h2>
          <p className="mt-2 text-sm text-muted-foreground">Activa datos demo para visualizar el editor de slides.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 min-h-0 overflow-hidden">
      <aside className="w-64 border-r border-border bg-card/80 p-4">
        <Button variant="outline" className="mb-4 w-full gap-2 text-xs">
          <Plus className="h-3.5 w-3.5" /> Agregar slide
        </Button>
        <div className="space-y-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => setActiveSlide(index)}
              className={`w-full rounded-xl border p-2 text-left transition ${
                index === activeSlide ? "border-primary/50 bg-primary/10" : "border-border/70 bg-secondary/20 hover:bg-secondary/40"
              }`}
            >
              <div className="aspect-video rounded-lg border border-border/60 bg-card p-2">
                <p className="line-clamp-2 text-[10px] font-semibold text-foreground">{slide.title}</p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Slide {index + 1}</p>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card/70 px-5 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Editor de presentaciones</p>
            <h1 className="text-lg font-semibold text-foreground">{presentation.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> IA
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Play className="h-3.5 w-3.5" /> Presentar
            </Button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[1.6fr_1fr]">
          <section className="flex min-h-0 items-center justify-center bg-secondary/30 p-8">
            {current && (
              <article className="surface-elevated flex aspect-video w-full max-w-4xl flex-col justify-between border border-border/70 p-10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{layoutLabels[current.layout]}</p>
                  <h2 className="mt-3 text-4xl font-bold text-foreground">{current.title}</h2>
                  <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{current.content}</p>
                </div>
                <p className="text-xs text-muted-foreground">Narrativa conectada con dashboard y propuesta comercial TechCorp.</p>
              </article>
            )}
          </section>

          <aside className="border-l border-border bg-card/70 p-4">
            <h2 className="text-sm font-semibold text-foreground">Panel de propiedades</h2>
            <div className="mt-3 rounded-xl border border-border/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layout activo</p>
              <p className="mt-1 text-sm text-foreground">{current ? layoutLabels[current.layout] : "-"}</p>
            </div>

            <div className="mt-4 space-y-2">
              {aiTools.map((tool) => (
                <button
                  key={tool}
                  className="flex w-full items-center gap-2 rounded-lg border border-border/70 bg-secondary/30 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  <Wand2 className="h-4 w-4 text-primary" /> {tool}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-border/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Templates demo</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Pitch", "Reporte", "Board", "Roadmap"].map((template) => (
                  <span key={template} className="rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground">
                    {template}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
