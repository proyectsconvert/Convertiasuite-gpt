import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  MessageSquare, FileText, Globe, Presentation, Search, BarChart3,
  ArrowRight, Sparkles, Zap, Shield, Users, Brain, Award,
  Send, Menu, X, Check
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RotatingHeadline } from "@/components/ui/rotating-headline";
import { GradientCycleTitle } from "@/components/ui/gradient-cycle-title";
import { RevealLegend } from "@/components/ui/reveal-legend";
import { PlatformActionShowcase } from "@/components/landing/platform-action/PlatformActionShowcase";
import {
  heroCopyVariants, heroPillVariants,
  servicesHeadlineVariants, servicesCards,
  benefitsHeadlineVariants, benefitsCards,
  ctaCopyVariants, contactCopyVariants,
} from "@/lib/landing-copy";

const HERO_ROTATE_MS = 8200;
const PILL_ROTATE_MS = 7000;

const serviceIcons = [MessageSquare, FileText, Globe, Presentation, Search, BarChart3] as const;
const benefitIcons = [Zap, Shield, Users, Brain, Award, BarChart3] as const;

const navLinks = [
  { label: "Plataforma", href: "platform" },
  { label: "Servicios", href: "servicios" },
  { label: "Beneficios", href: "beneficios" },
  { label: "Contacto", href: "contacto" },
];

const metrics = [
  { value: "500+", label: "Empresas activas", icon: Users },
  { value: "2.4M", label: "Consultas procesadas", icon: Brain },
  { value: "99.9%", label: "Uptime garantizado", icon: Shield },
  { value: "4.9/5", label: "Satisfacción cliente", icon: Award },
];

const contactFieldClass =
  "bg-white text-slate-900 border-slate-300 shadow-sm placeholder:text-slate-500 " +
  "focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white " +
  "dark:bg-white dark:text-slate-900 dark:border-slate-300 dark:placeholder:text-slate-500 " +
  "dark:focus-visible:ring-offset-white";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

