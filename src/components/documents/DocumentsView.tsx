import { useState } from 'react';
import {
  FileText, Plus, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Image, Link2, Table, Download, Sparkles, ChevronDown,
  Wand2, FileDown, MoreHorizontal
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';

const templates = [
  { id: 'report', name: 'Informe', icon: '📊' },
  { id: 'letter', name: 'Carta', icon: '✉️' },
  { id: 'contract', name: 'Contrato', icon: '📋' },
  { id: 'proposal', name: 'Propuesta', icon: '💼' },
  { id: 'minutes', name: 'Acta', icon: '📝' },
  { id: 'summary', name: 'Resumen ejecutivo', icon: '📈' },
];

const aiActions = [
  { label: 'Reescribir', icon: Wand2 },
  { label: 'Resumir', icon: FileText },
  { label: 'Mejorar tono', icon: Sparkles },
  { label: 'Estructurar', icon: List },
];

export default function DocumentsView() {
  const { documents } = useAppStore();
  const [activeDoc, setActiveDoc] = useState(documents[0]?.id || null);
  const [content, setContent] = useState(
    `# Propuesta Comercial - TechCorp\n\n## Resumen Ejecutivo\n\nPresentamos una solución integral diseñada para optimizar los procesos operativos de TechCorp, con un enfoque en automatización inteligente y análisis predictivo.\n\n## Objetivos\n\n1. Reducir costos operativos en un 25%\n2. Mejorar la satisfacción del cliente en un 40%\n3. Acelerar el time-to-market en un 35%\n\n## Alcance del Proyecto\n\n### Fase 1: Diagnóstico (Semanas 1-2)\n- Auditoría de procesos actuales\n- Identificación de oportunidades de mejora\n- Definición de KPIs\n\n### Fase 2: Implementación (Semanas 3-8)\n- Configuración de la plataforma\n- Integración con sistemas existentes\n- Desarrollo de flujos automatizados\n\n### Fase 3: Optimización (Semanas 9-12)\n- Capacitación del equipo\n- Ajustes basados en feedback\n- Documentación final\n\n## Inversión\n\n| Concepto | Valor |\n|----------|-------|\n| Licencias anuales | $24,000 |\n| Implementación | $15,000 |\n| Capacitación | $5,000 |\n| Soporte premium | $8,000/año |\n\n**Total primer año: $52,000 USD**`
  );
  const [showTemplates, setShowTemplates] = useState(false);

  const doc = documents.find((d) => d.id === activeDoc);

  return (
    <div className="flex-1 flex h-full">
      {/* Document list sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <Button size="sm" className="w-full btn-primary-gradient gap-2" onClick={() => setShowTemplates(!showTemplates)}>
            <Plus className="w-4 h-4" /> Nuevo documento
          </Button>
        </div>
        {showTemplates && (
          <div className="p-3 border-b border-border bg-secondary/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Templates</p>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((t) => (
                <button key={t.id} className="flex items-center gap-2 p-2 rounded-lg border border-border text-xs hover:bg-background transition-colors">
                  <span>{t.icon}</span> {t.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {documents.map((d) => (
            <button key={d.id} onClick={() => setActiveDoc(d.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${activeDoc === d.id ? 'bg-secondary' : 'hover:bg-secondary/50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium text-foreground truncate">{d.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{d.updatedAt.toLocaleDateString('es')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 border-b border-border flex items-center px-4 gap-1 bg-card overflow-x-auto">
          {[Bold, Italic, Underline].map((Icon, i) => (
            <button key={i} className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <div className="w-px h-5 bg-border mx-1" />
          {[AlignLeft, AlignCenter, AlignRight].map((Icon, i) => (
            <button key={i} className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <div className="w-px h-5 bg-border mx-1" />
          {[List, ListOrdered, Table, Image, Link2].map((Icon, i) => (
            <button key={i} className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Exportar <ChevronDown className="w-3 h-3" />
          </Button>
        </div>

        <div className="flex-1 flex">
          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full min-h-[600px] bg-transparent border-none outline-none resize-none text-foreground text-sm leading-relaxed font-mono"
              />
            </div>
          </div>

          {/* AI Assistant panel */}
          <div className="w-72 border-l border-border bg-card p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Asistente IA</span>
            </div>
            <div className="space-y-2 mb-6">
              {aiActions.map((a) => (
                <button key={a.label}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                  <a.icon className="w-4 h-4" /> {a.label}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Exportar como</p>
              {['PDF', 'DOCX', 'Markdown'].map((f) => (
                <button key={f} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">
                  <FileDown className="w-4 h-4" /> {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
