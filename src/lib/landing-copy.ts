/** Copy para la landing de convert-IA — variantes para rotación y textos */

export type TitleSubtitle = {
  title: string;
  subtitle: string;
  titleCycle?: readonly [string, string, string];
};

export type HeroCopyVariant = {
  title: string;
  titleCycle: readonly [string, string, string];
  subtitle: string;
};

/* ── Hero ── */

export const heroCopyVariants: HeroCopyVariant[] = [
  {
    title: "hero-ideas",
    titleCycle: ["Convierte ideas en", "resultados", "reales"],
    subtitle:
      "Una plataforma integral que combina chat IA documentos presentaciones y análisis para potenciar la productividad de tu empresa",
  },
  {
    title: "hero-eficiencia",
    titleCycle: ["IA que acelera", "tu equipo", "sin fricción"],
    subtitle:
      "Centraliza generación de contenido análisis de datos y comunicación en un solo producto listo para escalar",
  },
  {
    title: "hero-transforma",
    titleCycle: ["Transforma tu", "operación", "con inteligencia"],
    subtitle:
      "De la pregunta al entregable en minutos con múltiples modelos de IA y herramientas integradas",
  },
  {
    title: "hero-plataforma",
    titleCycle: ["La plataforma", "unificada", "de IA empresarial"],
    subtitle:
      "Chat documentos presentaciones análisis y más en una experiencia corporativa diseñada para resultados",
  },
  {
    title: "hero-stack",
    titleCycle: ["Un solo stack", "múltiples", "capacidades"],
    subtitle:
      "Menos herramientas más productividad y trazabilidad completa del insight a la acción",
  },
];

export const heroPillVariants = [
  "IA · Documentos · Presentaciones",
  "Chat inteligente para empresas",
  "Genera y exporta en segundos",
  "Múltiples modelos un solo lugar",
  "De idea a resultado sin fricción",
];

/* ── Plataforma en Acción ── */

export const platformHeadlineVariants: TitleSubtitle[] = [
  {
    title: "plataforma-accion",
    titleCycle: ["Tu plataforma IA", "en acción", "en tiempo real"],
    subtitle:
      "Chat documentos presentaciones y análisis en una sola experiencia fluida con cuatro formas de producir sin saltar entre herramientas",
  },
  {
    title: "plataforma-vivo",
    titleCycle: ["Productividad", "en vivo", "sin fricción"],
    subtitle:
      "Dashboard IA lenguaje natural y constructor visual reunidos para que tu equipo pase de la idea a la acción sin perder contexto",
  },
  {
    title: "plataforma-crea",
    titleCycle: ["Crea", "genera", "y ejecuta"],
    subtitle:
      "Demo viva de módulos integrados para que veas el producto como lo usarías en operación real",
  },
  {
    title: "plataforma-insights",
    titleCycle: ["Resultados que", "se entienden", "al instante"],
    subtitle:
      "Claridad ejecutiva en cada vista con narrativa visual pensada para dirección y equipos operativos por igual",
  },
  {
    title: "plataforma-equipos",
    titleCycle: ["IA aplicada", "para equipos", "modernos"],
    subtitle:
      "Una experiencia premium alineada a cómo trabajan hoy squads de producto contenido y operaciones",
  },
];

/* ── Servicios ── */

export type ServiceCardCopy = { title: string; tagline: string; desc: string };

export const servicesHeadlineVariants: TitleSubtitle[] = [
  {
    title: "servicios-todo",
    titleCycle: ["Todo lo que necesitas", "en un solo", "lugar"],
    subtitle:
      "Herramientas de IA diseñadas para equipos que buscan eficiencia calidad y resultados medibles sin dispersión",
  },
  {
    title: "servicios-central",
    titleCycle: ["Una sola plataforma", "múltiples capacidades", "cero dispersión"],
    subtitle:
      "Centraliza lo esencial para crear producir y decidir sin repartir cuellos de botella entre herramientas distintas",
  },
  {
    title: "servicios-genera",
    titleCycle: ["Genera contenido", "analiza datos", "y ejecuta"],
    subtitle:
      "Una capa integral para chat documentos presentaciones y análisis con gobierno y trazabilidad desde el primer día",
  },
  {
    title: "servicios-escala",
    titleCycle: ["IA aplicada", "que escala", "con tu operación"],
    subtitle:
      "Diseñada para equipos que priorizan velocidad claridad y control sin sacrificar calidad en los entregables",
  },
];

