import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Layers,
  Activity,
  Cpu,
  DollarSign,
  Users,
  Search,
  ArrowUpDown,
  RefreshCw,
  TrendingUp,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { adminApi, AdminMetricsResponse, UserMetric } from "@/services/api";
import { toast } from "sonner";

const COLORS = [
  "#8f8cff", 
  "#1aeda1", 
  "#5bb8b5", 
  "#7c6cf0",
  "#69d3cf", 
  "#2bbfa0", 
];

const ACCENT = {
  violet: "#8f8cff",
  green: "#1aeda1",
  teal: "#5bb8b5",
  deepViolet: "#7c6cf0",
} as const;

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-card, rgba(30, 41, 59, 0.92))",
  borderColor: "var(--color-border, rgba(255,255,255,0.1))",
  borderRadius: "12px",
  fontSize: "11px",
  color: "var(--color-foreground, #f8fafc)",
  backdropFilter: "blur(8px)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
};

const TOOLTIP_LABEL_STYLE = {
  fontWeight: "bold" as const,
  color: "var(--color-foreground, #f8fafc)",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [days, setDays] = useState<number>(14);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [data, setData] = useState<AdminMetricsResponse | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortField, setSortField] = useState<keyof UserMetric>("total_cost");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const fetchMetrics = async (showRefreshToast = false) => {
    if (showRefreshToast) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await adminApi.getMetrics();
      setData(response);
    } catch (error) {
      console.error("Error loading metrics:", error);
      toast.error("Error al cargar las métricas del servidor");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [days]);

  // Handle table sorting
  const handleSort = (field: keyof UserMetric) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredUsers = data?.by_user
    ? data.by_user
        .filter(
          (u) =>
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.department.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        .sort((a, b) => {
          const valA = a[sortField];
          const valB = b[sortField];
          if (typeof valA === "string" && typeof valB === "string") {
            return sortAsc
              ? valA.localeCompare(valB)
              : valB.localeCompare(valA);
          }
          if (typeof valA === "number" && typeof valB === "number") {
            return sortAsc ? valA - valB : valB - valA;
          }
          return 0;
        })
    : [];

  const formatDate = (isoStr: string) => {
    if (!isoStr) return "N/A";
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return isoStr;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-background">
        <RefreshCw className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Olivia está preparando el chisme estadístico del día...
        </p>
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto bg-background text-foreground scrollbar-thin">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 space-y-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Panel de Administración
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Métricas de uso reales por perfil, modelo y departamento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchMetrics(true)}
              disabled={refreshing}
              className="p-2 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
              title="Refrescar datos"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>

            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-border bg-card text-xs text-muted-foreground font-semibold focus:outline-none transition-all cursor-pointer"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={14}>Últimos 14 días</option>
              <option value={30}>Últimos 30 días</option>
            </select>

            <button
              onClick={() => navigate("/app/chat")}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/80 border border-border transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al chat
            </button>
          </div>
        </div>

        {/* ─── SUMMARY CARDS GRID ─── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Card 1: Total Consultas */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm relative overflow-hidden group hover:border-[#8f8cff]/60 transition-all duration-300"
          >
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-bl-full transition-all group-hover:scale-110"
              style={{ backgroundColor: `${ACCENT.violet}14` }}
            />
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: ACCENT.violet }}
              >
                Consultas Totales
              </span>
              <Calendar className="w-4 h-4" style={{ color: ACCENT.violet }} />
            </div>
            <p className="text-2xl font-bold mt-3 tracking-tight">
              {summary?.total_requests ?? 0}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Tiempo real</span>
            </div>
          </motion.div>

          {/* Card 2: Costo Total */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm relative overflow-hidden group hover:border-[#1aeda1]/60 transition-all duration-300"
          >
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-bl-full transition-all group-hover:scale-110"
              style={{ backgroundColor: `${ACCENT.green}14` }}
            />
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: ACCENT.green }}
              >
                Costo Total
              </span>
              <DollarSign className="w-4 h-4" style={{ color: ACCENT.green }} />
            </div>
            <p className="text-2xl font-bold mt-3 tracking-tight">
              ${summary?.total_cost?.toFixed(4) ?? "0.00"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">
              Promedio/req:{" "}
              <span className="font-semibold text-foreground">
                ${summary?.avg_cost_per_request?.toFixed(5) ?? "0.000"}
              </span>
            </p>
          </motion.div>

          {/* Card 3: Usuarios Activos */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm relative overflow-hidden group hover:border-[#5bb8b5]/60 transition-all duration-300"
          >
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-bl-full transition-all group-hover:scale-110"
              style={{ backgroundColor: `${ACCENT.teal}14` }}
            />
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: ACCENT.teal }}
              >
                Perfiles Activos
              </span>
              <Users className="w-4 h-4" style={{ color: ACCENT.teal }} />
            </div>
            <p className="text-2xl font-bold mt-3 tracking-tight">
              {summary?.active_users ?? 0}
            </p>
            <p className="text-[10px] text-foreground mt-2">
              Promedio tokens/req:{" "}
              <span className="font-semibold text-foreground">
                {summary?.avg_tokens_per_request ?? 0}
              </span>
            </p>
          </motion.div>

          {/* Card 4: Consultas por Minuto */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm relative overflow-hidden group hover:border-[#7c6cf0]/60 transition-all duration-300"
          >
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-bl-full transition-all group-hover:scale-110"
              style={{ backgroundColor: `${ACCENT.deepViolet}14` }}
            />
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: ACCENT.deepViolet }}
              >
                Consultas / Minuto
              </span>
              <div className="flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: ACCENT.deepViolet }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ backgroundColor: ACCENT.deepViolet }}
                  />
                </span>
                <TrendingUp className="w-4 h-4" style={{ color: ACCENT.deepViolet }} />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3 tracking-tight">
              {summary?.requests_per_minute ?? 0.0}
            </p>
            <p className="text-[10px] text-muted-foreground mt-2">
              Tokens input:{" "}
              <span className="font-semibold text-foreground">
                {summary?.total_tokens_input.toLocaleString() ?? 0}
              </span>
            </p>
          </motion.div>
        </div>

        {/* ─── CHARTS SECTION ─── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Area Chart: Timeline usage */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[20px] font-bold text-foreground">
                  Historial de Consultas y Costos
                </h2>
                <p className="text-[15px] text-muted-foreground mt-0.5">
                  Evolución diaria del volumen y costos generados
                </p>
              </div>
            </div>

            <div className="h-[260px] w-full text-[15px]">
              {data && data.timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.timeline}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorRequests"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={ACCENT.violet}
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor={ACCENT.violet}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorCost"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={ACCENT.green}
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="95%"
                          stopColor={ACCENT.green}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border/30"
                      strokeOpacity={0.4}
                    />
                    <XAxis
                      dataKey="date"
                      fontSize={10}
                      className="fill-muted-foreground"
                      stroke="currentColor"
                      tickLine={false}
                      tick={{ fill: "var(--color-muted-foreground, #999)" }}
                    />
                    <YAxis
                      yAxisId="left"
                      fontSize={12}
                      stroke={ACCENT.violet}
                      tickLine={false}
                      tick={{ fill: ACCENT.violet }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      fontSize={12}
                      stroke={ACCENT.green}
                      tickLine={false}
                      tick={{ fill: ACCENT.green }}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={TOOLTIP_LABEL_STYLE}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="requests"
                      name="Consultas"
                      stroke={ACCENT.violet}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRequests)"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="total_cost"
                      name="Costo ($)"
                      stroke={ACCENT.green}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCost)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Sin datos históricos en el rango
                </div>
              )}
            </div>
          </div>

          {/* Model Distribution Donut Chart */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-[20px] font-bold text-foreground">
                Distribución de Modelos
              </h2>
              <p className="text-[15px] text-muted-foreground mt-0.5">
                Modelos LLM más solicitados por consultas
              </p>
            </div>

            <div className="h-[200px] w-full relative flex items-center justify-center">
              {data && data.by_model.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.by_model}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="requests"
                      nameKey="model_name"
                    >
                      {data.by_model.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Sin datos de modelos
                </div>
              )}
              {/* Donut Center text */}
              {data && data.by_model.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Modelos
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {data.by_model.length}
                  </span>
                </div>
              )}
            </div>

            {/* Model Legends */}
            <div className="grid grid-cols-2 gap-2 text-[10px] mt-1">
              {data?.by_model.slice(0, 6).map((item, idx) => (
                <div
                  key={item.model_name}
                  className="flex items-center gap-1.5 truncate"
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <span
                    className="text-muted-foreground truncate"
                    title={item.model_name}
                  >
                    {item.model_name}:{" "}
                    <span className="font-semibold text-foreground">
                      {item.requests}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── SECOND ROW CHART: Department Usage ─── */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm md:col-span-3 space-y-4">
            <div>
              <h2 className="text-[20px] font-bold text-foreground">
                Consumo por Departamento
              </h2>
              <p className="text-[15px] text-muted-foreground mt-0.5">
                Ranking de departamentos con mayor gasto acumulado y volumen
              </p>
            </div>

            <div className="h-[200px] w-full">
              {data && data.by_department.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.by_department}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      strokeOpacity={0.4}
                    />
                    <XAxis
                      dataKey="department_name"
                      fontSize={12}
                      tickLine={false}
                      tick={{ fill: "var(--color-muted-foreground, #999)" }}
                    />
                    <YAxis
                      yAxisId="left"
                      fontSize={12}
                      stroke={ACCENT.violet}
                      tickLine={false}
                      tick={{ fill: ACCENT.violet }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      fontSize={12}
                      stroke={ACCENT.green}
                      tickLine={false}
                      tick={{ fill: ACCENT.green }}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                    <Bar
                      yAxisId="left"
                      dataKey="requests"
                      name="Consultas"
                      fill={ACCENT.violet}
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="total_cost"
                      name="Costo ($)"
                      fill={ACCENT.green}
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Sin datos de departamentos
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── DETAILED USAGE BY PROFILE TABLE ─── */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Estadísticas por Perfil de Usuario
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Listado detallado de empleados con métricas de consumo en tiempo
                real
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o área..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/40">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40">
                  <th
                    className="px-4 py-3 cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Usuario <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("role")}
                  >
                    <div className="flex items-center gap-1">
                      Rol <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("department")}
                  >
                    <div className="flex items-center gap-1">
                      Área / Departamento <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("requests")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Consultas <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("tokens_input")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Tokens Totales <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("total_cost")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Costo Acumulado <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("most_used_model")}
                  >
                    <div className="flex items-center gap-1">
                      Modelo Favorito <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("last_use")}
                  >
                    <div className="flex items-center gap-1">
                      Último Uso <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.user_id}
                      className="hover:bg-secondary/20 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-semibold text-foreground">
                            {user.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            user.role.toLowerCase() === "admin"
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {user.department}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium">
                        {user.requests}
                      </td>
                      <td className="px-4 py-3.5 text-right text-muted-foreground font-mono">
                        {(
                          user.tokens_input + user.tokens_output
                        ).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold font-mono"
                        style={{ color: ACCENT.green }}
                      >
                        ${user.total_cost.toFixed(5)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-secondary/50 font-mono text-[10px] text-foreground border border-border/40">
                          {user.most_used_model}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground font-mono">
                        {formatDate(user.last_use)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-muted-foreground text-xs"
                    >
                      No se encontraron usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}