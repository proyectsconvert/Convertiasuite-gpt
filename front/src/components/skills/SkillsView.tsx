import { useEffect, useMemo, useState, useCallback } from "react";
import * as Icons from "lucide-react";
import {
  Search,
  Sparkles,
  Server,
  Code2,
  PenTool,
  BarChart3,
  Globe,
  Lightbulb,
  Palette,
  Shield,
  Zap,
  SlidersHorizontal,
  Tag,
  ChevronRight,
  X,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { skillsApi, type Skill } from "@/services/api";
import { useAppStore } from "@/store/appStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function getSkillIcon(iconName: string) {
  if (!iconName) {
    return Icons.Sparkles;
  }

  const normalized = iconName
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");

  const toPascalCase = (value: string) =>
    value
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
      .replace(/^(.)/, (match) => match.toUpperCase());

  const iconNameCandidates = [
    normalized,
    normalized.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
    `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`,
    toPascalCase(normalized),
  ];

  for (const name of iconNameCandidates) {
    if (name in Icons) {
      return (Icons as Record<string, typeof Icons.Sparkles>)[name];
    }
  }

  return Icons.Sparkles;
}

const CATEGORY_COLORS: Record<string, { gradient: string; text: string; bg: string; border: string }> = {
  Development: {
    gradient: "from-cyan-500/15 to-blue-500/15",
    text: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
  },
  Marketing: {
    gradient: "from-pink-500/15 to-rose-500/15",
    text: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
  },
  Analysis: {
    gradient: "from-amber-500/15 to-orange-500/15",
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  Design: {
    gradient: "from-purple-500/15 to-violet-500/15",
    text: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
  },
  General: {
    gradient: "from-emerald-500/15 to-teal-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS["General"];
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted/60", className)} />
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/40 p-5 space-y-4"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4 border border-primary/20">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">
        No se encontraron skills
      </h3>
      <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
        No hay skills disponibles que coincidan con tu búsqueda.
        Prueba con otros filtros.
      </p>
    </motion.div>
  );
}

function DetailModal({
  skill,
  open,
  onClose,
  isEnabled,
  onToggle,
}: {
  skill: Skill | null;
  open: boolean;
  onClose: () => void;
  isEnabled: boolean;
  onToggle: () => void;
}) {
  if (!skill) return null;
  const catColor = getCategoryColor(skill.category);
  const Icon = getSkillIcon(skill.icon);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-base font-semibold">
            <div className={cn("p-2.5 rounded-xl", catColor.bg)}>
              <Icon className={cn("w-5 h-5", catColor.text)} />
            </div>
            <div className="min-w-0">
              <span className="truncate block">{skill.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {skill.category} · v{skill.version}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Description */}
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">
              Descripción
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              {skill.description}
            </p>
          </div>

          {/* Tags */}
          {skill.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {skill.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs gap-1 font-normal"
                >
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Prompt preview */}
          {skill.prompt && (
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">
                Prompt del sistema
              </p>
              <p className="text-sm text-muted-foreground line-clamp-6 whitespace-pre-wrap font-mono text-xs leading-relaxed">
                {skill.prompt || "Sin prompt configurado"}
              </p>
            </div>
          )}

          {/* Usage hint */}
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
            <p className="text-xs text-primary font-medium mb-1">
              💡 ¿Cómo usar esta skill?
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Activa la skill y escribe <code className="px-1 py-0.5 bg-primary/10 rounded text-primary font-mono text-[11px]">@{skill.name}</code> en el chat para invocarla.
            </p>
          </div>

          {/* Toggle Action */}
          <Button
            className={cn(
              "w-full gap-2 rounded-xl font-medium transition-all",
              isEnabled
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            variant={isEnabled ? "outline" : "default"}
            onClick={() => {
              onToggle();
              onClose();
            }}
          >
            {isEnabled ? (
              <>
                <X className="w-4 h-4" />
                Deshabilitar skill
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Habilitar skill
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SkillCard({
  skill,
  isEnabled,
  onToggle,
  onSelect,
}: {
  skill: Skill;
  isEnabled: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const catColor = getCategoryColor(skill.category);
  const Icon = getSkillIcon(skill.icon);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group relative rounded-2xl border bg-card overflow-hidden transition-all duration-200 cursor-pointer",
        isEnabled
          ? "border-primary/30 shadow-sm shadow-primary/5"
          : "border-border/40 hover:border-border/60 hover:shadow-sm"
      )}
      onClick={onSelect}
    >
      {/* Enabled indicator */}
      {isEnabled && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#1aeda1] to-[#bab8ff]" />
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105",
              catColor.bg
            )}
          >
            <Icon className={cn("w-5 h-5", catColor.text)} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {skill.name}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {skill.category} · v{skill.version}
            </p>
          </div>

          {/* Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={cn(
              "flex-shrink-0 w-10 h-[22px] rounded-full transition-all duration-200 relative",
              isEnabled
                ? "bg-primary"
                : "bg-muted-foreground/20"
            )}
            title={isEnabled ? "Deshabilitar" : "Habilitar"}
          >
            <motion.div
              className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm"
              animate={{ left: isEnabled ? 20 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
          {skill.description}
        </p>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {skill.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                catColor.bg,
                catColor.text
              )}
            >
              {tag}
            </span>
          ))}
          {skill.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">
              +{skill.tags.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Bottom status bar */}
      <div
        className={cn(
          "px-5 py-2.5 border-t flex items-center justify-between text-[11px]",
          isEnabled
            ? "border-primary/10 bg-primary/[0.03]"
            : "border-border/30 bg-muted/30"
        )}
      >
        <span
          className={cn(
            "flex items-center gap-1.5 font-medium",
            isEnabled ? "text-primary" : "text-muted-foreground"
          )}
        >
          {isEnabled ? (
            <>
              <Check className="w-3 h-3" />
              Activa
            </>
          ) : (
            "Inactiva"
          )}
        </span>
        <span className="text-muted-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Ver detalles
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </motion.div>
  );
}

// Maps a user's area/department name to the skill category it corresponds to.
// Returns the matching category string, or null if no match found.
function areaToCategory(area: string | null | undefined): string | null {
  if (!area) return null;
  const a = area.toLowerCase().trim();
  if (a.includes("bi") || a.includes("business intelligence") || a.includes("datos") || a.includes("data")) return "BI";
  if (a.includes("desarrollo") || a.includes("dev") || a.includes("it") || a.includes("software") || a.includes("tecnolog")) return "Desarrollo";
  if (a.includes("diseño") || a.includes("dise") || a.includes("design") || a.includes("ux") || a.includes("ui")) return "Diseño";
  if (a.includes("reclutamiento") || a.includes("r&s") || a.includes("rs") || a.includes("rrhh") || a.includes("talento") || a.includes("recursos humanos") || a.includes("hr")) return "R&S";
  // Marketing / Ventas could be added here in the future
  if (a.includes("marketing") || a.includes("ventas") || a.includes("comercial")) return "Marketing";
  return null;
}

export default function SkillsView() {
  const { skills, setSkills, enabledSkillIds, toggleSkill, user } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showAllAreas, setShowAllAreas] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Derived: the category that maps to the current user's area
  const userAreaCategory = useMemo(() => areaToCategory(user?.area), [user?.area]);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const response = await skillsApi.listSkills();
      setSkills(response.skills || []);
    } catch {
      toast.error("No se pudieron cargar las skills");
    } finally {
      setLoading(false);
    }
  }, [setSkills]);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  const filteredSkills = useMemo(() => {
    return skills.filter((s) => {
      const matchSearch = search
        ? s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.description.toLowerCase().includes(search.toLowerCase()) ||
          s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
        : true;
      // Area filter: if user has a mapped area and showAllAreas is off, restrict to that area's category
      const matchArea =
        !showAllAreas && userAreaCategory
          ? s.category === userAreaCategory
          : true;
      // Category filter: from sidebar click (overrides area filter if explicitly selected)
      const matchCategory = categoryFilter
        ? s.category === categoryFilter
        : true;
      return matchSearch && matchArea && matchCategory;
    });
  }, [skills, search, categoryFilter, showAllAreas, userAreaCategory]);

  const categories = useMemo(() => {
    // When showing all areas, list all categories; otherwise only the user's area category
    const baseSkills = !showAllAreas && userAreaCategory
      ? skills.filter(s => s.category === userAreaCategory)
      : skills;
    const cats = new Set(baseSkills.map((s) => s.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [skills, showAllAreas, userAreaCategory]);

  const enabledSkills = useMemo(
    () => skills.filter((skill) => enabledSkillIds.includes(skill.id)),
    [skills, enabledSkillIds],
  );

  const enabledCount = enabledSkills.length;

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-background">
      {/* ── Left Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r border-border/50 py-4 px-3 gap-1 bg-sidebar">
        {/* Header */}
        <div className="px-3 mb-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Skills
          </h2>
          {/* Area badge */}
          {userAreaCategory && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Área: <span className="font-semibold text-foreground">{userAreaCategory}</span>
            </p>
          )}
        </div>

        {/* View scope toggle */}
        <div className="px-3 mb-3">
          <button
            onClick={() => {
              setShowAllAreas((prev) => !prev);
              setCategoryFilter("");
            }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border",
              showAllAreas
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/50 text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
            )}
          >
            <Globe className="w-3.5 h-3.5 flex-shrink-0" />
            {showAllAreas ? "Viendo todas las áreas" : "Ver todas las áreas"}
          </button>
        </div>

        {/* Filter: all within scope */}
        <nav className="space-y-0.5 mb-4">
          <button
            onClick={() => setCategoryFilter("")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
              !categoryFilter
                ? "bg-sidebar-accent text-foreground font-semibold"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="w-4 h-4 flex-shrink-0" />
            {showAllAreas ? "Todas" : "Mi área"}
            <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
              {filteredSkills.length}
            </span>
          </button>
        </nav>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="px-3 mb-2">
            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              Categorías
            </p>
          </div>
        )}
        <nav className="space-y-0.5">
          {categories.map((cat) => {
            const catColor = getCategoryColor(cat);
            const count = skills.filter((s) => s.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() =>
                  setCategoryFilter(categoryFilter === cat ? "" : cat)
                }
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                  categoryFilter === cat
                    ? "bg-sidebar-accent text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    catColor.bg,
                    catColor.text
                  )}
                  style={{
                    backgroundColor:
                      categoryFilter === cat ? "currentColor" : undefined,
                  }}
                />
                {cat}
                <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Enabled skills summary */}
        <div className="mt-auto pt-4 border-t border-border/40">
          <div className="text-xs text-muted-foreground px-3 mb-2">
            {enabledCount} skill{enabledCount !== 1 ? "s" : ""} activa
            {enabledCount !== 1 ? "s" : ""}
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mx-3">
            <div
              className="h-full bg-gradient-to-r from-[#1aeda1] to-[#bab8ff] rounded-full transition-all"
              style={{
                width: `${skills.length > 0 ? Math.min((enabledCount / skills.length) * 100, 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/40 bg-background/80 backdrop-blur-sm flex-shrink-0">
          {/* Title (mobile) */}
          <div className="lg:hidden flex items-center gap-2 mr-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Skills</h2>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="skills-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar skills..."
              className="pl-9 h-9 rounded-xl border-border/50 bg-secondary/50 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mobile: area toggle + category filter */}
          <div className="lg:hidden flex items-center gap-2">
            {userAreaCategory && (
              <button
                onClick={() => {
                  setShowAllAreas((prev) => !prev);
                  setCategoryFilter("");
                }}
                className={cn(
                  "h-9 px-3 rounded-xl text-xs font-medium border transition-all whitespace-nowrap",
                  showAllAreas
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/50 bg-secondary/50 text-muted-foreground"
                )}
              >
                <Globe className="w-3.5 h-3.5 inline mr-1" />
                {showAllAreas ? "Todas las áreas" : "Mi área"}
              </button>
            )}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 px-3 rounded-xl border border-border/50 bg-secondary/50 text-xs text-foreground outline-none"
            >
              <option value="">{showAllAreas ? "Todas" : "Mi área"}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Enabled badge */}
         
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <GridSkeleton />
          ) : filteredSkills.length === 0 ? (
            <EmptyState />
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {filteredSkills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    isEnabled={enabledSkillIds.includes(skill.id)}
                    onToggle={() => {
                      toggleSkill(skill.id);
                      const wasEnabled = enabledSkillIds.includes(skill.id);
                      toast.success(
                        wasEnabled
                          ? `"${skill.name}" deshabilitada`
                          : `"${skill.name}" habilitada — usa @${skill.name} en el chat`
                      );
                    }}
                    onSelect={() => {
                      setSelectedSkill(skill);
                      setDetailOpen(true);
                    }}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <DetailModal
        skill={selectedSkill}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        isEnabled={
          selectedSkill
            ? enabledSkillIds.includes(selectedSkill.id)
            : false
        }
        onToggle={() => {
          if (selectedSkill) {
            toggleSkill(selectedSkill.id);
            const wasEnabled = enabledSkillIds.includes(selectedSkill.id);
            toast.success(
              wasEnabled
                ? `"${selectedSkill.name}" deshabilitada`
                : `"${selectedSkill.name}" habilitada`
            );
          }
        }}
      />
    </div>
  );
}
