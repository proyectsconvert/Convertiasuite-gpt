import { motion } from 'framer-motion';
import { 
  MessageSquare, FileText, Globe, Presentation, Search, BarChart3,
  ArrowRight, Check, Sparkles, Zap, Shield, Users
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const capabilities = [
  { icon: MessageSquare, title: 'Chat con IA', desc: 'Conversaciones inteligentes con múltiples modelos de lenguaje para resolver cualquier desafío.' },
  { icon: FileText, title: 'Generador de documentos', desc: 'Redacta informes, propuestas y contratos con asistencia de IA en segundos.' },
  { icon: Globe, title: 'Constructor web', desc: 'Genera interfaces y páginas web a partir de instrucciones en lenguaje natural.' },
  { icon: Presentation, title: 'Presentaciones', desc: 'Crea slides profesionales con templates y contenido generado por IA.' },
  { icon: Search, title: 'Búsqueda inteligente', desc: 'Encuentra información relevante en tus conversaciones, documentos y proyectos.' },
  { icon: BarChart3, title: 'Análisis de archivos', desc: 'Sube archivos y obtén análisis, resúmenes y visualizaciones automáticas.' },
];

const steps = [
  { num: '01', title: 'Escribe o carga', desc: 'Describe lo que necesitas o sube tus archivos. La IA entiende tu contexto.' },
  { num: '02', title: 'La IA transforma', desc: 'Procesamos tu solicitud con los mejores modelos de IA del mercado.' },
  { num: '03', title: 'Exporta y ejecuta', desc: 'Obtén resultados listos para usar: documentos, código, presentaciones y más.' },
];

const plans = [
  { name: 'Free', price: '$0', period: '/mes', features: ['5 chats/día', '1 documento/semana', 'Modelos básicos', 'Búsqueda limitada'], cta: 'Comenzar gratis', featured: false },
  { name: 'Pro', price: '$29', period: '/mes', features: ['Chats ilimitados', 'Documentos ilimitados', 'Todos los modelos', 'Búsqueda avanzada', 'Presentaciones', 'Web builder', 'Soporte prioritario'], cta: 'Comenzar prueba', featured: true },
  { name: 'Enterprise', price: 'Custom', period: '', features: ['Todo en Pro', 'API dedicada', 'SSO / SAML', 'SLA 99.9%', 'Soporte 24/7', 'On-premise disponible', 'Capacitación incluida'], cta: 'Contactar ventas', featured: false },
];

const metrics = [
  { value: '500+', label: 'Empresas activas' },
  { value: '2.4M', label: 'Consultas procesadas' },
  { value: '99.9%', label: 'Uptime garantizado' },
  { value: '4.8/5', label: 'Satisfacción' },
];

export default function LandingPage() {
  const { setView } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">convert-IA</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <button className="hover:text-foreground transition-colors">Producto</button>
            <button className="hover:text-foreground transition-colors">Soluciones</button>
            <button className="hover:text-foreground transition-colors">Precios</button>
            <button className="hover:text-foreground transition-colors">Recursos</button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setView('auth'); }}>
              Iniciar sesión
            </Button>
            <Button size="sm" className="btn-primary-gradient px-4" onClick={() => { setView('auth'); }}>
              Comenzar
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: 'var(--gradient-hero)' }} />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-10 blur-3xl" style={{ background: 'var(--gradient-primary)' }} />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div initial="hidden" animate="visible" className="max-w-4xl mx-auto text-center">
            <motion.div custom={0} variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Zap className="w-3.5 h-3.5" /> Plataforma de IA empresarial #1
            </motion.div>
            <motion.h1 custom={1} variants={fadeUp} className="text-5xl md:text-7xl font-extrabold text-foreground leading-[1.1] mb-6">
              Convierte ideas en{' '}
              <span className="gradient-text">resultados reales</span>
            </motion.h1>
            <motion.p custom={2} variants={fadeUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              La plataforma unificada de inteligencia artificial que centraliza chat, documentos, presentaciones y análisis en una sola experiencia corporativa.
            </motion.p>
            <motion.div custom={3} variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="btn-primary-gradient px-8 py-3 text-base" onClick={() => setView('auth')}>
                Comenzar gratis <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-3 text-base">
                Ver demostración
              </Button>
            </motion.div>
          </motion.div>

          {/* App Preview */}
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible" className="mt-20 max-w-5xl mx-auto">
            <div className="surface-elevated p-2 rounded-2xl border border-border">
              <div className="bg-secondary rounded-xl p-8 flex items-center justify-center min-h-[400px]">
                <div className="w-full max-w-3xl space-y-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 rounded-full bg-destructive/60" />
                    <div className="w-3 h-3 rounded-full bg-warning/60" />
                    <div className="w-3 h-3 rounded-full bg-success/60" />
                    <div className="flex-1 bg-background rounded-md h-7 mx-4" />
                  </div>
                  <div className="flex gap-4">
                    <div className="w-48 space-y-2 hidden md:block">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-8 bg-background rounded-md" style={{ opacity: 1 - i * 0.12 }} />
                      ))}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="bg-background rounded-lg p-4">
                        <div className="h-3 bg-primary/20 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-muted rounded w-full mb-2" />
                        <div className="h-3 bg-muted rounded w-5/6" />
                      </div>
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <div className="h-3 bg-primary/30 rounded w-2/3 mb-2" />
                        <div className="h-3 bg-primary/15 rounded w-full mb-2" />
                        <div className="h-3 bg-primary/15 rounded w-4/5 mb-2" />
                        <div className="h-3 bg-primary/15 rounded w-3/4" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Metrics */}
      <section className="py-16 border-y border-border bg-card">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {metrics.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-foreground mb-1">{m.value}</div>
                <div className="text-sm text-muted-foreground">{m.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Todo lo que necesitas en un solo lugar</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Herramientas de IA diseñadas para equipos que buscan eficiencia, calidad y resultados medibles.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="surface-card p-6 hover:shadow-card-hover transition-all duration-300 group cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <c.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{c.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{c.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-card border-y border-border">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Cómo funciona</h2>
            <p className="text-muted-foreground text-lg">Tres pasos para transformar tu productividad.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="text-center">
                <div className="text-5xl font-extrabold gradient-text mb-4">{s.num}</div>
                <h3 className="text-xl font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <p className="text-center text-sm text-muted-foreground mb-8 font-medium uppercase tracking-wider">Tecnologías integradas</p>
          <div className="flex flex-wrap justify-center items-center gap-10 opacity-40">
            {['OpenAI', 'Google', 'Anthropic', 'Meta', 'Mistral', 'Cohere'].map((name) => (
              <span key={name} className="text-lg font-bold text-foreground">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-card border-y border-border">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Planes y precios</h2>
            <p className="text-muted-foreground text-lg">Escala según tus necesidades. Sin sorpresas.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`rounded-2xl p-8 ${p.featured ? 'bg-foreground text-background ring-2 ring-primary' : 'surface-card'}`}>
                <h3 className={`text-lg font-bold mb-2 ${p.featured ? '' : 'text-foreground'}`}>{p.name}</h3>
                <div className="mb-6">
                  <span className={`text-4xl font-extrabold ${p.featured ? '' : 'text-foreground'}`}>{p.price}</span>
                  <span className={`text-sm ${p.featured ? 'opacity-70' : 'text-muted-foreground'}`}>{p.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <Check className={`w-4 h-4 flex-shrink-0 ${p.featured ? 'text-primary' : 'text-success'}`} />
                      <span className={p.featured ? 'opacity-90' : 'text-muted-foreground'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className={`w-full ${p.featured ? 'btn-primary-gradient' : ''}`} variant={p.featured ? 'default' : 'outline'} onClick={() => setView('auth')}>
                  {p.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">¿Listo para transformar tu productividad?</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">Únete a más de 500 empresas que ya usan convert-IA para convertir ideas en resultados.</p>
          <Button size="lg" className="btn-primary-gradient px-10 py-3 text-base" onClick={() => setView('auth')}>
            Comenzar ahora <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-card">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">convert-IA</span>
              </div>
              <p className="text-sm text-muted-foreground">Convierte ideas en resultados reales con inteligencia artificial.</p>
            </div>
            {[
              { title: 'Producto', links: ['Chat IA', 'Documentos', 'Presentaciones', 'Web Builder'] },
              { title: 'Empresa', links: ['Acerca de', 'Blog', 'Carreras', 'Contacto'] },
              { title: 'Legal', links: ['Privacidad', 'Términos', 'Seguridad', 'Cookies'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold text-foreground mb-3 text-sm">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}><button className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</button></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground">© 2025 convert-IA. Todos los derechos reservados.</p>
            <div className="flex items-center gap-4">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">SOC 2 Type II · ISO 27001 · GDPR</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
