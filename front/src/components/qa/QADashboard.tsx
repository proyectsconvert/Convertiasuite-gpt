import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { 
  qaApi, 
  adminApi,
  canSelectCampaign,
  getEffectiveCampaignId,
  Campaign,
  QASummary, 
  QACategoryDistribution, 
  QATopQuery, 
  QAInsight, 
  QAAuditLogItem,
  QAAuditFilterParams,
  UserInfo
} from "@/services/api";
import { 
  BarChart3, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Database,
  FileText,
  UserCheck,
  TrendingUp,
  Calendar
} from "lucide-react";

export default function QADashboard() {
  const currentUser: UserInfo = useMemo(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : { role: "" };
    } catch {
      return { role: "" } as UserInfo;
    }
  }, []);

  const isAdmin = useMemo(() => canSelectCampaign(currentUser), [currentUser]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Campaña efectiva resuelta por la regla de negocio
  const effectiveCampaignId = useMemo(
    () => getEffectiveCampaignId(currentUser, selectedCampaign || undefined),
    [currentUser, selectedCampaign]
  );

  
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<QASummary | null>(null);
  const [categories, setCategories] = useState<QACategoryDistribution[]>([]);
  const [topQueries, setTopQueries] = useState<QATopQuery[]>([]);
  const [insights, setInsights] = useState<QAInsight[]>([]);
  
  // Auditoría Paginada
  const [auditItems, setAuditItems] = useState<QAAuditLogItem[]>([]);
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditTotalPages, setAuditTotalPages] = useState<number>(1);
  const [auditTotalItems, setAuditTotalItems] = useState<number>(0);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);

  useEffect(() => {
    if (isAdmin) {
      adminApi.getCampaigns()
        .then((res) => setCampaigns(res.campaigns || []))
        .catch(() => toast.error("Error al cargar la lista de campañas"));
    }
  }, [isAdmin]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [summaryRes, categoriesRes, topQueriesRes, insightsRes] = await Promise.all([
        qaApi.getSummary(effectiveCampaignId, selectedDays),
        qaApi.getCategories(effectiveCampaignId, selectedDays),
        qaApi.getTopQueries(effectiveCampaignId, selectedCategory || undefined, selectedDays, 20),
        qaApi.getInsights(effectiveCampaignId)
      ]);

      setSummary(summaryRes);
      setCategories(categoriesRes);
      setTopQueries(topQueriesRes);
      setInsights(insightsRes);
    } catch (error) {
      toast.error("Error al sincronizar analítica de QA");
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLog = async (page: number = 1) => {
    try {
      setLoadingAudit(true);
      const filters: QAAuditFilterParams = {
        campaign_id: effectiveCampaignId,
        agent_id: selectedAgent || undefined,
        category: selectedCategory || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        limit: 15
      };

      const res = await qaApi.getAuditLog(filters);
      setAuditItems(res.items);
      setAuditPage(res.page);
      setAuditTotalPages(res.total_pages);
      setAuditTotalItems(res.total);
    } catch (error) {
      toast.error("Error al consultar log de auditoría");
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadAuditLog(1);
  }, [effectiveCampaignId, selectedDays, selectedAgent, selectedCategory, dateFrom, dateTo]);

  const donutSlices = useMemo(() => {
    const total = categories.reduce((acc, c) => acc + c.count, 0);
    if (total === 0) return [];

    const colors = [
      "#3B82F6", "#10B981", "#F59E0B", "#EF4444", 
      "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6"
    ];

    let accumulatedPercentage = 0;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    return categories.map((cat, idx) => {
      const strokeDasharray = `${(cat.percentage * circumference) / 100} ${circumference}`;
      const strokeDashoffset = -((accumulatedPercentage * circumference) / 100);
      accumulatedPercentage += cat.percentage;

      return {
        ...cat,
        color: colors[idx % colors.length],
        strokeDasharray,
        strokeDashoffset
      };
    });
  }, [categories]);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto p-6 gap-6 text-foreground">
      
      {/* HEADER & CONTROLES */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border/60 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            QA & Dashboard de Calidad
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Auditoría operativa, tasa RAG y detección de brechas | Rol: <span className="font-semibold text-foreground">{currentUser.role || "N/A"}</span>
          </p>
        </div>

        {/* FILTROS GLOBALES */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Campañas (Restringido a Admin) */}
          {isAdmin ? (
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Todas las Campañas</option>
              {campaigns.map((c) => (
                <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-1.5 bg-secondary/50 border border-border rounded-lg text-xs font-medium text-muted-foreground">
              Campaña: {currentUser.campaign_id || "Asignada"}
            </div>
          )}

          {/* Rango de Días */}
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(Number(e.target.value))}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary/50"
          >
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
          </select>

          {/* Categoría */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Todas las Categorías</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category}>{c.category}</option>
            ))}
          </select>

          {/* Fechas desde/hasta */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent focus:outline-none text-[11px]" 
            />
            <span className="text-muted-foreground">-</span>
            <input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent focus:outline-none text-[11px]" 
            />
          </div>

          <button
            onClick={() => { loadDashboardData(); loadAuditLog(auditPage); }}
            className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-xl border border-border/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Total Consultas</p>
            <h3 className="text-2xl font-bold mt-1">{summary?.total_queries ?? 0}</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Categoría Top</p>
            <h3 className="text-lg font-bold mt-1 truncate max-w-[140px]" title={summary?.top_category ?? "N/A"}>
              {summary?.top_category ?? "N/A"}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Campaña Más Activa</p>
            <h3 className="text-xs font-bold mt-1 truncate max-w-[140px]" title={summary?.most_active_campaign ?? "N/A"}>
              {summary?.most_active_campaign ?? "N/A"}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border/60 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Tasa RAG Global</p>
            <h3 className="text-2xl font-bold mt-1">{summary?.rag_rate ?? 0}%</h3>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <Database className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* CHARTS & TOP QUERIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DONUT SVG INLINE */}
        <div className="bg-card p-5 rounded-xl border border-border/60 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-semibold border-b border-border/40 pb-3">
            Distribución por Categorías
          </h3>

          {categories.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
              Sin datos de categorías en este rango.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {donutSlices.map((slice, i) => (
                    <circle
                      key={i}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth="12"
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      className="transition-all duration-500 ease-out"
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs text-muted-foreground font-medium">Tipos</span>
                  <span className="text-sm font-bold">{categories.length}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2">
                {donutSlices.map((slice) => (
                  <div key={slice.category} className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                    <span className="font-medium truncate max-w-[130px]">{slice.category}</span>
                    <span className="text-muted-foreground ml-auto">{slice.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TOP QUERIES */}
        <div className="bg-card p-5 rounded-xl border border-border/60 shadow-sm flex flex-col justify-between">
          <h3 className="text-sm font-semibold border-b border-border/40 pb-3">
            Consultas Más Frecuentes
          </h3>

          <div className="space-y-2.5 my-3 max-h-56 overflow-y-auto pr-1">
            {topQueries.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No hay registros de consultas repetidas.</p>
            ) : (
              topQueries.map((q, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-lg text-xs gap-3">
                  <span className="font-medium truncate flex-1" title={q.query_text}>
                    {q.query_text}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold text-[10px] shrink-0">
                    {q.category}
                  </span>
                  <span className="font-bold text-foreground bg-background px-2 py-0.5 rounded border border-border text-[11px] shrink-0">
                    {q.count} veces
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MOTOR DE ALERTAS (INSIGHTS) */}
      <div className="bg-card p-5 rounded-xl border border-border/60 shadow-sm">
        <h3 className="text-sm font-semibold border-b border-border/40 pb-3 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Brechas Operativas Detectadas
        </h3>

        {insights.length === 0 ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            No se detectaron brechas críticas en los patrones de consulta.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((item) => {
              const isHigh = item.level === "high";
              const isMedium = item.level === "medium";

              return (
                <div 
                  key={item.id} 
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 text-xs ${
                    isHigh 
                      ? "bg-destructive/10 border-destructive/30 text-destructive" 
                      : isMedium 
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" 
                        : "bg-blue-500/10 border-blue-500/30 text-blue-500"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 font-bold mb-1">
                      {isHigh ? "🔴" : isMedium ? "🟡" : "🟢"}
                      <span>{item.title}</span>
                    </div>
                    <p className="opacity-90 mt-1">{item.finding}</p>
                  </div>
                  <div className="pt-2 border-t border-current/20 text-[11px] font-medium">
                     <strong>Recomendación:</strong> {item.recommendation}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REGISTRO DE AUDITORIA PAGINADO */}
      <div className="bg-card p-5 rounded-xl border border-border/60 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <h3 className="text-sm font-semibold">Registro Histórico de Auditoría</h3>
          <span className="text-xs text-muted-foreground">Total: {auditTotalItems} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 uppercase text-[10px] text-muted-foreground border-b border-border/60">
              <tr>
                <th className="p-3">Agente</th>
                <th className="p-3">Consulta</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Fuentes RAG</th>
                <th className="p-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loadingAudit ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Cargando registros...
                  </td>
                </tr>
              ) : auditItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No hay registros de auditoría que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                auditItems.map((item) => (
                  <tr key={item.log_id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-3 font-medium text-foreground">{item.agent_name}</td>
                    <td className="p-3 max-w-xs truncate" title={item.query_text}>{item.query_text}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-secondary border border-border text-[10px] font-medium">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3">
                      {item.rag_used ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sí ({item.rag_sources?.length || 0})
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* CONTROLES PAGINACION */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Página {auditPage} de {auditTotalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={auditPage <= 1 || loadingAudit}
              onClick={() => loadAuditLog(auditPage - 1)}
              className="p-1.5 border border-border rounded-lg disabled:opacity-40 hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={auditPage >= auditTotalPages || loadingAudit}
              onClick={() => loadAuditLog(auditPage + 1)}
              className="p-1.5 border border-border rounded-lg disabled:opacity-40 hover:bg-secondary transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
