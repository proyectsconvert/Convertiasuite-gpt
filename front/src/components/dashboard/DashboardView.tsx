import { motion } from "framer-motion";
import { ArrowRight, Clock3, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { dashboardKpis, executionTimeline, moduleActions, moduleHealth } from "@/lib/demo-data";

export default function DashboardView() {
  const navigate = useNavigate();
  const { user } = useAppStore();

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface-elevated border border-border/60 p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Centro operativo</p>
              <h1 className="text-3xl font-bold text-foreground">Hola, {user?.name?.split(" ")[0] ?? "Carlos"}. Tu demo esta lista para vender valor.</h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                En las ultimas 24 horas se actualizaron conversaciones, propuestas y slides conectados al mismo caso comercial.
              </p>
            </div>
            <Button className="btn-primary-gradient gap-2" onClick={() => navigate("/app/chat")}>
              Abrir asistente IA <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardKpis.map((kpi, index) => (
            <motion.article
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="surface-card p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
              <p className="mt-3 text-3xl font-bold text-foreground">{kpi.value}</p>
              <p className="mt-2 text-xs text-primary">{kpi.trend}</p>
            </motion.article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <article className="surface-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Accesos por modulo</h2>
              <span className="text-xs text-muted-foreground">Historias conectadas</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {moduleActions.map((action) => (
                <button
                  key={action.key}
                  onClick={() => navigate(`/app/${action.key}`)}
                  className="group rounded-xl border border-border/70 bg-secondary/40 p-4 text-left transition hover:border-primary/40 hover:bg-secondary"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <action.icon className={`h-4 w-4 ${action.accentClass}`} />
                    <p className="text-sm font-semibold text-foreground">{action.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                  <div className="mt-3 text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">Abrir modulo</div>
                </button>
              ))}
            </div>
          </article>

          <article className="surface-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Casos en progreso</h2>
            </div>
            <div className="space-y-3">
              {executionTimeline.map((item) => (
                <div key={item.title} className="rounded-lg border border-border/70 bg-secondary/30 p-3">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.owner}</p>
                  <p className="mt-2 text-xs font-semibold text-primary">{item.status}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <article className="surface-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Salud de la plataforma</h2>
            <div className="space-y-2">
              {moduleHealth.map((module) => (
                <div key={module.label} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{module.label}</p>
                    <p className="text-xs text-muted-foreground">{module.detail}</p>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold text-primary">{module.status}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="surface-elevated border border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10 p-6">
            <div className="flex h-full flex-col justify-between gap-5">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Storytelling demo listo
                </div>
                <h2 className="text-2xl font-bold text-foreground">Todo el workspace cuenta una historia unica y coherente.</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Chat, Documentos, Presentaciones y Busqueda comparten datos consistentes para una demostracion comercial sin fricciones.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate("/app/presentations")} className="btn-primary-gradient gap-2">
                  Abrir Pitch Deck <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/app/search")}>Validar busqueda semantica</Button>
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
