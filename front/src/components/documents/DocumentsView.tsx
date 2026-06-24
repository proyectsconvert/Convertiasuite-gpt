import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  File,
  Upload,
  Download,
  Trash2,
  Search,
  LayoutGrid,
  List,
  MoreVertical,
  Clock,
  HardDrive,
  ChevronDown,
  X,
  Tag,
  Info,
  FolderOpen,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { documentsApi } from "@/services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DocumentItem {
  id: string;
  filename: string;
  type: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  tags: string[];
  metadata: Record<string, unknown>;
  preview_text: string;
  version: number;
  history: Array<{
    version?: number;
    action?: string;
    timestamp?: string;
    summary?: string;
  }>;
}

type ViewMode = "grid" | "list";
type SidebarSection = "my-drive" | "recent";

// ─── File icon helpers ────────────────────────────────────────────────────────
const FILE_TYPE_CONFIG: Record<
  string,
  { icon: typeof FileText; color: string; bg: string; label: string }
> = {
  pdf: {
    icon: FileText,
    color: "text-red-500",
    bg: "bg-red-500/10",
    label: "PDF",
  },
  docx: {
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Word",
  },
  doc: {
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Word",
  },
  xlsx: {
    icon: FileSpreadsheet,
    color: "text-green-500",
    bg: "bg-green-500/10",
    label: "Excel",
  },
  xls: {
    icon: FileSpreadsheet,
    color: "text-green-500",
    bg: "bg-green-500/10",
    label: "Excel",
  },
  csv: {
    icon: FileSpreadsheet,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    label: "CSV",
  },
  pptx: {
    icon: FileImage,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    label: "PowerPoint",
  },
  ppt: {
    icon: FileImage,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    label: "PowerPoint",
  },
  txt: {
    icon: FileText,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Texto",
  },
  md: {
    icon: FileCode,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    label: "Markdown",
  },
  json: {
    icon: FileCode,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    label: "JSON",
  },
};

function getFileConfig(type: string) {
  return (
    FILE_TYPE_CONFIG[type?.toLowerCase()] ?? {
      icon: File,
      color: "text-muted-foreground",
      bg: "bg-muted",
      label: type?.toUpperCase() || "Archivo",
    }
  );
}

