import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, Loader2, Sun, Moon, User, Settings,
} from "lucide-react";
import { useAppStore } from "@/store/appStore";

export default function SettingsView() {
  const { user, darkMode, toggleDarkMode, logout } = useAppStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    logout();
    navigate("/");
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-6 py-10 space-y-8">
        {/* Page title */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Configuración</h1>
        </div>

        {/* Profile section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Perfil</h2>
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ring-2 ring-border/30">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{user?.name || "Usuario"}</p>
                <p className="text-sm text-muted-foreground">{user?.email || "—"}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ["Empresa", user?.company || "—"],
                ["Rol", user?.role || "—"],
                ["Plan", (user?.plan || "free").toUpperCase()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border/40 bg-secondary/30 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Appearance section */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Apariencia</h2>
          <div className="rounded-2xl border border-border/50 bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Tema de la interfaz</p>
                <p className="text-xs text-muted-foreground mt-0.5">Cambia entre modo claro y oscuro</p>
              </div>
              <div className="flex rounded-xl bg-secondary p-1 gap-0.5">
                <button
                  onClick={() => darkMode && toggleDarkMode()}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                    !darkMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" /> Claro
                </button>
                <button
                  onClick={() => !darkMode && toggleDarkMode()}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                    darkMode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
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
            {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Cerrar sesión
          </button>
        </section>
      </div>
    </div>
  );
}
