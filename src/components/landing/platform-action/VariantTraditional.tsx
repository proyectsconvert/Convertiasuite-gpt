import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, BarChart3, DollarSign, Percent, Users } from "lucide-react";
import { ChartTooltip, CountUpSpan, KpiTile } from "./ui-bits";
import { pa } from "./theme";
import { cn } from "@/lib/utils";

const barSet = [
  { m: "Ene", v: 62, rev: "$182K", conv: "5.9%", mom: "+4.1%" },
  { m: "Feb", v: 48, rev: "$156K", conv: "5.2%", mom: "-2.3%" },
  { m: "Mar", v: 78, rev: "$214K", conv: "6.4%", mom: "+8.8%" },
  { m: "Abr", v: 55, rev: "$168K", conv: "5.5%", mom: "+1.2%" },
  { m: "May", v: 88, rev: "$241K", conv: "7.1%", mom: "+12.4%" },
  { m: "Jun", v: 72, rev: "$203K", conv: "6.2%", mom: "+3.0%" },
];

const lineD = "M0,58 L40,48 L80,52 L120,38 L160,42 L200,28 L240,32 L280,18 L320,22 L360,12";

const donutSegments = [
  { label: "Chat IA", pct: 38, color: "hsl(187 80% 42%)" },
  { label: "Documentos", pct: 27, color: "hsl(170 60% 45%)" },
  { label: "Presentaciones", pct: 22, color: "hsl(220 70% 55%)" },
  { label: "Otros", pct: 13, color: "hsl(280 60% 55%)" },
];

const DONUT_C = 2 * Math.PI * 36;

