import { useState } from 'react';
import {
  Plus, Play, Download, ChevronLeft, ChevronRight, Trash2, Copy, GripVertical,
  Type, Image, Square, LayoutTemplate, Sparkles
} from 'lucide-react';
import { useAppStore, type PresentationSlide } from '@/store/appStore';
import { Button } from '@/components/ui/button';

const slideTemplates = [
  { id: 'pitch', name: 'Pitch Deck', icon: '🚀' },
  { id: 'executive', name: 'Ejecutiva', icon: '💼' },
  { id: 'educational', name: 'Educativa', icon: '📚' },
  { id: 'report', name: 'Reporte', icon: '📊' },
  { id: 'minimal', name: 'Minimalista', icon: '✨' },
];

const slideColors = [
  { bg: 'bg-primary', text: 'text-primary-foreground' },
  { bg: 'bg-foreground', text: 'text-background' },
  { bg: 'bg-card', text: 'text-foreground' },
  { bg: 'bg-accent', text: 'text-accent-foreground' },
];

export default function PresentationsView() {
  const { presentations } = useAppStore();
  const [activePres, setActivePres] = useState(presentations[0]?.id || null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [editing, setEditing] = useState(false);

  const pres = presentations.find((p) => p.id === activePres);
  const slides = pres?.slides || [];
  const currentSlide = slides[activeSlide];

  if (!pres) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <LayoutTemplate className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Constructor de presentaciones</h2>
          <p className="text-muted-foreground mb-6 max-w-md">Selecciona un template para comenzar o crea una presentación desde cero.</p>
          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-6">
            {slideTemplates.map((t) => (
              <button key={t.id} className="p-4 rounded-xl border border-border hover:bg-secondary transition-colors text-center">
                <span className="text-2xl mb-2 block">{t.icon}</span>
                <span className="text-xs font-medium text-foreground">{t.name}</span>
              </button>
            ))}
          </div>
          <Button className="btn-primary-gradient gap-2" onClick={() => setActivePres(presentations[0]?.id || null)}>
            <Plus className="w-4 h-4" /> Nueva presentación
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full">
      {/* Slide thumbnails */}
      <div className="w-52 border-r border-border bg-card flex flex-col">
        <div className="p-3 border-b border-border">
          <Button size="sm" className="w-full gap-2 text-xs" variant="outline">
            <Plus className="w-3.5 h-3.5" /> Agregar slide
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {slides.map((s, i) => (
            <button key={s.id} onClick={() => setActiveSlide(i)}
              className={`w-full rounded-lg border-2 transition-colors overflow-hidden ${activeSlide === i ? 'border-primary' : 'border-border hover:border-muted-foreground/30'}`}>
              <div className={`aspect-video p-3 flex items-center justify-center ${i === 0 ? 'bg-primary' : i === 3 ? 'bg-foreground' : 'bg-card'}`}>
                <span className={`text-[8px] font-semibold truncate ${i === 0 || i === 3 ? 'text-primary-foreground' : 'text-foreground'}`}>{s.title}</span>
              </div>
              <div className="px-2 py-1 bg-background">
                <span className="text-[10px] text-muted-foreground">{i + 1}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Slide editor */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{pres.title}</span>
            <span className="text-xs text-muted-foreground">· Slide {activeSlide + 1} de {slides.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> IA
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Play className="w-3.5 h-3.5" /> Presentar
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Exportar
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-secondary/30 flex items-center justify-center p-8">
          {currentSlide && (
            <div className={`w-full max-w-4xl aspect-video rounded-xl shadow-elevated overflow-hidden flex items-center justify-center p-12 ${
              activeSlide === 0 ? 'bg-primary' : activeSlide === 3 ? 'bg-foreground' : 'bg-card border border-border'
            }`}>
              <div className="text-center max-w-2xl">
                <h2 className={`text-4xl font-extrabold mb-4 ${activeSlide === 0 || activeSlide === 3 ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {currentSlide.title}
                </h2>
                <p className={`text-lg leading-relaxed ${activeSlide === 0 || activeSlide === 3 ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {currentSlide.content}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="h-14 border-t border-border flex items-center justify-center gap-4 bg-card">
          <Button variant="ghost" size="sm" disabled={activeSlide === 0} onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground font-medium">{activeSlide + 1} / {slides.length}</span>
          <Button variant="ghost" size="sm" disabled={activeSlide === slides.length - 1} onClick={() => setActiveSlide(Math.min(slides.length - 1, activeSlide + 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Properties panel */}
      <div className="w-64 border-l border-border bg-card p-4 flex flex-col">
        <h3 className="text-sm font-semibold text-foreground mb-4">Propiedades</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Layout</label>
            <div className="grid grid-cols-2 gap-2">
              {['Título', 'Contenido', '2 Columnas', 'Imagen'].map((l) => (
                <button key={l} className="px-2 py-1.5 rounded-md border border-border text-xs hover:bg-secondary transition-colors text-muted-foreground">{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Color de fondo</label>
            <div className="flex gap-2">
              {['bg-primary', 'bg-foreground', 'bg-card', 'bg-accent', 'bg-success'].map((c) => (
                <button key={c} className={`w-8 h-8 rounded-lg ${c} border border-border`} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Insertar</label>
            <div className="space-y-1.5">
              {[
                { icon: Type, label: 'Texto' },
                { icon: Image, label: 'Imagen' },
                { icon: Square, label: 'Forma' },
              ].map((item) => (
                <button key={item.label} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors">
                  <item.icon className="w-4 h-4" /> {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
