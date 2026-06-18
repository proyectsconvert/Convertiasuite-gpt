import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Loader2,
  Sun,
  Moon,
  User,
  Settings,
  Edit2,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { authApi } from "@/services/api";
import { toast } from "sonner";

export default function SettingsView() {
  const { user, darkMode, toggleDarkMode, logout, updateUser } = useAppStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  // Profile edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editArea, setEditArea] = useState(user?.area || "");
  const [editFunctionalRole, setEditFunctionalRole] = useState(
    user?.functional_role || "",
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password change states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    logout();
    navigate("/");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("El nombre no puede estar vacío");
      return;
    }

    setIsSavingProfile(true);
    try {
      const payload = {
        name: editName.trim(),
        area: editArea.trim() || undefined,
        functional_role: editFunctionalRole.trim() || undefined,
      };
      const updatedUser = await authApi.updateProfile(payload);

      updateUser({
        name: updatedUser.name,
        role: updatedUser.role,
        email: updatedUser.email,
        area: updatedUser.area,
        functional_role: updatedUser.functional_role,
      });

      setIsEditingProfile(false);
      toast.success("Perfil actualizado con éxito");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error al actualizar el perfil");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error("Ingresa contraseña actual y nueva");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Las nuevas contraseñas no coinciden");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("La nueva contraseña debe ser diferente a la actual");
      return;
    }

    setIsChangingPass(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Contraseña actualizada con éxito");
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Contraseña actual incorrecta o error al cambiar");
    } finally {
      setIsChangingPass(false);
    }
  };

  const areas = [
    "Desarrollo e Innovación",
    "Marketing",
    "Recursos Humanos",
    "Finanzas",
    "Operaciones",
    "Ventas",
    "Gestión de Proyectos",
    "Otro",
  ];

  const functionalRoles = [
    "Desarrolladora Backend",
    "Desarrolladora Frontend",
    "Analista BI",
    "Especialista de Reclutamiento y Selección",
    "Especialista en Talento y Cultura",
    "SEO",
    "Content Manager",
    "Project Manager",
    "Otro",
  ];

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6 sm:px-6 sm:py-10 sm:space-y-8">
        <div className="flex flex-col gap-3 border-b border-border/40 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Configuración
            </h1>
          </div>

          <button
            type="button"
            onClick={() => navigate("/app/chat")}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all shadow-sm border border-border/60"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al chat
          </button>
        </div>

        {/* Personal Information Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Información Personal
          </h2>
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            {isEditingProfile ? (
              <form
                onSubmit={handleSaveProfile}
                className="space-y-4 animate-in fade-in duration-200"
              >
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary/50 text-muted-foreground text-sm cursor-not-allowed opacity-60"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    El correo no puede ser modificado desde aquí
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Rol Funcional (Opcional)
                  </label>
                  <select
                    value={editFunctionalRole}
                    onChange={(e) => setEditFunctionalRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  >
                    <option value="">Selecciona tu rol...</option>
                    {functionalRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Área Organizacional (Opcional)
                  </label>
                  <select
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  >
                    <option value="">Selecciona tu área...</option>
                    {areas.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setEditName(user?.name || "");
                      setEditArea(user?.area || "");
                      setEditFunctionalRole(user?.functional_role || "");
                    }}
                    disabled={isSavingProfile}
                    className="px-4 py-2 rounded-xl border border-border/50 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    {isSavingProfile && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                    Guardar Cambios
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ring-2 ring-border/30">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {user?.name || "Usuario"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user?.email || "—"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditName(user?.name || "");
                      setEditArea(user?.area || "");
                      setEditFunctionalRole(user?.functional_role || "");
                      setIsEditingProfile(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border hover:bg-secondary text-xs font-semibold text-foreground transition-all shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Empresa", user?.company || "—"],
                    ["Rol Funcional", user?.functional_role || "—"],
                    ["Área", user?.area || "—"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-border/40 bg-secondary/30 p-3"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Security Section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Seguridad
          </h2>
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            {isChangingPassword ? (
              <form
                onSubmit={handleChangePassword}
                className="space-y-4 animate-in fade-in duration-200"
              >
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña actual"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirma la nueva contraseña"
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    required
                  />
                </div>

                <div className="pt-2 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    disabled={isChangingPass}
                    className="px-4 py-2 rounded-xl border border-border/50 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    {isChangingPass && (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    )}
                    Cambiar Contraseña
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Lock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Cambiar Contraseña
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Actualiza tu contraseña de forma segura
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border hover:bg-secondary text-xs font-semibold text-foreground transition-all shadow-sm whitespace-nowrap"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Cambiar
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Appearance section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Apariencia
          </h2>
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Tema de la interfaz
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cambia entre modo claro y oscuro
                </p>
              </div>
              <div className="flex rounded-xl bg-secondary p-1 gap-0.5">
                <button
                  onClick={() => darkMode && toggleDarkMode()}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                    !darkMode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" /> Claro
                </button>
                <button
                  onClick={() => !darkMode && toggleDarkMode()}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                    darkMode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" /> Oscuro
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Logout */}
        <section>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-destructive transition hover:bg-destructive/10 w-full"
          >
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            Cerrar sesión
          </button>
        </section>
      </div>
    </div>
  );
}
