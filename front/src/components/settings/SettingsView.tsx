import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  Link2,
  Loader2,
  LogOut,
  Palette,
  Shield,
  Sun,
  Moon,
  User,
  Zap,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { integrationCatalog, planUsage } from "@/lib/demo-data";

const sections = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "appearance", label: "Apariencia", icon: Palette },
  { id: "plan", label: "Plan y uso", icon: Zap },
  { id: "integrations", label: "Integraciones", icon: Link2 },
  { id: "notifications", label: "Notificaciones", icon: Bell },
  { id: "security", label: "Seguridad", icon: Shield },
] as const;

export default function SettingsView() {
  const { user, darkMode, toggleDarkMode, logout } = useAppStore();
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]["id"]>("profile");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    logout();
    navigate("/");
  };

  return (
    <div className="flex h-full flex-1 min-h-0 overflow-hidden">
      <aside className="w-64 border-r border-border bg-card/80 p-4">
        <h1 className="mb-4 text-lg font-bold text-foreground">Configuracion</h1>
        <div className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                section.id === activeSection ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <section.icon className="h-4 w-4" /> {section.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="mt-6 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition hover:bg-destructive/10"
        >
          {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Cerrar sesion
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {activeSection === "profile" && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Perfil</h2>
              <article className="surface-card p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{user?.name ?? "Carlos Mendoza"}</p>
                    <p className="text-sm text-muted-foreground">{user?.email ?? "demo@convert-ia.com"}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Empresa", user?.company ?? "Convert-IA Inc."],
                    ["Rol", user?.role ?? "Product Manager"],
                    ["Plan", (user?.plan ?? "pro").toUpperCase()],
                    ["Workspace", "Demo Comercial"],
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded-lg border border-border/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label as string}</p>
                      <p className="mt-1 text-sm text-foreground">{value as string}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          )}

          {activeSection === "appearance" && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Apariencia</h2>
              <article className="surface-card space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Tema global</p>
                    <p className="text-xs text-muted-foreground">Sincronizado en todos los modulos de la suite</p>
                  </div>
                  <div className="flex rounded-lg bg-secondary p-1">
                    <button
                      onClick={() => darkMode && toggleDarkMode()}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold ${!darkMode ? "bg-background text-foreground" : "text-muted-foreground"}`}
                    >
                      <Sun className="mr-1 inline h-3.5 w-3.5" /> Claro
                    </button>
                    <button
                      onClick={() => !darkMode && toggleDarkMode()}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold ${darkMode ? "bg-background text-foreground" : "text-muted-foreground"}`}
                    >
                      <Moon className="mr-1 inline h-3.5 w-3.5" /> Oscuro
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vista previa</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-sm font-semibold text-foreground">Panel principal</p>
                      <p className="mt-1 text-xs text-muted-foreground">Cards, CTA y estado visual unificado</p>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/40 p-3">
                      <p className="text-sm font-semibold text-foreground">Asistente IA</p>
                      <p className="mt-1 text-xs text-muted-foreground">Mensajes, acciones y chips consistentes</p>
                    </div>
                  </div>
                </div>
              </article>
            </section>
          )}

          {activeSection === "plan" && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Plan y uso</h2>
              <article className="surface-card p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">Plan Pro</p>
                    <p className="text-sm text-muted-foreground">Renovacion estimada: 15 mayo 2026</p>
                  </div>
                  <Button variant="outline" size="sm">Gestionar plan</Button>
                </div>
                <div className="space-y-3">
                  {planUsage.map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{item.label}</span>
                        <span className="text-muted-foreground">{item.usage}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${item.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          )}

          {activeSection === "integrations" && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Integraciones</h2>
              <div className="space-y-3">
                {integrationCatalog.map((integration) => (
                  <article key={integration.name} className="surface-card flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{integration.name}</p>
                      <p className="text-xs text-muted-foreground">{integration.description}</p>
                    </div>
                    <Button variant={integration.connected ? "outline" : "default"} className={integration.connected ? "" : "btn-primary-gradient"}>
                      {integration.connected ? "Conectado" : "Conectar"}
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeSection === "notifications" && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Notificaciones</h2>
              <article className="surface-card p-6">
                <div className="space-y-3">
                  {[
                    ["Resumen diario", "Estado de entregables clave", true],
                    ["Alertas de aprobacion", "Cambios en propuestas y slides", true],
                    ["Nuevas integraciones", "Lanzamientos del producto", false],
                  ].map(([title, detail, enabled]) => (
                    <div key={title as string} className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{title as string}</p>
                        <p className="text-xs text-muted-foreground">{detail as string}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${enabled ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                        {enabled ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          )}

          {activeSection === "security" && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Seguridad</h2>
              <article className="surface-card p-6">
                <div className="space-y-3">
                  {[
                    ["Autenticacion en dos pasos", "No habilitada"],
                    ["Sesiones activas", "2 dispositivos"],
                    ["Politica de acceso", "SSO recomendado para Enterprise"],
                  ].map(([title, detail], index) => (
                    <div key={title as string} className="flex items-center justify-between rounded-lg border border-border/70 p-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{title as string}</p>
                        <p className="text-xs text-muted-foreground">{detail as string}</p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1">
                        {index === 0 ? <Check className="h-3.5 w-3.5" /> : null}
                        Configurar
                      </Button>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