export function VariantTraditional({ active }: { active: boolean }) {
  const donutRings = useMemo(() => {
    let rotation = 0;
    return donutSegments.map((s) => {
      const len = (s.pct / 100) * DONUT_C;
      const rot = rotation;
      rotation += (s.pct / 100) * 360;
      return { ...s, len, rot };
    });
  }, []);

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className={pa.badge}>Dashboard Enterprise</span>
        <span className={cn("text-[10px] font-medium", pa.tSectionMeta)}>vs mes anterior · sync en vivo</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <KpiTile label="Consultas IA (MTD)" icon={<DollarSign className="h-3.5 w-3.5" />} badge="+18.4%"
          sub={<span className={cn("flex items-center gap-1 text-[10px]", pa.tPositive)}><ArrowUpRight className="h-3 w-3" /> vs 1,420 mes ant.</span>}>
          <CountUpSpan end={1680} active={active} />
        </KpiTile>
        <KpiTile label="Docs generados" icon={<Percent className="h-3.5 w-3.5" />} badge="live sync"
          sub={<span className={cn("text-[10px]", pa.tMuted)}>Objetivo 200/mes</span>}>
          <CountUpSpan end={168} active={active} />
        </KpiTile>
        <KpiTile label="Tiempo ahorrado" icon={<BarChart3 className="h-3.5 w-3.5" />}
          sub={<span className={cn("flex items-center gap-1 text-[10px]", pa.tPositive)}><ArrowDownRight className="h-3 w-3" /> -32% vs Q1</span>}>
          <CountUpSpan end={34} suffix="h" active={active} />
        </KpiTile>
        <KpiTile label="Satisfacción" icon={<Users className="h-3.5 w-3.5" />} badge="NPS 72"
          sub={<span className={cn("text-[10px]", pa.tMuted)}>4.9/5 promedio</span>}>
          <CountUpSpan end={96} suffix="%" active={active} />
        </KpiTile>
      </div>

      <div className="grid gap-3 lg:grid-cols-5 lg:gap-4">
        <ChartTooltip title="Uso de la plataforma · tendencia"
          lines={[
            { label: "Crecimiento mensual", value: "+14.2%" },
            { label: "Forecast Q4", value: "+18%" },
            { label: "Usuarios activos", value: "342" },
          ]}>
          <div className={cn(pa.card, pa.cardHover, "cursor-crosshair p-3 sm:p-4 lg:col-span-3")}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className={cn("text-xs font-semibold", pa.tTitle)}>Productividad vs objetivo</p>
              <span className={cn(pa.badge, "normal-case")}>forecast ready</span>
            </div>
            <svg viewBox="0 0 360 70" className="h-24 w-full sm:h-28" preserveAspectRatio="none">
              <defs>
                <linearGradient id="vt-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(187 80% 42%)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="hsl(187 80% 42%)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <motion.path d={`${lineD} L360,70 L0,70 Z`} fill="url(#vt-area)" initial={{ opacity: 0 }} animate={active ? { opacity: 1 } : {}} transition={{ duration: 0.8 }} />
              <motion.path d={lineD} fill="none" stroke="hsl(187 80% 42%)" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={active ? { pathLength: 1 } : { pathLength: 0 }} transition={{ duration: 1.6, ease: "easeOut" }} />
              <motion.path d="M0,25 L360,25" stroke="hsl(170 60% 45% / 0.4)" strokeWidth="1" strokeDasharray="4 6" initial={{ pathLength: 0 }} animate={active ? { pathLength: 1 } : {}} transition={{ delay: 0.5, duration: 1 }} />
            </svg>
            <p className={cn("mt-1 text-[10px]", pa.tMuted)}>Últimos 10 meses · pasa el cursor para detalle</p>
          </div>
        </ChartTooltip>

        <ChartTooltip title="Uso por módulo" lines={[{ label: "Chat IA", value: "38%" }, { label: "Documentos", value: "27%" }, { label: "Presentaciones", value: "22%" }]}>
          <div className={cn(pa.card, pa.cardHover, "flex cursor-crosshair flex-col items-center justify-center p-3 sm:p-4 lg:col-span-2")}>
            <p className={cn("mb-2 self-start text-xs font-semibold", pa.tTitle)}>Uso por módulo</p>
            <svg viewBox="0 0 100 100" className="h-28 w-28 sm:h-32 sm:w-32">
              <g transform="translate(50,50) rotate(-90)">
                {donutRings.map((seg, i) => (
                  <motion.circle key={seg.label} r="36" cx="0" cy="0" fill="none" stroke={seg.color} strokeWidth="14"
                    strokeDasharray={`${seg.len} ${DONUT_C}`} transform={`rotate(${seg.rot})`}
                    initial={{ opacity: 0 }} animate={active ? { opacity: 1 } : {}} transition={{ delay: 0.12 * i, duration: 0.45 }} />
                ))}
              </g>
            </svg>
            <ul className={cn("mt-2 grid w-full grid-cols-2 gap-x-2 gap-y-1 text-[9px]", pa.donutLegend)}>
              {donutSegments.map((s) => (
                <li key={s.label} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label} {s.pct}%
                </li>
              ))}
            </ul>
          </div>
        </ChartTooltip>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className={cn(pa.card, "p-3 sm:p-4")}>
          <p className={cn("mb-3 text-xs font-semibold", pa.tTitle)}>Consultas por mes</p>
          <div className="flex h-32 items-end gap-1 sm:h-36 sm:gap-1.5">
            {barSet.map((b, i) => (
              <ChartTooltip key={b.m} title={`${b.m} · detalle`} lines={[{ label: "Consultas", value: b.rev }, { label: "Conversión", value: b.conv }, { label: "MoM", value: b.mom }]}>
                <motion.div className={cn("group/bar relative flex-1 cursor-crosshair rounded-t-sm", pa.barFill)}
                  initial={{ height: "0%" }} animate={active ? { height: `${b.v}%` } : { height: "0%" }}
                  transition={{ delay: 0.08 * i, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ filter: "brightness(1.15)" }}>
                  <span className={cn("absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] opacity-0 transition-opacity group-hover/bar:opacity-100 sm:text-[9px]", pa.tMuted)}>{b.m}</span>
                </motion.div>
              </ChartTooltip>
            ))}
          </div>
        </div>

        <div className={cn(pa.card, "overflow-hidden p-0")}>
          <div className={cn("flex items-center justify-between border-b px-3 py-2", pa.panelHeader)}>
            <p className={cn("text-xs font-semibold", pa.tTitle)}>Resumen semanal</p>
            <span className={pa.badge}>activo</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-left text-[10px] sm:text-xs">
              <thead>
                <tr className={pa.tableHead}>
                  <th className="px-3 py-2 font-medium">Período</th>
                  <th className="px-3 py-2 font-medium">Consultas</th>
                  <th className="px-3 py-2 font-medium hidden sm:table-cell">Docs</th>
                  <th className="px-3 py-2 font-medium">Tiempo</th>
                  <th className="px-3 py-2 font-medium">vs ant.</th>
                </tr>
              </thead>
              <tbody className={pa.tMono}>
                {[
                  ["Lun–Mié", "842", "34", "12h", "+9.1%"],
                  ["Jue–Dom", "1,104", "48", "18h", "+14.8%"],
                  ["Semana", "1,946", "82", "30h", "+12.0%"],
                ].map((row) => (
                  <tr key={row[0]} className={pa.tableRow}>
                    <td className={cn("px-3 py-2 font-mono", pa.tStrong)}>{row[0]}</td>
                    <td className="px-3 py-2">{row[1]}</td>
                    <td className="px-3 py-2 hidden sm:table-cell">{row[2]}</td>
                    <td className={cn("px-3 py-2 font-medium", pa.tValue)}>{row[3]}</td>
                    <td className={cn("px-3 py-2", pa.tPositive)}>{row[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
