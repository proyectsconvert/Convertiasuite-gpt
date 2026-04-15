import { useState, useRef, useEffect } from 'react';
import {
  Send, Paperclip, Image, Link2, Mic, Copy, ThumbsUp, ThumbsDown,
  RotateCcw, ChevronDown, FileText, Globe, Presentation, BarChart3,
  Sparkles, Bot, User
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

const models = ['GPT-5', 'Claude 3.5', 'Gemini Pro', 'Mistral Large'];
const quickChips = [
  { icon: FileText, label: 'Generar documento' },
  { icon: Globe, label: 'Crear web' },
  { icon: Presentation, label: 'Crear slides' },
  { icon: BarChart3, label: 'Analizar datos' },
];

export default function ChatView() {
  const { chats, currentChatId, setCurrentChatId, updateChat, addChat } = useAppStore();
  const [input, setInput] = useState('');
  const [model, setModel] = useState('GPT-5');
  const [isTyping, setIsTyping] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chat = chats.find((c) => c.id === currentChatId);
  const messages = chat?.messages ?? [];

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: input, timestamp: new Date() };

    if (chat) {
      updateChat(chat.id, { messages: [...messages, userMsg], updatedAt: new Date() });
    } else {
      const newChat = {
        id: Date.now().toString(),
        title: input.slice(0, 50),
        model,
        messages: [userMsg],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      addChat(newChat);
      setCurrentChatId(newChat.id);
    }

    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: getSimulatedResponse(input),
        timestamp: new Date(),
      };
      const currentChat = useAppStore.getState().chats.find((c) => c.id === (chat?.id || useAppStore.getState().chats[0]?.id));
      if (currentChat) {
        useAppStore.getState().updateChat(currentChat.id, {
          messages: [...currentChat.messages, aiMsg],
          updatedAt: new Date(),
        });
      }
      setIsTyping(false);
    }, 1500);
  };

  // Empty state
  if (!chat || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">¿En qué puedo ayudarte?</h2>
          <p className="text-muted-foreground mb-8 text-center max-w-md">
            Escribe cualquier pregunta, sube un archivo o selecciona una acción rápida para comenzar.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-lg w-full mb-8">
            {[
              'Redacta una propuesta comercial para un cliente del sector financiero',
              'Analiza las tendencias de mercado en tecnología para 2025',
              'Crea un plan de onboarding para nuevos empleados',
              'Resume los puntos clave de mi último informe trimestral',
            ].map((s, i) => (
              <button key={i} onClick={() => setInput(s)}
                className="text-left p-4 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200">
                {s}
              </button>
            ))}
          </div>
        </div>
        <InputBar
          input={input} setInput={setInput} model={model} showModels={showModels}
          setShowModels={setShowModels} setModel={setModel} handleSend={handleSend}
          textareaRef={textareaRef} isTyping={isTyping}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-6 flex-shrink-0 bg-card">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-foreground text-sm truncate max-w-xs">{chat.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowModels(!showModels)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-secondary transition-colors text-muted-foreground">
              <Bot className="w-3.5 h-3.5" /> {model} <ChevronDown className="w-3 h-3" />
            </button>
            {showModels && (
              <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 z-50 min-w-[150px]">
                {models.map((m) => (
                  <button key={m} onClick={() => { setModel(m); setShowModels(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors ${m === model ? 'text-primary font-medium' : 'text-foreground'}`}>
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[85%] ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3' : ''}`}>
                {m.role === 'assistant' ? (
                  <div className="prose-chat text-foreground text-sm leading-relaxed">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                    <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border">
                      <button className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground"><Copy className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground"><ThumbsUp className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground"><ThumbsDown className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground"><RotateCcw className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm">{m.content}</span>
                )}
              </div>
              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-primary animate-pulse-soft" />
              </div>
              <div className="flex items-center gap-1 py-3">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEnd} />
        </div>
      </div>

      <InputBar
        input={input} setInput={setInput} model={model} showModels={showModels}
        setShowModels={setShowModels} setModel={setModel} handleSend={handleSend}
        textareaRef={textareaRef} isTyping={isTyping}
      />
    </div>
  );
}

function InputBar({ input, setInput, handleSend, textareaRef, isTyping }: {
  input: string; setInput: (v: string) => void; model: string; showModels: boolean;
  setShowModels: (v: boolean) => void; setModel: (v: string) => void;
  handleSend: () => void; textareaRef: React.RefObject<HTMLTextAreaElement>; isTyping: boolean;
}) {
  return (
    <div className="p-4 border-t border-border bg-card flex-shrink-0">
      <div className="max-w-3xl mx-auto">
        {/* Quick chips */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
          {quickChips.map((c) => (
            <button key={c.label} onClick={() => setInput(c.label)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors whitespace-nowrap">
              <c.icon className="w-3.5 h-3.5" /> {c.label}
            </button>
          ))}
        </div>
        {/* Input */}
        <div className="relative flex items-end gap-2 bg-secondary rounded-xl border border-border p-2">
          <div className="flex items-center gap-1 px-1">
            <button className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted-foreground"><Paperclip className="w-4 h-4" /></button>
            <button className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted-foreground"><Image className="w-4 h-4" /></button>
            <button className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted-foreground"><Link2 className="w-4 h-4" /></button>
            <button className="p-1.5 rounded-lg hover:bg-background transition-colors text-muted-foreground"><Mic className="w-4 h-4" /></button>
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Escribe tu mensaje..."
            className="flex-1 resize-none bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground min-h-[40px] max-h-[160px] py-2"
            rows={1}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isTyping} size="sm" className="btn-primary-gradient h-9 w-9 p-0 rounded-lg flex-shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">convert-IA puede cometer errores. Verifica la información importante.</p>
      </div>
    </div>
  );
}

function getSimulatedResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('propuesta') || lower.includes('comercial')) {
    return `## Propuesta Comercial\n\nHe preparado un borrador de propuesta comercial basado en tu solicitud:\n\n### Resumen Ejecutivo\nPresentamos una solución integral diseñada para optimizar sus procesos operativos y aumentar la eficiencia en un **35%** durante el primer trimestre de implementación.\n\n### Alcance del Proyecto\n- Diagnóstico inicial (2 semanas)\n- Implementación fase 1 (4 semanas)\n- Capacitación del equipo (2 semanas)\n- Seguimiento y optimización (4 semanas)\n\n### Inversión\n| Concepto | Valor |\n|----------|-------|\n| Licencias | $12,000/año |\n| Implementación | $8,500 |\n| Capacitación | $3,000 |\n| **Total** | **$23,500** |\n\n¿Quieres que ajuste alguna sección o que genere el documento completo?`;
  }
  if (lower.includes('analiz') || lower.includes('datos') || lower.includes('tendencia')) {
    return `## Análisis de Tendencias\n\nBasándome en los datos disponibles, identifico las siguientes tendencias clave:\n\n### 1. Inteligencia Artificial Generativa\n- Crecimiento del **340%** en adopción empresarial\n- Inversión proyectada de **$150B** para 2025\n\n### 2. Automatización de Procesos\n- **67%** de empresas implementando RPA\n- ROI promedio de **300%** en 18 meses\n\n### 3. Ciberseguridad\n- Incremento del **72%** en ataques sofisticados\n- Presupuesto promedio aumentó un **45%**\n\n\`\`\`\nSector       | Crecimiento | Confianza\nIA           | +340%       | Alta\nCloud        | +28%        | Alta\nBlockchain   | +15%        | Media\nIoT          | +22%        | Alta\n\`\`\`\n\n¿Necesitas que profundice en algún sector específico?`;
  }
  return `Entendido. He analizado tu solicitud y aquí están mis recomendaciones:\n\n### Puntos clave\n1. **Contexto**: Tu solicitud abarca un tema relevante para la estrategia empresarial actual\n2. **Análisis**: He identificado 3 áreas de oportunidad principales\n3. **Recomendación**: Sugiero un enfoque iterativo con validación en cada etapa\n\n### Próximos pasos\n- Definir métricas de éxito\n- Establecer timeline de implementación\n- Asignar responsables por área\n\n¿Quieres que desarrolle alguno de estos puntos en detalle?`;
}
