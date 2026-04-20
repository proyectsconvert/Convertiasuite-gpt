import { useMemo, useState } from "react";
import {
  Download,
  FileDown,
  FileText,
  ListChecks,
  Plus,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";

const templates = [
  { id: "proposal", title: "Propuesta comercial", detail: "Incluye alcance, ROI y cronograma" },
  { id: "report", title: "Informe ejecutivo", detail: "Resultados trimestrales y decisiones" },
  { id: "minutes", title: "Acta de comite", detail: "Acuerdos, riesgos y responsables" },
  { id: "contract", title: "Contrato marco", detail: "Terminos de servicios enterprise" },
];

const aiActions = [
  { label: "Reescribir con tono ejecutivo", icon: Wand2 },
  { label: "Resumir para directivos", icon: Sparkles },
  { label: "Extraer plan de accion", icon: ListChecks },
  { label: "Convertir en one-pager", icon: FileText },
];

const defaultContent = "";

export default function DocumentsView() {
  const { documents } = useAppStore();
  const [activeId, setActiveId] = useState(documents[0]?.id ?? "");
  const [content, setContent] = useState(defaultContent);
  const [showTemplates, setShowTemplates] = useState(false);

  const activeDocument = useMemo(() => documents.find((doc) => doc.id === activeId) ?? documents[0], [activeId, documents]);

  return (
    <div className="flex h-full flex-1 min-h-0 overflow-hidden">
      <aside className="w-72 border-r border-border bg-card/80 p-4">
        <Button className="btn-primary-gradient mb-4 w-full gap-2" onClick={() => setShowTemplates((prev) => !prev)}>
          <Plus className="h-4 w-4" /> Nuevo documento
        </Button>

        {showTemplates && (
          <div className="mb-4 space-y-2 rounded-xl border border-border bg-secondary/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plantillas sugeridas</p>
            {templates.map((template) => (
              <button key={template.id} className="w-full rounded-lg border border-border/70 bg-card px-3 py-2 text-left transition hover:border-primary/30">
                <p className="text-sm font-semibold text-foreground">{template.title}</p>
                <p className="text-xs text-muted-foreground">{template.detail}</p>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recientes</p>
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setActiveId(doc.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                doc.id === activeId
                  ? "border-primary/40 bg-primary/10"
                  : "border-border/70 bg-secondary/20 hover:bg-secondary/40"
              }`}
            >
              <p className="text-sm font-medium text-foreground">{doc.title}</p>
              <p className="text-xs text-muted-foreground">Actualizado: {doc.updatedAt.toLocaleDateString("es")}</p>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card/70 px-5 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Flujo documental</p>
            <h1 className="text-lg font-semibold text-foreground">{activeDocument?.title ?? "Documento demo"}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Exportar
            </Button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1.7fr_1fr]">
          <section className="min-h-0 overflow-y-auto bg-background px-6 py-5">
            <article className="surface-elevated mx-auto max-w-3xl border border-border/60 p-6">
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="min-h-[620px] w-full resize-none border-none bg-transparent font-mono text-sm leading-relaxed text-foreground outline-none"
              />
            </article>
          </section>

          <aside className="border-l border-border bg-card/70 p-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Asistente IA</p>
              <h2 className="mt-1 text-sm font-semibold text-foreground">Mejoras sugeridas para este documento</h2>
              <p className="mt-2 text-xs text-muted-foreground">El texto ya coincide con datos del dashboard y del pitch deck.</p>
            </div>

            <div className="mt-4 space-y-2">
              {aiActions.map((action) => (
                <button
                  key={action.label}
                  className="flex w-full items-center gap-2 rounded-lg border border-border/70 bg-secondary/30 px-3 py-2 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                >
                  <action.icon className="h-4 w-4 text-primary" /> {action.label}
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-border/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Exportacion rapida</p>
              <div className="mt-2 space-y-2">
                {["PDF", "DOCX", "Markdown"].map((format) => (
                  <button
                    key={format}
                    className="flex w-full items-center gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary"
                  >
                    <FileDown className="h-4 w-4" /> {format}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
