import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi, Campaign, CampaignMember, SystemUser, AvailableSkill, CampaignSkill } from "@/modules/shared/services/api";
import { Users, Plus, Trash2, RefreshCw, X, Save, UserPlus, Search, Edit, Sparkles, BookOpen, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/modules/shared/store/appStore";

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

  // Skills state
  const [skills, setSkills] = useState<CampaignSkill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<AvailableSkill[]>([]);
  const [loadingAvailableSkills, setLoadingAvailableSkills] = useState(false);

  // Skill Modals state
  const [showAssignSkillModal, setShowAssignSkillModal] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [skillCustomContent, setSkillCustomContent] = useState("");
  const [isSubmittingSkill, setIsSubmittingSkill] = useState(false);

  const [editingSkill, setEditingSkill] = useState<CampaignSkill | null>(null);
  const [editSkillCustomContent, setEditSkillCustomContent] = useState("");

  const loadCampaignSkills = async (campaignId: string) => {
    try {
      setLoadingSkills(true);
      const res = await adminApi.getCampaignSkills(campaignId);
      if (res.skills) {
        setSkills(res.skills);
      }
    } catch (e) {
      toast.error("Error al cargar habilidades de la campaña");
    } finally {
      setLoadingSkills(false);
    }
  };

  const loadAvailableSkills = async () => {
    try {
      setLoadingAvailableSkills(true);
      const res = await adminApi.getAvailableSkills();
      if (res.skills) {
        setAvailableSkills(res.skills);
      }
    } catch (e) {
      toast.error("Error al cargar la lista de habilidades disponibles");
    } finally {
      setLoadingAvailableSkills(false);
    }
  };

  const handleSelectCampaign = (c: Campaign) => {
    setSelectedCampaign(c);
    loadMembers(c.campaign_id);
    loadCampaignSkills(c.campaign_id);
  };

  const openAssignSkillModal = () => {
    loadAvailableSkills();
    setSelectedSkillId("");
    setSkillCustomContent("");
    setShowAssignSkillModal(true);
  };

  const handleAssignSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    if (!selectedSkillId) {
      toast.error("Por favor selecciona una habilidad");
      return;
    }
    try {
      setIsSubmittingSkill(true);
      await adminApi.assignCampaignSkill(
        selectedCampaign.campaign_id,
        selectedSkillId,
        skillCustomContent
      );
      toast.success("Habilidad asignada exitosamente a la campaña");
      setShowAssignSkillModal(false);
      setSelectedSkillId("");
      setSkillCustomContent("");
      loadCampaignSkills(selectedCampaign.campaign_id);
    } catch (e: any) {
      toast.error(e?.message || "Error al asignar la habilidad");
    } finally {
      setIsSubmittingSkill(false);
    }
  };

  const handleOpenEditSkill = (skill: CampaignSkill) => {
    setEditingSkill(skill);
    setEditSkillCustomContent(skill.custom_content || "");
  };

  const handleSaveSkillEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !editingSkill) return;
    try {
      setIsSubmittingSkill(true);
      await adminApi.updateCampaignSkill(
        selectedCampaign.campaign_id,
        editingSkill.id,
        editSkillCustomContent,
        editingSkill.is_active
      );
      toast.success("Instrucciones personalizadas actualizadas");
      setEditingSkill(null);
      loadCampaignSkills(selectedCampaign.campaign_id);
    } catch (e: any) {
      toast.error(e?.message || "Error al actualizar la habilidad");
    } finally {
      setIsSubmittingSkill(false);
    }
  };

  const handleToggleSkillActive = async (skill: CampaignSkill) => {
    if (!selectedCampaign) return;
    try {
      const newStatus = !skill.is_active;
      await adminApi.updateCampaignSkill(
        selectedCampaign.campaign_id,
        skill.id,
        skill.custom_content,
        newStatus
      );
      toast.success(`Habilidad ${newStatus ? "activada" : "desactivada"}`);
      loadCampaignSkills(selectedCampaign.campaign_id);
    } catch (e) {
      toast.error("Error al cambiar estado de la habilidad");
    }
  };

  const handleRemoveSkill = async (assignmentId: string) => {
    if (!selectedCampaign) return;
    if (!window.confirm("¿Seguro que deseas desvincular esta habilidad de la campaña?")) return;
    try {
      await adminApi.removeCampaignSkill(selectedCampaign.campaign_id, assignmentId);
      toast.success("Habilidad desvinculada");
      loadCampaignSkills(selectedCampaign.campaign_id);
    } catch (e) {
      toast.error("Error al quitar la habilidad");
    }
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
  const [selectedSkillsForCreation, setSelectedSkillsForCreation] = useState<string[]>([]);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  const openCreateCampaignModal = () => {
    setNewCampaignName("");
    setNewCampaignDesc("");
    setSelectedSkillsForCreation([]);
    loadAvailableSkills();
    setShowCreateModal(true);
  };

  const handleToggleSkillForCreation = (skillId: string) => {
    setSelectedSkillsForCreation((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName) {
      toast.error("El nombre de la campaña es obligatorio");
      return;
    }
    try {
      setIsCreatingCampaign(true);
      const res = await adminApi.createCampaign({
        campaign_name: newCampaignName,
        description: newCampaignDesc,
        is_active: true,
      });

      const createdId = res.campaign?.campaign_id;
      if (createdId && selectedSkillsForCreation.length > 0) {
        // Asignar habilidades seleccionadas al momento de crear
        await Promise.all(
          selectedSkillsForCreation.map((skillId) =>
            adminApi.assignCampaignSkill(createdId, skillId)
          )
        );
      }

      toast.success("Campaña creada exitosamente con sus habilidades asignadas");
      setShowCreateModal(false);
      setNewCampaignName("");
      setNewCampaignDesc("");
      setSelectedSkillsForCreation([]);
      fetchCampaigns();
      if (res.campaign) {
        handleSelectCampaign(res.campaign);
      }
    } catch (e: any) {
      toast.error(e?.message || "Error al crear la campaña");
    } finally {
      setIsCreatingCampaign(false);
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
              onClick={openCreateCampaignModal}
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

              {/* Seccion Skills de la Campaña */}
              <div className="pt-6 border-t border-border/40">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" /> Habilidades & Protocolos de Campaña
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Plantillas y reglas operativas (Ventas, Cobranza, Tipificación, etc.) inyectadas al agente OlivIA.
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={openAssignSkillModal}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-md transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Asignar Habilidad
                    </button>
                  )}
                </div>

                {loadingSkills ? (
                  <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-muted-foreground" /></div>
                ) : skills.length === 0 ? (
                  <div className="bg-card border border-dashed border-border/60 rounded-xl p-6 text-center">
                    <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">Sin habilidades asignadas</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Asigna plantillas de cobranza, ventas o atención al cliente para guiar la interacción del copiloto en esta campaña.
                    </p>
                    {isAdmin && (
                      <button
                        onClick={openAssignSkillModal}
                        className="mt-3 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Asignar primera habilidad
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {skills.map((skill) => (
                      <div
                        key={skill.id}
                        className={`p-4 rounded-xl border transition-all ${
                          skill.is_active ? "border-border/80 bg-card shadow-sm" : "border-border/40 bg-card/40 opacity-70"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 rounded-lg bg-primary/10 text-primary font-semibold text-sm mt-0.5">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold">{skill.skill_name}</h4>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                  skill.is_active ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                                }`}>
                                  {skill.is_active ? "Activa" : "Inactiva"}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{skill.skill_description}</p>
                              {skill.custom_content && (
                                <div className="mt-2.5 p-2.5 bg-secondary/30 rounded-lg border border-border/40 text-xs">
                                  <span className="font-semibold text-foreground/80 block mb-1 text-[11px]">
                                    Instrucciones específicas de esta campaña:
                                  </span>
                                  <p className="text-muted-foreground whitespace-pre-wrap font-mono text-[11px] line-clamp-3">
                                    {skill.custom_content}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleOpenEditSkill(skill)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                title="Editar personalización"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleSkillActive(skill)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                                  skill.is_active
                                    ? "border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                                    : "border-green-500/30 text-green-500 hover:bg-green-500/10"
                                }`}
                              >
                                {skill.is_active ? "Desactivar" : "Activar"}
                              </button>
                              <button
                                onClick={() => handleRemoveSkill(skill.id)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Quitar habilidad"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/40 bg-secondary/20">
              <div>
                <h3 className="font-bold text-lg">Crear Nueva Campaña</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Configura el nombre y selecciona las habilidades operativas iniciales</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCampaign} className="p-5 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre de la Campaña *</label>
                <input
                  required
                  type="text"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="Ej: ETB Cobranza, Claro Ventas..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Descripción</label>
                <textarea
                  value={newCampaignDesc}
                  onChange={(e) => setNewCampaignDesc(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none h-20"
                  placeholder="Descripción de los objetivos o alcance de la campaña..."
                />
              </div>

              {/* Selección de Skills al crear */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> Asignar Habilidades Iniciales
                  </label>
                  <span className="text-[10px] text-muted-foreground font-medium bg-secondary px-2 py-0.5 rounded-full">
                    {selectedSkillsForCreation.length} seleccionadas
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Selecciona los protocolos que estarán disponibles para el copiloto en esta campaña desde su creación:
                </p>

                {loadingAvailableSkills ? (
                  <div className="flex justify-center p-4"><RefreshCw className="animate-spin text-muted-foreground w-4 h-4" /></div>
                ) : availableSkills.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-2 border border-dashed rounded-lg text-center">
                    No hay plantillas de habilidades registradas en el sistema.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 mt-1">
                    {availableSkills.map((sk) => {
                      const isSelected = selectedSkillsForCreation.includes(sk.id);
                      return (
                        <div
                          key={sk.id}
                          onClick={() => handleToggleSkillForCreation(sk.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                            isSelected
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border/60 hover:border-border hover:bg-secondary/30"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1 rounded text-primary focus:ring-primary pointer-events-none"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-foreground">{sk.name}</span>
                              <span className="text-[9px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground capitalize">
                                {sk.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{sk.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border/40 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCampaign}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                >
                  {isCreatingCampaign ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
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

      {/* Modal Asignar Habilidad */}
      {showAssignSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/40 bg-secondary/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Asignar Habilidad a la Campaña</h3>
              </div>
              <button onClick={() => setShowAssignSkillModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignSkill} className="p-5 flex flex-col gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Seleccionar Habilidad Base *
                </label>
                {loadingAvailableSkills ? (
                  <div className="flex justify-center p-4"><RefreshCw className="animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {availableSkills.map((sk) => {
                      const isAlreadyAssigned = skills.some((s) => s.skill_id === sk.id);
                      return (
                        <div
                          key={sk.id}
                          onClick={() => !isAlreadyAssigned && setSelectedSkillId(sk.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                            selectedSkillId === sk.id
                              ? "border-primary bg-primary/10 shadow-sm"
                              : isAlreadyAssigned
                              ? "border-border/30 opacity-50 cursor-not-allowed bg-secondary/20"
                              : "border-border/60 hover:border-border hover:bg-secondary/30"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{sk.name}</span>
                              <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full text-muted-foreground capitalize">
                                {sk.category}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{sk.description}</p>
                          </div>
                          {isAlreadyAssigned && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                              Ya asignada
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 mt-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                  <span>Instrucciones Específicas de la Campaña (Opcional)</span>
                </label>
                <textarea
                  value={skillCustomContent}
                  onChange={(e) => setSkillCustomContent(e.target.value)}
                  placeholder="Escribe reglas o guiones específicos para este cliente/campaña. Se añadirán a la plantilla base de forma segura..."
                  className="w-full bg-background border border-border rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono resize-none h-28"
                />
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  Las instrucciones se sanitizan automáticamente y no modifican las reglas base del sistema.
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border/40 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignSkillModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSkill || !selectedSkillId}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingSkill ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Asignar Habilidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Personalización Habilidad */}
      {editingSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/40 bg-secondary/20">
              <div>
                <h3 className="font-bold text-lg">Personalizar: {editingSkill.skill_name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{editingSkill.skill_description}</p>
              </div>
              <button onClick={() => setEditingSkill(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSkillEdit} className="p-5 flex flex-col gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Instrucciones Específicas de esta Campaña
                </label>
                <textarea
                  value={editSkillCustomContent}
                  onChange={(e) => setEditSkillCustomContent(e.target.value)}
                  placeholder="Modifica los protocolos específicos, promociones de la campaña o guiones particulares..."
                  className="w-full bg-background border border-border rounded-lg p-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono resize-none h-36"
                />
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  Estas instrucciones se adjuntan después del prompt base de la habilidad.
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border/40 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingSkill(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSkill}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingSkill ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
