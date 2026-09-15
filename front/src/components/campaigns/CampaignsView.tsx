import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi, Campaign, CampaignMember, SystemUser } from "@/services/api";
import { Users, Plus, Trash2, RefreshCw, X, Save, UserPlus, Search, Edit } from "lucide-react";
import { useAppStore } from "@/store/appStore";

export default function CampaignsView() {
  const { user } = useAppStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Members state
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // System users state
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getCampaigns();
      if (res.campaigns) {
        setCampaigns(res.campaigns);
      }
    } catch (e) {
      toast.error("Error al cargar las campañas");
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await adminApi.getUsers();
      if (res.users) {
        setSystemUsers(res.users);
      }
    } catch (e) {
      console.warn("Error al cargar lista de usuarios:", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchSystemUsers();
  }, []);

  const loadMembers = async (campaignId: string) => {
    try {
      setLoadingMembers(true);
      const res = await adminApi.getCampaignMembers(campaignId);
      if (res.members) {
        setMembers(res.members);
      }
    } catch (e) {
      toast.error("Error al cargar miembros de la campaña");
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSelectCampaign = (c: Campaign) => {
    setSelectedCampaign(c);
    loadMembers(c.campaign_id);
  };

  const deleteCampaign = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta campaña?")) return;
    try {
      await adminApi.deleteCampaign(id);
      toast.success("Campaña eliminada");
      if (selectedCampaign?.campaign_id === id) {
        setSelectedCampaign(null);
        setMembers([]);
      }
      fetchCampaigns();
    } catch (e) {
      toast.error("Error al eliminar la campaña");
    }
  };

  // Create Campaign Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDesc, setNewCampaignDesc] = useState("");

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName) {
      toast.error("El nombre de la campaña es obligatorio");
      return;
    }
    try {
      await adminApi.createCampaign({
        campaign_name: newCampaignName,
        description: newCampaignDesc,
        is_active: true,
      });
      toast.success("Campaña creada");
      setShowCreateModal(false);
      setNewCampaignName("");
      setNewCampaignDesc("");
      fetchCampaigns();
    } catch (e) {
      toast.error("Error al crear la campaña");
    }
  };

  // Add Member Modal State
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberTab, setAddMemberTab] = useState<"existing" | "new">("existing");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("agent");

  // New User Form State
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  const openAddMemberModal = () => {
    fetchSystemUsers();
    setSelectedUserId("");
    setUserSearchTerm("");
    setNewMemberRole("agent");
    setAddMemberTab("existing");
    setShowAddMemberModal(true);
  };

  const handleAddExistingMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    if (!selectedUserId) {
      toast.error("Por favor selecciona un usuario");
      return;
    }
    try {
      setIsSubmittingMember(true);
      await adminApi.addCampaignMember(
        selectedCampaign.campaign_id,
        selectedUserId,
        newMemberRole
      );
      toast.success("Miembro añadido exitosamente");
      setShowAddMemberModal(false);
      setSelectedUserId("");
      loadMembers(selectedCampaign.campaign_id);
    } catch (e) {
      toast.error("Error al añadir miembro");
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleCreateAndAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    if (!newUserEmail) {
      toast.error("El correo del usuario es obligatorio");
      return;
    }
    try {
      setIsSubmittingMember(true);
      // 1. Invitar/Crear usuario
      const inviteRes = await adminApi.inviteUser({
        email: newUserEmail,
        name: newUserName || newUserEmail.split("@")[0],
        role: "user",
        password: newUserPassword || undefined,
      });

      let createdUserId = inviteRes.user_id;

      // Si no devolvió ID directamente, refrescar lista de usuarios y buscarlo por email
      if (!createdUserId) {
        const updatedUsersRes = await adminApi.getUsers();
        if (updatedUsersRes.users) {
          setSystemUsers(updatedUsersRes.users);
          const found = updatedUsersRes.users.find(
            (u) => u.email.toLowerCase() === newUserEmail.toLowerCase()
          );
          if (found) createdUserId = found.user_id;
        }
      }

      if (!createdUserId) {
        toast.error("El usuario se creó, pero no se pudo obtener su ID para añadirlo a la campaña");
        return;
      }

      // 2. Añadir como miembro
      await adminApi.addCampaignMember(
        selectedCampaign.campaign_id,
        createdUserId,
        newMemberRole
      );

      toast.success(`Usuario ${newUserEmail} creado y añadido a la campaña`);
      setShowAddMemberModal(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      loadMembers(selectedCampaign.campaign_id);
    } catch (e: any) {
      toast.error(e?.message || "Error al crear y añadir miembro");
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!selectedCampaign) return;
    if (!window.confirm("¿Seguro que deseas quitar a este usuario de la campaña?")) return;
    try {
      await adminApi.removeCampaignMember(selectedCampaign.campaign_id, userId);
      toast.success("Miembro eliminado de la campaña");
      loadMembers(selectedCampaign.campaign_id);
    } catch (e) {
      toast.error("Error al quitar miembro");
    }
  };
 

  const isAdmin = user?.role?.toLowerCase() === "admin";

  // Filtrado de usuarios elegibles
  const existingMemberUserIds = new Set(members.map((m) => m.user_id));

  const eligibleUsers = systemUsers.filter((u) => {
    // Excluir si ya es miembro de la campaña actual
    if (existingMemberUserIds.has(u.user_id)) return false;

    // Solo permitir usuarios pertenecientes al departamento / área de Operaciones
    const areaLower = (u.area || "").toLowerCase();
    const isOperations =
      areaLower.includes("operacion") ||
      areaLower.includes("operation") ||
      areaLower.includes("operativa") ||
      areaLower.includes("ops");

    if (!isOperations) {
      return false;
    }

    // Filtrar por término de búsqueda si existe
    if (userSearchTerm.trim()) {
      const term = userSearchTerm.toLowerCase();
      const matchName = u.name.toLowerCase().includes(term);
      const matchEmail = u.email.toLowerCase().includes(term);
      return matchName || matchEmail;
    }

    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden text-foreground">
      <div className="p-6 border-b border-border/40 flex justify-between items-center bg-card">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Campañas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin 
              ? "Administra tus campañas y los miembros asignados" 
              : "Consulta las campañas asignadas y su equipo de operaciones"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchCampaigns();
              if (selectedCampaign) loadMembers(selectedCampaign.campaign_id);
            }}
            className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors"
            title="Refrescar"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin text-muted-foreground" : "text-muted-foreground"}`} />
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" /> Crear Campaña
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Lista de campañas */}
        <div className="w-1/3 border-r border-border/40 overflow-y-auto p-4 flex flex-col gap-3">
          {loading ? (
            <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-muted-foreground" /></div>
          ) : campaigns.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
              No se encontraron campañas.
            </div>
          ) : (
            campaigns.map((c) => (
              <div
                key={c.campaign_id}
                className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                  selectedCampaign?.campaign_id === c.campaign_id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border/60 hover:border-border hover:bg-card/50"
                }`}
                onClick={() => handleSelectCampaign(c)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-sm">{c.campaign_name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {c.description || "Sin descripción"}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCampaign(c.campaign_id);
                      }}
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title="Eliminar campaña"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${c.is_active ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                    {c.is_active ? "Activa" : "Inactiva"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detalles de la campaña */}
        <div className="w-2/3 overflow-y-auto p-6 bg-card/30">
          {selectedCampaign ? (
            <div className="space-y-6">
              <div className="border-b border-border/40 pb-4">
                <h2 className="text-xl font-bold">{selectedCampaign.campaign_name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedCampaign.description || "No hay descripción"}</p>

                {isAdmin && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newStatus = !selectedCampaign.is_active;
                        adminApi.updateCampaign(selectedCampaign.campaign_id, { is_active: newStatus })
                          .then(() => {
                            toast.success(`Campaña ${newStatus ? "activada" : "desactivada"}`);
                            fetchCampaigns();
                            setSelectedCampaign({ ...selectedCampaign, is_active: newStatus });
                          })
                          .catch(() => {
                            toast.error("Error al actualizar el estado de la campaña");
                          });
                      }}
                      className="text-xs font-medium text-primary hover:bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-md transition-colors"
                    >
                      {selectedCampaign.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                )}        
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" /> Miembros de la Campaña
                  </h3>
                  {isAdmin && (
                    <button
                      onClick={openAddMemberModal}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-md transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Agregar Miembro
                    </button>
                  )}
                </div>

                {loadingMembers ? (
                  <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-secondary/30 text-xs uppercase text-muted-foreground border-b border-border/60">
                        <tr>
                          <th className="px-4 py-3 font-medium">Usuario</th>
                          <th className="px-4 py-3 font-medium">Rol en Campaña</th>
                          <th className="px-4 py-3 font-medium">Estado</th>
                          {isAdmin && <th className="px-4 py-3 font-medium text-right">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {members.length === 0 ? (
                          <tr>
                            <td colSpan={isAdmin ? 4 : 3} className="px-4 py-8 text-center text-muted-foreground">
                              No hay miembros asignados a esta campaña
                            </td>
                          </tr>
                        ) : (
                          members.map((m) => (
                            <tr key={m.member_id} className="hover:bg-secondary/20 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="font-medium text-xs text-foreground">
                                    {m.user_name || "Usuario registrado"}
                                  </span>
                                  {m.user_email && (
                                    <span className="text-[11px] text-muted-foreground">
                                      {m.user_email}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 capitalize">
                                  {m.campaign_role.replace("_", " ")}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[11px] font-medium ${m.is_active ? 'text-green-500' : 'text-muted-foreground'}`}>
                                  {m.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                              </td>
                              {isAdmin && (
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => removeMember(m.user_id)}
                                    className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 transition-colors"
                                    title="Quitar miembro"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
      
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center border border-border">
                <Users className="w-8 h-8 opacity-50" />
              </div>
              <p>Selecciona una campaña para ver sus detalles</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear Campaña */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/40 bg-secondary/20">
              <h3 className="font-bold text-lg">Crear Nueva Campaña</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCampaign} className="p-5 flex flex-col gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</label>
                <input
                  required
                  type="text"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="Ej: Ventas Q3"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción</label>
                <textarea
                  value={newCampaignDesc}
                  onChange={(e) => setNewCampaignDesc(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none h-24"
                  placeholder="Descripción de la campaña..."
                />
              </div>
              <div className="pt-2 flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Crear Campaña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Agregar Miembro */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/40 bg-secondary/20">
              <div>
                <h3 className="font-bold text-lg">Agregar Miembro a Campaña</h3>
                <p className="text-xs text-muted-foreground">{selectedCampaign?.campaign_name}</p>
              </div>
              <button onClick={() => setShowAddMemberModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Pestaña */}
            <div className="flex border-b border-border/40 px-5 pt-3 gap-4 bg-secondary/10">
              <button
                type="button"
                onClick={() => setAddMemberTab("existing")}
                className={`pb-2 text-xs font-semibold border-b-2 transition-all ${
                  addMemberTab === "existing"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Usuario Existente
              </button>
              <button
                type="button"
                onClick={() => setAddMemberTab("new")}
                className={`pb-2 text-xs font-semibold border-b-2 transition-all ${
                  addMemberTab === "new"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                + Crear / Invitar Nuevo
              </button>
            </div>

            {addMemberTab === "existing" ? (
              <form onSubmit={handleAddExistingMember} className="p-5 flex flex-col gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                    <span>Buscar Usuario</span>
                    {loadingUsers && <span className="normal-case text-[10px]">Cargando...</span>}
                  </label>

                  {/* Buscador */}
                  <div className="relative mb-2">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      placeholder="Filtrar por nombre o correo..."
                      className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="">-- Seleccionar usuario ({eligibleUsers.length} disponibles) --</option>
                    {eligibleUsers.map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.name} ({u.email}) {u.functional_role ? `- ${u.functional_role}` : ""}
                      </option>
                    ))}
                  </select>
                  {eligibleUsers.length === 0 && !loadingUsers && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      No hay usuarios disponibles que no sean ya miembros de esta campaña.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Rol en la Campaña
                  </label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="agent">Agente (agent)</option>
                    <option value="kam">KAM (kam)</option>
                    <option value="quality_analyst">Analista de Calidad (quality_analyst)</option>
                    <option value="back_office">Back Office (back_office)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingMember || !selectedUserId}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmittingMember ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Añadir Miembro
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateAndAddMember} className="p-5 flex flex-col gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Correo Electrónico *
                  </label>
                  <input
                    required
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="agente@convertia.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contraseña (Opcional)
                  </label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Dejar en blanco para invitación por email"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Rol en la Campaña
                  </label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="agent">Agente (agent)</option>
                    <option value="kam">KAM (kam)</option>
                    <option value="quality_analyst">Analista de Calidad (quality_analyst)</option>
                    <option value="back_office">Back Office (back_office)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingMember}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSubmittingMember ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    Crear y Asignar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
