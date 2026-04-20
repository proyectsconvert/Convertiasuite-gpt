import { motion } from "framer-motion";
import { AlertTriangle, Brain, Sparkles, TrendingUp, Zap } from "lucide-react";
import { ChartTooltip, CountUpSpan, KpiTile } from "./ui-bits";
import { pa } from "./theme";
import { cn } from "@/lib/utils";

const insights = [
  { title: "Productividad pico", body: "Equipos que usan chat + documentos generan 3x más entregables entre 10:00–13:00.", tag: "Eficiencia" },
  { title: "Modelo óptimo", body: "GPT-5 resuelve 89% de consultas técnicas; Claude 3.5 domina redacción creativa.", tag: "Routing" },
  { title: "Ahorro detectado", body: "Automatizar resúmenes ejecutivos reduciría 14h/semana en el equipo comercial.", tag: "ROI" },
];

export function VariantAI({ active }: { active: boolean }) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={pa.badge}>IA generativa</span>
        <span className={cn("text-[10px] font-medium", pa.tSectionMeta)}>Insights automáticos · anomalías · recomendaciones</span>
      </div>

      <motion.div className={cn("relative overflow-hidden rounded-xl p-4", pa.aiHero)}
        initial={{ opacity: 0, y: 8 }} animate={active ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}>
        <div className={pa.aiGlow} />
        <div className="flex flex-wrap items-start gap-3">
          <div className={pa.aiIconBox}><Brain className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest", pa.tAccent)}>
              <Sparkles className="h-3 w-3" /> Generado a partir de tu consulta
            </p>
            <p className={cn("mt-1 font-display text-sm font-semibold sm:text-base", pa.tStrong)}>
              "Análisis de productividad del equipo · últimos 30 días con desglose por módulo y recomendaciones"
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={pa.chip}>multi-modelo</span>
              <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-800 dark:text-amber-200/90">
                3 oportunidades detectadas
              </span>
              <span className={pa.chipMuted}>live sync</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <p className={cn("text-xs font-semibold", pa.tSubtitle)}>Insights automáticos</p>
          <div className="grid gap-2 sm:grid-cols-1">
            {insights.map((ins, i) => (
              <motion.div key={ins.title} className={cn(pa.card, pa.cardHover, "flex gap-3 p-3")}
                initial={{ opacity: 0, x: -12 }} animate={active ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.12 * i, duration: 0.45 }}>
                <Zap className={cn("mt-0.5 h-4 w-4 shrink-0", pa.tAccent)} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn("text-sm font-semibold", pa.tStrong)}>{ins.title}</p>
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-medium text-primary dark:bg-emerald-500/15 dark:text-emerald-300">{ins.tag}</span>
                  </div>
                  <p className={cn("mt-1 text-[11px] leading-relaxed", pa.tBody)}>{ins.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <ChartTooltip title="Forecast de adopción" lines={[{ label: "Proyección uso", value: "+24%" }, { label: "Intervalo", value: "±3.8%" }, { label: "Modelo", value: "ensemble" }]}>
            <div className={cn(pa.card, pa.cardHover, "cursor-crosshair p-4")}>
              <div className="mb-2 flex items-center justify-between">
                <p className={cn("text-xs font-semibold", pa.tTitle)}>Forecast Q4</p>
                <TrendingUp className={cn("h-4 w-4", pa.tAccent)} />
              </div>
              <p className={cn("font-display text-3xl font-bold", pa.tValue)}>
                <CountUpSpan end={24} prefix="+" suffix="%" active={active} />
              </p>
              <p className={cn("mt-2 text-[10px]", pa.tMuted)}>vs mismo trimestre año anterior</p>
              <div className={cn("mt-3", pa.progressTrack)}>
                <motion.div className={pa.progressFill} initial={{ width: "0%" }} animate={active ? { width: "78%" } : { width: "0%" }} transition={{ delay: 0.4, duration: 1.2, ease: "easeOut" }} />
              </div>
            </div>
          </ChartTooltip>

          <div className={cn(pa.card, "p-4")}>
            <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300/90">
              <AlertTriangle className="h-4 w-4" />
              <p className={cn("text-xs font-semibold", pa.tStrong)}>Oportunidades detectadas</p>
            </div>
            <ul className={cn("space-y-2 text-[11px]", pa.tBody)}>
              <li className={cn("flex justify-between gap-2 border-b pb-2", pa.borderSubtle)}>
                <span>Docs sin revisar · equipo MKT</span>
                <span className="shrink-0 font-mono text-amber-700 dark:text-amber-200/90">+41%</span>
              </li>
              <li className={cn("flex justify-between gap-2 border-b pb-2", pa.borderSubtle)}>
                <span>Chat sin seguimiento · ventas</span>
                <span className="shrink-0 font-mono text-amber-700 dark:text-amber-200/90">12 hilos</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Presentaciones pendientes</span>
                <span className="shrink-0 font-mono text-amber-700 dark:text-amber-200/90">5 drafts</span>
              </li>
            </ul>
          </div>

          <KpiTile label="AI productivity score" badge="beta"
            sub={<span className={cn("text-[10px]", pa.tMuted)}>Calidad + velocidad + adopción</span>}>
            <CountUpSpan end={94} suffix="/100" active={active} />
          </KpiTile>
        </div>
      </div>
    </div>
  );
}
