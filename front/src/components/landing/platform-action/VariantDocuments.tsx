import { motion } from "framer-motion";
import { FileText, Sparkles, User, Check, FileSpreadsheet, FileCheck, FileSignature } from "lucide-react";
import { pa } from "./theme";
import { cn } from "@/lib/utils";

const documentTypes = [
  { icon: FileSignature, label: "Propuesta comercial", desc: "Para clientes nuevos", color: "primary" },
  { icon: FileSpreadsheet, label: "Informe trimestral", desc: "Reporte de resultados", color: "emerald" },
  { icon: FileCheck, label: "Contrato de servicios", desc: "Acuerdo con proveedor", color: "purple" },
];

const recentDocs = [
  { name: "Propuesta TechCorp Q2", status: "Completado", time: "Hace 2h" },
  { name: "Informe financiero Mar", status: "En revisión", time: "Hace 5h" },
  { name: "Contrato SlAI Solutions", status: "Borrador", time: "Ayer" },
];

export function VariantDocuments({ active }: { active: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={pa.badge}>Documentos</span>
        <span className={cn("text-[10px] font-medium", pa.tSectionMeta)}>Generación inteligente · Templates · Exportación PDF</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Document types */}
        <motion.div 
          className={cn(pa.card, "p-4")}
          initial={{ opacity: 0, y: 8 }} 
          animate={active ? { opacity: 1, y: 0 } : {}} 
          transition={{ duration: 0.5 }}
        >
          <div className="mb-3 flex items-center gap-2">
            <FileText className={cn("h-4 w-4", pa.tAccent)} />
            <span className={cn("text-xs font-semibold", pa.tTitle)}>Crear nuevo documento</span>
          </div>
          
          <div className="space-y-2">
            {documentTypes.map((doc, i) => (
              <motion.div
                key={doc.label}
                className={cn(pa.cardHover, "flex items-center gap-3 rounded-lg border border-slate-200/70 dark:border-white/10 p-3 cursor-pointer")}
                initial={{ opacity: 0, x: -8 }}
                animate={active ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
              >
                <div className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  doc.color === "primary" ? "bg-primary/10 text-primary" :
                  doc.color === "emerald" ? "bg-emerald-500/10 text-emerald-600" :
                  "bg-purple-500/10 text-purple-600"
                )}>
                  <doc.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-semibold truncate", pa.tStrong)}>{doc.label}</p>
                  <p className={cn("text-[10px] truncate", pa.tMuted)}>{doc.desc}</p>
                </div>
                <Sparkles className={cn("h-4 w-4 shrink-0", pa.tAccent)} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent documents */}
        <motion.div 
          className={cn(pa.card, "p-4")}
          initial={{ opacity: 0, y: 8 }} 
          animate={active ? { opacity: 1, y: 0 } : {}} 
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className={cn("text-xs font-semibold", pa.tTitle)}>Documentos recientes</span>
            <span className={cn("text-[10px] rounded bg-primary/10 px-2 py-0.5 font-medium", pa.chip)}>3 archivos</span>
          </div>
          
          <div className="space-y-2">
            {recentDocs.map((doc, i) => (
              <motion.div
                key={doc.name}
                className="flex items-center gap-3 rounded-lg border border-slate-200/50 dark:border-white/10 p-3"
                initial={{ opacity: 0, x: 8 }}
                animate={active ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
              >
                <FileText className={cn("h-4 w-4 shrink-0", pa.tMuted)} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-xs font-medium truncate", pa.tStrong)}>{doc.name}</p>
                  <p className={cn("text-[10px]", pa.tMuted)}>{doc.time}</p>
                </div>
                <span className={cn(
                  "rounded px-2 py-0.5 text-[9px] font-medium",
                  doc.status === "Completado" ? "bg-emerald-500/10 text-emerald-600" :
                  doc.status === "En revisión" ? "bg-amber-500/10 text-amber-600" :
                  "bg-slate-500/10 text-slate-600"
                )}>
                  {doc.status}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Prompt input */}
      <motion.div 
        className={cn("rounded-xl border p-3", pa.insetDark)}
        initial={{ opacity: 0, y: 8 }}
        animate={active ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-2">
          <Sparkles className="h-3 w-3" />
          <span>Descripción con IA</span>
        </div>
        <p className={cn("text-xs italic", pa.tMuted)}>
          "Genera propuesta comercial para cliente de retail con pricing de 3 paquetes: básico ($5K), profesional ($15K) y enterprise ($50K)"
        </p>
      </motion.div>
    </div>
  );
}