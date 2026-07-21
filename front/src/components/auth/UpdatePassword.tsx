import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error("Supabase password update error:", error);
        let errorMsg = error.message;
        if (!errorMsg || errorMsg === "{}" || typeof errorMsg !== "string") {
          errorMsg = "No se pudo actualizar la contraseña. Asegúrate de tener una sesión activa o que el enlace no haya expirado.";
        }
        setError(errorMsg);
      } else {
        setMessage("¡Tu contraseña ha sido cambiada con éxito! Redirigiendo...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (err) {
      console.error("Network or execution error during password update:", err);
      setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground justify-center items-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
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

          <h2 className="text-3xl font-bold mt-4 mb-2">Nueva contraseña</h2>
          <p className="text-muted-foreground text-sm">
            Ingresa tu nueva clave de acceso para actualizar tu cuenta.
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Nueva contraseña (mínimo 8 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-11"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="button"
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
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400"
            >
              {error}
            </motion.div>
          )}

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-400"
            >
              {message}
            </motion.div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 font-medium"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Actualizando...
              </span>
            ) : (
              "Actualizar contraseña"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
