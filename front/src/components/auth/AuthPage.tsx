import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Sparkles, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2, LogIn } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authTab, setAuthTab, login, loginWithDemo } = useAppStore();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isRegister = location.pathname === "/register" || authTab === "register";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const success = login(email, password);
    if (success) {
      navigate("/app/chat");
    } else {
      setError("Credenciales inválidas. Usa el acceso demo.");
    }
    setIsLoading(false);
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    loginWithDemo();
    navigate("/app/chat");
  };

  const handleOAuth = (provider: string) => {
    setIsLoading(true);
    setTimeout(() => {
      loginWithDemo();
      navigate("/app/chat");
    }, 800);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left visual panel — dark gradient like Convertia */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-primary/15 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-accent/10 blur-[80px]" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-lg glow-sm">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-display font-bold text-white">convert-IA</h2>
          <p className="text-white/50 max-w-sm mx-auto">
            Plataforma unificada de inteligencia artificial para empresas que buscan eficiencia y resultados.
          </p>
          <div className="space-y-3 text-left max-w-xs mx-auto pt-4">
            {["Múltiples modelos de IA", "Seguridad empresarial", "Integración completa"].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
                <span className="text-white/70 text-sm font-medium">{f}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col bg-background">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm space-y-8">
            <div className="lg:hidden flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-lg">convert-IA</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-display font-bold">{isRegister ? "Crea tu cuenta" : "Iniciar sesión"}</h1>
              <p className="text-muted-foreground text-sm">
                {isRegister ? "Comienza a usar convert-IA en segundos." : "Ingresa tus credenciales para acceder a la plataforma."}
              </p>
            </div>

            {/* Demo access */}
            <div className="p-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Acceso rápido demo</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Prueba la plataforma sin registrarte</p>
              <Button onClick={handleDemoLogin} disabled={isLoading} className="w-full gradient-primary text-white font-semibold glow-sm" size="sm">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ingresar como Demo"}
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {isRegister && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Nombre completo" value={name} onChange={(e) => setName(e.target.value)} className="pl-10 h-11" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" placeholder="correo@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type={showPassword ? "text" : "password"} placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-11" required minLength={4} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
                  {error}
                </motion.div>
              )}

              <Button type="submit" className="w-full h-11 gradient-primary text-white font-semibold glow-sm" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando...</span>
                ) : (
                  <><LogIn className="mr-2 h-4 w-4" /> Ingresar</>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
