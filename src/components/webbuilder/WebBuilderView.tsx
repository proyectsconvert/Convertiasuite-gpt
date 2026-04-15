import { useState } from 'react';
import { Code, Eye, Smartphone, Monitor, Tablet, Send, Download, Sparkles, Copy, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const sampleHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing Page - TechCorp</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; color: #0f172a; }
    .hero {
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 2rem;
      text-align: center;
    }
    .hero h1 {
      font-size: 3.5rem;
      font-weight: 800;
      margin-bottom: 1rem;
      line-height: 1.1;
    }
    .hero p {
      font-size: 1.25rem;
      color: #475569;
      max-width: 600px;
      margin: 0 auto 2rem;
    }
    .btn {
      padding: 0.75rem 2rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      font-size: 1rem;
    }
    .btn-primary {
      background: #2563eb;
      color: white;
    }
  </style>
</head>
<body>
  <section class="hero">
    <div>
      <h1>Innovación que transforma</h1>
      <p>Soluciones tecnológicas para empresas que buscan resultados reales y medibles.</p>
      <button class="btn btn-primary">Comenzar ahora</button>
    </div>
  </section>
</body>
</html>`;

export default function WebBuilderView() {
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState(sampleHTML);
  const [viewMode, setViewMode] = useState<'code' | 'preview' | 'split'>('split');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const previewWidth = device === 'mobile' ? '375px' : device === 'tablet' ? '768px' : '100%';

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex bg-secondary rounded-lg p-0.5">
            {([['code', Code], ['split', Sparkles], ['preview', Eye]] as const).map(([mode, Icon]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${viewMode === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                <Icon className="w-3.5 h-3.5" /> {mode === 'code' ? 'Código' : mode === 'preview' ? 'Preview' : 'Split'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-secondary rounded-lg p-0.5">
            {([['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]] as const).map(([d, Icon]) => (
              <button key={d} onClick={() => setDevice(d)}
                className={`p-1.5 rounded-md transition-colors ${device === d ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Exportar HTML
          </Button>
        </div>
      </div>

      {/* Prompt bar */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <div className="flex-1 flex items-center gap-2 bg-secondary rounded-lg border border-border px-3">
            <Wand2 className="w-4 h-4 text-primary flex-shrink-0" />
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe lo que quieres generar... ej: 'landing page minimalista con hero y pricing'"
              className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground py-2.5"
            />
          </div>
          <Button size="sm" className="btn-primary-gradient px-4 gap-1.5">
            <Send className="w-3.5 h-3.5" /> Generar
          </Button>
        </div>
      </div>

      {/* Editor + Preview */}
      <div className="flex-1 flex overflow-hidden">
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'flex-1'} flex flex-col border-r border-border`}>
            <div className="h-8 bg-secondary/50 border-b border-border flex items-center px-3 justify-between">
              <span className="text-xs font-mono text-muted-foreground">index.html</span>
              <button className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground"><Copy className="w-3.5 h-3.5" /></button>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 bg-card p-4 font-mono text-xs text-foreground resize-none outline-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'flex-1'} bg-secondary/30 flex items-start justify-center p-4 overflow-auto`}>
            <div className="bg-background rounded-lg shadow-card overflow-hidden border border-border" style={{ width: previewWidth, maxWidth: '100%' }}>
              <iframe srcDoc={code} className="w-full h-[600px] border-none" title="Preview" sandbox="allow-scripts" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