export default function LandingPage() {
  const { setView, darkMode, toggleDarkMode } = useAppStore();
  const reduceMotion = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [pillIndex, setPillIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const variant = heroCopyVariants[reduceMotion ? 0 : heroIndex];
  const pillText = heroPillVariants[reduceMotion ? 0 : pillIndex];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (reduceMotion || heroCopyVariants.length <= 1) return;
    const id = window.setInterval(() => setHeroIndex((i) => (i + 1) % heroCopyVariants.length), HERO_ROTATE_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || heroPillVariants.length <= 1) return;
    const id = window.setInterval(() => setPillIndex((i) => (i + 1) % heroPillVariants.length), PILL_ROTATE_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const heroMotionKey = reduceMotion ? "static-h" : `${heroIndex}-${variant.title}`;

  const handleStart = () => setView("auth");
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(
          180deg,
          hsl(220 25% 7%) 0%,
          hsl(220 25% 7%) 8%,
          hsl(220 22% 12%) 18%,
          hsl(215 20% 22%) 30%,
          hsl(210 18% 38%) 42%,
          hsl(210 15% 55%) 54%,
          hsl(210 12% 72%) 66%,
          hsl(210 10% 86%) 78%,
          hsl(210 15% 96%) 90%,
          hsl(0 0% 100%) 100%
        )`,
      }}
    >
      {/* ── Navbar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm" : "bg-transparent"}`}>
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className={`font-display font-bold text-lg tracking-tight ${scrolled ? "text-foreground" : "text-white"}`}>
              convert-IA
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <button key={l.label} onClick={() => scrollTo(l.href)}
                className={`text-sm font-medium transition-colors hover:text-primary ${scrolled ? "text-muted-foreground" : "text-white/70"}`}>
                {l.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleDarkMode} className={`p-2 rounded-lg transition-colors ${scrolled ? "hover:bg-secondary text-muted-foreground" : "hover:bg-white/10 text-white/70"}`}>
              {darkMode ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <Button variant="ghost" size="sm" onClick={handleStart} className={`hidden sm:inline-flex ${scrolled ? "" : "text-white/80 hover:text-white hover:bg-white/10"}`}>
              Iniciar sesión
            </Button>
            <Button size="sm" onClick={() => scrollTo("contacto")} className="gradient-primary text-white font-semibold glow-sm hover:opacity-90 transition-opacity">
              Solicitar demo
            </Button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
              {mobileMenuOpen ? <X className={`w-5 h-5 ${scrolled ? "text-foreground" : "text-white"}`} /> : <Menu className={`w-5 h-5 ${scrolled ? "text-foreground" : "text-white"}`} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border p-4 space-y-3">
            {navLinks.map((l) => (
              <button key={l.label} onClick={() => scrollTo(l.href)} className="block text-sm text-foreground py-2 w-full text-left">{l.label}</button>
            ))}
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/10 blur-[100px]" />

        <div className="container relative z-10 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="space-y-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-display font-bold text-white tracking-tight">convert-IA</span>
              </div>

              {/* Rotating pill */}
              <div className="inline-flex min-h-[2.25rem] max-w-full items-center overflow-hidden rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-sm text-primary break-normal text-pretty"
                aria-live={reduceMotion ? undefined : "polite"}>
                <Sparkles className="mr-2 h-3.5 w-3.5 shrink-0" aria-hidden />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={reduceMotion ? "static-pill" : pillText}
                    initial={reduceMotion ? false : { opacity: 0, y: 6, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -4, filter: "blur(3px)" }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="font-medium"
                  >
                    {pillText}
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* Rotating headline */}
              <div className="min-h-[8.5rem] sm:min-h-[7.5rem] lg:min-h-[8rem] max-w-full">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={heroMotionKey}
                    initial={reduceMotion ? false : { opacity: 0, y: 12, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -10, filter: "blur(5px)" }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <GradientCycleTitle
                      as="h1"
                      segments={variant.titleCycle}
                      className="text-left text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-display font-bold leading-[1.08] tracking-tight justify-start"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Rotating subtitle */}
              <div className="min-h-[5.5rem] max-w-xl">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={heroMotionKey}
                    initial={reduceMotion ? false : { opacity: 0, y: 8, filter: "blur(5px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -6, filter: "blur(3px)" }}
                    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <RevealLegend
                      text={variant.subtitle}
                      animationKey={heroMotionKey}
                      className="text-lg lg:text-xl text-white/60 leading-relaxed"
                      sweepClassName="text-primary"
                      layout="start"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <Button size="lg" onClick={() => scrollTo("contacto")} className="gradient-primary text-white font-semibold px-8 h-12 text-base glow-sm hover:opacity-90 transition-opacity">
                  Solicitar demo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <p className="text-sm text-white/40 flex items-center gap-4">
                <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Sin tarjeta de crédito</span>
                <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Setup en 2 min</span>
              </p>
            </motion.div>

            {/* Hero visual mockup */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} className="relative hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden glow-primary border border-white/10">
                <div className="bg-[hsl(220,25%,7%)] p-1">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[hsl(220,22%,9%)]">
                    <div className="flex gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-red-500/50" />
                      <span className="h-3 w-3 rounded-full bg-amber-400/50" />
                      <span className="h-3 w-3 rounded-full bg-emerald-500/50" />
                    </div>
                    <div className="flex-1 flex justify-center px-2">
                      <div className="truncate rounded-md border border-white/10 bg-white/[0.06] px-3 py-1 font-mono text-[11px] text-white/70">
                        convert-ia.app/dashboard
                      </div>
                    </div>
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-primary/70">live</span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Consultas hoy", val: "1,247" },
                        { label: "Docs generados", val: "89" },
                        { label: "Tiempo ahorrado", val: "34h" },
                      ].map((k) => (
                        <div key={k.label} className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/45 mb-1">{k.label}</div>
                          <div className="font-display text-xl font-bold text-white">{k.val}</div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs font-medium text-white/70">IA procesando consulta...</span>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-white/[0.08] rounded w-full" />
                        <div className="h-2 bg-white/[0.08] rounded w-4/5" />
                        <div className="h-2 bg-primary/20 rounded w-3/5" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,25%,7%)] via-transparent to-transparent opacity-40" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Metrics ── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 gradient-hero px-5 py-10 shadow-2xl shadow-black/35 sm:px-8 sm:py-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(187_80%_42%/0.08),transparent_68%)]" />
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8">
              {metrics.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-3 glow-sm">
                    <m.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-3xl md:text-4xl font-display font-bold text-white mb-1">{m.value}</div>
                  <div className="text-sm text-white/55">{m.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Plataforma en Acción ── */}
      <div id="platform">
        <PlatformActionShowcase />
      </div>

      {/* ── Servicios ── */}
      <section id="servicios" className="py-16 sm:py-20 lg:py-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 gradient-hero px-5 py-10 shadow-2xl shadow-black/35 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(187_80%_42%/0.12),transparent_68%)]" aria-hidden />
            <div className="relative z-10">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10 space-y-5 text-center sm:mb-12 lg:mb-14">
                <span className="text-sm font-semibold uppercase tracking-widest text-primary">Servicios</span>
                <RotatingHeadline
                  items={servicesHeadlineVariants}
                  intervalMs={8200}
                  minHeightClass="min-h-[15rem] sm:min-h-[13.5rem] lg:min-h-[12.5rem]"
                  titleClassName="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
                  subtitleClassName="mx-auto max-w-2xl font-medium leading-relaxed text-white/75"
                />
              </motion.div>

              <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {servicesCards.map((s, i) => {
                  const Icon = serviceIcons[i];
                  return (
                    <motion.div key={s.title} variants={item}
                      className="group relative rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/45 hover:bg-white/[0.06] hover:shadow-lg hover:shadow-primary/10">
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg gradient-primary transition-shadow group-hover:glow-sm">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="mb-1 font-display font-semibold text-white">{s.title}</h3>
                      <p className="mb-2 text-sm font-medium leading-snug text-primary/90 break-normal hyphens-none [overflow-wrap:normal] [word-break:normal]">{s.tagline}</p>
                      <p className="text-sm leading-relaxed text-white/60 break-normal hyphens-none [overflow-wrap:normal] [word-break:normal]">{s.desc}</p>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Beneficios ── */}
      <section id="beneficios" className="relative py-16 sm:py-20 lg:py-24">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 gradient-hero px-5 py-10 shadow-2xl shadow-black/35 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--accent)_/_0.18),transparent_65%)]" aria-hidden />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,hsl(var(--primary)_/_0.08),transparent_55%)]" aria-hidden />
            <div className="relative z-10">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10 space-y-5 text-center sm:mb-12 lg:mb-14">
                <span className="text-sm font-semibold uppercase tracking-widest text-accent">Beneficios</span>
                <RotatingHeadline
                  items={benefitsHeadlineVariants}
                  intervalMs={8200}
                  minHeightClass="min-h-[13rem] sm:min-h-[11.5rem] lg:min-h-[10.5rem]"
                  titleClassName="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
                  subtitleClassName="mx-auto max-w-2xl font-medium leading-relaxed text-emerald-100/85"
                />
              </motion.div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {benefitsCards.map((b, i) => {
                  const Icon = benefitIcons[i];
                  return (
                    <motion.div key={b.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                      className="rounded-xl border border-emerald-500/15 bg-white/[0.04] p-6 backdrop-blur-sm transition-all duration-300 hover:border-accent/50 hover:bg-emerald-500/[0.06] hover:shadow-lg hover:shadow-accent/10">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-white shadow-md shadow-accent/20">
                        <Icon className="h-5 w-5" strokeWidth={2} />
                      </div>
                      <h3 className="mb-2 font-display text-lg font-semibold text-white">{b.title}</h3>
                      <p className="text-sm leading-relaxed text-emerald-100/65 break-normal hyphens-none [overflow-wrap:normal] [word-break:normal]">{b.desc}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA (Solicitar Demo) ── */}
      <section className="py-24 lg:py-32">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="relative rounded-2xl overflow-hidden gradient-hero p-12 lg:p-20 text-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(187_80%_42%/0.08),transparent_70%)]" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <RotatingHeadline
                items={ctaCopyVariants}
                intervalMs={8200}
                minHeightClass="min-h-[13.5rem] sm:min-h-[11.5rem]"
                titleClassName="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white"
                subtitleClassName="text-white/55 text-lg"
              />
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Button size="lg" onClick={() => scrollTo("contacto")} className="gradient-primary text-white font-semibold px-8 h-12 glow-sm">
                  Solicitar Demo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Contacto ── */}
      <section id="contacto" className="py-24 lg:py-32 relative overflow-hidden">
        <div className="container max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12 space-y-4">
            <span className="text-sm font-semibold uppercase tracking-widest text-primary">Contacto</span>
            <RotatingHeadline
              items={contactCopyVariants}
              intervalMs={8400}
              minHeightClass="min-h-[12.5rem] sm:min-h-[11rem]"
              titleClassName="text-3xl sm:text-4xl font-display font-bold"
              subtitleClassName="text-gray-600"
              subtitleSweepClassName="text-primary"
              titleSurface="light"
            />
          </motion.div>

          {submitted ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center p-12 rounded-xl border border-primary/30 bg-primary/5">
              <p className="text-lg font-display font-semibold text-primary">¡Gracias por tu interés!</p>
              <p className="text-gray-500 mt-2">Nos pondremos en contacto contigo pronto.</p>
            </motion.div>
          ) : (
            <motion.form initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
              className="space-y-5 p-8 rounded-xl border border-slate-200 bg-white shadow-lg backdrop-blur-xl dark:border-slate-200 dark:bg-white">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">Nombre completo</label>
                  <Input className={contactFieldClass} placeholder="Tu nombre" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-800">Correo electrónico</label>
                  <Input className={contactFieldClass} type="email" placeholder="correo@empresa.com" required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">Empresa</label>
                <Input className={contactFieldClass} placeholder="Nombre de tu empresa" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">Mensaje</label>
                <Textarea className={contactFieldClass} placeholder="Cuéntanos qué necesitas..." rows={4} required />
              </div>
              <Button type="submit" className="w-full gradient-primary text-white font-semibold h-11 glow-sm">
                Enviar solicitud <Send className="ml-2 h-4 w-4" />
              </Button>
            </motion.form>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 py-12">
        <div className="container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-bold text-gray-900 text-lg">convert-IA</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                Plataforma unificada de IA para empresas que buscan eficiencia, calidad y resultados medibles.
              </p>
            </div>
            <div>
              <h4 className="font-display font-semibold text-gray-900 mb-4">Plataforma</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><button onClick={() => scrollTo("servicios")} className="hover:text-primary transition-colors">Servicios</button></li>
                <li><button onClick={() => scrollTo("contacto")} className="hover:text-primary transition-colors">Contacto</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold text-gray-900 mb-4">Soluciones</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>Chat con IA</li>
                <li>Documentos Inteligentes</li>
                <li>Presentaciones</li>
                <li>Constructor Web</li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><button className="hover:text-primary transition-colors">Términos de servicio</button></li>
                <li><button className="hover:text-primary transition-colors">Política de privacidad</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-6 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} convert-IA. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
