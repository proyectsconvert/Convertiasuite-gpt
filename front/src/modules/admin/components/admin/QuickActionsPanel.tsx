import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, X, Sparkles, RefreshCw, AlertCircle, Save } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { adminApi, QuickAction } from "@/modules/shared/services/api";
import { toast } from "sonner";

export default function QuickActionsPanel() {
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<QuickAction | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<QuickAction>>({
    label: "",
    description: "",
    prompt: "",
    icon: "FileText",
    color: "from-blue-500/10 to-cyan-500/10 hover:from-blue-500/15 hover:to-cyan-500/15",
    icon_color: "text-blue-500",
    is_active: true,
    order_index: 0,
  });

  const fetchActions = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await adminApi.getQuickActions();
      if (res.status === "success" && res.actions) {
        setActions(res.actions);
      }
    } catch (err: any) {
      toast.error(err.message || "Error al cargar las acciones rápidas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const handleOpenModal = (action?: QuickAction) => {
    if (action) {
      setEditingAction(action);
      setFormData(action);
    } else {
      setEditingAction(null);
      setFormData({
        label: "",
        description: "",
        prompt: "",
        icon: "FileText",
        color: "from-blue-500/10 to-cyan-500/10 hover:from-blue-500/15 hover:to-cyan-500/15",
        icon_color: "text-blue-500",
        is_active: true,
        order_index: actions.length,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label || !formData.description || !formData.prompt) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }

    try {
      setRefreshing(true);
      if (editingAction?.action_id) {
        await adminApi.updateQuickAction(editingAction.action_id, formData);
        toast.success("Acción rápida actualizada correctamente");
      } else {
        await adminApi.createQuickAction(formData as QuickAction);
        toast.success("Acción rápida creada exitosamente");
      }
      setIsModalOpen(false);
      fetchActions();
    } catch (err: any) {
      toast.error(err.message || "Error al guardar la acción rápida");
      setRefreshing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta acción rápida?")) return;
    try {
      setRefreshing(true);
      await adminApi.deleteQuickAction(id);
      toast.success("Acción rápida eliminada");
      fetchActions();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar");
      setRefreshing(false);
    }
  };

  const toggleStatus = async (action: QuickAction) => {
    if (!action.action_id) return;
    try {
      setRefreshing(true);
      await adminApi.updateQuickAction(action.action_id, { is_active: !action.is_active });
      toast.success(`Acción rápida ${!action.is_active ? 'activada' : 'desactivada'}`);
      fetchActions();
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar estado");
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Acciones Rápidas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gestiona los prompts sugeridos en la pantalla de bienvenida del chat
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchActions(true)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-border bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Acción
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {actions.length > 0 ? (
          actions.map((action) => {
            const IconComponent = (action.icon && (LucideIcons as any)[action.icon]) || Sparkles;
            return (
              <motion.div
                key={action.action_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative group rounded-2xl border ${
                  action.is_active ? "border-border/50 hover:border-primary/50" : "border-border/20 opacity-60"
                } bg-card p-5 shadow-sm transition-all duration-300 overflow-hidden flex flex-col justify-between min-h-[220px]`}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full bg-gradient-to-br ${action.color} opacity-20 pointer-events-none transition-transform group-hover:scale-110`} />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2 rounded-lg bg-secondary/50 ${action.icon_color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleStatus(action)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-colors ${
                          action.is_active 
                            ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20" 
                            : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                        }`}
                      >
                        {action.is_active ? "Activo" : "Inactivo"}
                      </button>
                    </div>
                  </div>

                  <h3 className="text-[15px] font-bold text-foreground mb-1 leading-tight">{action.label}</h3>
                  <p className="text-[11px] text-muted-foreground mb-3">{action.description}</p>
                  
                  <div className="bg-secondary/40 rounded-lg p-2.5 border border-border/30 relative">
                    <p className="text-[10px] text-muted-foreground line-clamp-3 italic">"{action.prompt}"</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
                  <span className="text-[10px] font-mono text-muted-foreground">Orden: {action.order_index}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenModal(action)}
                      className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => action.action_id && handleDelete(action.action_id)}
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border/60 rounded-2xl">
            <AlertCircle className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-sm font-medium">No hay acciones rápidas configuradas</p>
            <p className="text-xs mt-1 opacity-70">Crea una para que aparezca en la pantalla de bienvenida</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-border/40 p-4 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    {editingAction ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    {editingAction ? "Editar Acción Rápida" : "Nueva Acción Rápida"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form id="action-form" onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Título (Label) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Generar propuesta..."
                    value={formData.label || ""}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Descripción Breve *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Documentos con IA"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Prompt Completo a enviar *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="El texto exacto que se insertará en el chat..."
                    value={formData.prompt || ""}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Ícono (Lucide)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. FileText, Globe"
                      value={formData.icon || ""}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Orden
                    </label>
                    <input
                      type="number"
                      value={formData.order_index ?? 0}
                      onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Color Icono (Tailwind)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. text-emerald-500"
                      value={formData.icon_color || ""}
                      onChange={(e) => setFormData({ ...formData, icon_color: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                      Clases Gradiente Fondo
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. from-emerald-500/10 to-teal-500/10"
                      value={formData.color || ""}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-[10px]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-border bg-background text-primary focus:ring-primary"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-foreground cursor-pointer">
                    Activa (visible para usuarios)
                  </label>
                </div>
              </form>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-border/40 bg-secondary/20 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground font-medium text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="action-form"
                  disabled={refreshing}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {refreshing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {refreshing ? "Guardando..." : "Guardar Acción"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
