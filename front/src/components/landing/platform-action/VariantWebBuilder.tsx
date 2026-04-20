import { motion } from "framer-motion";
import { Globe, Sparkles, Code, Monitor, Smartphone, Tablet, Check } from "lucide-react";
import { pa } from "./theme";
import { cn } from "@/lib/utils";

const webTemplates = [
  { name: "Landing Page", desc: "Página de captación" },
  { name: "Dashboard", desc: "Panel de métricas" },
  { name: "Portafolio", desc: "展示 proyectos" },
  { name: "Blog", desc: "Artículos y posts" },
];

const deviceIcons = [
  { icon: Smartphone, label: "Móvil", active: true },
  { icon: Tablet, label: "Tablet", active: false },
  { icon: Monitor, label: "Desktop", active: false },
];

const codePreview = `<section className="hero">
  <h1>Bienvenido a mi sitio</h1>
  <p>Construido con IA en segundos</p>
  <button>Comenzar</button>
</section>`;

export function VariantWebBuilder({ active }: { active: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={pa.badge}>Web Builder</span>
        <span className={cn("text-[10px] font-medium", pa.tSectionMeta)}>Código limpio · Responsive · Deploy automático</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Preview */}
        <motion.div 
          className={cn("overflow-hidden rounded-xl border", pa.card, "lg:col-span-8")}
          initial={{ opacity: 0, y: 8 }} 
          animate={active ? { opacity: 1, y: 0 } : {}} 
          transition={{ duration: 0.5 }}
        >
          {/* Device tabs */}
          <div className={cn("flex items-center justify-between border-b px-4 py-2", pa.panelHeader)}>
            <div className="flex items-center gap-1">
              {deviceIcons.map((d) => (
                <button
                  key={d.label}
                  className={cn(
                    "p-1.5 rounded transition-colors",
                    d.active ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <d.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <Globe className="h-3 w-3" />
              <span>preview.convert-ia.app</span>
            </div>
          </div>

          {/* Browser frame */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800">
            <div className="rounded-lg border border-slate-200/50 dark:border-white/10 overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-white/10 bg-slate-50 dark:bg-slate-900 px-3 py-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-400/60" />
                  <span className="h-2 w-2 rounded-full bg-amber-400/60" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400/60" />
                </div>
                <div className="flex-1 bg-white dark:bg-slate-800 rounded px-3 py-1 text-[10px] text-slate-500">
                  convert-ia.app/preview
                </div>
              </div>
              
              {/* Content preview */}
              <div className="p-6 bg-white dark:bg-slate-900 min-h-[180px]">
                <div className="text-center">
                  <div className="inline-block w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Bienvenido a mi sitio</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Construido con IA en segundos</p>
                  <button className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg">
                    Comenzar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Options */}
        <motion.div 
          className="space-y-4 lg:col-span-4"
          initial={{ opacity: 0, y: 8 }} 
          animate={active ? { opacity: 1, y: 0 } : {}} 
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Templates */}
          <div className={cn(pa.card, "p-4")}>
            <span className={cn("text-xs font-semibold mb-3 block", pa.tTitle)}>Templates</span>
            <div className="space-y-2">
              {webTemplates.map((t, i) => (
                <motion.div
                  key={t.name}
                  className={cn(pa.cardHover, "flex items-center justify-between rounded-lg border p-3 cursor-pointer")}
                  initial={{ opacity: 0, x: 8 }}
                  animate={active ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.2 + i * 0.05 }}
                >
                  <div>
                    <p className={cn("text-xs font-medium", pa.tStrong)}>{t.name}</p>
                    <p className={cn("text-[10px]", pa.tMuted)}>{t.desc}</p>
                  </div>
                  <Check className={cn("h-4 w-4", pa.tAccent)} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Code snippet */}
          <div className={cn(pa.card, "p-4")}>
            <div className="flex items-center gap-2 mb-2">
              <Code className={cn("h-4 w-4", pa.tAccent)} />
              <span className={cn("text-xs font-semibold", pa.tTitle)}>Código generado</span>
            </div>
            <pre className={cn("text-[9px] leading-relaxed rounded-lg p-2 overflow-auto max-h-24", pa.insetDark)}>
              {codePreview}
            </pre>
          </div>
        </motion.div>
      </div>

      {/* Prompt */}
      <motion.div 
        className={cn("rounded-xl border p-3", pa.insetDark)}
        initial={{ opacity: 0, y: 8 }}
        animate={active ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-2">
          <Sparkles className="h-3 w-3" />
          <span>Generar con IA</span>
        </div>
        <p className={cn("text-xs italic", pa.tMuted)}>
          "Crea landing page para startup SaaS con hero section, features en grid, pricing table y CTA final"
        </p>
      </motion.div>
    </div>
  );
}