export const servicesCards: ServiceCardCopy[] = [
  {
    title: "Chat con IA",
    tagline: "Múltiples modelos · Contexto empresarial",
    desc: "Conversaciones inteligentes con GPT-5, Claude 3.5 y más para resolver cualquier desafío.",
  },
  {
    title: "Documentos Inteligentes",
    tagline: "Plantillas · Exportación avanzada",
    desc: "Redacta informes, propuestas y contratos con asistencia de IA en segundos.",
  },
  {
    title: "Constructor Web",
    tagline: "HTML · Preview en vivo",
    desc: "Genera interfaces y páginas web a partir de instrucciones en lenguaje natural.",
  },
  {
    title: "Presentaciones",
    tagline: "Templates · Exportación directa",
    desc: "Crea slides profesionales con templates y contenido generado por IA.",
  },
  {
    title: "Búsqueda Inteligente",
    tagline: "Semántica · Multi-fuente",
    desc: "Encuentra información relevante en tus conversaciones, documentos y proyectos.",
  },
  {
    title: "Análisis de Datos",
    tagline: "CSV · Excel · JSON",
    desc: "Sube archivos y obtén análisis, resúmenes y visualizaciones automáticas.",
  },
];

/* ── Beneficios ── */

export type BenefitCardCopy = { title: string; desc: string };

export const benefitsHeadlineVariants: TitleSubtitle[] = [
  {
    title: "benef-resultados",
    titleCycle: ["Velocidad", "claridad", "y control"],
    subtitle:
      "Lo esencial para un equipo que vive de producir con IA con señales claras gobierno y una experiencia premium limpia",
  },
  {
    title: "benef-ia",
    titleCycle: ["IA aplicada", "a resultados", "reales"],
    subtitle:
      "Menos ruido operativo y más impacto medible en productividad con modelos integrados al flujo de trabajo",
  },
  {
    title: "benef-friccion",
    titleCycle: ["Menos fricción", "más impacto", "medible"],
    subtitle:
      "Un stack que escala con tu operación y mantiene trazabilidad desde la idea hasta el entregable final",
  },
  {
    title: "benef-escalar",
    titleCycle: ["Tecnología", "lista para", "escalar"],
    subtitle:
      "Seguridad multi-modelo exportación avanzada y arquitectura SaaS pensada para crecer contigo desde el día uno",
  },
];

export const benefitsCards: BenefitCardCopy[] = [
  { title: "Velocidad real", desc: "De la idea al entregable en minutos, sin depender de procesos manuales." },
  { title: "Seguridad enterprise", desc: "Multi-modelo, roles finos y auditoría para operar con tranquilidad." },
  { title: "Todo en uno", desc: "Chat, documentos, presentaciones y análisis convergen en la misma plataforma." },
  { title: "Control granular", desc: "Permisos por módulo, cuenta y acción: cada usuario ve lo que debe." },
  { title: "Escala sin drama", desc: "Arquitectura SaaS pensada para crecer contigo, de equipo a corporativo." },
  { title: "Equipos alineados", desc: "Misma plataforma, vistas personalizadas: menos reuniones, más contexto." },
];

/* ── CTA (Solicitar Demo) ── */

export const ctaCopyVariants: TitleSubtitle[] = [
  {
    title: "cta-empezar",
    titleCycle: ["¿Listo para", "empezar", "a crear?"],
    subtitle:
      "Únete a más de 500 empresas que ya usan convert-IA para producir más rápido y con mejor calidad",
  },
  {
    title: "cta-transforma",
    titleCycle: ["Transforma tu", "productividad", "hoy"],
    subtitle:
      "Solicita una demo personalizada y descubre lo que tu equipo puede lograr con IA integrada",
  },
  {
    title: "cta-ideas",
    titleCycle: ["Convierte más ideas", "en acción", "continua"],
    subtitle:
      "Menos tiempo en tareas repetitivas y más enfoque en lo que realmente mueve la aguja de tu negocio",
  },
  {
    title: "cta-equipo",
    titleCycle: ["Tu equipo merece", "herramientas", "de primer nivel"],
    subtitle:
      "Una plataforma que se ve se entiende y se usa en el día a día sin depender de un solo experto",
  },
];

/* ── Contacto ── */

export const contactCopyVariants: TitleSubtitle[] = [
  {
    title: "contacto-proyecto",
    titleCycle: ["Hablemos de tu", "próximo", "proyecto"],
    subtitle:
      "Cuéntanos tu contexto en pocas líneas y te respondemos en menos de veinticuatro horas con un plan claro",
  },
  {
    title: "contacto-automatizar",
    titleCycle: ["Cuéntanos qué", "quieres", "automatizar"],
    subtitle:
      "Priorizamos tu mensaje y te devolvemos el siguiente paso sin vueltas ni burocracia innecesaria",
  },
  {
    title: "contacto-demo",
    titleCycle: ["Empieza tu demo", "personalizada", "hoy"],
    subtitle:
      "Nombre empresa y reto con eso arrancamos y preparamos una sesión útil con tus propios casos",
  },
  {
    title: "contacto-construir",
    titleCycle: ["Construyamos", "algo útil", "juntos"],
    subtitle:
      "Experiencia premium directa y sin formularios eternos porque tu tiempo también es un activo valioso",
  },
];
