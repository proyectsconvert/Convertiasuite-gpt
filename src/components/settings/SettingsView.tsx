import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Palette, Bell, Globe2, Zap, Shield, Link2, Monitor, Moon, Sun,
  ChevronRight, Check, CreditCard, LogOut, Loader2
} from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";

const sections = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "appearance", label: "Apariencia", icon: Palette },
  { id: "notifications", label: "Notificaciones", icon: Bell },
  { id: "language", label: "Idioma", icon: Globe2 },
  { id: "plan", label: "Plan y uso", icon: Zap },
  { id: "security", label: "Seguridad", icon: Shield },
  { id: "integrations", label: "Integraciones", icon: Link2 },
];

const integrations = [
  { name: "Slack", desc: "Recibe notificaciones en Slack", connected: true },
  { name: "Google Drive", desc: "Sincroniza documentos", connected: true },
  { name: "Notion", desc: "Exporta a Notion", connected: false },
  { name: "Zapier", desc: "Automatiza flujos", connected: false },
  { name: "Salesforce", desc: "Sincroniza datos de CRM", connected: false },
];

export default function SettingsView() {
  const { darkMode, toggleDarkMode, logout, user } = useAppStore();
  const [activeSection, setActiveSection] = useState("profile");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await new Promise((r) => setTimeout(r, 500));
    logout();
    navigate("/");
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Settings nav */}
      <div className="w-56 border-r border-border bg-card p-4 flex flex-col">
        <h2 className="text-lg font-bold text-foreground mb-4 px-2">Configuración</h2>
        <div className="space-y-0.5 flex-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeSection === s.id
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary/50"
              }`}
            >
              <s.icon className="w-4 h-4" /> {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}{" "}
          Cerrar sesión
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          {activeSection === "profile" && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground">Perfil</h3>
              <div className="surface-card p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-foreground">{user?.name || "Carlos Mendoza"}</div>
                    <div className="text-sm text-muted-foreground">{user?.email || "carlos@empresa.com"}</div>
                  </div>
                  <Button variant="outline" size="sm" className="ml-auto">
                    Editar
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  {[
                    ["Nombre", user?.name || "Carlos Mendoza"],
                    ["Email", user?.email || "carlos@empresa.com"],
                    ["Empresa", user?.company || "TechCorp S.A."],
                    ["Rol", user?.role || "Director de Operaciones"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
                      <div className="text-sm text-foreground">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "appearance" && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground">Apariencia</h3>
              <div className="surface-card p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">Tema</div>
                    <div className="text-xs text-muted-foreground">Selecciona el tema de la aplicación</div>
                  </div>
                  <div className="flex bg-secondary rounded-lg p-0.5">
                    <button
                      onClick={() => {
                        if (darkMode) toggleDarkMode();
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        !darkMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" /> Claro
                    </button>
                    <button
                      onClick={() => {
                        if (!darkMode) toggleDarkMode();
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        darkMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" /> Oscuro
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">Fuente del editor</div>
                    <div className="text-xs text-muted-foreground">Tipografía para el editor de código</div>
                  </div>
                  <span className="text-sm text-foreground font-mono">JetBrains Mono</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === "plan" && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground">Plan y uso</h3>
              <div className="surface-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground capitalize">{user?.plan || "Pro"} Plan</span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">Activo</span>
                    </div>
                    <div className="text-sm text-muted-foreground">$29/mes · Renovación: 15 mayo 2025</div>
                  </div>
                  <Button variant="outline" size="sm">
                    Cambiar plan
                  </Button>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Chats este mes", used: 847, total: "Ilimitado", pct: 100 },
                    { label: "Documentos", used: 23, total: "Ilimitado", pct: 100 },
                    { label: "Almacenamiento", used: 2.4, total: 10, pct: 24, unit: "GB" },
                    { label: "Tokens IA utilizados", used: 1.2, total: 5, pct: 24, unit: "M" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-foreground font-medium">{item.label}</span>
                        <span className="text-muted-foreground">
                          {item.used}
                          {item.unit ? item.unit : ""} / {item.total === "Ilimitado" ? "∞" : `${item.total}${item.unit || ""}`}
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(item.pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "integrations" && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground">Integraciones</h3>
              <div className="space-y-3">
                {integrations.map((int) => (
                  <div key={int.name} className="surface-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Link2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{int.name}</div>
                        <div className="text-xs text-muted-foreground">{int.desc}</div>
                      </div>
                    </div>
                    <Button
                      variant={int.connected ? "outline" : "default"}
                      size="sm"
                      className={int.connected ? "" : "btn-primary-gradient"}
                    >
                      {int.connected ? "Conectado" : "Conectar"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground">Notificaciones</h3>
              <div className="surface-card p-6 space-y-4">
                {[
                  ["Notificaciones por email", "Recibe resúmenes diarios", true],
                  ["Notificaciones push", "Alertas en tiempo real", true],
                  ["Actualizaciones de producto", "Nuevas funciones y mejoras", false],
                  ["Tips y tutoriales", "Consejos para mejorar tu uso", false],
                ].map(([title, desc, enabled]) => (
                  <div key={title as string} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">{title as string}</div>
                      <div className="text-xs text-muted-foreground">{desc as string}</div>
                    </div>
                    <div
                      className={`w-10 h-6 rounded-full transition-colors cursor-pointer flex items-center px-0.5 ${
                        enabled ? "bg-primary" : "bg-border"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-background shadow-sm transition-transform ${enabled ? "translate-x-4" : ""}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === "language" && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground">Idioma</h3>
              <div className="surface-card p-6 space-y-3">
                {["Español", "English", "Português", "Français"].map((lang, i) => (
                  <button
                    key={lang}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      i === 0 ? "bg-primary/5 border border-primary/20" : "hover:bg-secondary border border-transparent"
                    }`}
                  >
                    <span className="text-sm text-foreground font-medium">{lang}</span>
                    {i === 0 && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSection === "security" && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-foreground">Seguridad</h3>
              <div className="surface-card p-6 space-y-4">
                {[
                  ["Contraseña", "Última actualización: hace 30 días"],
                  ["Autenticación en dos pasos", "No habilitada"],
                  ["Sesiones activas", "2 dispositivos"],
                ].map(([title, desc]) => (
                  <div key={title as string} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <div className="text-sm font-medium text-foreground">{title as string}</div>
                      <div className="text-xs text-muted-foreground">{desc as string}</div>
                    </div>
                    <Button variant="outline" size="sm">
                      Configurar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}