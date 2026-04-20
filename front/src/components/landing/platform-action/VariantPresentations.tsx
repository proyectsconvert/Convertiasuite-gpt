import { motion } from "framer-motion";
import { Presentation, Sparkles, Play, Layout, Image, Columns, Check } from "lucide-react";
import { pa } from "./theme";
import { cn } from "@/lib/utils";

const slideLayouts = [
  { icon: Layout, label: "Título", desc: "Portada y sección" },
  { icon: Columns, label: "Dos columnas", desc: "Contenido dual" },
  { icon: Image, label: "Imagen", desc: "Foto con pie" },
  { icon: Layout, label: "Lista", desc: "Puntos clave" },
];

const recentPresentations = [
  { name: "Pitch Deck Serie A", slides: 12, status: "Completado" },
  { name: "Reporte Q1 2025", slides: 8, status: "En edición" },
  { name: "Propuesta TechCorp", slides: 15, status: "Borrador" },
];

export function VariantPresentations({ active }: { active: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={pa.badge}>Presentaciones</span>
        <span className={cn("text-[10px] font-medium", pa.tSectionMeta)}>Templates · Generación automática · Diseños profesionales</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Slide preview */}
        <motion.div 
          className={cn("overflow-hidden rounded-xl border", pa.card, "lg:col-span-7")}
          initial={{ opacity: 0, y: 8 }} 
          animate={active ? { opacity: 1, y: 0 } : {}} 
          transition={{ duration: 0.5 }}
        >
          <div className={cn("flex items-center justify-between border-b px-4 py-2", pa.panelHeader)}>
            <span className={cn("text-xs font-semibold", pa.tTitle)}>Vista previa</span>
            <div className="flex items-center gap-2">
              <span className={cn("text-[10px]", pa.tMuted)}>Slide 3/12</span>
              <Play className={cn("h-4 w-4", pa.tAccent)} />
            </div>
          </div>
          
          <div className="p-4">
            <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/20 via-slate-100 to-accent/10 dark:from-primary/30 dark:via-slate-800 dark:to-accent/20 flex items-center justify-center border border-slate-200/50 dark:border-white/10">
              <div className="text-center">
                <Presentation className={cn("h-10 w-10 mx-auto mb-2", pa.tAccent)} />
                <p className={cn("text-sm font-semibold", pa.tStrong)}>La Solución</p>
                <p className={cn("text-xs", pa.tMuted)}>Plataforma unificada de IA</p>
              </div>
            </div>
            
            {/* Slide thumbnails */}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <div 
                  key={n}
                  className={cn(
                    "h-8 w-12 shrink-0 rounded border cursor-pointer",
                    n === 3 ? "border-primary bg-primary/10" : "border-slate-200/70 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03]"
                  )}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Options */}
        <motion.div 
          className="space-y-4 lg:col-span-5"
          initial={{ opacity: 0, y: 8 }} 
          animate={active ? { opacity: 1, y: 0 } : {}} 
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Templates */}
          <div className={cn(pa.card, "p-4")}>
            <span className={cn("text-xs font-semibold mb-3 block", pa.tTitle)}>Layouts disponibles</span>
            <div className="grid grid-cols-2 gap-2">
              {slideLayouts.map((layout, i) => (
                <motion.div
                  key={layout.label}
                  className={cn(pa.cardHover, "flex items-center gap-2 rounded-lg border p-2 cursor-pointer")}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={active ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.2 + i * 0.05 }}
                >
                  <layout.icon className={cn("h-4 w-4 shrink-0", pa.tAccent)} />
                  <div>
                    <p className={cn("text-[10px] font-medium", pa.tStrong)}>{layout.label}</p>
                    <p className={cn("text-[9px]", pa.tMuted)}>{layout.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recent presentations */}
          <div className={cn(pa.card, "p-4")}>
            <span className={cn("text-xs font-semibold mb-3 block", pa.tTitle)}>Presentaciones recientes</span>
            <div className="space-y-2">
              {recentPresentations.map((p, i) => (
                <motion.div
                  key={p.name}
                  className="flex items-center gap-3 rounded-lg border border-slate-200/50 dark:border-white/10 p-2"
                  initial={{ opacity: 0, x: 8 }}
                  animate={active ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <Presentation className={cn("h-4 w-4 shrink-0", pa.tMuted)} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-medium truncate", pa.tStrong)}>{p.name}</p>
                    <p className={cn("text-[10px]", pa.tMuted)}>{p.slides} slides</p>
                  </div>
                  {p.status === "Completado" && <Check className={cn("h-4 w-4 shrink-0 text-emerald-500")} />}
                </motion.div>
              ))}
            </div>
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
          "Crea presentación de 10 slides para pitch a inversionistas con modelo de negocio, mercado TAM y equipo"
        </p>
      </motion.div>
    </div>
  );
}