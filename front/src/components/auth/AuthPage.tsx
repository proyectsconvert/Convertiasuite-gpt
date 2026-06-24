import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  Mail,
} from "lucide-react";

import { useAppStore } from "@/store/appStore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AuthPage() {
  const navigate = useNavigate();

  const { login } = useAppStore();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isLoading) return;

    setError("");
    setIsLoading(true);

    try {
      const success = await login(email, password);

      if (!success) {
        setError("Correo o contraseña incorrectos.");
        return;
      }

      navigate("/app/chat");
    } catch (err) {
      console.error(err);
      setError("No fue posible iniciar sesión.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-black p-12">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[120px]" />

        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-[100px]" />

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.6,
          }}
          className="relative z-10 text-center max-w-md"
        >
          <div className="flex justify-center mb-8">
            <img
              src="/favicon.ico"
              alt="convert-IA"
              className="w-16 h-16 rounded-2xl"
            />
          </div>

          <h1 className="text-4xl font-bold text-white mb-4">Convert-IA</h1>

          <p className="text-white/60 leading-relaxed">
            Plataforma unificada de IA enfocada en automatización, productividad
            y operaciones empresariales.
          </p>

          <div className="mt-10 space-y-4 text-left">
            {[
              "Múltiples modelos de IA",
              "Streaming en tiempo real",
              "Arquitectura escalable",
              "Seguridad empresarial",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-white/70 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col">
        <div className="p-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm"
          >
            {/* HEADER */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4 lg:hidden">
                <img
                  src="/logo-dark.ico"
                  alt="convert-IA"
                  className="w-8 h-8 object-contain block dark:hidden"
                />
                <img
                  src="/favicon.ico"
                  alt="convert-IA"
                  className="w-8 h-8 object-contain hidden dark:block"
                />
                <span className="text-lg font-semibold">Convert-IA</span>
              </div>

              <h2 className="text-3xl font-bold mt-4 mb-2">Iniciar sesión</h2>

              <p className="text-muted-foreground text-sm">
                Ingresa tus credenciales para acceder a la plataforma.
              </p>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                <Input
                  type="email"
                  placeholder="correo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  required
                  minLength={8}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: -4,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400"
                >
                  {error}
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 font-medium"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando...
                  </span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Ingresar
                  </>
                )}
              </Button>
            </form>
            <div className="text-center pt-2">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-muted-foreground hover:text-cyan-400 transition-colors underline underline-offset-4"
                >
                  No recuerdo mi contraseña
                </Link>
              </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