function formatBytes(words: number) {
  if (!words) return "—";
  return `${words.toLocaleString()} palabras`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/60",
        className
      )}
    />
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 p-4 space-y-3">
          <Skeleton className="h-12 w-12 rounded-lg mx-auto" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-20 hidden sm:block" />
          <Skeleton className="h-3 w-24 hidden md:block" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <FolderOpen className="w-10 h-10 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Mi unidad está vacía
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">
        Sube archivos para tenerlos disponibles desde cualquier lugar y
        compartirlos con la IA.
      </p>
      <Button onClick={onUpload} className="gap-2">
        <Plus className="w-4 h-4" />
        Subir primer archivo
      </Button>
    </motion.div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({
  doc,
  open,
  onClose,
  onDownload,
  onDelete,
}: {
  doc: DocumentItem | null;
  open: boolean;
  onClose: () => void;
  onDownload: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!doc) return null;
  const cfg = getFileConfig(doc.type);
  const Icon = cfg.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-base font-semibold">
            <div className={cn("p-2 rounded-lg", cfg.bg)}>
              <Icon className={cn("w-5 h-5", cfg.color)} />
            </div>
            <span className="truncate">{doc.filename}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Tags */}
          {doc.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {doc.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs gap-1">
                  <Tag className="w-3 h-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Tipo", value: cfg.label },
              { label: "Palabras", value: doc.word_count?.toLocaleString() || "—" },
              { label: "Versión", value: `v${doc.version}` },
              { label: "Creado", value: formatDate(doc.created_at) },
              { label: "Actualizado", value: formatDate(doc.updated_at) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-border/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="font-medium truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Preview */}
          {doc.preview_text && (
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Vista previa</p>
              <p className="text-sm text-muted-foreground line-clamp-5 whitespace-pre-wrap">
                {doc.preview_text}
              </p>
            </div>
          )}

          {/* History */}
          {doc.history?.length > 0 && (
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-xs text-muted-foreground mb-2 font-medium">
                Historial ({doc.history.length})
              </p>
              <ul className="space-y-1.5">
                {doc.history.slice(0, 4).map((entry, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between text-xs text-muted-foreground"
                  >
                    <span>{entry.action || `Versión ${entry.version ?? i + 1}`}</span>
                    {entry.timestamp && (
                      <span>{formatDate(entry.timestamp)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1 gap-2"
              onClick={() => onDownload(doc.id, doc.filename)}
            >
              <Download className="w-4 h-4" />
              Descargar
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => {
                onDelete(doc.id);
                onClose();
              }}
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Grid Card ────────────────────────────────────────────────────────────────
function GridCard({
  doc,
  onSelect,
  onDownload,
  onDelete,
}: {
  doc: DocumentItem;
  onSelect: (doc: DocumentItem) => void;
  onDownload: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = getFileConfig(doc.type);
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="group relative rounded-xl border border-border/40 bg-card hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={() => onSelect(doc)}
    >
      {/* File icon area */}
      <div className="flex flex-col items-center justify-center pt-7 pb-4 px-4">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-3", cfg.bg)}>
          <Icon className={cn("w-7 h-7", cfg.color)} />
        </div>
        <p className="text-xs font-medium text-center text-foreground line-clamp-2 leading-tight px-1">
          {doc.filename}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">{formatDate(doc.created_at)}</p>
      </div>

      {/* Type badge */}
      <div className="px-3 pb-3 flex items-center gap-1.5">
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {cfg.label}
        </Badge>
        {doc.tags.slice(0, 1).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 truncate max-w-[60px]">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Hover actions */}
      <div
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm shadow-sm"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onSelect(doc)} className="gap-2">
              <Info className="w-4 h-4" />
              Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDownload(doc.id, doc.filename)}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(doc.id)}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────
function ListRow({
  doc,
  onSelect,
  onDownload,
  onDelete,
}: {
  doc: DocumentItem;
  onSelect: (doc: DocumentItem) => void;
  onDownload: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = getFileConfig(doc.type);
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.15 }}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onSelect(doc)}
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", cfg.bg)}>
        <Icon className={cn("w-4 h-4", cfg.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc.filename}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {doc.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-[10px] text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <Badge variant="outline" className="text-[10px] hidden sm:flex">
        {cfg.label}
      </Badge>

      <span className="text-xs text-muted-foreground hidden md:block w-24 text-right flex-shrink-0">
        {formatBytes(doc.word_count)}
      </span>

      <span className="text-xs text-muted-foreground w-20 text-right flex-shrink-0">
        {formatDate(doc.updated_at)}
      </span>

      <div
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onSelect(doc)} className="gap-2">
              <Info className="w-4 h-4" />
              Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDownload(doc.id, doc.filename)}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(doc.id)}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DocumentsView() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [section, setSection] = useState<SidebarSection>("my-drive");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);

  // ── Load documents ──────────────────────────────────────────────────────────
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await documentsApi.listDocuments({
        search: search || undefined,
        type: typeFilter || undefined,
      });
      let docs = response.documents || [];

      // Sort by recent for "recent" section
      if (section === "recent") {
        docs = [...docs].sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ).slice(0, 20);
      }

      setDocuments(docs);
    } catch {
      toast.error("No se pudieron cargar los documentos");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, section]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (!files.length) return;

      setUploading(true);
      try {
        await Promise.all(files.map((file) => documentsApi.uploadFile(file)));
        toast.success(
          files.length === 1
            ? `"${files[0].name}" subido correctamente`
            : `${files.length} archivos subidos`
        );
        await loadDocuments();
      } catch {
        toast.error("Error al subir archivos");
      } finally {
        setUploading(false);
      }
    },
    [loadDocuments]
  );

  // ── File input upload ───────────────────────────────────────────────────────
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      await Promise.all(files.map((file) => documentsApi.uploadFile(file)));
      toast.success(
        files.length === 1
          ? `"${files[0].name}" subido correctamente`
          : `${files.length} archivos subidos`
      );
      await loadDocuments();
    } catch {
      toast.error("Error al subir archivos");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Download ────────────────────────────────────────────────────────────────
  const handleDownload = async (id: string, filename: string) => {
    try {
      const blob = await documentsApi.download(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Descarga iniciada");
    } catch {
      toast.error("No se pudo descargar el documento");
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("¿Eliminar este documento? Esta acción no se puede deshacer.");
    if (!confirmed) return;

    try {
      await documentsApi.delete(id);
      toast.success("Documento eliminado");
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (selectedDoc?.id === id) {
        setDetailOpen(false);
        setSelectedDoc(null);
      }
    } catch {
      toast.error("No se pudo eliminar");
    }
  };

  // ── Select doc ──────────────────────────────────────────────────────────────
  const handleSelectDoc = async (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setDetailOpen(true);
    try {
      const details = await documentsApi.getById(doc.id);
      setSelectedDoc(details);
    } catch {
      // keep current data
    }
  };

  // ── Filtered docs ───────────────────────────────────────────────────────────
  const filteredDocs = useMemo(() => {
    if (!search && !typeFilter) return documents;
    return documents.filter((d) => {
      const matchSearch = search
        ? d.filename.toLowerCase().includes(search.toLowerCase()) ||
          d.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
        : true;
      const matchType = typeFilter ? d.type === typeFilter : true;
      return matchSearch && matchType;
    });
  }, [documents, search, typeFilter]);

  // ── Sidebar nav items ───────────────────────────────────────────────────────
  const navItems: { id: SidebarSection; label: string; icon: typeof HardDrive }[] = [
    { id: "my-drive", label: "Mi unidad", icon: HardDrive },
    { id: "recent", label: "Recientes", icon: Clock },
  ];

  const fileTypes = useMemo(() => {
    const types = new Set(documents.map((d) => d.type).filter(Boolean));
    return Array.from(types).sort();
  }, [documents]);

  return (
    <div
      className="flex flex-1 h-full overflow-hidden bg-background"
      ref={dropZoneRef}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ── Drag overlay ── */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-primary/10 backdrop-blur-sm border-4 border-dashed border-primary rounded-2xl m-3 pointer-events-none"
          >
            <Upload className="w-14 h-14 text-primary mb-4" />
            <p className="text-xl font-semibold text-primary">
              Suelta aquí para subir
            </p>
            <p className="text-sm text-primary/70 mt-1">
              Admite PDF, DOCX, XLSX, PPTX, TXT, CSV, MD, JSON
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Left Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r border-border/50 py-4 px-3 gap-1">
        {/* New button */}
        <Button
          className="gap-2 mb-4 shadow-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Nuevo
            </>
          )}
        </Button>

        {/* Nav */}
        <nav className="space-y-0.5">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                section === id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Storage hint */}
        <div className="mt-auto pt-4 border-t border-border/40">
          <div className="text-xs text-muted-foreground px-3 mb-2">
            {documents.length} archivo{documents.length !== 1 ? "s" : ""}
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mx-3">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min((documents.length / 50) * 100, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 px-3">
            {documents.length} / 50 archivos (plan actual)
          </p>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── Toolbar ── */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 flex-shrink-0">
          {/* Mobile section label */}
          <div className="lg:hidden flex items-center gap-2 mr-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 h-8">
                  {navItems.find((n) => n.id === section)?.label}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {navItems.map(({ id, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={id}
                    onClick={() => setSection(id)}
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en Mi unidad..."
              className="pl-9 h-9 bg-muted/50 border-border/50 focus:bg-background"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type filter */}
          {fileTypes.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 hidden sm:flex">
                  <Tag className="w-3.5 h-3.5" />
                  {typeFilter ? getFileConfig(typeFilter).label : "Tipo"}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setTypeFilter("")}>
                  Todos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {fileTypes.map((t) => (
                  <DropdownMenuItem key={t} onClick={() => setTypeFilter(t)} className="gap-2">
                    <span className={cn("text-xs font-medium", getFileConfig(t).color)}>
                      {getFileConfig(t).label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* View toggle */}
          <div className="flex rounded-lg border border-border/50 overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile upload button */}
          <Button
            size="sm"
            className="lg:hidden gap-1.5 h-9"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-3.5 h-3.5" />
            Subir
          </Button>
        </div>

        {/* ── Section heading ── */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <h2 className="text-sm font-semibold text-foreground">
            {section === "my-drive" ? "Mi unidad" : "Recientes"}
            {!loading && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {filteredDocs.length} archivo{filteredDocs.length !== 1 ? "s" : ""}
                {typeFilter && ` · ${getFileConfig(typeFilter).label}`}
              </span>
            )}
          </h2>

          {/* List header */}
          {viewMode === "list" && !loading && filteredDocs.length > 0 && (
            <div className="flex items-center gap-3 px-3 py-1.5 mt-2 text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border/30">
              <div className="w-8 flex-shrink-0" />
              <span className="flex-1">Nombre</span>
              <span className="hidden sm:block w-16">Tipo</span>
              <span className="hidden md:block w-24 text-right">Tamaño</span>
              <span className="w-20 text-right">Modificado</span>
              <div className="w-7" />
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {loading ? (
            viewMode === "grid" ? <GridSkeleton /> : <ListSkeleton />
          ) : filteredDocs.length === 0 ? (
            <EmptyState onUpload={() => fileInputRef.current?.click()} />
          ) : viewMode === "grid" ? (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3"
              layout
            >
              <AnimatePresence mode="popLayout">
                {filteredDocs.map((doc) => (
                  <GridCard
                    key={doc.id}
                    doc={doc}
                    onSelect={handleSelectDoc}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="space-y-0.5">
              <AnimatePresence mode="popLayout">
                {filteredDocs.map((doc) => (
                  <ListRow
                    key={doc.id}
                    doc={doc}
                    onSelect={handleSelectDoc}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── Hidden file input ── */}
      <input
        ref={fileInputRef}
        id="document-upload-hidden"
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.pptx,.ppt,.txt,.md,.json"
        onChange={handleFileInput}
      />

      {/* ── Detail Modal ── */}
      <DetailModal
        doc={selectedDoc}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onDownload={handleDownload}
        onDelete={handleDelete}
      />
    </div>
  );
}
