import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        console.error("Supabase password reset error:", error);
        // Handle potential empty object errors or undefined message
        let errorMsg = error.message;
        if (!errorMsg || errorMsg === "{}" || typeof errorMsg !== "string") {
          errorMsg = "No se pudo enviar el correo de recuperación. Verifica el correo e intenta de nuevo.";
        }
        setError(errorMsg);
      } else {
        setMessage("Se ha enviado un enlace a tu correo para restablecer la contraseña.");
      }
    } catch (err) {
      console.error("Network or execution error:", err);
      setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* VOLVER BUTTON */}
      <div className="p-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al inicio de sesión
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

            <h2 className="text-3xl font-bold mt-4 mb-2">Recuperar contraseña</h2>
            <p className="text-muted-foreground text-sm">
              Introduce tu email y te enviaremos un enlace de recuperación.
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11"
                required
                autoComplete="email"
              />
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
                  Enviando...
                </span>
              ) : (
                "Enviar enlace"
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}