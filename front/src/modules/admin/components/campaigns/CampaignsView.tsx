import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { 
  adminApi, 
  qaApi,
  Campaign, 
  CampaignMember, 
  SystemUser, 
  AvailableSkill, 
  CampaignSkill,
  QAInsight,
  QATopQuery
} from "@/modules/shared/services/api";
import { 
  Users, 
  Plus, 
  Trash2, 
  RefreshCw, 
  X, 
  Save, 
  UserPlus, 
  Search, 
  Edit, 
  Sparkles, 
  BookOpen, 
  ShieldCheck,
  Target,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Activity,
  CheckSquare,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
  MessageSquareQuote,
  Lightbulb,
  FileCheck,
  Zap,
  Filter,
  ArrowLeft,
  PanelLeft
} from "lucide-react";
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

  // Tabs y Filtros del Dashboard de Campañas
  const [activeTab, setActiveTab] = useState<"overview" | "members" | "skills" | "reinforcement">("overview");
  const [searchCampaignQuery, setSearchCampaignQuery] = useState("");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchMemberQuery, setSearchMemberQuery] = useState("");

  // Modo responsivo para pantalla dividida
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Herramientas de Refuerzo & Coaching (DQLE-32)
  const [reinforcementInsights, setReinforcementInsights] = useState<QAInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [topQueries, setTopQueries] = useState<QATopQuery[]>([]);
  const [loadingTopQueries, setLoadingTopQueries] = useState(false);
  const [activeObjectionTab, setActiveObjectionTab] = useState<string>("all");
  const [copiedPhraseKey, setCopiedPhraseKey] = useState<string | null>(null);
  const [checklistCompleted, setChecklistCompleted] = useState<Record<string, boolean>>({
    saludo: true,
    titularidad: true,
    sondeo: false,
    objecion: false,
    cierre: false,
  });

  const toggleChecklist = (key: string) => {
    setChecklistCompleted((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const copyPhraseToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhraseKey(key);
    toast.success("Frase de refuerzo copiada al portapapeles");
    setTimeout(() => setCopiedPhraseKey(null), 2500);
  };

  const loadReinforcementData = async (campaignId: string) => {
    try {
      setLoadingInsights(true);
      setLoadingTopQueries(true);
      const [insightsRes, topQueriesRes] = await Promise.allSettled([
        qaApi.getInsights(campaignId),
        qaApi.getTopQueries(campaignId, undefined, 30, 8),
      ]);

      if (insightsRes.status === "fulfilled" && Array.isArray(insightsRes.value)) {
        setReinforcementInsights(insightsRes.value);
      } else {
        setReinforcementInsights([]);
      }

      if (topQueriesRes.status === "fulfilled" && Array.isArray(topQueriesRes.value)) {
        setTopQueries(topQueriesRes.value);
      } else {
        setTopQueries([]);
      }
    } catch (err) {
      console.warn("Error cargando herramientas de refuerzo:", err);
    } finally {
      setLoadingInsights(false);
      setLoadingTopQueries(false);
    }
  };

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
    loadReinforcementData(c.campaign_id);
    setSearchMemberQuery("");
    setMobileShowDetail(true);
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

  // Filtrado de campañas en el panel lateral
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      // Filtro por término
      if (searchCampaignQuery.trim()) {
        const q = searchCampaignQuery.toLowerCase();
        const matchesName = c.campaign_name.toLowerCase().includes(q);
        const matchesDesc = (c.description || "").toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      // Filtro por estado
      if (campaignStatusFilter === "active") return c.is_active;
      if (campaignStatusFilter === "inactive") return !c.is_active;
      return true;
    });
  }, [campaigns, searchCampaignQuery, campaignStatusFilter]);

  // Filtrado de miembros de la campaña seleccionada
  const filteredMembers = useMemo(() => {
    if (!searchMemberQuery.trim()) return members;
    const q = searchMemberQuery.toLowerCase();
    return members.filter((m) => {
      const matchName = (m.user_name || "").toLowerCase().includes(q);
      const matchEmail = (m.user_email || "").toLowerCase().includes(q);
      const matchRole = (m.campaign_role || "").toLowerCase().includes(q);
      return matchName || matchEmail || matchRole;
    });
  }, [members, searchMemberQuery]);

  // Matriz de Refuerzo de Objeciones (Curada y vinculada a las habilidades de la campaña)
  const objectionProtocols = useMemo(() => [
    {
      id: "price",
      category: "price",
      categoryName: "Precio / Costo",
      icon: "dollar",
      title: "Objeción de Costo o Presupuesto Insuficiente",
      signal: "«El plan es muy costoso», «no me alcanza la plata», «muy caro comparado con otros».",
      action: "Desglosar la inversión en costo diario y enfocar el retorno de inversión o facilidades de pago diferido.",
      phrase: "Comprendo plenamente su punto. Si lo distribuimos día a día, estamos hablando de menos de lo que cuesta un café diario por la solución integral. Además, en esta campaña tenemos autorizada una opción de pago diferido sin recargo.",
      key: "obj-price"
    },
    {
      id: "distrust",
      category: "distrust",
      categoryName: "Desconfianza / Fraude",
      icon: "shield",
      title: "Desconfianza en el Contacto o Temor a Fraude",
      signal: "«Esto parece una estafa», «¿de dónde sacaron mi número?», «no doy mis datos por teléfono».",
      action: "Validar su legítima precaución, confirmar el canal corporativo formal y recalcar que NO se solicitarán contraseñas ni claves bancarias.",
      phrase: "Comprendo y comparto su prudencia; hoy en día es vital cuidar la información. Nos comunicamos formalmente de los canales oficiales. En ningún momento le solicitaremos contraseñas, claves ni transferencias por esta llamada.",
      key: "obj-distrust"
    },
    {
      id: "time",
      category: "time",
      categoryName: "Tiempo / Aplazamiento",
      icon: "clock",
      title: "Falta de Tiempo o Solicitud de Llamar Después",
      signal: "«Estoy muy ocupado», «llámeme la otra semana», «no tengo tiempo para esto ahora».",
      action: "Técnica de los 20 segundos de impacto y acuerdo de agendamiento puntual con fecha y hora exacta.",
      phrase: "Entiendo que esté con el tiempo justo. Solo le tomaré 20 segundos para mencionarle el beneficio principal. Si le resulta conveniente, agendamos de inmediato una llamada puntual para mañana a la hora que prefiera.",
      key: "obj-time"
    },
    {
      id: "competitor",
      category: "competitor",
      categoryName: "Competencia",
      icon: "zap",
      title: "Preferencia por la Competencia Existente",
      signal: "«Ya tengo contratado otro servicio», «la otra empresa me ofrece lo mismo».",
      action: "Reconocer al proveedor actual sin desacreditarlo; resaltar los diferenciales de soporte 24/7 y estabilidad.",
      phrase: "Es una compañía respetable. La razón por la que nuestros clientes deciden complementarla o cambiarse con nosotros es por nuestra garantía de soporte personalizado y tiempos de respuesta inferiores a 10 minutos.",
      key: "obj-competitor"
    },
    {
      id: "hostility",
      category: "hostility",
      categoryName: "Hostilidad / Malestar",
      icon: "alert",
      title: "Desescalamiento de Hostilidad o Enojo",
      signal: "«No me llamen más», «siempre es lo mismo con ustedes», insultos o agresividad.",
      action: "Protocolo de contención inmediata, tono sereno, no debatir y ofrecer solución concreta al motivo del contacto.",
      phrase: "Comprendo su malestar y lamento cualquier inconveniente previo. Mi intención el día de hoy es brindarle una solución directa y respetuosa si me permite 30 segundos para orientarle.",
      key: "obj-hostility"
    }
  ], []);

  const filteredObjections = useMemo(() => {
    if (activeObjectionTab === "all") return objectionProtocols;
    return objectionProtocols.filter(o => o.category === activeObjectionTab);
  }, [objectionProtocols, activeObjectionTab]);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden text-foreground">
      {/* Top Header Responsivo */}
      <div className="p-4 sm:p-5 lg:p-6 border-b border-border/40 flex flex-wrap justify-between items-center gap-3 bg-card">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Ágatha</h1>
            <span className="text-xs bg-primary/10 text-primary border border-primary/20 font-semibold px-2.5 py-0.5 rounded-full">
              {campaigns.filter(c => c.is_active).length} activas / {campaigns.length} total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {isAdmin 
              ? "Administra campañas, miembros, habilidades operativas y herramientas de refuerzo" 
              : "Consulta las campañas asignadas y sus protocolos operativos"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Botón para alternar ancho de la lista en pantallas grandes (xl+) */}
          <button
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            className="hidden xl:flex items-center gap-1.5 text-xs font-medium px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title={isSidebarCollapsed ? "Mostrar lista de campañas" : "Ocultar lista para pantalla completa"}
          >
            <PanelLeft className="w-4 h-4" />
            <span>{isSidebarCollapsed ? "Mostrar Lista" : "Ocultar Lista"}</span>
          </button>

          <button
            onClick={() => {
              fetchCampaigns();
              if (selectedCampaign) {
                loadMembers(selectedCampaign.campaign_id);
                loadCampaignSkills(selectedCampaign.campaign_id);
                loadReinforcementData(selectedCampaign.campaign_id);
              }
            }}
            className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-muted-foreground" : "text-muted-foreground"}`} />
          </button>

          {isAdmin && (
            <button
              onClick={openCreateCampaignModal}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3.5 py-2 rounded-lg hover:opacity-90 transition-opacity font-medium text-xs sm:text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Crear</span> Campaña
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Panel lateral: Lista de campañas con buscador y filtros (Se adapta automáticamente en pantalla dividida) */}
        <div
          className={`border-r border-border/40 flex flex-col bg-card/20 min-h-0 transition-all duration-200 ${
            mobileShowDetail ? "hidden xl:flex" : "flex w-full"
          } ${
            isSidebarCollapsed ? "xl:hidden" : "xl:w-72 2xl:w-80 shrink-0"
          }`}
        >
          {/* Buscador de campañas */}
          <div className="p-3.5 sm:p-4 border-b border-border/40 space-y-2.5 bg-card/40 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                value={searchCampaignQuery}
                onChange={(e) => setSearchCampaignQuery(e.target.value)}
                placeholder="Buscar campaña..."
                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              {searchCampaignQuery && (
                <button
                  onClick={() => setSearchCampaignQuery("")}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtros de estado */}
            <div className="flex gap-1 bg-secondary/30 p-1 rounded-lg text-xs">
              <button
                onClick={() => setCampaignStatusFilter("all")}
                className={`flex-1 py-1 rounded-md font-medium text-[11px] transition-all ${
                  campaignStatusFilter === "all"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todas ({campaigns.length})
              </button>
              <button
                onClick={() => setCampaignStatusFilter("active")}
                className={`flex-1 py-1 rounded-md font-medium text-[11px] transition-all ${
                  campaignStatusFilter === "active"
                    ? "bg-card text-green-500 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Activas ({campaigns.filter(c => c.is_active).length})
              </button>
              <button
                onClick={() => setCampaignStatusFilter("inactive")}
                className={`flex-1 py-1 rounded-md font-medium text-[11px] transition-all ${
                  campaignStatusFilter === "inactive"
                    ? "bg-card text-destructive shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Inactivas ({campaigns.filter(c => !c.is_active).length})
              </button>
            </div>
          </div>

          {/* Lista de campañas filtradas */}
          <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 flex flex-col gap-2">
            {loading ? (
              <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-muted-foreground" /></div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground text-xs border border-dashed border-border rounded-xl">
                No se encontraron campañas que coincidan con el filtro.
              </div>
            ) : (
              filteredCampaigns.map((c) => {
                const isSelected = selectedCampaign?.campaign_id === c.campaign_id;
                return (
                  <div
                    key={c.campaign_id}
                    className={`p-3 rounded-xl border transition-all cursor-pointer group relative ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                        : "border-border/60 hover:border-border hover:bg-card/60 bg-card/30"
                    }`}
                    onClick={() => handleSelectCampaign(c)}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              c.is_active ? "bg-green-500 shadow-sm shadow-green-500/50 animate-pulse" : "bg-muted-foreground/40"
                            }`}
                          />
                          <h3 className="font-semibold text-xs text-foreground truncate">{c.campaign_name}</h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1 leading-relaxed">
                          {c.description || "Sin descripción registrada"}
                        </p>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCampaign(c.campaign_id);
                          }}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-1"
                          title="Eliminar campaña"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-border/30 text-[10px]">
                      <span className={`font-medium px-2 py-0.5 rounded-full ${
                        c.is_active ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'
                      }`}>
                        {c.is_active ? "Activa" : "Inactiva"}
                      </span>
                      {isSelected && (
                        <span className="text-primary font-semibold flex items-center gap-0.5">
                          Seleccionada <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel derecho: Pestañas de detalle de la campaña (En pantalla dividida toma el 100% del ancho) */}
        <div
          className={`flex-1 overflow-y-auto bg-card/10 flex flex-col min-h-0 ${
            !mobileShowDetail && !selectedCampaign ? "hidden xl:flex" : "flex"
          }`}
        >
          {selectedCampaign ? (
            <div className="flex flex-col h-full min-h-0">
              {/* Header de la campaña seleccionada */}
              <div className="p-4 sm:p-5 lg:p-6 bg-card border-b border-border/40 shrink-0">
                {/* Botón de regreso exclusivo para pantalla dividida */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/30 xl:hidden">
                  <button
                    onClick={() => setMobileShowDetail(false)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Volver a Campañas
                  </button>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    selectedCampaign.is_active ? "bg-green-500/10 text-green-500" : "bg-destructive/10 text-destructive"
                  }`}>
                    {selectedCampaign.is_active ? "Activa" : "Inactiva"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-bold truncate">{selectedCampaign.campaign_name}</h2>
                      <span className={`hidden sm:inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        selectedCampaign.is_active ? "bg-green-500/15 text-green-500 border border-green-500/30" : "bg-destructive/15 text-destructive border border-destructive/30"
                      }`}>
                        {selectedCampaign.is_active ? "Campaña Activa" : "Campaña Inactiva"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed line-clamp-2 sm:line-clamp-none">
                      {selectedCampaign.description || "Esta campaña no posee una descripción detallada registrada."}
                    </p>
                  </div>

                  {isAdmin && (
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
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all shrink-0 ${
                        selectedCampaign.is_active
                          ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                          : "border-green-500/30 text-green-500 hover:bg-green-500/10"
                      }`}
                    >
                      {selectedCampaign.is_active ? "Desactivar" : "Activar"}
                    </button>
                  )}
                </div>

                {/* Barra de Pestañas (Tabs) con scroll horizontal suave */}
                <div className="flex gap-1.5 mt-4 sm:mt-5 border-b border-border/40 -mb-4 sm:-mb-6 pb-0 overflow-x-auto no-scrollbar scroll-smooth">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap shrink-0 transition-all ${
                      activeTab === "overview"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Activity className="w-4 h-4 shrink-0" /> Resumen
                  </button>

                  <button
                    onClick={() => setActiveTab("members")}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap shrink-0 transition-all ${
                      activeTab === "members"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" /> Miembros ({members.length})
                  </button>

                  <button
                    onClick={() => setActiveTab("skills")}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap shrink-0 transition-all ${
                      activeTab === "skills"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="w-4 h-4 shrink-0" /> Habilidades ({skills.length})
                  </button>

                  <button
                    onClick={() => setActiveTab("reinforcement")}
                    className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap shrink-0 transition-all relative ${
                      activeTab === "reinforcement"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Target className="w-4 h-4 shrink-0 text-primary" /> Herramientas de Refuerzo
                    {reinforcementInsights.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute top-2 right-1" />
                    )}
                  </button>
                </div>
              </div>

              {/* Contenido según pestaña activa */}
              <div className="p-4 sm:p-5 lg:p-6 flex-1 overflow-y-auto space-y-5 sm:space-y-6">
                {/* ────────────────── PESTAÑA 1: RESUMEN ────────────────── */}
                {activeTab === "overview" && (
                  <div className="space-y-5 sm:space-y-6">
                    {/* Grid de Métricas Principales adaptativo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3">
                      <div className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">Estado Operativo</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${selectedCampaign.is_active ? "bg-green-500" : "bg-destructive"}`} />
                        </div>
                        <div className="mt-1.5 sm:mt-2 text-base sm:text-lg lg:text-xl font-bold truncate">
                          {selectedCampaign.is_active ? "En Operación" : "En Pausa"}
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 truncate">
                          {selectedCampaign.is_active ? "Copiloto respondiendo" : "Tráfico detenido"}
                        </p>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">Equipo Asignado</span>
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div className="mt-1.5 sm:mt-2 text-base sm:text-lg lg:text-xl font-bold truncate">{members.length} usuarios</div>
                        <button
                          onClick={() => setActiveTab("members")}
                          className="text-[10px] sm:text-[11px] text-primary hover:underline mt-1 font-medium block truncate"
                        >
                          Ver equipo →
                        </button>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">Habilidades Activas</span>
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <div className="mt-1.5 sm:mt-2 text-base sm:text-lg lg:text-xl font-bold truncate">
                          {skills.filter(s => s.is_active).length} / {skills.length}
                        </div>
                        <button
                          onClick={() => setActiveTab("skills")}
                          className="text-[10px] sm:text-[11px] text-primary hover:underline mt-1 font-medium block truncate"
                        >
                          Configurar →
                        </button>
                      </div>

                      <div className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card shadow-sm">
                        <div className="flex justify-between items-start">
                          <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">Alertas de Calidad</span>
                          <Target className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="mt-1.5 sm:mt-2 text-base sm:text-lg lg:text-xl font-bold truncate">
                          {reinforcementInsights.length} detectadas
                        </div>
                        <button
                          onClick={() => setActiveTab("reinforcement")}
                          className="text-[10px] sm:text-[11px] text-primary hover:underline mt-1 font-medium block truncate"
                        >
                          Ver refuerzo →
                        </button>
                      </div>
                    </div>

                    {/* Habilidades en uso en esta campaña */}
                    <div className="p-5 rounded-2xl border border-border/60 bg-card space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" /> Protocolos Operativos Asignados
                        </h3>
                        <button
                          onClick={() => setActiveTab("skills")}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Gestionar habilidades
                        </button>
                      </div>
                      {skills.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">
                          Esta campaña no tiene habilidades asignadas. Asigna la plantilla de Ventas o Cobranza para guiar al copiloto.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {skills.map((s) => (
                            <div
                              key={s.id}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                                s.is_active
                                  ? "bg-secondary/40 border-border text-foreground"
                                  : "bg-muted/30 border-dashed border-border/60 text-muted-foreground opacity-60"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? "bg-green-500" : "bg-muted-foreground"}`} />
                              {s.skill_name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Guía Rápida para el Supervisor / Administrador */}
                    <div className="p-5 rounded-2xl border border-border/60 bg-card space-y-3">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" /> Directrices Operativas de la Campaña
                      </h3>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-secondary/20 border border-border/40">
                          <span className="font-semibold text-foreground block mb-1">1. Protocolo de Identificación</span>
                          <p className="text-muted-foreground leading-relaxed">
                            Todos los agentes asignados deben confirmar el nombre del titular antes de brindar ofertas comerciales o negociar acuerdos.
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-secondary/20 border border-border/40">
                          <span className="font-semibold text-foreground block mb-1">2. Copiloto en Tiempo Real</span>
                          <p className="text-muted-foreground leading-relaxed">
                            El widget de Olivia detectará objeciones y hostilidad durante la llamada sugiriendo la mejor frase en menos de 50ms.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ────────────────── PESTAÑA 2: MIEMBROS ────────────────── */}
                {activeTab === "members" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center gap-4">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                        <input
                          type="text"
                          value={searchMemberQuery}
                          onChange={(e) => setSearchMemberQuery(e.target.value)}
                          placeholder="Buscar miembro por nombre, email o rol..."
                          className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      {isAdmin && (
                        <button
                          onClick={openAddMemberModal}
                          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg transition-colors"
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
                            {filteredMembers.length === 0 ? (
                              <tr>
                                <td colSpan={isAdmin ? 4 : 3} className="px-4 py-8 text-center text-muted-foreground text-xs">
                                  {members.length === 0
                                    ? "No hay miembros asignados a esta campaña."
                                    : "No se encontraron miembros con ese criterio de búsqueda."}
                                </td>
                              </tr>
                            ) : (
                              filteredMembers.map((m) => (
                                <tr key={m.member_id} className="hover:bg-secondary/20 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-xs text-foreground">
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
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 capitalize">
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
                )}

                {/* ────────────────── PESTAÑA 3: HABILIDADES & PROTOCOLOS ────────────────── */}
                {activeTab === "skills" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" /> Habilidades & Protocolos de Campaña
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Plantillas operativas (Ventas, Cobranza, Tipificación) inyectadas directamente al copiloto Olivia.
                        </p>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={openAssignSkillModal}
                          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Asignar Habilidad
                        </button>
                      )}
                    </div>

                    {loadingSkills ? (
                      <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-muted-foreground" /></div>
                    ) : skills.length === 0 ? (
                      <div className="bg-card border border-dashed border-border/60 rounded-xl p-8 text-center">
                        <Sparkles className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm font-medium text-foreground">Sin habilidades asignadas</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                          Asigna plantillas de ventas o cobranza para guiar las respuestas del copiloto en esta campaña.
                        </p>
                        {isAdmin && (
                          <button
                            onClick={openAssignSkillModal}
                            className="mt-4 text-xs font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
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
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="p-2.5 rounded-lg bg-primary/10 text-primary font-semibold text-sm mt-0.5 shrink-0">
                                  <Sparkles className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
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
                                        Instrucciones específicas configuradas:
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
                )}

                {activeTab === "reinforcement" && (
                  <div className="space-y-6">
  
                    {/* Bloque 1: Alertas y Brechas de Calidad (Insights de QA) */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Brechas de Calidad y Necesidades de Refuerzo
                        </h4>
                        <span className="text-[10px] text-muted-foreground">
                          Basado en auditoría de interacciones
                        </span>
                      </div>

                      {loadingInsights ? (
                        <div className="flex justify-center p-6"><RefreshCw className="animate-spin text-muted-foreground w-4 h-4" /></div>
                      ) : reinforcementInsights.length === 0 ? (
                        <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/5 flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                          <div>
                            <span className="text-xs font-semibold text-green-600 dark:text-green-400 block">
                              Operación con Excelente Desempeño
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              No se han registrado brechas críticas de calidad ni concentración anómala de errores en esta campaña.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                          {reinforcementInsights.map((insight) => (
                            <div
                              key={insight.id}
                              className={`p-4 rounded-xl border flex flex-col justify-between ${
                                insight.level === "high"
                                  ? "border-destructive/30 bg-destructive/5"
                                  : insight.level === "medium"
                                  ? "border-amber-500/30 bg-amber-500/5"
                                  : "border-blue-500/30 bg-blue-500/5"
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <AlertTriangle className={`w-4 h-4 ${
                                    insight.level === "high" ? "text-destructive" : insight.level === "medium" ? "text-amber-500" : "text-blue-500"
                                  }`} />
                                  <span className="font-semibold text-xs text-foreground">{insight.title}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{insight.finding}</p>
                              </div>
                              <div className="p-2.5 rounded-lg bg-card/60 border border-border/40 text-[11px]">
                                <span className="font-bold text-foreground/90 block mb-0.5">Acción de Refuerzo:</span>
                                <span className="text-muted-foreground">{insight.recommendation}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bloque 2: Dudas y Consultas Críticas de Agentes (Top Queries) */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-primary" /> Consultas Más Recurrentes de Agentes en Llamada
                        </h4>
                        <span className="text-[10px] text-muted-foreground">Detectadas por el Asistente Olivia</span>
                      </div>

                      {loadingTopQueries ? (
                        <div className="flex justify-center p-6"><RefreshCw className="animate-spin text-muted-foreground w-4 h-4" /></div>
                      ) : topQueries.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic p-3 border border-dashed rounded-xl text-center">
                          Aún no se han acumulado suficientes consultas en esta campaña para generar métricas de reiteración.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                          {topQueries.map((q, idx) => (
                            <div key={idx} className="p-3 rounded-xl border border-border/60 bg-card flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-medium text-foreground block truncate">
                                  «{q.query_text}»
                                </span>
                                <span className="text-[10px] text-muted-foreground capitalize">
                                  Categoría: {q.category}
                                </span>
                              </div>
                              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-secondary text-primary shrink-0">
                                {q.count} veces
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 p-8">
              <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center border border-border">
                <Users className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-sm">Selecciona una campaña de la lista lateral para ver sus detalles</p>
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
