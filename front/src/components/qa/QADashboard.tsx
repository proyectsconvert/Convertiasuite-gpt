import { ClipboardCheck } from "lucide-react";

export default function QADashboard() {
  return (
    <section className="flex h-full flex-col overflow-auto bg-background p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
        <header className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Panel de calidad
            </h1>
            <p className="text-sm text-muted-foreground">
              Revisa y supervisa la calidad de las operaciones.
            </p>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
          <div>
            <ClipboardCheck
              className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              No hay revisiones de calidad disponibles.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}